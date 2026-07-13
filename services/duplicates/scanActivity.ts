/**
 * Throttled bridge from a running scan's progress stream to the Live Activity
 * (Lock Screen / Dynamic Island). ActivityKit rate-limits how often an activity
 * can be updated, so this coalesces to roughly 1 update/sec — the same idea as
 * pipeline.ts's own EMIT_INTERVAL_MS throttle for streamed UI snapshots.
 *
 * `start()` is idempotent while an activity is already running (id !== null) —
 * this matters because the same controller instance is reused across a
 * same-session background-interrupt-then-resume (see the AppState effect in
 * DuplicatesScreen), so resuming must keep updating the *same* Live Activity
 * rather than spawning a duplicate.
 *
 * Known limitation: a cold app relaunch loses the previous activity's id (it's
 * only held in memory), so resuming an interrupted scan after the app was
 * fully terminated starts a fresh activity rather than reclaiming the old one.
 * The orphaned one simply goes stale and is eventually removed by the system —
 * cosmetic, not a functional bug.
 */
import * as liveActivity from '../../platform/liveActivity';
import type { ScanProgress } from './types';

const UPDATE_INTERVAL_MS = 1000;

export interface ScanActivityController {
    start(initial: ScanProgress): Promise<void>;
    /** Throttled — safe to call on every onProgress tick. */
    reportProgress(progress: ScanProgress, groupsFound: number): void;
    /** Ends the activity with a final snapshot. Safe to call even if nothing is running. */
    end(final: ScanProgress, groupsFound: number): Promise<void>;
}

export function createScanActivityController(): ScanActivityController {
    let activityId: string | null = null;
    let lastUpdateAt = 0;

    return {
        async start(initial) {
            if (activityId !== null) return; // already running — e.g. a same-session resume
            if (!liveActivity.isAvailable()) return;
            activityId = await liveActivity.start(initial.phase, initial.processed, initial.total, 0);
        },
        reportProgress(progress, groupsFound) {
            if (activityId === null) return;
            const now = Date.now();
            if (now - lastUpdateAt < UPDATE_INTERVAL_MS) return;
            lastUpdateAt = now;
            void liveActivity.update(activityId, progress.phase, progress.processed, progress.total, groupsFound);
        },
        async end(final, groupsFound) {
            if (activityId === null) return;
            const id = activityId;
            activityId = null;
            await liveActivity.end(id, final.phase, final.processed, final.total, groupsFound);
        },
    };
}
