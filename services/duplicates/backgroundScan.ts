/**
 * Headless continuation of an interrupted duplicate scan, run opportunistically
 * by iOS via `expo-background-task` (BGProcessingTask under the hood). iOS
 * decides *when* this runs — commonly overnight while charging — never on
 * demand, and can kill it at any point, so it must checkpoint cleanly like the
 * foreground `beginBackgroundTask` path in `platform/backgroundExecution.ts`.
 *
 * `TaskManager.defineTask` below MUST run unconditionally at module load (not
 * inside a component), because iOS can launch the app *specifically* to run
 * this task — the JS bundle needs the task defined before that launch reaches
 * here. This module is imported for its side effect from `index.ts`, the true
 * app entry point, so that's guaranteed regardless of how the app was booted.
 * `registerBackgroundScan()` (called once from `App.tsx` on interactive
 * startup) is the separate step that tells iOS "please schedule this."
 *
 * NOTE — the `renderAsync`-in-a-headless-context spike: `runScanWithPersistence`
 * hashes any newly-collected asset via `computePerceptualHash`
 * (`perceptualHash.ts`), which calls `expo-image-manipulator`'s `renderAsync`.
 * Whether that works with no UI/GL context attached (as a headless
 * BGProcessingTask has) is unverified — the `[duplicates][background]`
 * summary log below is the on-device signal to watch: if `hashed` stays 0 and
 * `decodeFailed` climbs for genuinely new (non-cached) assets, `renderAsync`
 * is failing headless, and background runs should fall back to only
 * re-clustering already-cached hashes (skip hashing new assets here, defer
 * them to the next foreground session) instead of the full pipeline below.
 * That fallback is intentionally not implemented yet — see the plan.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loadScanResults } from './resultsCache';
import { runScanWithPersistence } from './runScan';
import type { CancelToken, PhotoDecision } from './types';

export const BACKGROUND_SCAN_TASK = 'duplicates-background-scan';

/** How often to *ask* iOS to run the task, in minutes. The OS treats this as a
 *  minimum, not a schedule — actual runs are opportunistic and often nightly. */
const MINIMUM_INTERVAL_MINUTES = 60;

TaskManager.defineTask(BACKGROUND_SCAN_TASK, async ({ error }) => {
    if (error) {
        console.warn('[duplicates][background] task error', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
    }

    const persisted = await loadScanResults();
    if (!persisted || persisted.complete) {
        console.log('[duplicates][background] nothing to resume, skipping');
        return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Static for the duration of this headless run — there's no UI to make new
    // decisions with, so we only need to preserve whatever was already on disk.
    const decisions: Map<string, Map<string, PhotoDecision>> = persisted.decisions;

    const cancel: CancelToken = { cancelled: false };
    // iOS can interrupt a BGProcessingTask at any time; this is the global
    // (not per-task) signal that our window is closing. The library
    // auto-reschedules the task runner after this fires, so we only need to
    // checkpoint — not re-register.
    const removeExpirationListener = BackgroundTask.addExpirationListener(() => {
        console.log('[duplicates][background] expiring, checkpointing');
        cancel.cancelled = true;
    });

    try {
        const result = await runScanWithPersistence({
            cancel,
            getDecisions: () => decisions,
        });
        console.log('[duplicates][background] run summary', {
            cancelled: cancel.cancelled,
            scanned: result.scanned,
            groups: result.groups.length,
            ...result.diagnostics,
        });
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch (e) {
        console.warn('[duplicates][background] run failed', e);
        return BackgroundTask.BackgroundTaskResult.Failed;
    } finally {
        removeExpirationListener.remove();
    }
});

/** Registers the task with iOS. Safe to call every app launch — a no-op if already registered. */
export async function registerBackgroundScan(): Promise<void> {
    try {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SCAN_TASK, { minimumInterval: MINIMUM_INTERVAL_MINUTES });
    } catch (e) {
        // Best-effort: unsupported environments (simulator, Expo Go, Android
        // without the module) should never block app startup.
        console.warn('[duplicates][background] failed to register task', e);
    }
}

export async function unregisterBackgroundScan(): Promise<void> {
    try {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_SCAN_TASK);
    } catch (e) {
        console.warn('[duplicates][background] failed to unregister task', e);
    }
}
