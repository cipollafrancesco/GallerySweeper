import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { useImperativeHandle } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from '../../platform/haptics';
import type { Asset } from '../../platform/mediaAccess';
import { Label } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const swipeThreshold = screenWidth * 0.3;

const CardAffordance: React.FC<{ text: string; color: string }> = ({ text, color }) => (
    <View style={styles.affordanceContainer}>
        <BlurView intensity={80} tint="dark" style={styles.affordanceBg} />
        <Label style={[styles.affordanceLabel, { color }]}>{text}</Label>
    </View>
);

interface SwipeDeckProps {
    asset: Asset;
    onLeft: () => void;
    onRight: () => void;
}

export interface SwipeDeckRef {
    swipeLeft: () => void;
    swipeRight: () => void;
}

export const SwipeDeck = React.forwardRef<SwipeDeckRef, SwipeDeckProps>(({ asset, onLeft, onRight }, ref) => {
    const translateX = useSharedValue(0);
    const hapticTriggered = useSharedValue(false);

    useImperativeHandle(ref, () => ({
        swipeLeft: () => {
            translateX.value = withTiming(-screenWidth, { duration: 250 }, () => {
                'worklet';
                runOnJS(onLeft)();
                translateX.value = 0;
            });
        },
        swipeRight: () => {
            translateX.value = withTiming(screenWidth, { duration: 250 }, () => {
                'worklet';
                runOnJS(onRight)();
                translateX.value = 0;
            });
        },
    }));

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            if (Math.abs(event.translationX) > swipeThreshold && !hapticTriggered.value) {
                hapticTriggered.value = true;
                runOnJS(Haptics.impact)();
            }
        })
        .onEnd((event) => {
            if (event.translationX < -swipeThreshold) {
                runOnJS(onLeft)();
            } else if (event.translationX > swipeThreshold) {
                runOnJS(onRight)();
            }
            translateX.value = withSpring(0);
            hapticTriggered.value = false;
        });

    const cardStyle = useAnimatedStyle(() => {
        const rotation = interpolate(
            translateX.value,
            [-screenWidth / 2, 0, screenWidth / 2],
            [-10, 0, 10],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            translateX.value,
            [-screenWidth / 2, 0, screenWidth / 2],
            [0.7, 1, 0.7],
            Extrapolate.CLAMP
        );

        return {
            opacity,
            transform: [{ translateX: translateX.value }, { rotate: `${rotation}deg` }],
        };
    });

    const leftAffordanceStyle = useAnimatedStyle(() => {
        const opacity = interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], Extrapolate.CLAMP);
        const scale = interpolate(translateX.value, [-swipeThreshold, 0], [1, 0.8], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale }] };
    });

    const rightAffordanceStyle = useAnimatedStyle(() => {
        const opacity = interpolate(translateX.value, [0, swipeThreshold], [0, 1], Extrapolate.CLAMP);
        const scale = interpolate(translateX.value, [0, swipeThreshold], [0.8, 1], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale }] };
    });

    // Calculate image dimensions to maintain aspect ratio
    const imageAspectRatio = asset.width / asset.height;
    const cardMaxWidth = screenWidth - theme.spacing.m * 2;
    const cardMaxHeight = screenHeight * 0.6; // Max 60% of screen height

    let cardWidth = cardMaxWidth;
    let cardHeight = cardWidth / imageAspectRatio;

    if (cardHeight > cardMaxHeight) {
        cardHeight = cardMaxHeight;
        cardWidth = cardHeight * imageAspectRatio;
    }


    return (
        <View style={styles.container} pointerEvents="box-none">
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }, cardStyle]}>
                    <Image source={{ uri: asset.uri }} style={styles.image} contentFit="cover" />

                    <Animated.View style={[styles.affordance, styles.leftAffordance, leftAffordanceStyle]}>
                        <CardAffordance text="Delete" color={theme.colors.delete} />
                    </Animated.View>

                    <Animated.View style={[styles.affordance, styles.rightAffordance, rightAffordanceStyle]}>
                        <CardAffordance text="Keep" color={theme.colors.keep} />
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        borderRadius: theme.radii.l,
        overflow: 'hidden',
        ...theme.shadows.subtle,
        borderWidth: 2,
        borderColor: theme.colors.glassBorder,
        backgroundColor: theme.colors.glassBg,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
    },
    affordance: {
        position: 'absolute',
        top: theme.spacing.m,
        bottom: theme.spacing.m,
        justifyContent: 'center',
    },
    leftAffordance: {
        left: theme.spacing.m,
    },
    rightAffordance: {
        right: theme.spacing.m,
    },
    affordanceContainer: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.radii.m,
        overflow: 'hidden',
    },
    affordanceBg: {
        ...StyleSheet.absoluteFillObject,
    },
    affordanceLabel: {
        ...theme.typography.label,
    },
});
