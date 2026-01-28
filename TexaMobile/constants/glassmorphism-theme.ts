/**
 * Modern Glassmorphism Design System for TexaMobile
 * Following iOS & Android latest design standards
 */

import { Platform } from 'react-native';

// Primary Brand Colors
export const BrandColors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
};

// Glassmorphism Theme
export const GlassTheme = {
  light: {
    // Glass Effects
    glass: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.3)',
      shadow: 'rgba(0, 0, 0, 0.08)',
    },
    glassStrong: {
      background: 'rgba(255, 255, 255, 0.85)',
      border: 'rgba(255, 255, 255, 0.5)',
      shadow: 'rgba(0, 0, 0, 0.12)',
    },
    glassSubtle: {
      background: 'rgba(255, 255, 255, 0.5)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.05)',
    },
    
    // Text Colors
    text: {
      primary: '#11181C',
      secondary: '#687076',
      tertiary: '#9BA1A6',
      inverse: '#FFFFFF',
    },
    
    // Background Colors
    background: {
      primary: '#F5F7FA',
      secondary: '#FFFFFF',
      tertiary: '#E5E9F0',
    },
    
    // Accent & Status
    accent: BrandColors.primary[500],
    accentLight: BrandColors.primary[100],
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  dark: {
    // Glass Effects
    glass: {
      background: 'rgba(30, 30, 35, 0.7)',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
    glassStrong: {
      background: 'rgba(30, 30, 35, 0.85)',
      border: 'rgba(255, 255, 255, 0.15)',
      shadow: 'rgba(0, 0, 0, 0.4)',
    },
    glassSubtle: {
      background: 'rgba(30, 30, 35, 0.5)',
      border: 'rgba(255, 255, 255, 0.08)',
      shadow: 'rgba(0, 0, 0, 0.2)',
    },
    
    // Text Colors
    text: {
      primary: '#ECEDEE',
      secondary: '#9BA1A6',
      tertiary: '#687076',
      inverse: '#11181C',
    },
    
    // Background Colors
    background: {
      primary: '#0A0A0C',
      secondary: '#151718',
      tertiary: '#1E1E23',
    },
    
    // Accent & Status
    accent: BrandColors.primary[400],
    accentLight: BrandColors.primary[900],
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
};

// Gradient Presets
export const Gradients = {
  light: {
    primary: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
    secondary: ['#FAF5FF', '#F3E8FF', '#E9D5FF'],
    sunset: ['#FFF7ED', '#FFEDD5', '#FED7AA'],
    ocean: ['#ECFEFF', '#CFFAFE', '#A5F3FC'],
    forest: ['#F0FDF4', '#DCFCE7', '#BBF7D0'],
    warm: ['#FFF1F2', '#FFE4E6', '#FECDD3'],
  },
  dark: {
    primary: ['#082F49', '#0C4A6E', '#075985'],
    secondary: ['#3B0764', '#581C87', '#6B21A8'],
    sunset: ['#431407', '#7C2D12', '#9A3412'],
    ocean: ['#083344', '#164E63', '#155E75'],
    forest: ['#052E16', '#14532D', '#166534'],
    warm: ['#4C0519', '#881337', '#9F1239'],
  },
};

// Soft Shadows (iOS-style)
export const Shadows = {
  // Elevation 1 - Subtle
  soft1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Elevation 2 - Small Cards
  soft2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Elevation 3 - Medium Cards
  soft3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // Elevation 4 - Large Cards
  soft4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  
  // Elevation 5 - Modals & Popups
  soft5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
  },
  
  // Glass Shadow (for glassmorphism)
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
};

// Border Radius
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

// Spacing System (8px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Typography
export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  
  // Font Weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Blur Intensity (for expo-blur)
export const BlurIntensity = {
  light: {
    subtle: 10,
    medium: 20,
    strong: 40,
  },
  dark: {
    subtle: 15,
    medium: 30,
    strong: 50,
  },
};

// Animation Durations
export const AnimationDuration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Animation Easing
export const AnimationEasing = {
  // Smooth, natural motion
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  // Quick start, smooth end
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  // Smooth start, quick end
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  // Smooth both ends
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  // Spring-like motion
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Helper function to get current theme
export const getTheme = (isDark: boolean) => {
  return isDark ? GlassTheme.dark : GlassTheme.light;
};

// Helper function to get current gradient
export const getGradients = (isDark: boolean) => {
  return isDark ? Gradients.dark : Gradients.light;
};

// Helper function to get blur intensity
export const getBlurIntensity = (isDark: boolean) => {
  return isDark ? BlurIntensity.dark : BlurIntensity.light;
};

// Export all
export default {
  BrandColors,
  GlassTheme,
  Gradients,
  Shadows,
  BorderRadius,
  Spacing,
  Typography,
  BlurIntensity,
  AnimationDuration,
  AnimationEasing,
  getTheme,
  getGradients,
  getBlurIntensity,
};
