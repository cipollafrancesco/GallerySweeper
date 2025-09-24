import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

export const Title: React.FC<TextProps> = (props) => <Text {...props} style={[styles.title, props.style]} />;
export const Subtitle: React.FC<TextProps> = (props) => <Text {...props} style={[styles.subtitle, props.style]} />;
export const Body: React.FC<TextProps> = (props) => <Text {...props} style={[styles.body, props.style]} />;

const styles = StyleSheet.create({
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    subtitle: {
        fontSize: 18,
        color: 'white',
    },
    body: {
        fontSize: 16,
        color: 'white',
    },
});
