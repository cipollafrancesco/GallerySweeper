import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useQueue } from '../../domain/queueManager';
import * as haptics from '../../platform/haptics';
import { useModal } from '../../providers/ModalProvider';
import { storage } from '../../services/storage';
import { PillChip } from '../../ui/glass/PillChip';
import { ScreenHeader } from '../../ui/primitives/ScreenHeader';
import { theme } from '../../ui/theme';
import { formatCount } from '../../utils/format';
import { SettingsButton } from '../settings/SettingsButton';
import { SettingsModal } from '../settings/SettingsModal';

const TOOLBAR_HEIGHT = 48;
const TOOLBAR_ANIMATION_MS = 220;

/**
 * In-flow top region for the Sweep screen: a compact nav-bar-scale title row
 * (replacing the old oversized 34pt large title) plus a collapsible global
 * action toolbar for "Undo All" / "Delete (N)".
 *
 * Unlike the old Hud header, this is NOT absolutely positioned — it's a real
 * flex child above the deck region, so it reserves its own space instead of
 * floating over the photo. The toolbar's container height animates open once
 * an action exists and collapses back to zero once both the delete queue and
 * undo history are empty again (see queueManager's `markedForDelete` /
 * `actionHistory`), rather than fading buttons into a zero-height box.
 */
export const SweepHeader: React.FC = () => {
    const { kept, deleted, markedForDelete, actionHistory, commitDeletions, clearAllPending, access, loading } = useQueue();
    const { showModal } = useModal();

    const pendingCount = markedForDelete.size;
    const hasAnyAction = pendingCount > 0 || actionHistory.length > 0;

    // Durable "reviewed" progress — reads the persisted storage caches (which
    // survive RELOAD, unlike `kept`/`deleted`/`actionHistory` themselves, since
    // those reset on every library change including our own commit-delete).
    // `kept`/`deleted`/`markedForDelete`/`actionHistory.length`/`loading` are
    // only used here as change-triggers: every keep/delete/undo/commit/reload
    // flips one of them, prompting a fresh read of the durable count.
    const [reviewedCount, setReviewedCount] = useState(0);
    useEffect(() => {
        setReviewedCount(storage.getReviewedIds().size + storage.getMarkedForDeleteIds().size);
    }, [kept, deleted, markedForDelete, actionHistory.length, loading]);

    const toolbarHeight = useSharedValue(0);
    useEffect(() => {
        toolbarHeight.value = withTiming(hasAnyAction ? TOOLBAR_HEIGHT : 0, {
            duration: TOOLBAR_ANIMATION_MS,
            easing: Easing.out(Easing.cubic),
        });
    }, [hasAnyAction, toolbarHeight]);
    const toolbarStyle = useAnimatedStyle(() => ({ height: toolbarHeight.value }));

    const onOpenSettings = () => {
        // Optimistic strategy: only show settings modal when app is ready and user has access
        if (access === 'all' && !loading) {
            showModal(<SettingsModal />, { type: 'dialog' });
        }
    };

    const onClearDeletions = () => {
        haptics.selection();
        clearAllPending();
    };

    const onCommitDeletions = () => {
        haptics.warning();
        commitDeletions();
    };

    // Reviewed-count caption and the Undo All / Delete (N) toolbar are mutually
    // exclusive — showing both at once wastes vertical space (and, when the
    // header grows enough, can push the deck card off-fit — see SwipeDeck).
    const caption = hasAnyAction
        ? undefined
        : (access === 'all' || access === 'limited')
          ? reviewedCount > 0
              ? `${formatCount(reviewedCount)} reviewed`
              : 'No photos reviewed yet'
          : undefined;

    return (
        <>
            <ScreenHeader
                title="Gallery Sweeper"
                actions={<SettingsButton onPress={onOpenSettings} />}
                caption={caption}
            />

            <Animated.View style={[styles.toolbar, toolbarStyle]}>
                <View style={styles.toolbarRow}>
                    <View style={styles.toolbarSlot}>
                        {hasAnyAction && <PillChip title="Undo All" onPress={onClearDeletions} variant="ghost" />}
                    </View>
                    <View style={styles.toolbarSlot}>
                        {pendingCount > 0 && (
                            <PillChip title={`Delete (${pendingCount})`} onPress={onCommitDeletions} variant="destructive" />
                        )}
                    </View>
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    toolbar: {
        paddingHorizontal: theme.spacing.l,
        overflow: 'hidden',
    },
    toolbarRow: {
        height: TOOLBAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toolbarSlot: {
        flexDirection: 'row',
    },
});
