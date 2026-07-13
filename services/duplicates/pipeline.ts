/**
 * Top-level scan orchestrator. Runs the three tiers, merges their evidence in a
 * single Union-Find, and returns duplicate groups. Nothing here touches the
 * swipe-deck state — the feature integrates only via MediaLibrary deletes.
 */
import { Platform } from 'react-native';
import { computePerceptualHash } from './perceptualHash';
import { addHashToClusters, assembleGroups, createClusterState, UnionFind } from './grouping';
import { loadHashCache, saveHashCache } from './hashCache';
import { addSemanticEdges, resolveLocalUri } from './semantic';
import { buildSessions, collectAssets } from './tier1Sessions';
import * as MediaAccess from '../../platform/mediaAccess';
import type { AssetHash, AssetMeta, CancelToken, DuplicateGroup, ScanDiagnostics, ScanProgress } from './types';

/** Default Hamming threshold (of 64 bits) for treating two photos as near-duplicates. */
export const NEAR_DUP_THRESHOLD = 10;

/** Number of assets hashed between progress updates / cancellation checks. */
const HASH_BATCH_SIZE = 24;

/** Minimum newly-hashed assets between streamed group snapshots. */
const EMIT_MIN_NEW = 150;

/** Minimum wall-clock time between streamed group snapshots. */
const EMIT_INTERVAL_MS = 400;

/** Assets between hashing-progress heartbeat logs — the console pulse that proves the loop is alive. */
const HEARTBEAT_EVERY = HASH_BATCH_SIZE * 5;

/** Newly-hashed assets between incremental hash-cache flushes, so a killed scan resumes instead of re-hashing. */
const CACHE_FLUSH_EVERY = 500;

/** Per-asset resolve+hash time above which we warn — a single wedged asset stalls the whole sequential loop. */
const SLOW_ASSET_MS = 3000;

export interface ScanGroupsSnapshot {
    groups: DuplicateGroup[];
    metaById: Map<string, AssetMeta>;
    diagnostics: ScanDiagnostics;
}

export interface ScanOptions {
    onProgress?: (progress: ScanProgress) => void;
    /**
     * Called with a snapshot of the duplicate groups found so far, throttled so
     * it doesn't fire more often than useful. Lets the UI stream results in
     * during a long scan instead of only showing them at the very end.
     */
    onGroups?: (snapshot: ScanGroupsSnapshot) => void;
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
    diagnostics: ScanDiagnostics;
}

function emptyDiagnostics(collected: number): ScanDiagnostics {
    return {
        collected,
        cacheHits: 0,
        hashed: 0,
        skippedNoLocalUri: 0,
        getInfoFailed: 0,
        decodeFailed: 0,
        phFallbackRecovered: 0,
        durationMs: 0,
    };
}

interface HashUriResolution {
    /** A pixel-readable uri, or null if none could be resolved. */
    uri: string | null;
    getInfoFailed: boolean;
    noLocalUri: boolean;
}

/** Resolves a pixel-readable URI for hashing (iOS needs localUri instead of ph://). */
async function resolveHashUri(asset: AssetMeta): Promise<HashUriResolution> {
    if (Platform.OS !== 'ios') return { uri: asset.uri, getInfoFailed: false, noLocalUri: false };
    try {
        const info = await MediaAccess.getInfo(asset.id);
        if (info.localUri) return { uri: info.localUri, getInfoFailed: false, noLocalUri: false };
        return { uri: null, getInfoFailed: false, noLocalUri: true };
    } catch {
        return { uri: null, getInfoFailed: true, noLocalUri: false };
    }
}

/**
 * Scans the whole library for duplicate / near-duplicate photos.
 * Tier 1 sessions scope the optional semantic tier; Tier 2 perceptual hashing is
 * the cross-platform workhorse; Tier 3 (semantic) runs only on iOS when enabled.
 *
 * Hashing is interleaved with paging (via `collectAssets`'s `onPage` hook) and
 * clustering happens incrementally (`addHashToClusters`), so `onGroups` can be
 * called with a growing set of duplicate groups well before the whole library
 * has been scanned — the caller doesn't have to wait for the end to show
 * anything.
 */
export async function scanForDuplicates(options: ScanOptions = {}): Promise<ScanResult> {
    const { onProgress, onGroups, cancel } = options;
    const nearDupThreshold = options.nearDupThreshold ?? NEAR_DUP_THRESHOLD;
    const startedAt = Date.now();

    const meta = new Map<string, AssetMeta>();
    const hashes = new Map<string, AssetHash>();
    const uf = new UnionFind();
    const hashLinked = new Set<string>();
    const clusterState = createClusterState();
    const diag = emptyDiagnostics(0);
    const decodeErrorSamples: string[] = [];

    let dirty = false;
    let sinceEmit = 0;
    let lastEmitAt = 0;
    let hashedSinceFlush = 0;

    function emit(force: boolean): void {
        if (!onGroups) return;
        const now = Date.now();
        if (!force && (!dirty || sinceEmit < EMIT_MIN_NEW || now - lastEmitAt < EMIT_INTERVAL_MS)) return;
        const groups = assembleGroups(uf, meta, hashes, hashLinked);
        onGroups({ groups, metaById: meta, diagnostics: { ...diag } });
        dirty = false;
        sinceEmit = 0;
        lastEmitAt = now;
    }

    // --- Tier 2: perceptual hash (incremental cache) -----------------------------
    const cache = await loadHashCache();
    let processed = 0;
    let knownTotal = 0;
    onProgress?.({ phase: 'collecting', processed: 0, total: 0 });
    console.log('[duplicates] hashing start');

    // Hashes + clusters one already-collected page. Awaited by `collectAssets`
    // between pages, so hashing runs concurrently with later pages paging in.
    const hashPage = async (page: AssetMeta[]): Promise<void> => {
        for (const asset of page) {
            if (cancel?.cancelled) return;
            meta.set(asset.id, asset);
            diag.collected++;

            const cached = cache.get(asset.id);
            if (cached && cached.modificationTime === asset.modificationTime) {
                hashes.set(asset.id, cached);
                diag.cacheHits++;
                if (addHashToClusters(cached, nearDupThreshold, uf, clusterState, hashLinked)) dirty = true;
            } else {
                // Time resolve+hash: a single corrupt/huge asset can wedge a native
                // call, and since hashing is sequential that stalls the whole scan.
                // There's no per-await timeout, so at least make it visible.
                const assetStartedAt = Date.now();
                const resolution = await resolveHashUri(asset);
                if (resolution.getInfoFailed) diag.getInfoFailed++;
                if (resolution.noLocalUri) diag.skippedNoLocalUri++;

                // If we couldn't resolve a local file uri, still try the raw asset uri
                // (ph:// on iOS) — the new image-manipulator can sometimes read it
                // directly even when getAssetInfoAsync couldn't resolve a localUri.
                const isFallback = !resolution.uri;
                const fileUri = resolution.uri ?? asset.uri;

                if (fileUri) {
                    try {
                        const { dhash, sharpness } = await computePerceptualHash(fileUri);
                        const entry: AssetHash = { id: asset.id, modificationTime: asset.modificationTime, dhash, sharpness };
                        hashes.set(asset.id, entry);
                        cache.set(asset.id, entry);
                        diag.hashed++;
                        hashedSinceFlush++;
                        if (isFallback) diag.phFallbackRecovered++;
                        if (addHashToClusters(entry, nearDupThreshold, uf, clusterState, hashLinked)) dirty = true;
                    } catch (e) {
                        diag.decodeFailed++;
                        if (decodeErrorSamples.length < 5) {
                            decodeErrorSamples.push(String(e));
                            console.warn('[duplicates] hash failed', asset.id, e);
                        }
                    }
                }

                const assetMs = Date.now() - assetStartedAt;
                if (assetMs > SLOW_ASSET_MS) console.warn('[duplicates] slow asset', asset.id, `${assetMs}ms`);
            }

            processed++;
            sinceEmit++;
            if (processed % HASH_BATCH_SIZE === 0) {
                onProgress?.({ phase: 'hashing', processed, total: knownTotal || processed });
                emit(false);

                // Heartbeat: turns the otherwise-silent hashing window into a visible
                // pulse and shows exactly where assets are going (hashed vs cached vs
                // skipped/failed) plus the throughput.
                if (processed % HEARTBEAT_EVERY === 0) {
                    const elapsedMs = Date.now() - startedAt;
                    const perSec = elapsedMs > 0 ? Math.round((processed / elapsedMs) * 1000) : 0;
                    console.log('[duplicates] hashing progress', {
                        processed,
                        total: knownTotal || processed,
                        hashed: diag.hashed,
                        cacheHits: diag.cacheHits,
                        decodeFailed: diag.decodeFailed,
                        skippedNoLocalUri: diag.skippedNoLocalUri,
                        getInfoFailed: diag.getInfoFailed,
                        elapsedMs,
                        perSec,
                    });
                }

                // Periodically persist the growing cache so an interrupted/killed scan
                // resumes from here (cache is keyed by id + modificationTime) instead
                // of re-hashing the whole library. Coarse interval — each save
                // re-serializes the entire cache.
                if (hashedSinceFlush >= CACHE_FLUSH_EVERY) {
                    await saveHashCache(cache);
                    hashedSinceFlush = 0;
                }

                // Yield so the UI thread can breathe between batches.
                await new Promise<void>((resolve) => setTimeout(resolve, 0));
            }
        }
    };

    // --- Tier 1: collect metadata, interleaved with Tier 2 hashing ---------------
    const assets = await collectAssets(
        (collected, total) => {
            knownTotal = total || collected;
            onProgress?.({ phase: 'collecting', processed: collected, total: knownTotal });
        },
        cancel,
        hashPage,
    );
    console.log('[duplicates] collected', assets.length, 'assets');
    onProgress?.({ phase: 'hashing', processed, total: knownTotal || processed });
    console.log('[duplicates] hashing done', { hashed: diag.hashed, cacheHits: diag.cacheHits });

    await saveHashCache(cache);
    if (cancel?.cancelled) {
        diag.durationMs = Date.now() - startedAt;
        return { groups: [], metaById: meta, scanned: meta.size, diagnostics: diag };
    }
    emit(true); // flush a snapshot now that hashing has genuinely finished

    // --- Tier 3: semantic (iOS only, opt-in) -------------------------------------
    if (options.enableSemantic) {
        const sessions = buildSessions(assets);
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
        dirty = true; // semantic edges can merge components even without a new hash edge
        emit(true);
    }
    if (cancel?.cancelled) {
        diag.durationMs = Date.now() - startedAt;
        return { groups: [], metaById: meta, scanned: meta.size, diagnostics: diag };
    }

    // --- Assemble groups ---------------------------------------------------------
    onProgress?.({ phase: 'grouping', processed: meta.size, total: meta.size });
    const groups = assembleGroups(uf, meta, hashes, hashLinked);
    diag.durationMs = Date.now() - startedAt;
    console.log('[duplicates] scan summary', diag);
    onGroups?.({ groups, metaById: meta, diagnostics: { ...diag } });

    return { groups, metaById: meta, scanned: meta.size, diagnostics: diag };
}
