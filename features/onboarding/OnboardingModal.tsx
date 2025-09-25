import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const Instruction: React.FC<{ icon: React.ElementType; text: string, color: string }> = ({ icon: Icon, text, color }) => (
    <View style={styles.instruction}>
        <Icon color={color} size={32} />
        <Spacer size={theme.spacing.m} horizontal />
        <Body style={styles.instructionText}>{text}</Body>
    </View>
);


interface OnboardingModalProps {
    onDismiss: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onDismiss }) => {
    return (
        <GlassCard style={styles.card}>
            <Title style={styles.title}>How it works</Title>
            <Spacer size={theme.spacing.l} />

            <Instruction icon={ArrowRight} text="Swipe right to Keep a photo" color={theme.colors.keep} />
            <Spacer size={theme.spacing.m} />
            <Instruction icon={ArrowLeft} text="Swipe left to Mark for Delete" color={theme.colors.delete} />
            <Spacer size={theme.spacing.m} />
            <Instruction icon={Check} text="Commit deletions to confirm" color={theme.colors.primary} />

            <Spacer size={theme.spacing.xl} />
            <GlassButton title="Start Cleaning" onPress={onDismiss} variant="primary" />
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: theme.spacing.xl,
        margin: theme.spacing.m,
    },
    title: {
        textAlign: 'center',
    },
    instruction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 40,
        height: 40,
    },
    instructionText: {
        flex: 1,
    }
});
