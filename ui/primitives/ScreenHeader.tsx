import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Caption, NavTitle } from './Typography';

interface ScreenHeaderProps {
    title: string;
    /**
     * One-line status directly under the title — Sweep's "N reviewed", Duplicates'
     * "N groups found · tap a photo…". Omit to render just the title row (e.g.
     * Duplicates' empty/scanning states, which show no caption).
     */
    caption?: React.ReactNode;
    /** Right-aligned icon buttons, rendered in a row next to the title. */
    actions?: React.ReactNode;
}

/**
 * Shared title+caption+actions block for the Sweep and Duplicates tab screens.
 * The single source of the title→caption gap (`styles.caption`'s `marginTop`)
 * and the actions row layout, so the two screens' headers can't drift apart the
 * way they previously did (one used a 4px margin, the other an 8px padding, in
 * two different files). Each screen still owns its own toolbar/banner/list
 * below this — those differ too much structurally to unify.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, caption, actions }) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, { paddingTop: insets.top + theme.spacing.s }]}>
            <View style={styles.titleRow}>
                <NavTitle style={styles.title} accessibilityRole="header">
                    {title}
                </NavTitle>
                {actions && <View style={styles.actions}>{actions}</View>}
            </View>
            {caption && <Caption style={styles.caption}>{caption}</Caption>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.s,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    title: {
        flex: 1,
    },
    // Must be >= 2x HeaderIconButton's hitSlop (12) or adjacent icons' invisible
    // tap zones overlap — see HeaderIconButton.tsx.
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xl,
    },
    caption: {
        color: theme.colors.secondaryLabel,
        marginTop: theme.spacing.s,
    },
});
