/**
 * Top-level scan orchestrator. Runs the three tiers, merges their evidence in a
 * single Union-Find, and returns duplicate groups. Nothing here touches the
 * swipe-deck state — the feature integrates only via MediaLibrary deletes.
 */
import { Platform } from 'react-native';
import { computePerceptualHash } from './perceptualHash';
import { assembleGroups, clusterByHash, UnionFind } from './grouping';
import { loadHashCache, saveHashCache } from './hashCache';
import { addSemanticEdges, resolveLocalUri } from './semantic';
import { buildSessions, collectAssets } from './tier1Sessions';
import * as MediaAccess from '../../platform/mediaAccess';
import type { AssetHash, AssetMeta, CancelToken, DuplicateGroup, ScanProgress } from './types';

/** Default Hamming threshold (of 64 bits) for treating two photos as near-duplicates. */
export const NEAR_DUP_THRESHOLD = 10;

/** Number of assets hashed between progress updates / cancellation checks. */
const HASH_BATCH_SIZE = 24;

export interface ScanOptions {
    onProgress?: (progress: ScanProgress) => void;
    cancel?: CancelToken;
    /** Hamming distance threshold for near-duplicates (lower = stricter). */
    nearDupThreshold?: number;
    /** Enables the iOS-only semantic tier (off by default). */
    enableSemantic?: boolean;
}

export interface ScanResult {
    groups: DuplicateGroup[];
    /** Metadata for every scanned asset, so the UI can render thumbnails by id. */
    metaById: Map<string, AssetMeta>;
    /** Total assets scanned. */
    scanned: number;
}

/** Resolves a pixel-readable URI for hashing (iOS needs localUri instead of ph://). */
async function resolveHashUri(asset: AssetMeta): Promise<string | null> {
    if (Platform.OS !== 'ios') return asset.uri;
    try {
        const info = await MediaAccess.getInfo(asset.id);
        return info.localUri ?? null;
    } catch {
        return null;
    }
}

/**
 * Scans the whole library for duplicate / near-duplicate photos.
 * Tier 1 sessions scope the optional semantic tier; Tier 2 perceptual hashing is
 * the cross-platform workhorse; Tier 3 (semantic) runs only on iOS when enabled.
 */
export async function scanForDuplicates(options: ScanOptions = {}): Promise<ScanResult> {
    const { onProgress, cancel } = options;
    const nearDupThreshold = options.nearDupThreshold ?? NEAR_DUP_THRESHOLD;

    // --- Tier 1: collect metadata + build sessions -------------------------------
    onProgress?.({ phase: 'collecting', processed: 0, total: 0 });
    const assets = await collectAssets(
        (collected) => onProgress?.({ phase: 'collecting', processed: collected, total: collected }),
        cancel,
    );
    const meta = new Map<string, AssetMeta>(assets.map((a) => [a.id, a]));
    if (cancel?.cancelled) return { groups: [], metaById: meta, scanned: assets.length };

    const sessions = buildSessions(assets);

    // --- Tier 2: perceptual hash (incremental cache) -----------------------------
    const cache = await loadHashCache();
    const hashes = new Map<string, AssetHash>();
    let processed = 0;

    for (let i = 0; i < assets.length; i++) {
        if (cancel?.cancelled) break;
        const asset = assets[i];
        const cached = cache.get(asset.id);
        if (cached && cached.modificationTime === asset.modificationTime) {
            hashes.set(asset.id, cached);
        } else {
            const fileUri = await resolveHashUri(asset);
            if (fileUri) {
                try {
                    const { dhash, sharpness } = await computePerceptualHash(fileUri);
                    const entry: AssetHash = { id: asset.id, modificationTime: asset.modificationTime, dhash, sharpness };
                    hashes.set(asset.id, entry);
                    cache.set(asset.id, entry);
                } catch {
                    // Skip assets we can't decode (unsupported format, iCloud-only, etc.)
                }
            }
        }
        processed++;
        if (processed % HASH_BATCH_SIZE === 0 || i === assets.length - 1) {
            onProgress?.({ phase: 'hashing', processed, total: assets.length });
            // Yield so the UI thread can breathe between batches.
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
    }

    await saveHashCache(cache);
    if (cancel?.cancelled) return { groups: [], metaById: meta, scanned: assets.length };

    // --- Union all evidence ------------------------------------------------------
    const uf = new UnionFind();
    const hashLinked = new Set<string>();
    clusterByHash([...hashes.values()], nearDupThreshold, uf, hashLinked);

    // --- Tier 3: semantic (iOS only, opt-in) -------------------------------------
    if (options.enableSemantic) {
        await addSemanticEdges(
            sessions,
            meta,
            uf,
            (id) => {
                const asset = meta.get(id);
                return asset ? resolveLocalUri(id, asset.uri) : Promise.resolve(null);
            },
            {
                cancel,
                onProgress: (p, total) => onProgress?.({ phase: 'semantic', processed: p, total }),
            },
        );
    }
    if (cancel?.cancelled) return { groups: [], metaById: meta, scanned: assets.length };

    // --- Assemble groups ---------------------------------------------------------
    onProgress?.({ phase: 'grouping', processed: assets.length, total: assets.length });
    const groups = assembleGroups(uf, meta, hashes, hashLinked);

    return { groups, metaById: meta, scanned: assets.length };
}
