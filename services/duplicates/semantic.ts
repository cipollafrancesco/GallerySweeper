/**
 * Tier 3 — semantic similarity ("same subject, different angle"), iOS only.
 *
 * Backed by a local Expo native module that wraps Apple Vision's
 * `VNGenerateImageFeaturePrintRequest`. The module is absent in Expo Go and on
 * Android, in which case every function here degrades gracefully to a no-op so
 * Tiers 1+2 keep working. The comparison (cosine) is done in JS so we never have
 * to serialise Vision objects — the native side only returns a float vector.
 *
 * `scoreSemantic` is the single swap point: a future cross-platform embedding
 * model can implement the same signature without touching grouping or UI.
 */
import { Platform } from 'react-native';
import * as MediaAccess from '../../platform/mediaAccess';
import { UnionFind } from './grouping';
import { cosineSimilarity } from './hashCore';
import type { AssetMeta, CancelToken, Session } from './types';

export { cosineSimilarity } from './hashCore';

interface AppleVisionModule {
    featurePrint(uri: string): Promise<number[]>;
}

let cachedModule: AppleVisionModule | null | undefined;

function getNativeModule(): AppleVisionModule | null {
    if (cachedModule !== undefined) return cachedModule;
    try {
        // Lazy require so the missing native module (Expo Go / Android) is caught here.
        const mod = require('../../modules/apple-vision-similarity').default as AppleVisionModule | null;
        cachedModule = mod ?? null;
    } catch {
        cachedModule = null;
    }
    return cachedModule;
}

/** Whether real semantic scoring is available on this device/build. */
export function isSemanticAvailable(): boolean {
    return Platform.OS === 'ios' && getNativeModule() !== null;
}

/** Returns the Vision feature-print vector for a file URI, or null if unavailable. */
export async function getFeaturePrint(fileUri: string): Promise<Float32Array | null> {
    const mod = getNativeModule();
    if (!mod) return null;
    try {
        const vec = await mod.featurePrint(fileUri);
        return Float32Array.from(vec);
    } catch {
        return null;
    }
}

/** Default cosine threshold above which two shots are considered the same subject. */
export const SEMANTIC_SIMILARITY_THRESHOLD = 0.9;

/**
 * Within each Tier-1 session, computes feature prints and unions assets whose
 * cosine similarity exceeds the threshold. Bounded O(n^2) per session (sessions
 * are small). No-op when the native module is unavailable.
 *
 * `resolveFileUri` turns an asset into a pixel-readable file URI (iOS `localUri`).
 */
export async function addSemanticEdges(
    sessions: Session[],
    meta: Map<string, AssetMeta>,
    uf: UnionFind,
    resolveFileUri: (id: string) => Promise<string | null>,
    options?: {
        threshold?: number;
        onProgress?: (processed: number, total: number) => void;
        cancel?: CancelToken;
    },
): Promise<void> {
    if (!isSemanticAvailable()) return;

    const threshold = options?.threshold ?? SEMANTIC_SIMILARITY_THRESHOLD;
    const total = sessions.reduce((n, s) => n + s.assetIds.length, 0);
    let processed = 0;

    for (const session of sessions) {
        if (options?.cancel?.cancelled) return;

        const prints: { id: string; vec: Float32Array }[] = [];
        for (const id of session.assetIds) {
            if (options?.cancel?.cancelled) return;
            if (meta.has(id)) {
                const fileUri = await resolveFileUri(id);
                if (fileUri) {
                    const vec = await getFeaturePrint(fileUri);
                    if (vec) prints.push({ id, vec });
                }
            }
            processed++;
            options?.onProgress?.(processed, total);
        }

        for (let i = 0; i < prints.length; i++) {
            for (let j = i + 1; j < prints.length; j++) {
                if (cosineSimilarity(prints[i].vec, prints[j].vec) >= threshold) {
                    uf.union(prints[i].id, prints[j].id);
                }
            }
        }
    }
}

/** Convenience re-export so callers can resolve a pixel-readable URI consistently. */
export async function resolveLocalUri(id: string, uri: string): Promise<string | null> {
    if (Platform.OS !== 'ios') return uri; // Android `file://` uris are directly readable
    try {
        const info = await MediaAccess.getInfo(id);
        return info.localUri ?? null;
    } catch {
        return null;
    }
}
