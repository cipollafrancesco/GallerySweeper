import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { Body } from '../primitives/Typography';
import { theme } from '../theme';

interface GlassButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'keep' | 'delete' | 'undo' | 'primary';
    children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    variant = 'primary',
    style,
    children,
    ...props
}) => {
    const variantStyle = styles[variant];
    const content = children ? (
        <View style={styles.contentContainer}>{children}</View>
    ) : (
        <Body style={styles.text}>{title}</Body>
    );

    return (
        <TouchableOpacity {...props} style={[styles.container, variantStyle, style]}>
            {variant !== 'primary' && <BlurView intensity={80} tint="dark" style={styles.blurView} />}
            {content}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        minWidth: 50,
        borderRadius: theme.radii.m,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
    },
    contentContainer: {
        backgroundColor: 'transparent',
    },
    blurView: {
        ...StyleSheet.absoluteFillObject,
    },
    text: {
        ...theme.typography.button,
        backgroundColor: 'transparent',
    },
    primary: {
        backgroundColor: theme.colors.glassBg,
        borderColor: theme.colors.glassBorder,
        borderWidth: 1,
        ...theme.shadows.subtle,
    },
    keep: {
        backgroundColor: 'transparent',
    },
    delete: {
        backgroundColor: 'transparent',
    },
    undo: {
        backgroundColor: 'transparent',
    },
});
