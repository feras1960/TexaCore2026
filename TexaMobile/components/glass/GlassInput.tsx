/**
 * GlassInput Component - Glassmorphism Text Input with Smooth Animations
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getTheme,
  BorderRadius,
  Spacing,
  Typography,
  AnimationDuration,
} from '@/constants/glassmorphism-theme';
import { GlassView } from './GlassView';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: any;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);

  const [isFocused, setIsFocused] = useState(false);
  const borderScale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(0);
  const labelScale = useSharedValue(1);

  // Animated border highlight
  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: borderScale.value }],
      opacity: borderOpacity.value,
      borderColor: error ? theme.error : theme.accent,
    };
  });

  // Animated label (floating label effect)
  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: labelTranslateY.value },
        { scale: labelScale.value },
      ],
    };
  });

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderScale.value = withSpring(1.02, {
      damping: 15,
      stiffness: 150,
    });
    borderOpacity.value = withTiming(1, { duration: AnimationDuration.fast });

    if (label) {
      labelTranslateY.value = withSpring(-24, {
        damping: 15,
        stiffness: 150,
      });
      labelScale.value = withSpring(0.85, {
        damping: 15,
        stiffness: 150,
      });
    }

    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderScale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
    borderOpacity.value = withTiming(0, { duration: AnimationDuration.fast });

    if (label && !props.value) {
      labelTranslateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      labelScale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    }

    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <GlassView
        variant="medium"
        shadow="soft2"
        borderRadius="md"
        style={styles.inputContainer}
      >
        {/* Animated Border Highlight */}
        <Animated.View style={[styles.borderHighlight, animatedBorderStyle]} />

        {/* Input Wrapper */}
        <View style={styles.inputWrapper}>
          {/* Left Icon */}
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          {/* Input with Floating Label */}
          <View style={styles.inputContent}>
            {label && (
              <Animated.Text
                style={[
                  styles.label,
                  {
                    color: error
                      ? theme.error
                      : isFocused
                      ? theme.accent
                      : theme.text.secondary,
                  },
                  animatedLabelStyle,
                ]}
              >
                {label}
              </Animated.Text>
            )}

            <TextInput
              {...props}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={[
                styles.input,
                {
                  color: theme.text.primary,
                  paddingTop: label ? Spacing.lg : Spacing.md,
                },
                style,
              ]}
              placeholderTextColor={theme.text.tertiary}
            />
          </View>

          {/* Right Icon */}
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      </GlassView>

      {/* Error Message */}
      {error && (
        <Animated.Text
          style={[styles.errorText, { color: theme.error }]}
          entering={undefined} // Will appear with fade
        >
          {error}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  inputContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  borderHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    pointerEvents: 'none',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  inputContent: {
    flex: 1,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: Spacing.lg,
    left: 0,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    transformOrigin: 'left top',
  },
  input: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    minHeight: 24,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

export default GlassInput;
