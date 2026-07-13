/**
 * Grouping layer: Union-Find over asset ids fed by near-duplicate (hash) and
 * semantic edges, plus the "which one to keep" heuristic. All pure — no RN.
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
 * Returns true iff this hash merged two previously-separate components — i.e.
 * the visible group set actually changed, which callers can use to decide
 * whether a UI refresh is worth doing.
 */
export function addHashToClusters(
    ah: AssetHash,
    threshold: number,
    uf: UnionFind,
    state: ClusterState,
    hashLinked: Set<string>,
): boolean {
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
            hashLinked.add(ah.id);
            hashLinked.add(other);
        }
    }
    return merged;
}

/**
 * Unions near-duplicate assets whose hashes are within `threshold` bits, using
 * band bucketing to keep comparisons near-linear. Records which ids were linked
 * by a hash edge so the group reason can distinguish near-dups from similars.
 * Defined in terms of `addHashToClusters` so batch and streaming stay equivalent
 * by construction.
 */
export function clusterByHash(
    hashes: AssetHash[],
    threshold: number,
    uf: UnionFind,
    hashLinked: Set<string>,
): void {
    const state = createClusterState();
    for (const ah of hashes) {
        addHashToClusters(ah, threshold, uf, state, hashLinked);
    }
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

/**
 * Assembles final groups from the Union-Find state: drops singletons, picks a
 * keeper per group, labels the reason, and sorts by how many assets are
 * removable (largest cleanup opportunities first).
 */
export function assembleGroups(
    uf: UnionFind,
    meta: Map<string, AssetMeta>,
    hashes: Map<string, AssetHash>,
    hashLinked: Set<string>,
): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    for (const [, ids] of uf.components()) {
        if (ids.length < 2) continue;
        const reason: GroupReason = ids.some((id) => hashLinked.has(id)) ? 'near-dup' : 'similar';
        // Use the smallest asset id (not the UF root) as the stable group id: the
        // root can flip whenever two components merge, which would otherwise
        // re-key this group on every streaming update and thrash the list UI.
        const id = ids.reduce((min, x) => (x < min ? x : min));
        groups.push({
            id,
            assetIds: ids,
            reason,
            keeperId: pickKeeper(ids, meta, hashes),
        });
    }
    groups.sort((a, b) => b.assetIds.length - a.assetIds.length);
    return groups;
}
