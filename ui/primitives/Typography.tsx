import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { theme } from '../theme';

export const Title: React.FC<TextProps> = (props) => <Text {...props} style={[styles.title, props.style]} />;
export const Subtitle: React.FC<TextProps> = (props) => <Text {...props} style={[styles.subtitle, props.style]} />;
export const Body: React.FC<TextProps> = (props) => <Text {...props} style={[styles.body, props.style]} />;
export const Caption: React.FC<TextProps> = (props) => <Text {...props} style={[styles.caption, props.style]} />;
export const Label: React.FC<TextProps> = (props) => <Text {...props} style={[styles.label, props.style]} />;


const styles = StyleSheet.create({
    title: theme.typography.h1,
    subtitle: theme.typography.h2,
    body: theme.typography.body,
    caption: theme.typography.caption,
    label: theme.typography.label,
});
