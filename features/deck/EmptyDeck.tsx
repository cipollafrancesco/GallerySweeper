import React from 'react';
import { StyleSheet } from 'react-native';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Center, Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';

interface EmptyDeckProps {
    onRefresh: () => void;
}

export const EmptyDeck: React.FC<EmptyDeckProps> = ({ onRefresh }) => {
    return (
        <Center style={styles.container}>
            <GlassCard>
                <Title>All clear!</Title>
                <Spacer size={20} />
                <Body>You've reviewed all the photos in your library.</Body>
                <Spacer size={30} />
                <GlassButton title="Refresh" onPress={onRefresh} />
            </GlassCard>
        </Center>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
});
