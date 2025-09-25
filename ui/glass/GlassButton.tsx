import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { Body, Caption } from '../primitives/Typography';
import { theme } from '../theme';

interface GlassButtonProps extends PressableProps {
    title: string;
    variant?: 'keep' | 'delete' | 'undo';
    size?: 'medium' | 'small';
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
    };

    const textVariantStyles = {
        keep: styles.keepText,
        delete: styles.deleteText,
        undo: styles.undoText,
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
                        : styles.textContainer
                    : styles.iconContainer,
                style,
                pressed && styles.pressed,
            ]}
            {...props}
        >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
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
        borderRadius: theme.radii.m,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
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
    pressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    inner: {
        width: '100%',
        height: '100%',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    keepText: { color: theme.colors.keep },
    deleteText: { color: theme.colors.delete },
    undoText: { color: theme.colors.secondary },
});
