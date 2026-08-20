import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Check, Trash2 } from 'lucide-react-native';
import React, { useImperativeHandle, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
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

// Enhanced iOS-style chip overlay component with improved visibility
const ChipOverlay: React.FC<{ text: string; color: string; icon: React.ReactNode }> = ({ text, color, icon }) => (
    <View style={[styles.chipContainer, { backgroundColor: color }]}>
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.chipBorder} />
        <View style={styles.chipContent}>
            {icon}
            <Label style={styles.chipLabel}>{text}</Label>
        </View>
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
    const isGestureActive = useSharedValue(false);

    // The deck's actual available box — this container fills `deckRegion` in
    // App.tsx exactly (via absoluteFillObject below), so its measured size is
    // the real space available between the header and Hud, unlike a fixed
    // fraction of the full device screen (see cardMaxWidth/cardMaxHeight below).
    // Defaults match the old hardcoded behavior until the first layout lands.
    const [containerSize, setContainerSize] = useState({ width: screenWidth, height: screenHeight * 0.6 });
    const onContainerLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
    };

    useImperativeHandle(ref, () => ({
        swipeLeft: () => {
            Haptics.impact();
            translateX.value = withTiming(-screenWidth, { duration: 300 }, () => {
                'worklet';
                runOnJS(onLeft)();
                translateX.value = 0;
            });
        },
        swipeRight: () => {
            Haptics.impact();
            translateX.value = withTiming(screenWidth, { duration: 300 }, () => {
                'worklet';
                runOnJS(onRight)();
                translateX.value = 0;
            });
        },
    }));

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            isGestureActive.value = true;
        })
        .onUpdate((event) => {
            translateX.value = event.translationX;
            if (Math.abs(event.translationX) > swipeThreshold && !hapticTriggered.value) {
                hapticTriggered.value = true;
                runOnJS(Haptics.impact)();
            }
        })
        .onEnd((event) => {
            isGestureActive.value = false;
            if (event.translationX < -swipeThreshold) {
                runOnJS(onLeft)();
            } else if (event.translationX > swipeThreshold) {
                runOnJS(onRight)();
            }
            // iOS-style spring animation - bouncy but controlled
            translateX.value = withSpring(0, {
                damping: 15,
                stiffness: 150,
                mass: 1,
            });
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
        // Only show chips during active gesture
        if (!isGestureActive.value) {
            return {
                opacity: 0,
                transform: [{ scale: 0.7 }, { translateY: -10 }]
            };
        }

        // Start showing at 15% of threshold for early feedback
        const earlyThreshold = swipeThreshold * 0.15;
        const opacity = interpolate(
            translateX.value,
            [-swipeThreshold, -earlyThreshold, 0],
            [1, 0.4, 0],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            translateX.value,
            [-swipeThreshold, -earlyThreshold, 0],
            [1.1, 0.9, 0.7],
            Extrapolate.CLAMP
        );
        const translateY = interpolate(
            translateX.value,
            [-swipeThreshold, 0],
            [0, -10],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ scale }, { translateY }]
        };
    });

    const rightAffordanceStyle = useAnimatedStyle(() => {
        // Only show chips during active gesture
        if (!isGestureActive.value) {
            return {
                opacity: 0,
                transform: [{ scale: 0.7 }, { translateY: -10 }]
            };
        }

        // Start showing at 15% of threshold for early feedback
        const earlyThreshold = swipeThreshold * 0.15;
        const opacity = interpolate(
            translateX.value,
            [0, earlyThreshold, swipeThreshold],
            [0, 0.4, 1],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            translateX.value,
            [0, earlyThreshold, swipeThreshold],
            [0.7, 0.9, 1.1],
            Extrapolate.CLAMP
        );
        const translateY = interpolate(
            translateX.value,
            [0, swipeThreshold],
            [-10, 0],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ scale }, { translateY }]
        };
    });

    // Calculate image dimensions to maintain aspect ratio, capped to the
    // measured space actually available (see containerSize above) rather than
    // a fixed fraction of the whole screen — otherwise the card doesn't shrink
    // when the header/Hud grow, and overflows on top of them.
    const imageAspectRatio = asset.width / asset.height;
    const cardMaxWidth = containerSize.width - theme.spacing.m * 2;
    const cardMaxHeight = containerSize.height - theme.spacing.m * 2;

    let cardWidth = cardMaxWidth;
    let cardHeight = cardWidth / imageAspectRatio;

    if (cardHeight > cardMaxHeight) {
        cardHeight = cardMaxHeight;
        cardWidth = cardHeight * imageAspectRatio;
    }


    return (
        <View style={styles.container} pointerEvents="box-none" onLayout={onContainerLayout}>
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[styles.cardContainer, { width: cardWidth, height: cardHeight }, cardStyle]}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel="Photo to review"
                    accessibilityHint="Swipe right to keep, left to delete. Or use the actions to choose."
                    accessibilityActions={[
                        { name: 'keep', label: 'Keep' },
                        { name: 'delete', label: 'Delete' },
                    ]}
                    onAccessibilityAction={(e) => {
                        if (e.nativeEvent.actionName === 'keep') {
                            onRight();
                        } else if (e.nativeEvent.actionName === 'delete') {
                            onLeft();
                        }
                    }}
                >
                    <Image source={{ uri: asset.uri }} style={styles.image} contentFit="cover" />

                    <Animated.View style={[styles.overlay, styles.leftOverlay, leftAffordanceStyle]}>
                        <ChipOverlay
                            text="Delete"
                            color={theme.colors.deleteFaded}
                            icon={<Trash2 color={theme.colors.delete} size={20} />}
                        />
                    </Animated.View>

                    <Animated.View style={[styles.overlay, styles.rightOverlay, rightAffordanceStyle]}>
                        <ChipOverlay
                            text="Keep"
                            color={theme.colors.keepFaded}
                            icon={<Check color={theme.colors.keep} size={20} />}
                        />
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
        borderRadius: theme.radii.xl,
        overflow: 'hidden',
        ...theme.shadows.medium,
        backgroundColor: theme.colors.secondarySystemBackground,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
    },

    // Overlay styles - centered positioning
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftOverlay: {
        // Centered positioning maintained by parent overlay styles
    },
    rightOverlay: {
        // Centered positioning maintained by parent overlay styles
    },

    // Enhanced chip styles for better visibility
    chipContainer: {
        borderRadius: theme.radii.pill,
        overflow: 'hidden',
        ...theme.shadows.large,
        minWidth: 110,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        // Additional shadow for better definition
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 12, // Android shadow
    },
    chipBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    chipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m + 2,
        paddingHorizontal: theme.spacing.l + 4,
        gap: theme.spacing.s,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Additional backdrop
    },
    chipLabel: {
        ...theme.typography.headline,
        fontWeight: '700', // Bolder text
        color: theme.colors.white,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
