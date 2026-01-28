/**
 * GlassButton Component - Glassmorphism Button with Smooth Animations
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getTheme,
  BorderRadius,
  Spacing,
  Typography,
  AnimationDuration,
  Shadows,
} from '@/constants/glassmorphism-theme';
import { GlassView } from './GlassView';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          fontSize: Typography.fontSize.sm,
          height: 36,
        };
      case 'lg':
        return {
          paddingHorizontal: Spacing.xxl,
          paddingVertical: Spacing.lg,
          fontSize: Typography.fontSize.lg,
          height: 56,
        };
      default:
        return {
          paddingHorizontal: Spacing.xl,
          paddingVertical: Spacing.md,
          fontSize: Typography.fontSize.base,
          height: 48,
        };
    }
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.accent,
          borderColor: 'transparent',
          textColor: theme.text.inverse,
        };
      case 'secondary':
        return {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
          textColor: theme.text.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.accent,
          textColor: theme.accent,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: theme.accent,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  // Animated press effect
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(0.85, { duration: AnimationDuration.fast });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: AnimationDuration.fast });
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  // Render button content
  const renderContent = () => {
    if (variant === 'primary') {
      // Primary button - solid color, no glass effect
      return (
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[
            styles.button,
            {
              backgroundColor: variantStyles.backgroundColor,
              borderColor: variantStyles.borderColor,
              borderWidth: variant === 'outline' ? 2 : 0,
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
              height: sizeStyles.height,
              opacity: disabled ? 0.5 : 1,
              width: fullWidth ? '100%' : 'auto',
            },
            Shadows.soft3,
            animatedStyle,
            style,
          ]}
        >
          {leftIcon && <Animated.View style={styles.leftIcon}>{leftIcon}</Animated.View>}
          
          {loading ? (
            <ActivityIndicator color={variantStyles.textColor} size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: variantStyles.textColor,
                  fontSize: sizeStyles.fontSize,
                  fontWeight: Typography.fontWeight.semibold,
                },
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
          
          {rightIcon && <Animated.View style={styles.rightIcon}>{rightIcon}</Animated.View>}
        </AnimatedPressable>
      );
    }

    // Other variants - with glass effect
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, { width: fullWidth ? '100%' : 'auto' }]}
      >
        <GlassView
          variant="medium"
          shadow="soft2"
          borderRadius="md"
          style={[
            styles.button,
            {
              backgroundColor: variantStyles.backgroundColor,
              borderColor: variantStyles.borderColor,
              borderWidth: variant === 'outline' ? 2 : 0,
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
              height: sizeStyles.height,
              opacity: disabled ? 0.5 : 1,
            },
            style,
          ]}
        >
          {leftIcon && <Animated.View style={styles.leftIcon}>{leftIcon}</Animated.View>}
          
          {loading ? (
            <ActivityIndicator color={variantStyles.textColor} size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: variantStyles.textColor,
                  fontSize: sizeStyles.fontSize,
                  fontWeight: Typography.fontWeight.semibold,
                },
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
          
          {rightIcon && <Animated.View style={styles.rightIcon}>{rightIcon}</Animated.View>}
        </GlassView>
      </AnimatedPressable>
    );
  };

  return renderContent();
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  text: {
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
});

export default GlassButton;
