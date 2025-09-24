import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export const GlassCard: React.FC<ViewProps> = ({ style, children, ...props }) => {
    return (
        <View style={[styles.cardContainer, style]} pointerEvents="auto">
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
            <View {...props} style={styles.card}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '90%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
    },
    card: {
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
});
