import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface ActionBarProps {
    children: React.ReactNode;
    style?: any;
}

/**
 * Blurred pill-bar chrome for a row of `ActionButton`s — the same wrapper the
 * Sweep deck's action bar uses, shared so every action bar in the app
 * (Sweep, Duplicates) reads as one coherent piece of chrome.
 */
export const ActionBar: React.FC<ActionBarProps> = ({ children, style }) => (
    <View style={[styles.actionBar, style]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.actionBarContent}>{children}</View>
    </View>
);

const styles = StyleSheet.create({
    actionBar: {
        borderTopLeftRadius: theme.radii.l,
        borderTopRightRadius: theme.radii.l,
        overflow: 'hidden',
        ...theme.shadows.medium,
    },
    actionBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.l,
        gap: theme.spacing.m,
    },
});
