/**
 * Tests for the anti-chaining clique-cover logic in `grouping.ts` — the fix
 * for groups containing photos that are nothing alike (see the plan/PR this
 * shipped with). Run via `npm test` (`node --test`, with a tiny custom loader
 * so Node's ESM resolver accepts this codebase's extensionless imports — see
 * scripts/tsExtensionResolver.mjs).
 *
 * `grouping.ts` is deliberately RN-free/pure, so it runs directly under
 * Node's test runner with no mocking. `semantic.ts`/`pipeline.ts` are NOT
 * imported here — they pull in `react-native` and can't load outside RN — so
 * the semantic tier's fix is covered indirectly via `completeLinkageClusters`
 * (the same primitive `addSemanticEdges` uses) and `assembleGroups`'s
 * `semanticEdges` parameter.
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { hammingDistance } from './hashCore';
import { assembleGroups, completeLinkageClusters, splitComponentByHash, UnionFind } from './grouping';
import type { AssetHash, AssetMeta, Hash } from './types';

const THRESHOLD = 10; // matches NEAR_DUP_THRESHOLD in pipeline.ts

/** A 10-bit-wide sliding window in the low 32 bits, shifted by `shift` bits.
 *  Two windows shifted by `d` bits apart have Hamming distance 2*min(10, d) —
 *  lets us construct chains with precisely-controlled pairwise distances. */
function slidingHash(shift: number, width = 10): Hash {
    let lo = 0;
    for (let i = 0; i < width; i++) lo |= 1 << (shift + i);
    return [0, lo >>> 0];
}

function makeHash(id: string, dhash: Hash): AssetHash {
    return { id, modificationTime: 0, dhash, sharpness: 0 };
}

function makeMeta(id: string): AssetMeta {
    return {
        id,
        uri: `file://${id}`,
        creationTime: 0,
        modificationTime: 0,
        width: 100,
        height: 100,
        filename: `${id}.jpg`,
        mediaSubtypes: [],
    };
}

/** Unions every pair of `hashes` within `threshold` (mirroring what
 *  addHashToClusters would do), and returns the resulting raw connected
 *  component containing `hashes[0].id`, plus a lookup map. */
function rawComponentFor(hashes: AssetHash[], threshold: number): { hashesById: Map<string, AssetHash>; ids: string[] } {
    const uf = new UnionFind();
    const hashesById = new Map(hashes.map((h) => [h.id, h]));
    for (const h of hashes) uf.find(h.id);
    for (let i = 0; i < hashes.length; i++) {
        for (let j = i + 1; j < hashes.length; j++) {
            if (hammingDistance(hashes[i].dhash, hashes[j].dhash) <= threshold) {
                uf.union(hashes[i].id, hashes[j].id);
            }
        }
    }
    const root = uf.find(hashes[0].id);
    const ids = [...uf.components().get(root)!];
    return { hashesById, ids };
}

describe('completeLinkageClusters', () => {
    it('never puts two non-linkable items in the same cluster (no chaining)', () => {
        // a-b linked, b-c linked, a-c NOT linked: a chain, not a clique.
        const linked = new Set(['a-b', 'b-a', 'b-c', 'c-b']);
        const clusters = completeLinkageClusters(['a', 'b', 'c'], (x) => x, (x, y) => linked.has(`${x}-${y}`));
        for (const cluster of clusters) {
            assert.ok(!(cluster.includes('a') && cluster.includes('c')), 'a and c must never co-occur');
        }
    });

    it('is deterministic regardless of input order', () => {
        const linkable = (a: string, b: string) => Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) <= 1;
        const items = ['a', 'b', 'c', 'd', 'e'];
        const shuffled = ['d', 'a', 'e', 'c', 'b'];

        const normalize = (clusters: string[][]) =>
            clusters.map((c) => [...c].sort()).sort((a, b) => (a.join() < b.join() ? -1 : 1));

        const r1 = normalize(completeLinkageClusters(items, (x) => x, linkable));
        const r2 = normalize(completeLinkageClusters(shuffled, (x) => x, linkable));
        assert.deepStrictEqual(r1, r2);
    });

    it('keeps a fully-connected clique together', () => {
        const clusters = completeLinkageClusters(['a', 'b', 'c'], (x) => x, () => true);
        assert.strictEqual(clusters.length, 1);
        assert.deepStrictEqual([...clusters[0]].sort(), ['a', 'b', 'c']);
    });

    it('matches the reported topology: a tight pair survives, asymmetric bridges drop out', () => {
        // p1-p2 linked (the genuine near-dup pair). x links ONLY to p1, y links
        // ONLY to p2. x-y and the cross pairs (x-p2, y-p1) are NOT linked — so a
        // raw Union-Find still chains all four into one component (p1-p2-x via
        // p1, p2-y via p2), but they don't form a clique together. This is the
        // exact shape of the reported bug: an identical pair contaminated by two
        // unrelated photos that each only chained in through one shared bridge.
        const linkSet = new Set(['p1-p2', 'p2-p1', 'p1-x', 'x-p1', 'p2-y', 'y-p2']);
        const clusters = completeLinkageClusters(
            ['p1', 'p2', 'x', 'y'],
            (id) => id,
            (a, b) => linkSet.has(`${a}-${b}`),
        );

        const pairCluster = clusters.find((c) => c.includes('p1') && c.includes('p2'));
        assert.ok(pairCluster, 'the identical pair must survive as one cluster');
        assert.strictEqual(pairCluster!.length, 2, 'the pair must not drag x or y in with it');

        for (const cluster of clusters) {
            assert.ok(!(cluster.includes('x') && cluster.includes('y')), 'x and y must never co-occur');
        }
    });
});

describe('splitComponentByHash', () => {
    it('a linear chain A-B-C-D (A and D beyond threshold) never lets A and D co-occur', () => {
        // Consecutive shift of 2 -> distance 4 (linked); A-D shift of 6 -> distance 12 (not linked).
        const hashes = [
            makeHash('a', slidingHash(0)),
            makeHash('b', slidingHash(2)),
            makeHash('c', slidingHash(4)),
            makeHash('d', slidingHash(6)),
        ];
        const { hashesById, ids } = rawComponentFor(hashes, THRESHOLD);
        assert.deepStrictEqual([...ids].sort(), ['a', 'b', 'c', 'd'], 'sanity: all 4 should be one raw component');

        const clusters = splitComponentByHash(ids, hashesById, THRESHOLD);
        for (const cluster of clusters) {
            assert.ok(!(cluster.includes('a') && cluster.includes('d')), 'a and d must never co-occur after splitting');
        }
    });

    it('never splits a genuine direct near-dup pair', () => {
        const hashes = [makeHash('a', slidingHash(0)), makeHash('b', slidingHash(0))]; // identical
        const clusters = splitComponentByHash(['a', 'b'], new Map(hashes.map((h) => [h.id, h])), THRESHOLD);
        assert.strictEqual(clusters.length, 1);
        assert.deepStrictEqual([...clusters[0]].sort(), ['a', 'b']);
    });
});

describe('assembleGroups — reason labeling and semantic re-bridging', () => {
    it('labels a hash-cohesive group "near-dup"', () => {
        const uf = new UnionFind();
        uf.union('a', 'b');
        const hashes = new Map([
            ['a', makeHash('a', slidingHash(0))],
            ['b', makeHash('b', slidingHash(0))],
        ]);
        const meta = new Map([
            ['a', makeMeta('a')],
            ['b', makeMeta('b')],
        ]);
        const groups = assembleGroups(uf, meta, hashes, THRESHOLD);
        assert.strictEqual(groups.length, 1);
        assert.strictEqual(groups[0].reason, 'near-dup');
        assert.deepStrictEqual([...groups[0].assetIds].sort(), ['a', 'b']);
    });

    it('labels a semantic-only cluster (no internal hash pair) "similar"', () => {
        const uf = new UnionFind();
        uf.union('a', 'b'); // only linked via the semantic edge below, no hash proximity
        const hashes = new Map([
            ['a', makeHash('a', slidingHash(0))],
            ['b', makeHash('b', slidingHash(20))], // far apart: distance 2*min(10,20)=20
        ]);
        const meta = new Map([
            ['a', makeMeta('a')],
            ['b', makeMeta('b')],
        ]);
        const groups = assembleGroups(uf, meta, hashes, THRESHOLD, [['a', 'b']]);
        assert.strictEqual(groups.length, 1);
        assert.strictEqual(groups[0].reason, 'similar');
    });

    it('drops a chained-in outlier with no real hash cohesion, keeps the genuine pair', () => {
        // p1/p2 are a genuine near-dup pair (identical hash). x chained into the
        // same raw Union-Find component via some other edge (any tier), but has
        // no hash cohesion with either — this is the reported bug's mechanism:
        // an unrelated photo riding along on a shared connected component.
        const uf = new UnionFind();
        uf.union('p1', 'p2');
        uf.union('p1', 'x');
        const hashes = new Map([
            ['p1', makeHash('p1', slidingHash(0))],
            ['p2', makeHash('p2', slidingHash(0))],
            ['x', makeHash('x', slidingHash(20))], // distance to p1/p2 = 2*min(10,20)=20, far outside threshold
        ]);
        const meta = new Map([
            ['p1', makeMeta('p1')],
            ['p2', makeMeta('p2')],
            ['x', makeMeta('x')],
        ]);
        const groups = assembleGroups(uf, meta, hashes, THRESHOLD);

        const pairGroup = groups.find((g) => g.assetIds.includes('p1') && g.assetIds.includes('p2'));
        assert.ok(pairGroup, 'p1/p2 must survive as a group');
        assert.strictEqual(pairGroup!.assetIds.length, 2, 'x must not be dragged into the pair');
        assert.ok(!groups.some((g) => g.assetIds.includes('x')), 'x has no hash cohesion with anything and must be dropped');
    });

    it('drops components larger than MAX_SPLIT_COMPONENT entirely rather than emitting an unreviewable mega-group', () => {
        const uf = new UnionFind();
        const ids: string[] = [];
        const N = 401; // one over the 400 guard in grouping.ts
        for (let i = 0; i < N; i++) {
            const id = `p${i}`;
            ids.push(id);
            if (i > 0) uf.union('p0', id);
        }
        const hashes = new Map<string, AssetHash>();
        const meta = new Map<string, AssetMeta>();
        for (const id of ids) {
            hashes.set(id, makeHash(id, slidingHash(0)));
            meta.set(id, makeMeta(id));
        }
        const groups = assembleGroups(uf, meta, hashes, THRESHOLD);
        assert.strictEqual(groups.length, 0, 'a pathologically large component should be dropped, not emitted');
    });
});
