/**
 * Swiss Minimalism Theme
 * Ultra-clean, professional, iOS-inspired design
 */

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════
// 🎨 SWISS MINIMALISM COLOR PALETTE
// ═══════════════════════════════════════════

export const SwissColors = {
  light: {
    // Pure whites and grays
    white: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#FAFAFA',
    
    // Neutral grays (Swiss precision)
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    
    // Text colors
    text: '#000000',
    textSecondary: '#616161',
    textTertiary: '#9E9E9E',
    
    // Borders
    border: 'rgba(0, 0, 0, 0.08)',
    borderStrong: 'rgba(0, 0, 0, 0.12)',
    
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.03)',
    
    // Subtle accent (minimal use only)
    accent: '#2196F3', // iOS blue
    
    // Status colors (minimal, subtle)
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  },
  
  dark: {
    // Dark mode
    white: '#FFFFFF',
    background: '#000000',
    surface: '#1C1C1E',
    
    // Dark grays
    gray50: '#1C1C1E',
    gray100: '#2C2C2E',
    gray200: '#3A3A3C',
    gray300: '#48484A',
    gray400: '#636366',
    gray500: '#8E8E93',
    gray600: '#AEAEB2',
    gray700: '#C7C7CC',
    gray800: '#D1D1D6',
    gray900: '#E5E5EA',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#8E8E93',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.15)',
    
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    
    // Accent
    accent: '#0A84FF', // iOS blue (dark mode)
    
    // Status colors (adjusted for dark)
    success: '#32D74B',
    error: '#FF453A',
    warning: '#FF9F0A',
    info: '#0A84FF',
  },
};

// ═══════════════════════════════════════════
// 🌊 iOS FLUID EFFECT
// ═══════════════════════════════════════════

export const FluidEffect = {
  // Glass morphism (ultra-subtle)
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  // Floating card (iOS style)
  floatingCard: {
    backgroundColor: SwissColors.white,
    shadowColor: SwissColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderRadius: 16,
  },
  
  // Subtle divider
  divider: {
    height: 0.5,
    backgroundColor: SwissColors.gray200,
  },
};

// ═══════════════════════════════════════════
// 📐 TYPOGRAPHY (Swiss Precision)
// ═══════════════════════════════════════════

export const SwissTypography = {
  // Headlines
  h1: {
    fontFamily: 'System',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 41,
    color: SwissColors.black,
  },
  
  h2: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 34,
    color: SwissColors.black,
  },
  
  h3: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 28,
    color: SwissColors.black,
  },
  
  // Body
  body: {
    fontFamily: 'System',
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.1,
    lineHeight: 22,
    color: SwissColors.gray800,
  },
  
  bodyBold: {
    fontFamily: 'System',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 22,
    color: SwissColors.black,
  },
  
  // Caption
  caption: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
    color: SwissColors.gray600,
  },
  
  // Numbers (tabular)
  number: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    color: SwissColors.black,
  },
};

// ═══════════════════════════════════════════
// 📏 SPACING (8pt Grid System)
// ═══════════════════════════════════════════

export const SwissSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Screen padding
  screenPadding: 20,
  
  // Card padding
  cardPadding: 16,
};

// ═══════════════════════════════════════════
// 🎭 ANIMATIONS (iOS Fluid)
// ═══════════════════════════════════════════

export const FluidAnimations = {
  // Smooth spring (iOS default)
  spring: {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  },
  
  // Gentle scale
  scaleDown: {
    scale: 0.97,
  },
  
  // Timing (iOS feels)
  timing: {
    duration: 400,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // iOS easing
  },
};

// ═══════════════════════════════════════════
// 🧩 COMPONENTS
// ═══════════════════════════════════════════

export const SwissComponents = {
  // Button
  button: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    
    // Primary (minimal)
    primary: {
      backgroundColor: SwissColors.black,
    },
    
    // Secondary (outline)
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: SwissColors.gray300,
    },
    
    // Ghost
    ghost: {
      backgroundColor: 'transparent',
    },
  },
  
  // Input
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: SwissColors.gray100,
    borderWidth: 0,
    ...SwissTypography.body,
  },
  
  // Card
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: SwissColors.white,
    ...FluidEffect.floatingCard,
  },
  
  // Stat card (numbers)
  statCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: SwissColors.gray50,
    borderWidth: 0.5,
    borderColor: SwissColors.gray200,
  },
};

// ═══════════════════════════════════════════
// 📱 LAYOUT
// ═══════════════════════════════════════════

export const SwissLayout = {
  screen: {
    flex: 1,
    backgroundColor: SwissColors.white,
  },
  
  container: {
    flex: 1,
    paddingHorizontal: SwissSpacing.screenPadding,
  },
  
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: SwissSpacing.screenPadding,
    backgroundColor: SwissColors.white,
  },
  
  section: {
    marginBottom: SwissSpacing.lg,
  },
};

// ═══════════════════════════════════════════
// 🎯 GET THEME (Dark/Light)
// ═══════════════════════════════════════════

export const getSwissTheme = (isDark: boolean = false) => {
  const colors = isDark ? SwissColors.dark : SwissColors.light;
  
  return {
    colors,
    
    typography: {
      h1: {
        fontFamily: 'System',
        fontSize: 34,
        fontWeight: '700' as any,
        letterSpacing: -0.5,
        lineHeight: 41,
        color: colors.text,
      },
      h2: {
        fontFamily: 'System',
        fontSize: 28,
        fontWeight: '700' as any,
        letterSpacing: -0.3,
        lineHeight: 34,
        color: colors.text,
      },
      h3: {
        fontFamily: 'System',
        fontSize: 22,
        fontWeight: '600' as any,
        letterSpacing: -0.2,
        lineHeight: 28,
        color: colors.text,
      },
      body: {
        fontFamily: 'System',
        fontSize: 17,
        fontWeight: '400' as any,
        letterSpacing: -0.1,
        lineHeight: 22,
        color: colors.textSecondary,
      },
      bodyBold: {
        fontFamily: 'System',
        fontSize: 17,
        fontWeight: '600' as any,
        letterSpacing: -0.1,
        lineHeight: 22,
        color: colors.text,
      },
      caption: {
        fontFamily: 'System',
        fontSize: 13,
        fontWeight: '400' as any,
        letterSpacing: 0,
        lineHeight: 18,
        color: colors.textTertiary,
      },
      number: {
        fontFamily: 'System',
        fontSize: 24,
        fontWeight: '600' as any,
        letterSpacing: -0.2,
        color: colors.text,
      },
    },
    
    spacing: SwissSpacing,
    animations: FluidAnimations,
    
    components: {
      card: {
        borderRadius: 16,
        padding: 20,
        backgroundColor: colors.surface,
        borderWidth: 0.5,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      },
      
      statCard: {
        borderRadius: 12,
        padding: 16,
        backgroundColor: colors.surface,
        borderWidth: 0.5,
        borderColor: colors.border,
      },
      
      button: {
        primary: {
          backgroundColor: colors.text,
        },
        secondary: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
      },
      
      input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderWidth: 0.5,
        borderColor: colors.border,
        color: colors.text,
      },
    },
    
    layout: {
      screen: {
        flex: 1,
        backgroundColor: colors.background,
      },
      container: {
        flex: 1,
        paddingHorizontal: SwissSpacing.screenPadding,
      },
    },
  };
};

// Export default (light theme)
export const SwissTheme = getSwissTheme(false);

export default SwissTheme;
