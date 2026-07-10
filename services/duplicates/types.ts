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

/** A detected group of duplicate / similar assets, with a pre-selected keeper. */
export interface DuplicateGroup {
    id: string;
    assetIds: string[];
    reason: GroupReason;
    keeperId: string;
}

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
