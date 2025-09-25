import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { theme } from '../theme';

export const GlassCard: React.FC<ViewProps> = ({ style, children, ...props }) => {
    return (
        <View style={[styles.cardOuter, style]} {...props}>
            <BlurView intensity={80} tint="dark" style={styles.blurView} />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    cardOuter: {
        borderRadius: theme.radii.l,
        overflow: 'hidden',
        borderColor: theme.colors.glassBorder,
        borderWidth: 1,
        backgroundColor: theme.colors.glassBg,
        ...theme.shadows.subtle,
    },
    blurView: {
        ...StyleSheet.absoluteFillObject,
    },
});
