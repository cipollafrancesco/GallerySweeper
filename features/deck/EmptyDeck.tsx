import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Center, Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

interface EmptyDeckProps {
    onRefresh: () => void;
}

export const EmptyDeck: React.FC<EmptyDeckProps> = ({ onRefresh }) => {
    return (
        <Center style={styles.container}>
            <GlassCard style={styles.card}>
                <Title style={styles.title}>No more photos</Title>
                <Spacer size={theme.spacing.m} />
                <Body style={styles.body}>You've reviewed all available photos.</Body>
                <Spacer size={theme.spacing.l} />
                <GlassButton title="Refresh" onPress={onRefresh} />
            </GlassCard>
        </Center>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.m,
    },
    card: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    title: {
        textAlign: 'center',
    },
    body: {
        textAlign: 'center',
        maxWidth: '80%',
    },
});
