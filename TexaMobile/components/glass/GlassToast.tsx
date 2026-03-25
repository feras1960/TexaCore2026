/**
 * GlassToast - Glassmorphism Toast Notifications
 * Beautiful toast messages with blur effect
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getTheme,
  getBlurIntensity,
  Shadows,
  BorderRadius,
  Spacing,
  Typography,
  AnimationDuration,
} from '@/constants/glassmorphism-theme';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

interface GlassToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  position?: ToastPosition;
  onHide?: () => void;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const GlassToast: React.FC<GlassToastProps> = ({
  visible,
  type,
  message,
  duration = 3000,
  position = 'top',
  onHide,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const blurIntensity = getBlurIntensity(isDark);

  const translateY = useSharedValue(position === 'top' ? -100 : 100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Show animation
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: AnimationDuration.fast });

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hideToast = () => {
    translateY.value = withSpring(position === 'top' ? -100 : 100, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(0, { duration: AnimationDuration.fast }, () => {
      if (onHide) {
        runOnJS(onHide)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  // Get icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: theme.success,
          bgColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: theme.error,
          bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: theme.warning,
          bgColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
        };
      case 'info':
        return {
          icon: 'information-circle',
          color: theme.info,
          bgColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        };
    }
  };

  const config = getTypeConfig();

  if (!visible) return null;

  return (
    <AnimatedBlurView
      intensity={blurIntensity.strong}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          top: position === 'top' ? Spacing.xxxl : undefined,
          bottom: position === 'bottom' ? Spacing.xxxl : undefined,
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
        },
        Shadows.soft4,
        animatedStyle,
      ]}
    >
      {/* Background overlay for color */}
      <View
        style={[
          styles.colorOverlay,
          {
            backgroundColor: config.bgColor,
          },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <Ionicons name={config.icon as any} size={24} color={config.color} />

        {/* Message */}
        <Text
          style={[
            styles.message,
            {
              color: theme.text.primary,
              fontSize: Typography.fontSize.base,
              fontWeight: Typography.fontWeight.medium,
            },
          ]}
          numberOfLines={3}
        >
          {message}
        </Text>
      </View>
    </AnimatedBlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    maxWidth: width - Spacing.lg * 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  message: {
    flex: 1,
  },
});

export default GlassToast;
