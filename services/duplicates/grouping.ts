/**
 * Grouping layer: Union-Find over asset ids fed by near-duplicate (hash) and
 * semantic edges, a clique-cover pass that breaks the chaining raw Union-Find
 * components are prone to, plus the "which one to keep" heuristic. All pure — no RN.
 */
import { hammingDistance } from './hashCore';
import type { AssetHash, AssetMeta, DuplicateGroup, GroupReason, Hash } from './types';

/** Disjoint-set / Union-Find with path compression over string ids. */
export class UnionFind {
    private parent = new Map<string, string>();

    find(x: string): string {
        const p = this.parent.get(x);
        if (p === undefined) {
            this.parent.set(x, x);
            return x;
        }
        if (p !== x) {
            const root = this.find(p);
            this.parent.set(x, root);
            return root;
        }
        return x;
    }

    union(a: string, b: string): void {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra !== rb) {
            this.parent.set(ra, rb);
        }
    }

    /** Groups all seen ids by their representative root. */
    components(): Map<string, string[]> {
        const groups = new Map<string, string[]>();
        for (const id of this.parent.keys()) {
            const root = this.find(id);
            const arr = groups.get(root);
            if (arr) {
                arr.push(id);
            } else {
                groups.set(root, [id]);
            }
        }
        return groups;
    }
}

/**
 * Splits a 64-bit hash into four 16-bit bands. Two hashes within a small Hamming
 * distance are very likely to share at least one identical band, so bands act as
 * an LSH candidate filter that avoids the O(n^2) all-pairs comparison.
 */
export function bandKeys(h: Hash): string[] {
    const [hi, lo] = h;
    return [
        `0:${(hi >>> 16) & 0xffff}`,
        `1:${hi & 0xffff}`,
        `2:${(lo >>> 16) & 0xffff}`,
        `3:${lo & 0xffff}`,
    ];
}

/** Safety cap: skip pathological buckets (e.g. thousands of solid-colour images). */
const MAX_BUCKET = 400;

/** Mutable state threaded across incremental `addHashToClusters` calls. */
export interface ClusterState {
    /** Band key -> ids seen so far in that band. */
    buckets: Map<string, string[]>;
    byId: Map<string, AssetHash>;
}

export function createClusterState(): ClusterState {
    return { buckets: new Map(), byId: new Map() };
}

/**
 * Online equivalent of `clusterByHash`'s inner loop: feed one hash at a time
 * (e.g. as they're computed during a streaming scan) and it unions it against
 * every previously-seen hash that shares a band and is within `threshold` bits.
 * Because Union-Find components are order-independent, feeding hashes one by
 * one via this function produces the exact same partition as `clusterByHash`
 * feeding them all at once — the only intentional difference is `MAX_BUCKET`,
 * which here caps candidate draws per-insert rather than skipping a bucket by
 * its eventual final size (identical for any band that never grows past the
 * cap, and bounded for pathological ones).
 *
 * Note: this still unions on any single pairwise match, so the resulting
 * Union-Find components can chain unrelated assets together (A~B~C~D even
 * when A and D share nothing). That's intentional here — this stays cheap and
 * incremental for streaming; `assembleGroups` is what re-partitions each
 * component into cohesive cliques before it becomes a `DuplicateGroup`.
 *
 * Returns true iff this hash merged two previously-separate components — i.e.
 * the visible group set actually changed, which callers can use to decide
 * whether a UI refresh is worth doing.
 */
export function addHashToClusters(ah: AssetHash, threshold: number, uf: UnionFind, state: ClusterState): boolean {
    state.byId.set(ah.id, ah);
    uf.find(ah.id); // ensure every asset is a node even if it stays a singleton

    const candidates = new Set<string>();
    for (const key of bandKeys(ah.dhash)) {
        let arr = state.buckets.get(key);
        if (!arr) {
            arr = [];
            state.buckets.set(key, arr);
        }
        if (arr.length < MAX_BUCKET) {
            for (const other of arr) candidates.add(other);
        }
        arr.push(ah.id);
    }

    let merged = false;
    for (const other of candidates) {
        if (hammingDistance(ah.dhash, state.byId.get(other)!.dhash) <= threshold) {
            if (uf.find(ah.id) !== uf.find(other)) merged = true;
            uf.union(ah.id, other);
        }
    }
    return merged;
}

/**
 * Unions near-duplicate assets whose hashes are within `threshold` bits, using
 * band bucketing to keep comparisons near-linear. Defined in terms of
 * `addHashToClusters` so batch and streaming stay equivalent by construction.
 */
export function clusterByHash(hashes: AssetHash[], threshold: number, uf: UnionFind): void {
    const state = createClusterState();
    for (const ah of hashes) {
        addHashToClusters(ah, threshold, uf, state);
    }
}

/**
 * Partitions `items` so every pair WITHIN a returned cluster satisfies
 * `linkable` (a clique) — never merges items transitively through a third,
 * unlike a raw Union-Find connected component. Greedy clique cover: seeds each
 * cluster from the unassigned item with the most remaining candidate links
 * (deterministic tiebreak on `key`, since Set/array iteration below is in
 * ascending sorted-key order), then only admits a candidate if it's linkable
 * to EVERY member already in the cluster (complete linkage) — so a candidate
 * that's only linkable to *some* of the cluster starts a new one instead.
 *
 * Deterministic given a stable `key`: the same input always yields the same
 * partition regardless of insertion order, so re-running this on a streaming
 * snapshot doesn't reshuffle group ids and thrash the list UI.
 *
 * O(n^2) to build the adjacency matrix, O(n^2..n^3) for the greedy cover — fine
 * since `items` is a single Union-Find component (tens of assets in practice,
 * not the whole library); callers should cap `items.length` for pathological
 * inputs rather than rely on this function to bound its own cost.
 */
export function completeLinkageClusters<T>(items: T[], key: (item: T) => string, linkable: (a: T, b: T) => boolean): T[][] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => {
        const ka = key(a);
        const kb = key(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    const n = sorted.length;

    const adjacency: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (linkable(sorted[i], sorted[j])) {
                adjacency[i][j] = true;
                adjacency[j][i] = true;
            }
        }
    }

    const unassigned = new Set<number>(Array.from({ length: n }, (_, i) => i));
    const clusters: T[][] = [];

    while (unassigned.size > 0) {
        // Seed from the unassigned item with the most remaining connections;
        // Set iteration is ascending-index (== ascending key) order, so the
        // first item to reach a new max degree is also the lowest-key tiebreak.
        let seed = -1;
        let seedDegree = -1;
        for (const i of unassigned) {
            let degree = 0;
            for (const j of unassigned) {
                if (i !== j && adjacency[i][j]) degree++;
            }
            if (degree > seedDegree) {
                seedDegree = degree;
                seed = i;
            }
        }

        const clusterIndices = [seed];
        unassigned.delete(seed);

        for (const candidate of [...unassigned].sort((a, b) => a - b)) {
            if (clusterIndices.every((member) => adjacency[member][candidate])) {
                clusterIndices.push(candidate);
                unassigned.delete(candidate);
            }
        }

        clusters.push(clusterIndices.map((i) => sorted[i]));
    }

    return clusters;
}

/**
 * Hash-tier wrapper around `completeLinkageClusters`: splits a raw Union-Find
 * component into hash-cohesive cliques. An id with no retained hash (e.g. a
 * decode failure) can't be cohesive with anything and becomes its own
 * singleton, dropped by the size>=2 filter in `assembleGroups`.
 */
export function splitComponentByHash(ids: string[], hashes: Map<string, AssetHash>, threshold: number): string[][] {
    return completeLinkageClusters(
        ids,
        (id) => id,
        (a, b) => {
            const ha = hashes.get(a)?.dhash;
            const hb = hashes.get(b)?.dhash;
            return ha != null && hb != null && hammingDistance(ha, hb) <= threshold;
        },
    );
}

/** True when the asset looks like a screenshot (iOS media subtype or filename). */
export function isScreenshot(meta: AssetMeta): boolean {
    if (meta.mediaSubtypes.includes('screenshot')) return true;
    return /screenshot|screen[\s_-]?shot/i.test(meta.filename);
}

/**
 * Chooses the best asset to keep in a group. Priority: real photo over
 * screenshot, then higher resolution, then sharper, then most recently modified.
 */
export function pickKeeper(
    ids: string[],
    meta: Map<string, AssetMeta>,
    hashes: Map<string, AssetHash>,
): string {
    return ids.reduce((best, current) => (compareKeeper(current, best, meta, hashes) > 0 ? current : best));
}

function compareKeeper(
    a: string,
    b: string,
    meta: Map<string, AssetMeta>,
    hashes: Map<string, AssetHash>,
): number {
    const ma = meta.get(a);
    const mb = meta.get(b);
    if (!ma || !mb) return ma ? 1 : -1;

    const shotA = isScreenshot(ma) ? 1 : 0;
    const shotB = isScreenshot(mb) ? 1 : 0;
    if (shotA !== shotB) return shotB - shotA; // prefer the non-screenshot

    const resA = ma.width * ma.height;
    const resB = mb.width * mb.height;
    if (resA !== resB) return resA - resB; // prefer higher resolution

    const sharpA = hashes.get(a)?.sharpness ?? 0;
    const sharpB = hashes.get(b)?.sharpness ?? 0;
    if (sharpA !== sharpB) return sharpA - sharpB; // prefer sharper

    return ma.modificationTime - mb.modificationTime; // prefer most recently modified
}

/** Components larger than this skip cohesion splitting below and are dropped
 *  entirely rather than emitted as one unreviewable mega-group. Pathological
 *  giant components (e.g. thousands of near-solid-color images colliding in
 *  one LSH bucket) are already a known edge case `MAX_BUCKET` guards against;
 *  this just bounds the split's O(n^2..n^3) cost, not correctness. */
const MAX_SPLIT_COMPONENT = 400;

/** True iff at least one pair within `ids` is within `threshold` hash bits —
 *  the real per-group evidence for the 'near-dup' reason. Replaces the old
 *  global `hashLinked` set, which mislabeled a whole heterogeneous component
 *  as 'near-dup' the moment ANY single member anywhere in it had a hash edge. */
function hasHashPairWithin(ids: string[], hashes: Map<string, AssetHash>, threshold: number): boolean {
    for (let i = 0; i < ids.length; i++) {
        const ha = hashes.get(ids[i])?.dhash;
        if (!ha) continue;
        for (let j = i + 1; j < ids.length; j++) {
            const hb = hashes.get(ids[j])?.dhash;
            if (hb && hammingDistance(ha, hb) <= threshold) return true;
        }
    }
    return false;
}

/**
 * Re-bridges hash-cohesive clusters using semantic edges. Semantic edges are
 * cohesive by construction (see `addSemanticEdges`'s own clique-cover pass),
 * so it's safe for them to re-connect hash cliques of the same subject
 * without reintroducing the chaining this whole module exists to avoid.
 */
function mergeClustersByEdges(clusters: string[][], edges: ReadonlyArray<readonly [string, string]>): string[][] {
    if (edges.length === 0) return clusters;

    const clusterOf = new Map<string, number>();
    clusters.forEach((cluster, index) => {
        for (const id of cluster) clusterOf.set(id, index);
    });

    const merge = new UnionFind();
    clusters.forEach((_, index) => merge.find(String(index)));
    for (const [a, b] of edges) {
        const ia = clusterOf.get(a);
        const ib = clusterOf.get(b);
        if (ia === undefined || ib === undefined) continue; // edge references an id outside this component
        merge.union(String(ia), String(ib));
    }

    const merged = new Map<string, string[]>();
    clusters.forEach((cluster, index) => {
        const root = merge.find(String(index));
        const arr = merged.get(root);
        if (arr) arr.push(...cluster);
        else merged.set(root, [...cluster]);
    });
    return [...merged.values()];
}

/**
 * Assembles final groups from the Union-Find state. Raw Union-Find components
 * are connected components, not cliques — a single hash or semantic edge can
 * transitively chain unrelated photos together (A~B~C~D even when A and D
 * share nothing pairwise). This re-partitions each component into
 * hash-cohesive cliques (`splitComponentByHash`), re-bridges them using
 * semantic edges, then — per final cluster — drops singletons, picks a
 * keeper, labels the reason from real per-cluster evidence, and sorts by how
 * many assets are removable (largest cleanup opportunities first).
 */
export function assembleGroups(
    uf: UnionFind,
    meta: Map<string, AssetMeta>,
    hashes: Map<string, AssetHash>,
    threshold: number,
    semanticEdges: ReadonlyArray<readonly [string, string]> = [],
): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    for (const [, ids] of uf.components()) {
        if (ids.length < 2) continue;
        if (ids.length > MAX_SPLIT_COMPONENT) continue; // untrustworthy pathological component — drop, not emit

        const hashClusters = splitComponentByHash(ids, hashes, threshold);
        const clusters = mergeClustersByEdges(hashClusters, semanticEdges);

        for (const cluster of clusters) {
            if (cluster.length < 2) continue;
            const reason: GroupReason = hasHashPairWithin(cluster, hashes, threshold) ? 'near-dup' : 'similar';
            // Use the smallest asset id (not the UF root) as the stable group id: the
            // root can flip whenever two components merge, which would otherwise
            // re-key this group on every streaming update and thrash the list UI.
            const id = cluster.reduce((min, x) => (x < min ? x : min));
            groups.push({
                id,
                assetIds: cluster,
                reason,
                keeperId: pickKeeper(cluster, meta, hashes),
            });
        }
    }
    groups.sort((a, b) => b.assetIds.length - a.assetIds.length);
    return groups;
}
