import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export type PillChipVariant = 'neutral' | 'delete';

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
 */
export const PillChip: React.FC<PillChipProps> = ({ title, onPress, variant = 'neutral', style }) => (
    <Pressable
        style={[styles.pill, variant === 'delete' ? styles.deleteVariant : styles.neutralVariant, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
    >
        <Text style={[styles.text, variant === 'delete' && styles.deleteText]}>{title}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    pill: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.radii.pill,
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    neutralVariant: {
        backgroundColor: theme.colors.secondarySystemFill,
    },
    deleteVariant: {
        borderColor: theme.colors.delete,
        borderWidth: 1,
    },
    text: {
        ...theme.typography.headline,
        color: theme.colors.label,
    },
    deleteText: {
        color: theme.colors.delete,
        fontWeight: '600',
    },
});
