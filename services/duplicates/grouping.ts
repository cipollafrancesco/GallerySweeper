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

/**
 * Unions near-duplicate assets whose hashes are within `threshold` bits, using
 * band bucketing to keep comparisons near-linear. Records which ids were linked
 * by a hash edge so the group reason can distinguish near-dups from similars.
 */
export function clusterByHash(
    hashes: AssetHash[],
    threshold: number,
    uf: UnionFind,
    hashLinked: Set<string>,
): void {
    const byId = new Map(hashes.map((h) => [h.id, h] as const));
    const buckets = new Map<string, string[]>();

    for (const ah of hashes) {
        uf.find(ah.id); // ensure every asset is a node even if it stays a singleton
        for (const key of bandKeys(ah.dhash)) {
            const arr = buckets.get(key);
            if (arr) {
                arr.push(ah.id);
            } else {
                buckets.set(key, [ah.id]);
            }
        }
    }

    const checked = new Set<string>();
    for (const bucket of buckets.values()) {
        if (bucket.length < 2 || bucket.length > MAX_BUCKET) continue;
        for (let i = 0; i < bucket.length; i++) {
            for (let j = i + 1; j < bucket.length; j++) {
                const a = bucket[i];
                const b = bucket[j];
                const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
                if (checked.has(pairKey)) continue;
                checked.add(pairKey);
                if (hammingDistance(byId.get(a)!.dhash, byId.get(b)!.dhash) <= threshold) {
                    uf.union(a, b);
                    hashLinked.add(a);
                    hashLinked.add(b);
                }
            }
        }
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
    for (const [root, ids] of uf.components()) {
        if (ids.length < 2) continue;
        const reason: GroupReason = ids.some((id) => hashLinked.has(id)) ? 'near-dup' : 'similar';
        groups.push({
            id: root,
            assetIds: ids,
            reason,
            keeperId: pickKeeper(ids, meta, hashes),
        });
    }
    groups.sort((a, b) => b.assetIds.length - a.assetIds.length);
    return groups;
}
