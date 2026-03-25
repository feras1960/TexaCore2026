/**
 * GlassCard Component - Glassmorphism Card with Hover Effect
 */

import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GlassView, GlassVariant, GlassShadow, GlassRadius } from './GlassView';
import { AnimationDuration } from '@/constants/glassmorphism-theme';

interface GlassCardProps {
  children?: React.ReactNode;
  variant?: GlassVariant;
  shadow?: GlassShadow;
  borderRadius?: GlassRadius;
  style?: ViewStyle;
  onPress?: () => void;
  pressable?: boolean;
  animated?: boolean;
  hoverEffect?: boolean; // Enable hover/press scale effect
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'medium',
  shadow = 'soft3',
  borderRadius = 'lg',
  style,
  onPress,
  pressable = true,
  animated = true,
  hoverEffect = true,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated press effect
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (hoverEffect && pressable && onPress) {
      scale.value = withSpring(0.97, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(0.8, { duration: AnimationDuration.fast });
    }
  };

  const handlePressOut = () => {
    if (hoverEffect && pressable && onPress) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: AnimationDuration.fast });
    }
  };

  if (!pressable || !onPress) {
    return (
      <GlassView
        variant={variant}
        shadow={shadow}
        borderRadius={borderRadius}
        style={style}
        animated={animated}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
    >
      <GlassView
        variant={variant}
        shadow={shadow}
        borderRadius={borderRadius}
        style={style}
        animated={animated}
      >
        {children}
      </GlassView>
    </AnimatedPressable>
  );
};

export default GlassCard;
