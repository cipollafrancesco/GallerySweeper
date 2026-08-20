import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface ZoomableImageProps {
    uri: string;
    /** Reports whether this photo is currently zoomed in, so the pager above
     * can disable its own swipe-to-navigate gesture while true — otherwise
     * panning a zoomed photo fights with paging to the next one. */
    onZoomChange?: (zoomed: boolean) => void;
}

/**
 * Pinch-to-zoom + pan-while-zoomed for one photo, with double-tap to toggle
 * zoom (reverse-pinching back to exactly 1x is fiddly, so this gives an easy
 * reset). The pan gesture only participates in the gesture arena while
 * actually zoomed (`.enabled(isZoomed)`) so it never steals the horizontal
 * swipe that pages between photos when at rest.
 */
export const ZoomableImage: React.FC<ZoomableImageProps> = ({ uri, onZoomChange }) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const [isZoomed, setIsZoomed] = useState(false);

    const reportZoom = (zoomed: boolean) => {
        setIsZoomed(zoomed);
        onZoomChange?.(zoomed);
    };

    const resetZoom = () => {
        'worklet';
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate((event) => {
            scale.value = Math.max(1, Math.min(savedScale.value * event.scale, MAX_SCALE));
        })
        .onEnd(() => {
            if (scale.value <= 1) {
                resetZoom();
                runOnJS(reportZoom)(false);
            } else {
                savedScale.value = scale.value;
                runOnJS(reportZoom)(true);
            }
        });

    const panGesture = Gesture.Pan()
        .enabled(isZoomed)
        .onUpdate((event) => {
            translateX.value = savedTranslateX.value + event.translationX;
            translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (savedScale.value > 1) {
                resetZoom();
                runOnJS(reportZoom)(false);
            } else {
                scale.value = withTiming(DOUBLE_TAP_SCALE);
                savedScale.value = DOUBLE_TAP_SCALE;
                runOnJS(reportZoom)(true);
            }
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="contain" />
            </Animated.View>
        </GestureDetector>
    );
};
