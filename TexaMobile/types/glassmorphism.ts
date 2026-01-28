/**
 * TypeScript Type Definitions for Glassmorphism Components
 */

// ========================================
// Glass Component Types
// ========================================

export type GlassVariant = 'subtle' | 'medium' | 'strong';
export type GlassShadow = 'none' | 'soft1' | 'soft2' | 'soft3' | 'soft4' | 'soft5' | 'glass';
export type GlassRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'round';
export type GlassTint = 'light' | 'dark' | 'default';

// ========================================
// Button Types
// ========================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// ========================================
// Gradient Types
// ========================================

export type GradientPreset = 'primary' | 'secondary' | 'sunset' | 'ocean' | 'forest' | 'warm';

// ========================================
// Theme Types
// ========================================

export interface GlassEffect {
  background: string;
  border: string;
  shadow: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  inverse: string;
}

export interface BackgroundColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface ThemeColors {
  glass: GlassEffect;
  glassStrong: GlassEffect;
  glassSubtle: GlassEffect;
  text: TextColors;
  background: BackgroundColors;
  accent: string;
  accentLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// ========================================
// Color Palette Types
// ========================================

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface BrandColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
}

// ========================================
// Shadow Types
// ========================================

export interface Shadow {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ShadowSystem {
  soft1: Shadow;
  soft2: Shadow;
  soft3: Shadow;
  soft4: Shadow;
  soft5: Shadow;
  glass: Shadow;
}

// ========================================
// Typography Types
// ========================================

export interface FontSizes {
  xs: number;
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  display: number;
}

export interface FontWeights {
  light: '300';
  regular: '400';
  medium: '500';
  semibold: '600';
  bold: '700';
  heavy: '800';
}

export interface LineHeights {
  tight: number;
  normal: number;
  relaxed: number;
}

export interface TypographySystem {
  fontSize: FontSizes;
  fontWeight: FontWeights;
  lineHeight: LineHeights;
}

// ========================================
// Spacing Types
// ========================================

export interface SpacingSystem {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

// ========================================
// Border Radius Types
// ========================================

export interface BorderRadiusSystem {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
}

// ========================================
// Animation Types
// ========================================

export interface AnimationDurations {
  instant: number;
  fast: number;
  normal: number;
  slow: number;
  verySlow: number;
}

export interface AnimationEasings {
  smooth: string;
  easeOut: string;
  easeIn: string;
  easeInOut: string;
  spring: string;
}

// ========================================
// Blur Intensity Types
// ========================================

export interface BlurIntensity {
  subtle: number;
  medium: number;
  strong: number;
}

export interface BlurIntensitySystem {
  light: BlurIntensity;
  dark: BlurIntensity;
}

// ========================================
// Complete Design System Type
// ========================================

export interface DesignSystem {
  BrandColors: BrandColorPalette;
  GlassTheme: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  Gradients: {
    light: Record<GradientPreset, string[]>;
    dark: Record<GradientPreset, string[]>;
  };
  Shadows: ShadowSystem;
  BorderRadius: BorderRadiusSystem;
  Spacing: SpacingSystem;
  Typography: TypographySystem;
  BlurIntensity: BlurIntensitySystem;
  AnimationDuration: AnimationDurations;
  AnimationEasing: AnimationEasings;
}

// ========================================
// Helper Function Types
// ========================================

export type GetThemeFunction = (isDark: boolean) => ThemeColors;
export type GetGradientsFunction = (isDark: boolean) => Record<GradientPreset, string[]>;
export type GetBlurIntensityFunction = (isDark: boolean) => BlurIntensity;

// ========================================
// Component Prop Types (Re-export)
// ========================================

export interface BaseGlassProps {
  variant?: GlassVariant;
  shadow?: GlassShadow;
  borderRadius?: GlassRadius;
  animated?: boolean;
}

export interface GlassViewProps extends BaseGlassProps {
  children?: React.ReactNode;
  style?: any;
  intensity?: number;
  tint?: GlassTint;
}

export interface GlassCardProps extends BaseGlassProps {
  children?: React.ReactNode;
  style?: any;
  onPress?: () => void;
  pressable?: boolean;
  hoverEffect?: boolean;
}

export interface GlassInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: any;
  value?: string;
  onChangeText?: (text: string) => void;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
}

export interface GlassButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: any;
  textStyle?: any;
  fullWidth?: boolean;
}

export interface GlassBackgroundProps {
  children?: React.ReactNode;
  preset?: GradientPreset;
  animated?: boolean;
  customColors?: string[];
}
