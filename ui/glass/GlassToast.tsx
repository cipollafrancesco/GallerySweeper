import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from '../primitives/Typography';
import { theme } from '../theme';

interface GlassToastProps {
    message: string;
    visible: boolean;
    onDismiss: () => void;
    variant?: 'error' | 'success';
}

const VISIBLE_MS = 3000;
const ENTER_MS = 280;
const EXIT_MS = 200;
const ENTER_TRANSLATE_Y = 16;
// Softer than the enter offset on purpose — exits should feel gentler than entrances.
const EXIT_TRANSLATE_Y = 8;
// Approximate BottomTabBar content height (icon + label + its own padding) so the
// toast floats clear of it. Not a measured pixel value — verify on-device and
// adjust if it overlaps on your particular device's safe-area configuration.
const TAB_BAR_CLEARANCE = 78;

/**
 * Bottom-right floating toast, matching the app's frosted-glass language
 * (BlurView + bordered + shadowed, same recipe as GlassCard/GlassButton).
 * Animates in (fade + slight upward slide) on mount, then fades/slides out
 * before actually calling `onDismiss` — the caller (ModalProvider) unmounts
 * this component on `onDismiss`, so deferring that call until the exit
 * animation finishes is what makes the exit visible instead of an abrupt cut.
 */
export const GlassToast: React.FC<GlassToastProps> = ({ message, visible, onDismiss, variant = 'error' }) => {
    const insets = useSafeAreaInsets();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(ENTER_TRANSLATE_Y);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
            translateY.value = withTiming(0, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });

            const timer = setTimeout(() => {
                opacity.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
                    if (finished) runOnJS(onDismiss)();
                });
                translateY.value = withTiming(EXIT_TRANSLATE_Y, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) });
            }, VISIBLE_MS);
            return () => clearTimeout(timer);
        } else {
            opacity.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
                if (finished) runOnJS(onDismiss)();
            });
            translateY.value = withTiming(EXIT_TRANSLATE_Y, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    const variantStyle = variant === 'error' ? styles.error : styles.success;

    return (
        <Animated.View
            style={[styles.container, { bottom: insets.bottom + TAB_BAR_CLEARANCE }, animatedStyle]}
            pointerEvents="none"
        >
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.content, variantStyle]}>
                <Body style={styles.text}>{message}</Body>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: theme.spacing.l,
        maxWidth: 320,
        borderRadius: theme.radii.l,
        overflow: 'hidden',
        borderColor: theme.colors.glassBorder,
        borderWidth: 1,
        ...theme.shadows.medium,
    },
    content: {
        padding: theme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        ...theme.typography.body,
        color: theme.colors.primary,
    },
    error: {
        backgroundColor: theme.colors.deleteFaded,
    },
    success: {
        backgroundColor: theme.colors.keepFaded,
    },
});
