/**
 * Tier 1 session bucketing — pure logic (RN-free, unit-testable). Groups
 * time-sorted assets into bursts used to scope the semantic tier. Time proximity
 * alone is NOT a duplicate signal.
 */
import type { AssetMeta, Session } from './types';

/** Default max gap (ms) between consecutive shots to stay in the same session. */
export const SESSION_GAP_MS = 10_000;

/**
 * Buckets time-sorted assets into sessions, starting a new session whenever the
 * gap to the previous asset exceeds `gapMs`. Singleton sessions are dropped —
 * they have nothing to compare against.
 */
export function buildSessions(assets: AssetMeta[], gapMs = SESSION_GAP_MS): Session[] {
    const sorted = [...assets].sort((a, b) => a.creationTime - b.creationTime);
    const sessions: Session[] = [];
    let current: string[] = [];
    let prevTime = Number.NEGATIVE_INFINITY;

    for (const asset of sorted) {
        if (asset.creationTime - prevTime > gapMs && current.length > 0) {
            if (current.length > 1) sessions.push({ assetIds: current });
            current = [];
        }
        current.push(asset.id);
        prevTime = asset.creationTime;
    }
    if (current.length > 1) sessions.push({ assetIds: current });

    return sessions;
}
