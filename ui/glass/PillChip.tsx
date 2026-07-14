import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export type PillChipVariant = 'neutral' | 'delete' | 'ghost' | 'destructive';

interface PillChipProps {
    title: string;
    onPress: () => void;
    variant?: PillChipVariant;
    style?: any;
}

/**
 * The small pending-action pill used by Sweep's header (e.g. "Delete (3)") —
 * shared so any compact, appears-only-when-relevant action chip in the app
 * looks and behaves the same way.
 *
 * `neutral`/`delete` are the original filled-gray / red-outline variants
 * (still used by the Duplicates review screen). `ghost`/`destructive` are the
 * global-action pair used by the Sweep header's collapsible toolbar — a
 * transparent outline for "Undo All" and a solid red fill for "Delete (N)" —
 * deliberately distinct from the per-card bottom action bar's Undo/Delete.
 */
export const PillChip: React.FC<PillChipProps> = ({ title, onPress, variant = 'neutral', style }) => {
    const variantStyle = VARIANT_STYLES[variant];
    return (
        <Pressable
            style={[styles.pill, variantStyle.container, style]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <Text style={[styles.text, variantStyle.text]}>{title}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    pill: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.radii.pill,
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        ...theme.typography.headline,
        color: theme.colors.label,
    },
});

const VARIANT_STYLES: Record<PillChipVariant, { container: any; text?: any }> = {
    neutral: {
        container: { backgroundColor: theme.colors.secondarySystemFill },
    },
    delete: {
        container: { borderColor: theme.colors.delete, borderWidth: 1 },
        text: { color: theme.colors.delete, fontWeight: '600' },
    },
    ghost: {
        container: { backgroundColor: 'transparent', borderColor: theme.colors.separator, borderWidth: 1 },
        text: { color: theme.colors.label },
    },
    destructive: {
        container: { backgroundColor: theme.colors.delete },
        text: { color: theme.colors.white, fontWeight: '600' },
    },
};
