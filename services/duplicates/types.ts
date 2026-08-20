/**
 * Shared types for the local duplicate / near-duplicate detection pipeline.
 * Everything here is plain data — no React Native imports — so the grouping and
 * hashing logic that consumes these types stays unit-testable in isolation.
 */

/** A 64-bit perceptual hash stored as two unsigned 32-bit halves: [high, low]. */
export type Hash = [number, number];

/** Lightweight metadata collected for every asset during a scan. */
export interface AssetMeta {
    id: string;
    /** `ph://` on iOS, `file://` on Android — good for display, not for pixel access on iOS. */
    uri: string;
    creationTime: number;
    modificationTime: number;
    width: number;
    height: number;
    filename: string;
    /** iOS-only; contains `'screenshot'` for screenshots. Empty on Android. */
    mediaSubtypes: string[];
}

/** Cached perceptual-hash result, keyed by `id` and invalidated by `modificationTime`. */
export interface AssetHash {
    id: string;
    modificationTime: number;
    dhash: Hash;
    /** Rough sharpness proxy (gradient energy); higher = sharper. Tie-breaker for the keeper. */
    sharpness: number;
}

/** A time-bounded burst/session of candidate assets (always length >= 2). */
export interface Session {
    assetIds: string[];
}

export type GroupReason = 'near-dup' | 'similar';

/**
 * A detected group of duplicate / similar assets. `keeperId` is only an
 * algorithmic suggestion (best resolution/sharpness/non-screenshot) surfaced
 * as a hint in the UI — it is never automatically applied to the user's
 * keep/delete decisions.
 */
export interface DuplicateGroup {
    id: string;
    assetIds: string[];
    reason: GroupReason;
    keeperId: string;
}

/** A user's explicit choice for one photo in a group. Absent = undecided. */
export type PhotoDecision = 'keep' | 'delete';

export type ScanPhase = 'collecting' | 'hashing' | 'semantic' | 'grouping';

export interface ScanProgress {
    phase: ScanPhase;
    processed: number;
    total: number;
}

/** Minimal cooperative-cancellation token (avoids depending on a global AbortController). */
export interface CancelToken {
    cancelled: boolean;
}

/**
 * Counters describing what happened to every collected asset during a scan.
 * Surfaced in logs and the empty-state UI so a failed scan (e.g. iCloud-only
 * originals, a decode error) is never indistinguishable from a clean library.
 */
export interface ScanDiagnostics {
    collected: number;
    cacheHits: number;
    hashed: number;
    /** iOS: `getAssetInfoAsync` returned no `localUri` (iCloud-only original). */
    skippedNoLocalUri: number;
    /** iOS: `getAssetInfoAsync` itself threw. */
    getInfoFailed: number;
    /** `computePerceptualHash` threw for a resolved uri. */
    decodeFailed: number;
    /** Recovered a hash via the `ph://` fallback after `localUri` was missing. */
    phFallbackRecovered: number;
    durationMs: number;
}
