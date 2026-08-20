import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueue } from '../../domain/queueManager';
import { addExpirationListener, beginTask, endTask } from '../../platform/backgroundExecution';
import * as haptics from '../../platform/haptics';
import * as MediaAccess from '../../platform/mediaAccess';
import { useModal } from '../../providers/ModalProvider';
import { useRestore } from '../../providers/RestoreProvider';
import { clearHashCache } from '../../services/duplicates/hashCache';
import { clearScanResults, loadScanResults, saveScanResults } from '../../services/duplicates/resultsCache';
import { runScanWithPersistence } from '../../services/duplicates/runScan';
import { createScanActivityController } from '../../services/duplicates/scanActivity';
import { storage } from '../../services/storage';
import type {
    AssetMeta,
    CancelToken,
    DuplicateGroup,
    PhotoDecision,
    ScanDiagnostics,
    ScanProgress,
} from '../../services/duplicates/types';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { SettingsModal } from '../settings/SettingsModal';
import { GroupDetailViewer } from './GroupDetailViewer';
import { GroupsReviewScreen } from './GroupsReviewScreen';
import { ResetDiscoveryConfirmationModal } from './ResetDiscoveryConfirmationModal';

type Stage = 'loading' | 'idle' | 'scanning' | 'reviewing' | 'error';

/** Stable empty-decisions reference for groups with no entries yet. */
const EMPTY_DECISIONS = new Map<string, PhotoDecision>();

/** Which photo, in which group, the detail viewer is currently open on. */
interface DetailTarget {
    groupId: string;
    index: number;
}

/**
 * The "Duplicates" tab: on first mount, shows the last persisted scan instantly
 * if one exists (no auto-rescan); otherwise scans the library, streaming
 * duplicate groups in as they're found so the user isn't staring at a blank
 * spinner for minutes on a large library. Rescan re-runs (and re-streams) on
 * demand. Mounted (not modal), so it keeps its results when switching tabs.
 */
export const DuplicatesScreen: React.FC = () => {
    const { showToast, showModal, hideModal } = useModal();
    const { restoreNonce } = useRestore();
    // Only needed for the Settings-access gate below, matching SweepHeader's
    // onOpenSettings exactly — Duplicates doesn't otherwise touch the queue.
    const { access, loading } = useQueue();
    const insets = useSafeAreaInsets();

    const [stage, setStage] = useState<Stage>('loading');
    const [scanRun, setScanRun] = useState(0);
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [metaById, setMetaById] = useState<Map<string, AssetMeta>>(new Map());
    const [decisions, setDecisions] = useState<Map<string, Map<string, PhotoDecision>>>(new Map());
    const [diagnostics, setDiagnostics] = useState<ScanDiagnostics | null>(null);
    const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

    const cancelRef = useRef<CancelToken>({ cancelled: false });
    // Mirrors `groups` so the cancel handler (a stable useCallback) can read the
    // latest streamed count without depending on — and re-creating on — it.
    const groupsRef = useRef<DuplicateGroup[]>([]);
    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);
    // Mirrors `decisions` so the scan effect can persist the latest decisions
    // (which the user may keep making while a scan is still streaming) without
    // reading a stale closure value captured when the effect started.
    const decisionsRef = useRef<Map<string, Map<string, PhotoDecision>>>(new Map());
    useEffect(() => {
        decisionsRef.current = decisions;
    }, [decisions]);
    // Mirror metaById/diagnostics too, so the cancel path can persist the accepted
    // partial from refs (the pipeline's cancel path returns empty groups, so its
    // resolved value can't be used).
    const metaByIdRef = useRef<Map<string, AssetMeta>>(new Map());
    useEffect(() => {
        metaByIdRef.current = metaById;
    }, [metaById]);
    const diagnosticsRef = useRef<ScanDiagnostics | null>(null);
    useEffect(() => {
        diagnosticsRef.current = diagnostics;
    }, [diagnostics]);
    // Mirrors `progress` so the cancel/error paths (stable callbacks, outside the
    // scan effect) can hand the Live Activity a final snapshot instead of nothing.
    const progressRef = useRef<ScanProgress | null>(null);
    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);
    // One controller per mount (not per scanRun) — a same-session background
    // interrupt-then-resume must keep updating the *same* Live Activity rather
    // than starting a duplicate. See scanActivity.ts for the idempotency details.
    const activityControllerRef = useRef(createScanActivityController());
    // Whether the groups currently on screen came from a *finished* scan. Written as
    // `complete` on every persist so an interrupted scan auto-resumes on reopen while
    // a finished one stays put.
    const completeRef = useRef(true);
    // Set when a background-task checkpoint cancels a scan mid-flight (as opposed to
    // the app being terminated outright). Consumed by the AppState 'active' handler
    // below to auto-resume without waiting for the user to notice and tap "Rescan".
    const backgroundInterruptedRef = useRef(false);
    // Set just before bumping `scanRun` to signal "this run continues the current
    // in-memory review, don't wipe decisions or reload from disk" — the resume
    // equivalent of `isResume` for the scanRun===0 (relaunch) path below.
    const forceResumeRef = useRef(false);

    useEffect(() => {
        // Fresh token per run so StrictMode's double-invoke (which cancels the
        // first run on cleanup) doesn't permanently cancel the scan.
        const cancel: CancelToken = { cancelled: false };
        cancelRef.current = cancel;
        let live = true;

        (async () => {
            // A background-task checkpoint (see the AppState effect below) bumps
            // scanRun to resume a scan it just had to cancel — consume that intent
            // here before it can affect anything else this run does.
            let isResume = forceResumeRef.current;
            forceResumeRef.current = false;
            // On the very first run (not an explicit rescan), try the persisted
            // scan first so reopening the app shows results instantly.
            if (scanRun === 0 && !isResume) {
                setStage('loading');
                const cached = await loadScanResults();
                if (!live || cancel.cancelled) return;
                if (cached) {
                    setGroups(cached.groups);
                    setMetaById(cached.metaById);
                    setDecisions(cached.decisions);
                    setDiagnostics(cached.diagnostics);
                    if (cached.complete) {
                        completeRef.current = true;
                        setStage('reviewing');
                        return;
                    }
                    // An interrupted scan: keep its partial groups + decisions on
                    // screen and fall through to resume. The warm hash cache makes
                    // the re-page fast and streams the remaining groups in.
                    isResume = true;
                }
            }

            setStage('scanning');
            setProgress(null);
            completeRef.current = false;
            // Reset decisions only for a genuinely fresh scan — NOT on a resume
            // (that would wipe the tags the user made before the interruption) and
            // NOT on every streamed emit (tagging isn't gated on completion, so
            // decisions must survive each progressive update within a run).
            if (!isResume) setDecisions(new Map());
            // No-op if a Live Activity from before a background interrupt is still
            // running (same controller instance across scanRun — see its useRef above).
            void activityControllerRef.current.start({ phase: 'collecting', processed: 0, total: 0 });

            try {
                // Streaming + persistence (throttled partial saves, final complete:true
                // save) live in `runScanWithPersistence` so the headless background
                // task (`backgroundScan.ts`) can reuse the exact same logic — this
                // callback only needs to mirror the streamed snapshot into UI state.
                const result = await runScanWithPersistence({
                    cancel,
                    getDecisions: () => decisionsRef.current,
                    onProgress: (p) => {
                        if (live && !cancel.cancelled) setProgress(p);
                        activityControllerRef.current.reportProgress(p, groupsRef.current.length);
                    },
                    onGroups: ({ groups: streamedGroups, metaById: streamedMeta, diagnostics: streamedDiag }) => {
                        if (!live || cancel.cancelled) return;
                        setGroups(streamedGroups);
                        setMetaById(streamedMeta);
                        setDiagnostics(streamedDiag);
                    },
                });
                if (!live || cancel.cancelled) return;
                setGroups(result.groups);
                setMetaById(result.metaById);
                setDiagnostics(result.diagnostics);
                setStage('reviewing');
                completeRef.current = true;
                void activityControllerRef.current.end(
                    { phase: 'grouping', processed: result.scanned, total: result.scanned },
                    result.groups.length,
                );
            } catch (e) {
                console.error('[duplicates] scan failed', e);
                if (!live || cancel.cancelled) return;
                setStage('error');
                void activityControllerRef.current.end(
                    progressRef.current ?? { phase: 'grouping', processed: 0, total: 0 },
                    groupsRef.current.length,
                );
            }
        })();

        return () => {
            live = false;
            cancel.cancelled = true;
        };
    }, [scanRun]);

    const deleteCount = useMemo(() => {
        let count = 0;
        for (const group of decisions.values()) {
            for (const decision of group.values()) {
                if (decision === 'delete') count++;
            }
        }
        return count;
    }, [decisions]);

    const startScan = useCallback(() => setScanRun((n) => n + 1), []);

    const handleCancelScan = useCallback(() => {
        cancelRef.current.cancelled = true;
        void activityControllerRef.current.end(
            progressRef.current ?? { phase: 'grouping', processed: 0, total: 0 },
            groupsRef.current.length,
        );
        // Keep whatever's already streamed in on-screen and interactive; only
        // fall back to the manual "scan" prompt if nothing was found yet.
        if (groupsRef.current.length > 0 && diagnosticsRef.current) {
            // An explicit cancel means "accept what's here" — persist it as a
            // completed scan so it stays reviewable and doesn't auto-resume on
            // every future launch. (Persist from refs; the pipeline's cancel path
            // returns empty groups, so its resolved value can't be used.)
            completeRef.current = true;
            void saveScanResults({
                groups: groupsRef.current,
                metaById: metaByIdRef.current,
                diagnostics: diagnosticsRef.current,
                scanned: diagnosticsRef.current.collected,
                complete: true,
                decisions: decisionsRef.current,
            });
        }
        setStage(groupsRef.current.length > 0 ? 'reviewing' : 'idle');
    }, []);

    // After a backup restore rewrites the results file, refresh from disk WITHOUT
    // starting a scan (going to 'idle' on a miss rather than auto-scanning). Cancel
    // any in-flight scan first so its streaming writes can't clobber the imported file.
    useEffect(() => {
        if (restoreNonce === 0) return;
        let live = true;
        cancelRef.current.cancelled = true;
        (async () => {
            const cached = await loadScanResults();
            if (!live) return;
            if (cached) {
                setGroups(cached.groups);
                setMetaById(cached.metaById);
                setDecisions(cached.decisions);
                setDiagnostics(cached.diagnostics);
                completeRef.current = cached.complete;
                setStage('reviewing');
            } else {
                setGroups([]);
                setMetaById(new Map());
                setDecisions(new Map());
                setDiagnostics(null);
                completeRef.current = true;
                setStage('idle');
            }
        })();
        return () => {
            live = false;
        };
    }, [restoreNonce]);

    // A rescan invalidates whatever the detail viewer was showing.
    useEffect(() => {
        if (stage === 'scanning') setDetailTarget(null);
    }, [stage]);

    // Keep the screen awake only while a scan runs, so iOS auto-lock / backgrounding
    // doesn't suspend the JS loop and freeze the scan partway. Scoped to 'scanning',
    // so the screen sleeps normally the rest of the time.
    useEffect(() => {
        if (stage !== 'scanning') return;
        void activateKeepAwakeAsync('duplicates-scan');
        return () => {
            deactivateKeepAwake('duplicates-scan');
        };
    }, [stage]);

    // iOS only: request a finite-length background task when the app is
    // backgrounded mid-scan, so the hashing loop's per-batch `setTimeout(0)` yields
    // keep firing for the brief window iOS grants instead of the JS runtime being
    // suspended outright. If that window is about to close (or no window was
    // granted at all — e.g. the native module isn't linked), checkpoint
    // immediately: cancel the in-flight scan and persist its partial progress with
    // `complete: false` so it resumes rather than silently stalling. Foregrounding
    // again within the same session auto-resumes via `forceResumeRef` rather than
    // leaving the UI stuck showing "scanning" with nothing actually running.
    useEffect(() => {
        if (stage !== 'scanning' || Platform.OS !== 'ios') return;

        let backgroundTaskId: number | null = null;

        const checkpoint = () => {
            cancelRef.current.cancelled = true;
            backgroundInterruptedRef.current = true;
            if (diagnosticsRef.current) {
                void saveScanResults({
                    groups: groupsRef.current,
                    metaById: metaByIdRef.current,
                    diagnostics: diagnosticsRef.current,
                    scanned: diagnosticsRef.current.collected,
                    complete: false,
                    decisions: decisionsRef.current,
                });
            }
        };

        const removeExpirationListener = addExpirationListener((id) => {
            if (id !== backgroundTaskId) return;
            backgroundTaskId = null;
            checkpoint();
        });

        const appStateSubscription = AppState.addEventListener('change', (next) => {
            if (next === 'background') {
                if (backgroundTaskId !== null) return; // already have a window open this session
                const id = beginTask();
                if (id === null) {
                    // No background window granted — there may be no further signal
                    // before the app is suspended, so checkpoint right away.
                    checkpoint();
                    return;
                }
                backgroundTaskId = id;
            } else if (next === 'active') {
                endTask(backgroundTaskId);
                backgroundTaskId = null;
                if (backgroundInterruptedRef.current) {
                    backgroundInterruptedRef.current = false;
                    forceResumeRef.current = true;
                    setScanRun((n) => n + 1);
                }
            }
        });

        return () => {
            appStateSubscription.remove();
            removeExpirationListener();
            endTask(backgroundTaskId);
        };
    }, [stage]);

    const handleDecide = useCallback((groupId: string, assetId: string, decision: PhotoDecision) => {
        setDecisions((prev) => {
            const next = new Map(prev);
            const group = new Map(next.get(groupId) ?? []);
            if (group.get(assetId) === decision) {
                group.delete(assetId); // tapping the same decision again clears it back to undecided
            } else {
                group.set(assetId, decision);
            }
            next.set(groupId, group);
            return next;
        });
    }, []);

    const handleOpenGroup = useCallback((groupId: string, index: number) => {
        setDetailTarget({ groupId, index });
    }, []);

    const handleCloseDetail = useCallback(() => {
        setDetailTarget(null);
        // Persist review progress now — the natural checkpoint after a batch of
        // per-photo decisions on one group — so it survives a restart even if
        // the user never taps "Delete selected." Best-effort/fire-and-forget:
        // saveScanResults never throws.
        if (diagnostics) {
            void saveScanResults({ groups, metaById, diagnostics, scanned: diagnostics.collected, complete: completeRef.current, decisions });
        }
    }, [groups, metaById, diagnostics, decisions]);

    // "Undo All" equivalent (SweepHeader.tsx's onClearDeletions) — clears every
    // keep/delete tag across all groups. Unlike Sweep there's no action history
    // to unwind here; the tags themselves are the state being cleared.
    const handleClearAll = useCallback(() => {
        haptics.selection();
        setDecisions(new Map());
    }, []);

    // No custom confirmation dialog — same logic as Sweep's onCommitDeletions
    // (SweepHeader.tsx): fire immediate tap feedback, then delete directly and
    // rely on iOS's own native "Delete N Photos?" confirmation sheet
    // (MediaAccess.deleteMany -> deleteAssetsAsync). A prior in-app dialog here
    // was a redundant second confirmation on top of that OS sheet.
    const handleConfirmDelete = useCallback(async () => {
        haptics.warning();
        const ids = new Set<string>();
        for (const group of decisions.values()) {
            for (const [assetId, decision] of group) {
                if (decision === 'delete') ids.add(assetId);
            }
        }
        if (ids.size === 0) return;

        try {
            const idArr = [...ids];
            const bytes = await MediaAccess.measureAssetsSize(idArr);
            const success = await MediaAccess.deleteMany(idArr);
            if (success) {
                // Keep deleted assets out of the main swipe deck.
                await Promise.all(idArr.map((id) => storage.addReviewedId(id)));
                await storage.addDeletions(idArr.length, bytes);

                const remainingGroups: DuplicateGroup[] = [];
                for (const group of groups) {
                    const keptAssets = group.assetIds.filter((id) => !ids.has(id));
                    // A group with fewer than two survivors has nothing left to compare.
                    if (keptAssets.length >= 2) remainingGroups.push({ ...group, assetIds: keptAssets });
                }
                const nextDecisions = new Map<string, Map<string, PhotoDecision>>();
                for (const [groupId, group] of decisions) {
                    const nextGroup = new Map<string, PhotoDecision>();
                    for (const [assetId, decision] of group) {
                        if (!ids.has(assetId)) nextGroup.set(assetId, decision);
                    }
                    nextDecisions.set(groupId, nextGroup);
                }
                setGroups(remainingGroups);
                setDecisions(nextDecisions);

                // Re-persist so a reopen doesn't show photos that were just deleted.
                if (diagnostics) {
                    await saveScanResults({
                        groups: remainingGroups,
                        metaById,
                        diagnostics,
                        scanned: diagnostics.collected,
                        complete: completeRef.current,
                        decisions: nextDecisions,
                    });
                }

                haptics.success();
                showToast(`Deleted ${ids.size} ${ids.size === 1 ? 'photo' : 'photos'}`);
            } else {
                haptics.warning();
                showToast('Deletion was cancelled', 'error');
            }
        } catch {
            haptics.error();
            showToast('Could not delete photos', 'error');
        }
    }, [decisions, groups, metaById, diagnostics, showToast]);

    const handleConfirmResetDiscovery = useCallback(async () => {
        hideModal();
        // Stop any in-flight scan first so its throttled saves can't recreate the
        // files we're about to delete (same idiom as the restore effect above).
        cancelRef.current.cancelled = true;
        void activityControllerRef.current.end(
            progressRef.current ?? { phase: 'grouping', processed: 0, total: 0 },
            groupsRef.current.length,
        );
        setGroups([]);
        setMetaById(new Map());
        setDecisions(new Map());
        setDiagnostics(null);
        setProgress(null);
        await Promise.all([clearScanResults(), clearHashCache()]);
        // scanRun becomes nonzero, so the effect skips the scanRun===0 disk-load
        // branch entirely; forceResumeRef/backgroundInterruptedRef are both still
        // false, so this lands on a genuinely fresh scan (decisions wiped, no resume).
        setScanRun((n) => n + 1);
    }, [hideModal]);

    const handleRequestResetDiscovery = useCallback(() => {
        showModal(<ResetDiscoveryConfirmationModal onConfirm={handleConfirmResetDiscovery} />, { type: 'dialog' });
    }, [showModal, handleConfirmResetDiscovery]);

    // Same gate as SweepHeader's onOpenSettings — only open once permissions are
    // resolved and the queue isn't mid-load.
    const handleOpenSettings = useCallback(() => {
        if (access === 'all' && !loading) {
            showModal(<SettingsModal />, { type: 'dialog' });
        }
    }, [access, loading, showModal]);

    const isScanning = stage === 'scanning';

    const detailGroup = detailTarget ? groups.find((g) => g.id === detailTarget.groupId) : undefined;

    return (
        <View style={styles.root}>
            {stage === 'loading' && (
                <View style={styles.loading}>
                    <ActivityIndicator color={theme.colors.systemBlue} size="large" />
                </View>
            )}

            {stage === 'idle' && (
                <View style={[styles.idle, { paddingTop: insets.top }]}>
                    <GlassCard style={styles.idleCard}>
                        <Title style={styles.idleTitle}>Find duplicates</Title>
                        <Spacer size={theme.spacing.s} />
                        <Body style={styles.idleBody}>
                            Scan your library on-device for duplicate and similar photos. Nothing leaves your phone.
                        </Body>
                        <Spacer size={theme.spacing.xl} />
                        <GlassButton title="Scan library" variant="primary" size="large" onPress={startScan}>
                            <Search color={theme.colors.white} size={20} />
                        </GlassButton>
                    </GlassCard>
                </View>
            )}

            {(stage === 'scanning' || stage === 'reviewing') && (
                <GroupsReviewScreen
                    groups={groups}
                    metaById={metaById}
                    decisions={decisions}
                    deleteCount={deleteCount}
                    diagnostics={diagnostics}
                    isScanning={isScanning}
                    progress={progress}
                    onOpenGroup={handleOpenGroup}
                    onDelete={handleConfirmDelete}
                    onClearAll={handleClearAll}
                    onRescan={startScan}
                    onCancelScan={handleCancelScan}
                    onResetDiscovery={handleRequestResetDiscovery}
                    onOpenSettings={handleOpenSettings}
                />
            )}

            {detailTarget && detailGroup && (
                <GroupDetailViewer
                    group={detailGroup}
                    metaById={metaById}
                    decisions={decisions.get(detailGroup.id) ?? EMPTY_DECISIONS}
                    initialIndex={detailTarget.index}
                    onDecide={(assetId, decision) => handleDecide(detailGroup.id, assetId, decision)}
                    onClose={handleCloseDetail}
                />
            )}

            {stage === 'error' && (
                <View style={[styles.idle, { paddingTop: insets.top }]}>
                    <GlassCard style={styles.idleCard}>
                        <Title style={styles.idleTitle}>Scan failed</Title>
                        <Spacer size={theme.spacing.s} />
                        <Body style={styles.idleBody}>
                            We couldn’t finish scanning your library. Please try again.
                        </Body>
                        <Spacer size={theme.spacing.xl} />
                        <GlassButton title="Try again" variant="primary" size="large" onPress={startScan}>
                            <Search color={theme.colors.white} size={20} />
                        </GlassButton>
                    </GlassCard>
                </View>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: theme.colors.systemBackground,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    idle: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    idleCard: {
        width: '100%',
        maxWidth: 360,
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    idleTitle: {
        textAlign: 'center',
    },
    idleBody: {
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
    },
});
