import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { GlassCard } from './GlassCard';

interface GlassButtonProps extends TouchableOpacityProps {
    title: string;
    primary?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ title, primary, ...props }) => {
    return (
        <TouchableOpacity {...props} style={styles.touchable}>
            <GlassCard style={[styles.button, primary && styles.primaryButton]}>
                <Text style={[styles.text, primary && styles.primaryText]}>{title}</Text>
            </GlassCard>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    touchable: {
        flex: 1,
    },
    button: {
        padding: 15,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    text: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    primaryText: {
        color: 'white',
    },
});
