import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { useRestore } from '../../providers/RestoreProvider';
import { pickBackupText, shareBackup } from '../../platform/backupFile';
import {
    applyBackup,
    buildBackup,
    parseBackup,
    serializeBackup,
    summarizeBackup,
    type BackupEnvelopeV1,
} from '../../services/backup';
import { storage } from '../../services/storage';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { HeaderIconButton } from '../../ui/primitives/HeaderIconButton';
import { Body, Caption, Subtitle, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { formatBytes, formatCount } from '../../utils/format';
import appConfig from '../../app.json';
import { BackupConfirmationModal } from './BackupConfirmationModal';
import { ResetConfirmationModal } from './ResetConfirmationModal';

export const SettingsModal = () => {
    const { hideModal, hideAllModals, showModal, showToast } = useModal();
    const { resetReviewState, loading } = useQueue();
    const { requestRestore } = useRestore();
    const appVersion = appConfig.expo.version;

    const [lifetimeStats, setLifetimeStats] = useState({ count: 0, bytes: 0 });
    useEffect(() => {
        storage.getLifetimeStats().then(setLifetimeStats);
    }, []);

    // Lead with a "~" whenever there's a real figure to hedge — the underlying byte
    // count is an accumulated estimate (see MediaAccess.measureAssetsSize), not an
    // exact measurement, so stating it as precise would overclaim. Skip the tilde
    // on a genuine zero so a fresh install reads "0 B", not "~0 B".
    const spaceFreed =
        lifetimeStats.bytes > 0 ? `~${formatBytes(lifetimeStats.bytes)}` : formatBytes(lifetimeStats.bytes);

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

    const onExport = async () => {
        try {
            const env = await buildBackup();
            const filename = `gallerysweeper-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const ok = await shareBackup(serializeBackup(env), filename);
            if (!ok) showToast('Could not open the share sheet', 'error');
        } catch {
            showToast('Could not create a backup', 'error');
        }
    };

    // Pick → validate → confirm (in that order), so the confirmation shows real
    // counts and an invalid file never reaches the destructive confirm.
    const onImport = async () => {
        const text = await pickBackupText();
        if (text == null) return; // cancelled
        const env = parseBackup(text);
        if (!env) {
            showToast('That file isn’t a valid backup', 'error');
            return;
        }
        showModal(
            <BackupConfirmationModal summary={summarizeBackup(env)} onConfirm={() => handleRestoreConfirm(env)} />,
            { type: 'dialog' },
        );
    };

    const handleRestoreConfirm = async (env: BackupEnvelopeV1) => {
        await applyBackup(env);
        requestRestore(); // reloads the swipe queue + the duplicates results from disk
        hideAllModals();
        showToast('Backup restored');
    };

    return (
        <GlassCard style={styles.card}>
            <View style={styles.header}>
                <Subtitle>Settings</Subtitle>
                <HeaderIconButton
                    onPress={hideModal}
                    accessibilityLabel="Close"
                    accessibilityHint="Closes settings"
                    icon={<X color={theme.colors.icon} size={22} />}
                />
            </View>
            <Spacer size={theme.spacing.xl} />
            <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                    <Title style={styles.statValue}>{formatCount(lifetimeStats.count)}</Title>
                    <Caption style={styles.statLabel}>photos deleted</Caption>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statColumn}>
                    <Title style={styles.statValue}>{spaceFreed}</Title>
                    <Caption style={styles.statLabel}>space freed</Caption>
                </View>
            </View>

            <Spacer size={theme.spacing.xl} />
            <Pressable
                onPress={onReset}
                style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                accessibilityLabel="Reset reviewed photos"
                accessibilityHint="Clears local references so all photos appear again"
            >
                <Body style={styles.resetText}>Reset reviewed photos</Body>
                <Body style={styles.resetSubtitle}>Clear local references so all photos appear again</Body>
            </Pressable>

            <Spacer size={theme.spacing.xl} />
            <Caption style={styles.sectionHeader}>Backup &amp; Restore</Caption>
            <Spacer size={theme.spacing.s} />
            <Pressable
                onPress={onExport}
                style={({ pressed }) => [styles.backupButton, pressed && styles.backupButtonPressed]}
                accessibilityLabel="Back up my progress"
                accessibilityHint="Save a file you can restore after reinstalling"
            >
                <Body style={styles.backupText}>Back up my progress</Body>
                <Body style={styles.backupSubtitle}>Save a file you can restore after reinstalling</Body>
            </Pressable>
            <Spacer size={theme.spacing.s} />
            <Pressable
                onPress={onImport}
                style={({ pressed }) => [styles.backupButton, pressed && styles.backupButtonPressed]}
                accessibilityLabel="Restore from backup"
                accessibilityHint="Replace current progress with a saved file"
            >
                <Body style={styles.backupText}>Restore from backup</Body>
                <Body style={styles.backupSubtitle}>Replace current progress with a saved file</Body>
            </Pressable>

            <View style={styles.footer}>
                <Caption>Gallery Sweeper {appVersion && `v${appVersion}`}</Caption>
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
    statsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-around',
    },
    statColumn: {
        alignItems: 'center',
    },
    // Groups the two stats into one visual block instead of two floating numbers.
    statDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.separator,
        marginVertical: theme.spacing.xs,
    },
    statValue: {
        fontSize: 28,
        // Prevents the digits from reflowing width once the async stats load in
        // (initial render is "0" / "0 B" before storage.getLifetimeStats resolves).
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
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
    sectionHeader: {
        color: theme.colors.secondary,
        textTransform: 'uppercase',
    },
    backupButton: {
        padding: theme.spacing.m,
        borderRadius: theme.radii.m,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.systemBlue,
    },
    backupButtonPressed: {
        backgroundColor: 'rgba(10, 132, 255, 0.15)',
    },
    backupText: {
        ...theme.typography.headline,
        color: theme.colors.systemBlue,
        fontWeight: '600',
    },
    backupSubtitle: {
        color: theme.colors.secondary,
        marginTop: theme.spacing.xs,
    },
    footer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    }
});
