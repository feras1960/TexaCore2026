/**
 * Unified Design System - نظام التصميم الموحد
 * Swiss Minimalism + iOS Fluid Animations
 * متوافق مع نسخة الويب و Mobile
 */

import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// نظام الألوان الموحد - Unified Color System
// ═══════════════════════════════════════════════════════════════════════════

export const UnifiedColors = {
  // الألوان الأساسية - Primary Colors (من نسخة الويب)
  primary: {
    50: '#e6f9f5',
    100: '#ccf3eb',
    200: '#99e7d7',
    300: '#66dbc3',
    400: '#33cfaf',
    500: '#00D4AA', // اللون الرئيسي - Teal/Cyan من الويب
    600: '#00aa88',
    700: '#008066',
    800: '#005544',
    900: '#002b22',
  },

  // الألوان الثانوية - Secondary Colors (Navy من الويب)
  secondary: {
    50: '#e6edf3',
    100: '#ccdbe7',
    200: '#99b7cf',
    300: '#6693b7',
    400: '#336f9f',
    500: '#0A2540', // Navy Blue من الويب
    600: '#081e33',
    700: '#061626',
    800: '#040f1a',
    900: '#02070d',
  },

  // الألوان المحايدة - Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  
  gray: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d',
    600: '#495057',
    700: '#343a40',
    800: '#212529',
    900: '#1a1a1a',
    950: '#0d0d0d',
  },

  // الخلفيات - Backgrounds
  background: {
    light: '#FFFFFF',
    dark: '#0A2540', // Navy من الويب
    subtle: '#FAF9F6', // Cream من الويب
    surface: '#fafafa',
  },

  // ألوان الحالات - Status Colors
  status: {
    success: '#00D4AA', // نفس اللون الأساسي
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#2563eb',
  },

  // ألوان ERP المخصصة - من نسخة الويب
  erp: {
    navy: '#0A2540',      // الخلفية الداكنة
    teal: '#00D4AA',      // الأيقونات النشطة
    cream: '#FAF9F6',     // الخلفية الفاتحة
    grayText: '#9ca3af',  // النصوص الثانوية
  },

  // ألوان خاصة بالقطاعات
  sectors: {
    textile: '#00D4AA',   // قطاع النسيج
    finance: '#2563eb',   // القطاع المالي
    medical: '#8b5cf6',   // القطاع الطبي
    fleet: '#f59e0b',     // قطاع النقل
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// نظام الألوان حسب الوضع - Theme-based Colors
// ═══════════════════════════════════════════════════════════════════════════

export const UnifiedTheme = {
  light: {
    // خلفيات
    background: UnifiedColors.white,
    surface: UnifiedColors.background.subtle, // Cream
    card: UnifiedColors.white,
    
    // نصوص
    text: {
      primary: UnifiedColors.secondary[500], // Navy للنصوص الرئيسية
      secondary: UnifiedColors.gray[600],
      tertiary: UnifiedColors.erp.grayText,
      inverse: UnifiedColors.white,
    },
    
    // حدود
    border: UnifiedColors.gray[200],
    borderLight: UnifiedColors.gray[100],
    
    // ظلال
    shadow: 'rgba(0, 0, 0, 0.08)',
    
    // أساسي (Teal/Cyan من الويب)
    primary: UnifiedColors.primary[500], // #00D4AA
    primaryLight: UnifiedColors.primary[100],
    primaryDark: UnifiedColors.primary[700],
    
    // ثانوي (Navy من الويب)
    secondary: UnifiedColors.secondary[500], // #0A2540
    secondaryLight: UnifiedColors.secondary[100],
    secondaryDark: UnifiedColors.secondary[700],
    
    // الحالات
    success: UnifiedColors.primary[500], // Teal
    warning: UnifiedColors.status.warning,
    error: UnifiedColors.status.error,
    info: UnifiedColors.status.info,
  },
  
  dark: {
    // خلفيات (Navy من الويب)
    background: UnifiedColors.secondary[500], // #0A2540
    surface: UnifiedColors.secondary[700],
    card: UnifiedColors.secondary[600],
    
    // نصوص
    text: {
      primary: UnifiedColors.white,
      secondary: UnifiedColors.gray[400],
      tertiary: UnifiedColors.erp.grayText,
      inverse: UnifiedColors.secondary[500],
    },
    
    // حدود
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    
    // ظلال
    shadow: 'rgba(0, 0, 0, 0.5)',
    
    // أساسي (Teal يبقى نفسه)
    primary: UnifiedColors.primary[500], // #00D4AA
    primaryLight: UnifiedColors.primary[100],
    primaryDark: UnifiedColors.primary[700],
    
    // ثانوي
    secondary: UnifiedColors.secondary[300],
    secondaryLight: UnifiedColors.secondary[200],
    secondaryDark: UnifiedColors.secondary[500],
    
    // الحالات
    success: UnifiedColors.primary[400], // Teal أفتح
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Typography - نظام الخطوط
// ═══════════════════════════════════════════════════════════════════════════

export const Typography = {
  // أحجام الخطوط
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
  
  // أوزان الخطوط
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  
  // ارتفاعات السطور
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // أنماط النصوص
  styles: {
    h1: {
      fontSize: 34,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      lineHeight: 41,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      lineHeight: 34,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      lineHeight: 28,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      letterSpacing: -0.1,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 18,
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Spacing - المسافات (8pt Grid System)
// ═══════════════════════════════════════════════════════════════════════════

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
  
  // مسافات خاصة
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Border Radius - الحواف
// ═══════════════════════════════════════════════════════════════════════════

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Shadows - الظلال
// ═══════════════════════════════════════════════════════════════════════════

export const Shadows = {
  // ظلال خفيفة (Swiss style)
  soft1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  soft2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  soft3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  soft4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Animations - الحركات (iOS Fluid)
// ═══════════════════════════════════════════════════════════════════════════

export const Animations = {
  // مدة الحركات
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    verySlow: 500,
  },
  
  // Spring settings (iOS-style)
  spring: {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  },
  
  // Easing
  easing: {
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },
  
  // تأثيرات الضغط
  pressScale: 0.97,
  hoverScale: 1.02,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Components Styles - أنماط المكونات
// ═══════════════════════════════════════════════════════════════════════════

export const ComponentStyles = {
  // البطاقات
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    ...Shadows.soft2,
  },
  
  // الأزرار
  button: {
    height: 50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
  },
  
  buttonSm: {
    height: 40,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
  },
  
  buttonLg: {
    height: 56,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xxl,
  },
  
  // المدخلات
  input: {
    height: 50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 0.5,
  },
  
  // التبويبات
  tab: {
    height: 56,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions - دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * احصل على الثيم الحالي حسب الوضع
 */
export const getTheme = (isDark: boolean) => {
  return isDark ? UnifiedTheme.dark : UnifiedTheme.light;
};

/**
 * احصل على لون الحالة
 */
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info', isDark: boolean) => {
  const theme = getTheme(isDark);
  return theme[status];
};

/**
 * احصل على لون القطاع
 */
export const getSectorColor = (sector: keyof typeof UnifiedColors.sectors) => {
  return UnifiedColors.sectors[sector];
};

// ═══════════════════════════════════════════════════════════════════════════
// Export All - تصدير كل شيء
// ═══════════════════════════════════════════════════════════════════════════

export const UnifiedDesignSystem = {
  colors: UnifiedColors,
  theme: UnifiedTheme,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  animations: Animations,
  components: ComponentStyles,
  
  // Helper functions
  getTheme,
  getStatusColor,
  getSectorColor,
} as const;

export default UnifiedDesignSystem;
