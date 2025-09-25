import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme';
import { Body } from '../primitives/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GlassToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  variant?: 'error' | 'success';
}

export const GlassToast: React.FC<GlassToastProps> = ({ message, visible, onDismiss, variant = 'error' }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, insets.top + 10],
  });

  const variantStyle = variant === 'error' ? styles.error : styles.success;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
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
    top: 0,
    left: 20,
    right: 20,
    borderRadius: theme.radii.m,
    overflow: 'hidden',
    borderColor: theme.colors.glassBorder,
    borderWidth: 1,
    ...theme.shadows.subtle,
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
