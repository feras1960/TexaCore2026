/**
 * GlassBackground Component - Animated Gradient Background
 * Perfect for login screens and hero sections
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGradients, AnimationDuration } from '@/constants/glassmorphism-theme';

type GradientPreset = 'primary' | 'secondary' | 'sunset' | 'ocean' | 'forest' | 'warm';

interface GlassBackgroundProps {
  children?: React.ReactNode;
  preset?: GradientPreset;
  animated?: boolean;
  customColors?: string[];
}

const { width, height } = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const GlassBackground: React.FC<GlassBackgroundProps> = ({
  children,
  preset = 'primary',
  animated = true,
  customColors,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const gradients = getGradients(isDark);

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Get gradient colors
  const colors = customColors || gradients[preset];

  // Animated gradient movement
  useEffect(() => {
    if (animated) {
      // Horizontal movement
      translateX.value = withRepeat(
        withSequence(
          withTiming(20, {
            duration: AnimationDuration.verySlow * 3,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-20, {
            duration: AnimationDuration.verySlow * 3,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );

      // Vertical movement
      translateY.value = withRepeat(
        withSequence(
          withTiming(15, {
            duration: AnimationDuration.verySlow * 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-15, {
            duration: AnimationDuration.verySlow * 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );

      // Scale pulsing
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, {
            duration: AnimationDuration.verySlow * 4,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: AnimationDuration.verySlow * 4,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    }
  }, [animated, translateX, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {};
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Animated Gradient Background */}
      <AnimatedLinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, animatedStyle]}
      />

      {/* Overlay Gradient for Depth */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.overlay}
        pointerEvents="none"
      />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 1.2,
    top: -height * 0.1,
    left: -width * 0.1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default GlassBackground;
