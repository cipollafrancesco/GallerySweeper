import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export const Spacer: React.FC<{ size: number; horizontal?: boolean }> = ({ size, horizontal }) => (
    <View style={horizontal ? { width: size } : { height: size }} />
);

export const Center: React.FC<ViewProps> = (props) => <View {...props} style={[styles.center, props.style]} />;

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
