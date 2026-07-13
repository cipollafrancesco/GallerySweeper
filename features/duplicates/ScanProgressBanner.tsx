import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScanProgress } from '../../services/duplicates/types';
import { Caption } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const PHASE_LABELS: Record<ScanProgress['phase'], string> = {
    collecting: 'Reading your library…',
    hashing: 'Analyzing photos…',
    semantic: 'Finding similar shots…',
    grouping: 'Grouping duplicates…',
};

interface ScanProgressBannerProps {
    progress: ScanProgress | null;
}

/**
 * Slim, non-blocking progress indicator for a scan running in the background —
 * unlike the old full-screen modal, this sits above the results list so the
 * user can keep scrolling/reviewing while a scan streams in.
 */
export const ScanProgressBanner: React.FC<ScanProgressBannerProps> = ({ progress }) => {
    const phase = progress?.phase ?? 'collecting';
    const total = progress?.total ?? 0;
    const processed = progress?.processed ?? 0;
    const ratio = total > 0 ? Math.min(1, processed / total) : 0;
    // Show the running count whenever we have a library total — including the
    // `collecting` phase, so a slow scan reads as "Reading… 1,200 / 8,000"
    // rather than a label with no numbers behind it.
    const showCount = total > 0;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Caption style={styles.label}>{PHASE_LABELS[phase]}</Caption>
                {showCount && (
                    <Caption style={styles.count}>
                        {processed.toLocaleString()} / {total.toLocaleString()}
                    </Caption>
                )}
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    label: {
        color: theme.colors.secondaryLabel,
    },
    count: {
        color: theme.colors.secondaryLabel,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.tertiarySystemFill,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
        backgroundColor: theme.colors.systemBlue,
    },
});
