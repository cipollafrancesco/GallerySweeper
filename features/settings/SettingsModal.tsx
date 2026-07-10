// import Constants from 'expo-constants';
import { Copy, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { DuplicatesFlow } from '../duplicates/DuplicatesFlow';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Caption, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { ResetConfirmationModal } from './ResetConfirmationModal';

export const SettingsModal = () => {
    const { hideModal, hideAllModals, showModal, showToast } = useModal();
    const { resetReviewState, loading, access } = useQueue();
    const appVersion = '1.0.0'; // Constants.expoConfig?.version;

    const onReset = () => {
        // Optimistic strategy: only show confirmation modal when not loading
        if (!loading) {
            showModal(<ResetConfirmationModal onConfirm={handleResetConfirm} />, { type: 'dialog' });
        }
    };

    const handleResetConfirm = async () => {
        await resetReviewState();
        hideAllModals(); // Close all modals (confirmation + settings)
        showToast('Review state reset. All photos will be shown.');
    };

    const onFindDuplicates = () => {
        if (access === 'all' && !loading) {
            hideModal(); // close settings first
            showModal(<DuplicatesFlow />, { type: 'custom' });
        }
    };


    return (
        <GlassCard style={styles.card}>
            <View style={styles.header}>
                <Title>Settings</Title>
                <Pressable onPress={hideModal} style={styles.closeButton}>
                    <X color={theme.colors.icon} size={24} />
                </Pressable>
            </View>
            <Spacer size={theme.spacing.xl} />
            <Pressable
                onPress={onFindDuplicates}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                accessibilityLabel="Find duplicate photos"
                accessibilityHint="Scans your library locally for duplicate and similar photos"
            >
                <View style={styles.actionRow}>
                    <Copy color={theme.colors.systemBlue} size={20} />
                    <Body style={styles.actionText}>Find duplicate photos</Body>
                </View>
                <Body style={styles.actionSubtitle}>Scan on-device for duplicates and similar shots</Body>
            </Pressable>
            <Spacer size={theme.spacing.m} />
            <Pressable
                onPress={onReset}
                style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                accessibilityLabel="Reset reviewed photos"
                accessibilityHint="Clears local references so all photos appear again"
            >
                <Body style={styles.resetText}>Reset reviewed photos</Body>
                <Body style={styles.resetSubtitle}>Clear local references so all photos appear again</Body>
            </Pressable>

            <View style={styles.footer}>
                <Caption>GallerySweeper {appVersion && `v${appVersion}`}</Caption>
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: 400,
        padding: theme.spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeButton: {
        padding: theme.spacing.s,
        margin: -theme.spacing.s, // Enlarge hit area
    },
    actionButton: {
        padding: theme.spacing.m,
        borderRadius: theme.radii.m,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.separator,
    },
    actionButtonPressed: {
        backgroundColor: theme.colors.secondarySystemFill,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
    },
    actionText: {
        ...theme.typography.headline,
        color: theme.colors.label,
        fontWeight: '600',
    },
    actionSubtitle: {
        color: theme.colors.secondary,
        marginTop: theme.spacing.xs,
    },
    resetButton: {
        padding: theme.spacing.m,
        borderRadius: theme.radii.m,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.deleteFaded,
    },
    resetButtonPressed: {
        backgroundColor: theme.colors.deleteFaded,
    },
    resetText: {
        ...theme.typography.headline,
        color: theme.colors.delete,
        fontWeight: '600',
    },
    resetSubtitle: {
        color: theme.colors.secondary,
        marginTop: theme.spacing.xs,
    },
    footer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    }
});
