/**
 * Scan + persist orchestration shared between the interactive `DuplicatesScreen`
 * and the headless `backgroundScan` task (see `backgroundScan.ts`). Runs
 * `scanForDuplicates`, throttled-persists partial results as `complete: false`
 * while it streams, and persists `complete: true` on natural completion. A
 * cancelled run is *not* persisted here — cancellation has more than one
 * meaning (user "accept what's here" vs. a background-task checkpoint that
 * must resume), so the canceller is responsible for its own final persist.
 */
import { scanForDuplicates } from './pipeline';
import type { ScanGroupsSnapshot, ScanResult } from './pipeline';
import { saveScanResults } from './resultsCache';
import { isSemanticAvailable } from './semantic';
import type { CancelToken, PhotoDecision, ScanProgress } from './types';

/** Min gap between partial-results flushes while a scan streams, so an interrupted
 *  scan can resume without re-serializing the results file on every emit. */
const PARTIAL_PERSIST_INTERVAL_MS = 1500;

export interface RunScanOptions {
    cancel: CancelToken;
    /** Defaults to `isSemanticAvailable()` — callers rarely need to override this. */
    enableSemantic?: boolean;
    onProgress?: (progress: ScanProgress) => void;
    /** Called on every streamed snapshot, in addition to (and before) the internal
     *  throttled persistence below — e.g. so a UI caller can update its own state. */
    onGroups?: (snapshot: ScanGroupsSnapshot) => void;
    /** Decisions to persist alongside each checkpoint. Defaults to none: a headless
     *  run makes no new decisions, so it only needs to preserve whatever was already
     *  on disk (the caller should seed this from `loadScanResults()` if resuming). */
    getDecisions?: () => Map<string, Map<string, PhotoDecision>>;
}

export async function runScanWithPersistence(options: RunScanOptions): Promise<ScanResult> {
    const { cancel, onProgress, onGroups, getDecisions } = options;
    let lastPartialPersistAt = 0;

    const result = await scanForDuplicates({
        cancel,
        enableSemantic: options.enableSemantic ?? isSemanticAvailable(),
        onProgress,
        onGroups: (snapshot) => {
            onGroups?.(snapshot);
            if (cancel.cancelled) return;
            const now = Date.now();
            if (now - lastPartialPersistAt < PARTIAL_PERSIST_INTERVAL_MS) return;
            lastPartialPersistAt = now;
            void saveScanResults({
                groups: snapshot.groups,
                metaById: snapshot.metaById,
                diagnostics: snapshot.diagnostics,
                scanned: snapshot.diagnostics.collected,
                complete: false,
                decisions: getDecisions?.() ?? new Map(),
            });
        },
    });

    if (!cancel.cancelled) {
        await saveScanResults({ ...result, complete: true, decisions: getDecisions?.() ?? new Map() });
    }
    return result;
}
