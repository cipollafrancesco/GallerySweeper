import React from 'react';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';

interface OnboardingModalProps {
    onDismiss: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onDismiss }) => {
    return (
        <GlassCard>
            <Title>A quick note on deleting</Title>
            <Spacer size={20} />
            <Body>
                To save you time, we’ll batch your deletions. Swipe left to mark photos for deletion, then tap "Commit Deletes" to confirm them all at once.
            </Body>
            <Spacer size={30} />
            <GlassButton title="Got It" onPress={onDismiss} />
        </GlassCard>
    );
};
