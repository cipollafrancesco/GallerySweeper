import { Check, Trash2, Undo2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueue } from '../../domain/queueManager';
import * as haptics from '../../platform/haptics';
import { useModal } from '../../providers/ModalProvider';
import { ActionBar } from '../../ui/glass/ActionBar';
import { ActionButton } from '../../ui/glass/ActionButton';
import { PillChip } from '../../ui/glass/PillChip';
import { theme } from '../../ui/theme';
import { SwipeDeckRef } from '../deck/SwipeDeck';
import { SettingsButton } from '../settings/SettingsButton';
import { SettingsModal } from '../settings/SettingsModal';



// iOS-style header component
type HeaderProps = {
    onOpenSettings: () => void;
    hasPendingDeletions: boolean;
    pendingDeletionsCount: number;
    onClearDeletions: () => void;
    onCommitDeletions: () => void;
};

const Header: React.FC<HeaderProps> = ({
    onOpenSettings,
    hasPendingDeletions,
    pendingDeletionsCount,
    onClearDeletions,
    onCommitDeletions,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.s }]}>
            {/* Large Title Section */}
            <View style={styles.titleSection}>
                <View style={styles.titleRow}>
                    <Text style={styles.largeTitle} accessibilityRole="header">Gallery Sweeper</Text>
                    <SettingsButton onPress={onOpenSettings} />
                </View>


                {hasPendingDeletions && (
                    <PendingBanner
                        count={pendingDeletionsCount}
                        onClear={onClearDeletions}
                        onCommit={onCommitDeletions}
                    />
                )}
            </View>
        </View>
    );
};

// Pending deletions banner component
type PendingBannerProps = {
    count: number;
    onClear: () => void;
    onCommit: () => void;
};

const PendingBanner: React.FC<PendingBannerProps> = ({ count, onClear, onCommit }) => {
    return (
        <View style={styles.pendingBanner}>
            <View style={styles.pendingActions}>
                <PillChip title="Undo All" onPress={onClear} variant="neutral" />
                {count > 0 && <PillChip title={`Delete (${count})`} onPress={onCommit} variant="delete" />}
            </View>
        </View>
    );
};


export const Hud: React.FC<{ deckRef: React.RefObject<SwipeDeckRef | null> }> = ({ deckRef }) => {
    const {
        markedForDelete,
        actionHistory,
        undo,
        commitDeletions,
        clearAllPending,
        access,
        loading,
    } = useQueue();
    const { showModal } = useModal();

    const hasPendingChanges = markedForDelete.size > 0 || actionHistory.length > 0;


    const onKeep = () => deckRef.current?.swipeRight();
    const onDelete = () => deckRef.current?.swipeLeft();
    const onUndo = () => {
        haptics.selection();
        undo();
    };
    const onClearDeletions = () => {
        haptics.selection();
        clearAllPending();
    };
    const onCommitDeletions = () => {
        haptics.warning();
        commitDeletions();
    };

    const onOpenSettings = () => {
        // Optimistic strategy: only show settings modal when app is ready and user has access
        if (access === 'all' && !loading) {
            showModal(<SettingsModal />, { type: 'dialog' });
        }
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Header
                onOpenSettings={onOpenSettings}
                hasPendingDeletions={hasPendingChanges}
                pendingDeletionsCount={markedForDelete.size}
                onClearDeletions={onClearDeletions}
                onCommitDeletions={onCommitDeletions}
            />

            <ActionBar style={[styles.actionBar, { paddingBottom: theme.spacing.m }]}>
                <ActionButton title="Keep" onPress={onKeep} variant="keep" icon={<Check color={theme.colors.keep} size={24} />} />
                <ActionButton
                    title="Undo"
                    onPress={onUndo}
                    disabled={actionHistory.length === 0}
                    variant="undo"
                    icon={<Undo2 color={actionHistory.length === 0 ? theme.colors.quaternaryLabel : theme.colors.label} size={24} />}
                />
                <ActionButton title="Delete" onPress={onDelete} variant="delete" icon={<Trash2 color={theme.colors.delete} size={24} />} />
            </ActionBar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },

    // Header Styles
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing.l,
        backgroundColor: 'transparent',
    },
    titleSection: {
        paddingBottom: theme.spacing.m,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    largeTitle: {
        ...theme.typography.largeTitle,
        flex: 1,
    },
    // Pending Banner
    pendingBanner: {
        borderRadius: theme.radii.l,
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    pendingText: {
        ...theme.typography.headline,
        color: theme.colors.label,
    },
    pendingActions: {
        paddingVertical: theme.spacing.s,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.m,
    },

    // Action Bar — chrome/buttons live in the shared ui/glass/ActionBar +
    // ActionButton; this only positions the bar within the Hud's own layout.
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});
