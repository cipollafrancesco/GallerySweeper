import { ArrowRight, Settings } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueue } from '../../domain/queueManager';
import * as SettingsLink from '../../platform/settingsLink';
import { useModal } from '../../providers/ModalProvider';
import { GlassCard } from '../../ui/glass/GlassCard';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Subtitle } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

export const Onboarding: React.FC = () => {
    const { access, canAskAgain, resolvePermissionRequest } = useQueue();
    const { hideModal } = useModal();

    const handlePress = useCallback(async () => {
        if (canAskAgain && access === 'undetermined') {
            await resolvePermissionRequest();
            hideModal();
        } else {
            SettingsLink.openPhotosSettings();
            hideModal();
        }
    }, [access, canAskAgain, resolvePermissionRequest, hideModal]);

    let title = 'One-Tap Deletion';
    let body = 'To avoid a confirmation popup for every photo, please grant Full Access to your library.';
    let ctaText = 'Grant Full Access';
    let icon = <ArrowRight size={20} color={theme.colors.white} />;
    let buttonVariant: 'primary' | 'secondary' = 'primary';

    if (access === 'limited') {
        title = 'Full Access Required';
        body = 'You have granted limited access. To enable one-tap deletion, please allow Full Access in your settings.';
        ctaText = 'Open Settings';
        icon = <Settings size={20} color={theme.colors.white} />;
        buttonVariant = 'primary';
    } else if (access === 'none') {
        title = 'Permission Denied';
        body = 'To use the app, you must enable photo permissions in your settings.';
        ctaText = 'Open Settings';
        icon = <Settings size={20} color={theme.colors.white} />;
        buttonVariant = 'secondary';
    }

    return (
        <GlassCard style={styles.card}>
            <View style={styles.content}>
                <Subtitle style={styles.title}>{title}</Subtitle>
                <Spacer size={theme.spacing.l} />
                <Body style={styles.body}>{body}</Body>
                <Spacer size={theme.spacing.xxl} />

                <ModernButton
                    title={ctaText}
                    onPress={handlePress}
                    variant={buttonVariant}
                    icon={icon}
                />
            </View>
        </GlassCard>
    );
};

// iOS-style button component matching project design patterns
interface ModernButtonProps {
    title: string;
    onPress: () => void;
    variant: 'primary' | 'secondary';
    icon: React.ReactNode;
}

const ModernButton: React.FC<ModernButtonProps> = ({ title, onPress, variant, icon }) => {
    const isPrimary = variant === 'primary';

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                isPrimary ? styles.primaryButton : styles.secondaryButton,
                pressed && styles.buttonPressed,
            ]}
            onPress={onPress}
        >
            <View style={styles.buttonContent}>
                <View style={[
                    styles.iconContainer,
                    isPrimary ? styles.primaryIconContainer : styles.secondaryIconContainer
                ]}>
                    {icon}
                </View>
                <Text style={[
                    styles.buttonText,
                    isPrimary ? styles.primaryButtonText : styles.secondaryButtonText
                ]}>
                    {title}
                </Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 0,
        margin: theme.spacing.m,
        maxHeight: 400,
        overflow: 'hidden',
    },
    content: {
        padding: theme.spacing.xl,
    },
    title: {
        textAlign: 'center',
        marginBottom: theme.spacing.s,
    },
    body: {
        textAlign: 'center',
        color: theme.colors.secondaryLabel,
        lineHeight: 24,
    },

    // iOS-style Button Styles (matching project patterns)
    button: {
        borderRadius: theme.radii.l,
        minHeight: theme.spacing.xl,
        ...theme.shadows.small,
    },
    primaryButton: {
        backgroundColor: theme.colors.systemBlue,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.systemBlue,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        gap: theme.spacing.m,
    },
    iconContainer: {
        width: theme.spacing.xxxl,
        height: theme.spacing.xxxl,
        borderRadius: theme.radii.m,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    secondaryIconContainer: {
        backgroundColor: theme.colors.systemBlue,
    },
    buttonText: {
        ...theme.typography.headline,
        fontWeight: '600',
    },
    primaryButtonText: {
        color: theme.colors.white,
    },
    secondaryButtonText: {
        color: theme.colors.systemBlue,
    },
});
