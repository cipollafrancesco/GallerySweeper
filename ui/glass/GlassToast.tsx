import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { GlassCard } from './GlassCard';

interface GlassToastProps extends TouchableOpacityProps {
    message: string;
}

export const GlassToast: React.FC<GlassToastProps> = ({ message, ...props }) => {
    return (
        <TouchableOpacity {...props}>
            <GlassCard style={styles.toast}>
                <Text style={styles.text}>{message}</Text>
            </GlassCard>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    toast: {
        padding: 15,
        alignItems: 'center',
    },
    text: {
        color: 'white',
        fontSize: 16,
    },
});
