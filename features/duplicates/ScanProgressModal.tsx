import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ScanProgress } from '../../services/duplicates/types';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Caption, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const PHASE_LABELS: Record<ScanProgress['phase'], string> = {
    collecting: 'Reading your library…',
    hashing: 'Analyzing photos…',
    semantic: 'Finding similar shots…',
    grouping: 'Grouping duplicates…',
};

interface ScanProgressModalProps {
    progress: ScanProgress | null;
    onCancel: () => void;
}

export const ScanProgressModal: React.FC<ScanProgressModalProps> = ({ progress, onCancel }) => {
    const phase = progress?.phase ?? 'collecting';
    const total = progress?.total ?? 0;
    const processed = progress?.processed ?? 0;
    const ratio = total > 0 ? Math.min(1, processed / total) : 0;
    const showCount = (phase === 'hashing' || phase === 'semantic') && total > 0;

    return (
        <View style={styles.overlay}>
            <GlassCard style={styles.card}>
                <ActivityIndicator color={theme.colors.systemBlue} size="large" />
                <Spacer size={theme.spacing.l} />
                <Title style={styles.title}>Scanning</Title>
                <Spacer size={theme.spacing.s} />
                <Body style={styles.phase}>{PHASE_LABELS[phase]}</Body>
                {showCount && (
                    <>
                        <Spacer size={theme.spacing.m} />
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
                        </View>
                        <Spacer size={theme.spacing.s} />
                        <Caption style={styles.count}>
                            {processed} / {total}
                        </Caption>
                    </>
                )}
                <Spacer size={theme.spacing.xl} />
                <GlassButton title="Cancel" variant="undo" onPress={onCancel} accessibilityLabel="Cancel scan" />
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    title: {
        textAlign: 'center',
    },
    phase: {
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.tertiarySystemFill,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: theme.colors.systemBlue,
    },
    count: {
        color: theme.colors.secondaryLabel,
    },
});
