/**
 * GlassView Component - Modern Glassmorphism Container
 * Supports Light/Dark mode with automatic theme switching
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { 
  getTheme, 
  getBlurIntensity,
  Shadows,
  BorderRadius,
  AnimationDuration,
} from '@/constants/glassmorphism-theme';

export type GlassVariant = 'subtle' | 'medium' | 'strong';
export type GlassShadow = 'none' | 'soft1' | 'soft2' | 'soft3' | 'soft4' | 'soft5' | 'glass';
export type GlassRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'round';

interface GlassViewProps {
  children?: React.ReactNode;
  variant?: GlassVariant;
  shadow?: GlassShadow;
  borderRadius?: GlassRadius;
  style?: ViewStyle;
  animated?: boolean;
  intensity?: number; // Custom blur intensity
  tint?: 'light' | 'dark' | 'default'; // Force specific tint
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  variant = 'medium',
  shadow = 'glass',
  borderRadius = 'lg',
  style,
  animated = true,
  intensity,
  tint = 'default',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const blurIntensities = getBlurIntensity(isDark);

  // Get blur intensity based on variant
  const getVariantIntensity = () => {
    if (intensity !== undefined) return intensity;
    switch (variant) {
      case 'subtle': return blurIntensities.subtle;
      case 'strong': return blurIntensities.strong;
      default: return blurIntensities.medium;
    }
  };

  // Get glass style based on variant
  const getGlassStyle = () => {
    switch (variant) {
      case 'subtle': return theme.glassSubtle;
      case 'strong': return theme.glassStrong;
      default: return theme.glass;
    }
  };

  const glassStyle = getGlassStyle();
  const blurIntensity = getVariantIntensity();

  // Animated entrance
  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {};
    return {
      opacity: withTiming(1, { duration: AnimationDuration.normal }),
      transform: [
        {
          scale: withSpring(1, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  // Determine tint mode
  const getTint = () => {
    if (tint !== 'default') return tint;
    return isDark ? 'dark' : 'light';
  };

  return (
    <AnimatedBlurView
      intensity={blurIntensity}
      tint={getTint()}
      style={[
        styles.container,
        {
          backgroundColor: glassStyle.background,
          borderColor: glassStyle.border,
          borderWidth: 1,
          borderRadius: BorderRadius[borderRadius],
        },
        shadow !== 'none' && Shadows[shadow],
        animated && animatedStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {children}
      </View>
    </AnimatedBlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});

export default GlassView;
