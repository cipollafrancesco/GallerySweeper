import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export type ActionButtonVariant = 'keep' | 'delete' | 'undo';

interface ActionButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    variant: ActionButtonVariant;
    icon: React.ReactNode;
    style?: any;
}

function variantColors(variant: ActionButtonVariant, disabled: boolean) {
    switch (variant) {
        case 'keep':
            return { backgroundColor: theme.colors.keepFaded, textColor: theme.colors.keep, borderColor: theme.colors.keep };
        case 'delete':
            return { backgroundColor: theme.colors.deleteFaded, textColor: theme.colors.delete, borderColor: theme.colors.delete };
        case 'undo':
            return {
                backgroundColor: disabled ? theme.colors.undoFaded : theme.colors.secondarySystemFill,
                textColor: disabled ? theme.colors.quaternaryLabel : theme.colors.label,
                borderColor: 'transparent',
            };
    }
}

/**
 * The pill-shaped keep/delete/undo button used by the Sweep deck's action bar
 * — shared here so every keep/delete affordance in the app (Sweep, Duplicates)
 * looks and behaves the same way.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({ title, onPress, disabled = false, variant, icon, style }) => {
    const colors = variantColors(variant, disabled);

    return (
        <Pressable
            style={[
                styles.actionButton,
                { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, borderWidth: 1 },
                disabled && styles.disabledButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled }}
        >
            {icon}
            <Text style={[styles.actionButtonText, { color: colors.textColor }]}>{title}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
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
