import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as MediaAccess from '../../platform/mediaAccess';
import { useModal } from '../../providers/ModalProvider';
import { scanForDuplicates } from '../../services/duplicates/pipeline';
import { isSemanticAvailable } from '../../services/duplicates/semantic';
import { storage } from '../../services/storage';
import type { AssetMeta, CancelToken, DuplicateGroup, ScanProgress } from '../../services/duplicates/types';
import { GlassCard } from '../../ui/glass/GlassCard';
import { DialogButton } from '../../ui/primitives/DialogButton';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { GroupsReviewScreen } from './GroupsReviewScreen';
import { ScanProgressModal } from './ScanProgressModal';

type Stage = 'scanning' | 'reviewing';

/** Builds the initial per-group selection: everything except the keeper is marked for deletion. */
function initialSelection(groups: DuplicateGroup[]): Map<string, Set<string>> {
    const selection = new Map<string, Set<string>>();
    for (const group of groups) {
        selection.set(group.id, new Set(group.assetIds.filter((id) => id !== group.keeperId)));
    }
    return selection;
}

export const DuplicatesFlow: React.FC = () => {
    const { hideModal, showToast } = useModal();

    const [stage, setStage] = useState<Stage>('scanning');
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [metaById, setMetaById] = useState<Map<string, AssetMeta>>(new Map());
    const [selection, setSelection] = useState<Map<string, Set<string>>>(new Map());
    const [confirmVisible, setConfirmVisible] = useState(false);

    const cancelRef = useRef<CancelToken>({ cancelled: false });

    useEffect(() => {
        // Each effect run gets a fresh token so StrictMode's double-invoke (which
        // cancels the first run on cleanup) doesn't permanently cancel the scan.
        const cancel: CancelToken = { cancelled: false };
        cancelRef.current = cancel;
        let mounted = true;

        (async () => {
            const result = await scanForDuplicates({
                cancel,
                enableSemantic: isSemanticAvailable(),
                onProgress: (p) => {
                    if (mounted && !cancel.cancelled) setProgress(p);
                },
            });
            if (!mounted || cancel.cancelled) return;
            setGroups(result.groups);
            setMetaById(result.metaById);
            setSelection(initialSelection(result.groups));
            setStage('reviewing');
        })();

        return () => {
            mounted = false;
            cancel.cancelled = true;
        };
    }, []);

    const deleteCount = useMemo(() => {
        let count = 0;
        for (const set of selection.values()) count += set.size;
        return count;
    }, [selection]);

    const handleCancelScan = useCallback(() => {
        cancelRef.current.cancelled = true;
        hideModal();
    }, [hideModal]);

    const handleToggle = useCallback((groupId: string, assetId: string) => {
        setSelection((prev) => {
            const next = new Map(prev);
            const current = new Set(next.get(groupId) ?? []);
            if (current.has(assetId)) {
                current.delete(assetId);
            } else {
                current.add(assetId);
            }
            next.set(groupId, current);
            return next;
        });
    }, []);

    const applyDeletion = useCallback((deletedIds: Set<string>) => {
        setGroups((prevGroups) => {
            const remaining: DuplicateGroup[] = [];
            for (const group of prevGroups) {
                const keptAssets = group.assetIds.filter((id) => !deletedIds.has(id));
                // A group with fewer than two survivors has nothing left to compare.
                if (keptAssets.length >= 2) {
                    remaining.push({ ...group, assetIds: keptAssets });
                }
            }
            return remaining;
        });
        setSelection((prev) => {
            const next = new Map<string, Set<string>>();
            for (const [groupId, set] of prev) {
                const survivors = new Set([...set].filter((id) => !deletedIds.has(id)));
                next.set(groupId, survivors);
            }
            return next;
        });
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        const ids = new Set<string>();
        for (const set of selection.values()) {
            for (const id of set) ids.add(id);
        }
        setConfirmVisible(false);
        if (ids.size === 0) return;

        try {
            const success = await MediaAccess.deleteMany([...ids]);
            if (success) {
                // Keep deleted assets out of the main swipe deck.
                await Promise.all([...ids].map((id) => storage.addReviewedId(id)));
                applyDeletion(ids);
                showToast(`Deleted ${ids.size} ${ids.size === 1 ? 'photo' : 'photos'}`);
            } else {
                showToast('Deletion was cancelled', 'error');
            }
        } catch {
            showToast('Could not delete photos', 'error');
        }
    }, [selection, applyDeletion, showToast]);

    return (
        <View style={styles.root}>
            {stage === 'scanning' ? (
                <ScanProgressModal progress={progress} onCancel={handleCancelScan} />
            ) : (
                <GroupsReviewScreen
                    groups={groups}
                    metaById={metaById}
                    selection={selection}
                    deleteCount={deleteCount}
                    onToggle={handleToggle}
                    onDelete={() => setConfirmVisible(true)}
                    onClose={hideModal}
                />
            )}

            {confirmVisible && (
                <View style={styles.confirmOverlay}>
                    <GlassCard style={styles.confirmCard}>
                        <View style={styles.confirmContent}>
                            <Title>Delete {deleteCount} {deleteCount === 1 ? 'photo' : 'photos'}?</Title>
                            <Spacer size={theme.spacing.m} />
                            <Body>
                                The selected photos will be removed from your library. On iOS they go to
                                Recently Deleted; on Android this cannot be undone.
                            </Body>
                        </View>
                        <View style={styles.confirmActions}>
                            <DialogButton title="Cancel" onPress={() => setConfirmVisible(false)} isFirst />
                            <DialogButton
                                title="Delete"
                                variant="destructive"
                                onPress={handleConfirmDelete}
                                accessibilityLabel="Confirm delete"
                                isLast
                            />
                        </View>
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
    confirmOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.l,
    },
    confirmCard: {
        maxWidth: 320,
        padding: 0,
        paddingTop: theme.spacing.l,
    },
    confirmContent: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.l,
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.separator,
    },
});
