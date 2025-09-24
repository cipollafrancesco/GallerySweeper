import { Image } from 'expo-image';
import React from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from '../../platform/haptics';
import type { Asset } from '../../platform/mediaAccess';

const { width: screenWidth } = Dimensions.get('window');
const swipeThreshold = screenWidth * 0.25;

interface SwipeDeckProps {
    asset: Asset;
    onLeft: () => void;
    onRight: () => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({ asset, onLeft, onRight }) => {
    const translateX = useSharedValue(0);
    const hapticTriggered = useSharedValue(false);

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

    const animatedStyle = useAnimatedStyle(() => {
        const rotation = interpolate(
            translateX.value,
            [-screenWidth / 2, 0, screenWidth / 2],
            [-10, 0, 10],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            translateX.value,
            [-screenWidth / 2, 0, screenWidth / 2],
            [0.5, 1, 0.5],
            Extrapolate.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { rotate: `${rotation}deg` },
            ],
            opacity,
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
                <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </Animated.View>
        </GestureDetector>
    );
};
