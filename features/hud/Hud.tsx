import { BlurView } from 'expo-blur';
import { Check, Settings, Trash2, Undo2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { theme } from '../../ui/theme';
import { SwipeDeckRef } from '../deck/SwipeDeck';
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
                    <Text style={styles.largeTitle}>Gallery Cleanup</Text>
                    <Pressable style={styles.settingsButton} onPress={onOpenSettings}>
                        <Settings size={24} color={theme.colors.white} />
                    </Pressable>
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
                <Pressable style={[styles.pillButton, styles.clearButton]} onPress={onClear}>
                    <Text style={styles.clearButtonText}>Undo All</Text>
                </Pressable>
                {count > 0 && <Pressable style={[styles.pillButton, styles.commitButton]} onPress={onCommit} disabled={count === 0}>
                    <Text style={styles.commitButtonText}>Delete {count > 0 ? `(${count})` : ''}</Text>
                </Pressable>}
            </View>
        </View>
    );
};

// iOS-style action button
const ActionButton: React.FC<{
    title: string;
    onPress: () => void;
    disabled?: boolean;
    variant: 'keep' | 'delete' | 'undo';
    icon: React.ReactNode;
}> = ({ title, onPress, disabled = false, variant, icon }) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'keep':
                return {
                    backgroundColor: theme.colors.keepFaded,
                    textColor: theme.colors.keep,
                    borderColor: theme.colors.keep,
                };
            case 'delete':
                return {
                    backgroundColor: theme.colors.deleteFaded,
                    textColor: theme.colors.delete,
                    borderColor: theme.colors.delete,
                };
            case 'undo':
                return {
                    backgroundColor: disabled ? theme.colors.undoFaded : theme.colors.secondarySystemFill,
                    textColor: disabled ? theme.colors.quaternaryLabel : theme.colors.label,
                    borderColor: 'transparent',
                };
        }
    };

    const buttonVariantStyle = getVariantStyles();

    return (
        <Pressable
            style={[
                styles.actionButton,
                {
                    backgroundColor: buttonVariantStyle.backgroundColor,
                    borderColor: buttonVariantStyle.borderColor,
                    borderWidth: 1,
                },
                disabled && styles.disabledButton
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            {icon}
            <Text style={[styles.actionButtonText, { color: buttonVariantStyle.textColor }]}>
                {title}
            </Text>
        </Pressable>
    );
};

// iOS-style action bar
type ActionBarProps = {
    onKeep: () => void;
    onDelete: () => void;
    onUndo: () => void;
    isUndoDisabled: boolean;
};

const ActionBar: React.FC<ActionBarProps> = ({ onKeep, onDelete, onUndo, isUndoDisabled }) => {
    // The bottom tab bar owns the safe-area inset now, so this bar only needs
    // its own padding to sit just above it.
    return (
        <View style={[styles.actionBar, { paddingBottom: theme.spacing.m }]}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.actionBarContent}>
                <ActionButton
                    title="Keep"
                    onPress={onKeep}
                    variant="keep"
                    icon={<Check color={theme.colors.keep} size={24} />}
                />
                <ActionButton
                    title="Undo"
                    onPress={onUndo}
                    disabled={isUndoDisabled}
                    variant="undo"
                    icon={<Undo2 color={isUndoDisabled ? theme.colors.quaternaryLabel : theme.colors.label} size={24} />}
                />
                <ActionButton
                    title="Delete"
                    onPress={onDelete}
                    variant="delete"
                    icon={<Trash2 color={theme.colors.delete} size={24} />}
                />
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
                onClearDeletions={clearAllPending}
                onCommitDeletions={commitDeletions}
            />

            <ActionBar
                onKeep={onKeep}
                onDelete={onDelete}
                onUndo={undo}
                isUndoDisabled={actionHistory.length === 0}
            />
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
    settingsButton: {
        width: theme.spacing.xxxl,
        height: theme.spacing.xxxl,
        borderRadius: theme.radii.m,
        backgroundColor: theme.colors.secondarySystemFill,
        justifyContent: 'center',
        alignItems: 'center',
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

    // Pill Buttons
    pillButton: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.radii.pill,
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: theme.colors.secondarySystemFill,
    },
    clearButtonText: {
        ...theme.typography.headline,
        color: theme.colors.label,
    },
    commitButton: {
        borderColor: theme.colors.delete,
        borderWidth: 1,
    },
    commitButtonText: {
        ...theme.typography.headline,
        color: theme.colors.delete,
        fontWeight: '600',
    },

    // Action Bar
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: theme.radii.l,
        borderTopRightRadius: theme.radii.l,
        overflow: 'hidden',
        ...theme.shadows.medium,
    },
    actionBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.l,
        gap: theme.spacing.m,
    },
    // Action Buttons
    actionButton: {
        flex: 1,
        minHeight: theme.spacing.xxxl + 8,
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.radii.pill,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.s,
        ...theme.shadows.small,
    },
    actionButtonText: {
        ...theme.typography.headline,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
