import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { Body, Caption } from '../primitives/Typography';
import { theme } from '../theme';

interface GlassButtonProps extends PressableProps {
    title: string;
    variant?: 'keep' | 'delete' | 'undo' | 'primary';
    size?: 'medium' | 'small' | 'large';
    children?: React.ReactNode;
    style?: any;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    variant = 'undo',
    size = 'medium',
    children,
    style,
    ...props
}) => {
    const variantStyles = {
        keep: styles.keep,
        delete: styles.delete,
        undo: styles.undo,
        primary: styles.primary,
    };

    const textVariantStyles = {
        keep: styles.keepText,
        delete: styles.deleteText,
        undo: styles.undoText,
        primary: styles.primaryText,
    };

    const isTextOnly = !children;
    const TextComponent = isTextOnly ? (size === 'small' ? Caption : Body) : Caption;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                isTextOnly
                    ? size === 'small'
                        ? styles.smallTextContainer
                        : size === 'large'
                            ? styles.largeTextContainer
                            : styles.textContainer
                    : styles.iconContainer,
                style,
                pressed && styles.pressed,
            ]}
            {...props}
        >
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[styles.inner, variantStyles[variant]]}>
                {children}
                <TextComponent
                    style={[styles.title, isTextOnly ? styles.textTitle : styles.iconTitle, textVariantStyles[variant]]}
                >
                    {title}
                </TextComponent>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.radii.l,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small,
    },
    iconContainer: {
        minWidth: 72,
        minHeight: 72,
        padding: theme.spacing.s,
    },
    textContainer: {
        paddingVertical: theme.spacing.m - 4,
        paddingHorizontal: theme.spacing.l,
    },
    smallTextContainer: {
        paddingVertical: theme.spacing.m - 4,
        paddingHorizontal: theme.spacing.m + 4,
    },
    largeTextContainer: {
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.xl,
        minHeight: theme.spacing.xxxl + 8,
    },
    pressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    inner: {
        width: '100%',
        padding: theme.spacing.m,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.radii.m,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: theme.colors.primary,
    },
    iconTitle: {
        marginTop: theme.spacing.xs,
    },
    textTitle: {
        fontWeight: '600',
    },
    keep: {
        backgroundColor: theme.colors.keepFaded,
        borderColor: theme.colors.keep,
    },
    delete: {
        backgroundColor: theme.colors.deleteFaded,
        borderColor: theme.colors.delete,
    },
    undo: {
        backgroundColor: theme.colors.secondarySystemFill,
        borderColor: theme.colors.separator,
    },
    primary: {
        backgroundColor: theme.colors.systemBlue,
        borderColor: theme.colors.systemBlue,
    },
    keepText: { color: theme.colors.keep },
    deleteText: { color: theme.colors.delete },
    undoText: { color: theme.colors.label },
    primaryText: { color: theme.colors.white },
});
