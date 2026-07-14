import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueue } from '../../domain/queueManager';
import * as haptics from '../../platform/haptics';
import { useModal } from '../../providers/ModalProvider';
import { PillChip } from '../../ui/glass/PillChip';
import { theme } from '../../ui/theme';
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
    const insets = useSafeAreaInsets();
    const { markedForDelete, actionHistory, commitDeletions, clearAllPending, access, loading } = useQueue();
    const { showModal } = useModal();

    const pendingCount = markedForDelete.size;
    const hasAnyAction = pendingCount > 0 || actionHistory.length > 0;

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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.headerRow}>
                <Text style={styles.navTitle} accessibilityRole="header">Gallery Sweeper</Text>
                <SettingsButton onPress={onOpenSettings} />
            </View>

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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: theme.spacing.l,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    navTitle: {
        ...theme.typography.title3,
        fontWeight: '600',
        flex: 1,
    },
    toolbar: {
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
