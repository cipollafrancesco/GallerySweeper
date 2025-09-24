import React from 'react';
import { useQueue } from '../../domain/queueManager';
import * as SettingsLink from '../../platform/settingsLink';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';

export const Onboarding: React.FC = () => {
    const { access, canAskAgain, loadInitial } = useQueue();

    const handlePress = () => {
        if (canAskAgain && access === 'undetermined') {
            loadInitial();
        } else {
            SettingsLink.openPhotosSettings();
        }
    };

    let title = 'One-Tap Deletion';
    let body = 'To avoid a confirmation popup for every photo, please grant Full Access to your library.';
    let ctaText = 'Grant Full Access';

    if (access === 'limited') {
        title = 'Full Access Required';
        body = 'You have granted limited access. To enable one-tap deletion, please allow Full Access in your settings.';
        ctaText = 'Open Settings';
    } else if (!canAskAgain && access === 'none') {
        title = 'Permission Denied';
        body = 'To use the app, you must enable photo permissions in your settings.';
        ctaText = 'Open Settings';
    }

    return (
        <GlassCard>
            <Title>{title}</Title>
            <Spacer size={20} />
            <Body>{body}</Body>
            <Spacer size={30} />
            <GlassButton title={ctaText} onPress={handlePress} />
        </GlassCard>
    );
};
