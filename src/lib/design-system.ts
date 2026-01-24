/**
 * Design System - نظام التصميم المتكامل
 * =====================================
 * يحتوي على جميع الثوابت والأنماط المستخدمة في التطبيق
 * لضمان التناسق في التصميم عبر جميع المكونات
 */

// ═══════════════════════════════════════════════════════════════════════════
// نظام الألوان - Color System
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
  // الألوان الأساسية - Primary Colors (Swiss Minimalism - Textile Sector)
  primary: {
    50: "#f0f5f3",
    100: "#d9e5e0",
    200: "#b3cbc1",
    300: "#8db1a2",
    400: "#4a8a74",
    500: "#2d5a4c",  // أخضر زمردي هادئ - زيتي مطفي
    600: "#1e3d33",
    700: "#162e26",
    800: "#0f1f1a",
    900: "#08100d",
  },
  
  // ألوان ERP المخصصة - مطفية وأنيقة
  erp: {
    navy: "#0A2540",
    teal: "#00D4AA",
    cream: "#FAF9F6",
    olive: "#2d5a4c",      // أخضر زيتي للنسيج
    oliveDark: "#1e3d33",  // أخضر زيتي داكن
  },
  
  // ألوان الخلفيات - Backgrounds
  background: "#ffffff",
  subtle: "#f4f4f5",       // للبطاقات والمداخل
  surface: "#fafafa",      // سطح فاتح
  
  // ألوان الحالات - Status Colors (هادئة)
  success: "#2d5a4c",      // نفس اللون الأساسي للنجاح
  warning: "#d97706",      // برتقالي هادئ
  error: "#dc2626",        // أحمر هادئ
  info: "#2563eb",         // أزرق هادئ
  
  // ألوان محايدة - Neutral Colors (نظيفة)
  gray: {
    50: "#f8f9fa",         // خلفية نظيفة جداً
    100: "#e9ecef",
    200: "#dee2e6",
    300: "#ced4da",
    400: "#adb5bd",
    500: "#6c757d",
    600: "#495057",
    700: "#343a40",
    800: "#212529",
    900: "#1a1a1a",        // أسود ليس حاداً جداً
    950: "#0d0d0d",
  },
  
  // ألوان إضافية - هادئة
  blue: {
    50: "#eff6ff",
    500: "#2563eb",
    600: "#1d4ed8",
    700: "#1e40af",
  },
  
  slate: {
    50: "#f8fafc",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
  },
  
  stone: {
    50: "#fafaf9",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// تدرجات الألوان - Gradients (Swiss Minimalism Style)
// ═══════════════════════════════════════════════════════════════════════════

export const gradients = {
  // تدرجات أساسية - Swiss Minimalism (قطاع النسيج)
  primary: "bg-gradient-to-r from-[#2d5a4c] to-[#4a8a74]",
  secondary: "bg-gradient-to-r from-slate-600 to-slate-700",
  accent: "bg-gradient-to-r from-[#1e3d33] to-[#2d5a4c]",
  
  // تدرجات هادئة
  warm: "bg-gradient-to-r from-stone-400 to-stone-500",
  cool: "bg-gradient-to-r from-slate-400 to-slate-500",
  
  // تدرجات خاصة
  subtle: "bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] dark:from-gray-900 dark:to-gray-800",
  glass: "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
  
  // تدرجات ERP - الأساسية
  erp: "bg-gradient-to-r from-[#0A2540] to-[#2d5a4c]",
  erpSoft: "bg-gradient-to-br from-[#0A2540]/5 to-[#2d5a4c]/10",
  erpOlive: "bg-gradient-to-r from-[#2d5a4c] to-[#4a8a74]",
  erpNavy: "bg-gradient-to-r from-[#0A2540] to-[#162e26]",
  
  // تدرجات للخلفيات
  hero: "bg-gradient-to-br from-[#f8f9fa] via-white to-[#f0f5f3] dark:from-gray-900 dark:via-gray-900 dark:to-[#0f1f1a]",
  card: "bg-gradient-to-br from-white to-[#f8f9fa] dark:from-gray-800 dark:to-gray-900",
  
  // تدرجات نصية
  textPrimary: "bg-gradient-to-r from-[#2d5a4c] to-[#4a8a74] bg-clip-text text-transparent",
  textSecondary: "bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent",
  textErp: "bg-gradient-to-r from-[#0A2540] to-[#2d5a4c] bg-clip-text text-transparent",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أنماط البطاقات - Card Styles
// ═══════════════════════════════════════════════════════════════════════════

export const cardStyles = {
  // البطاقة الافتراضية
  default: "bg-card border rounded-xl shadow-soft-sm hover:shadow-soft-md transition-all duration-300",
  
  // بطاقة زجاجية
  glass: "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-soft-lg",
  
  // بطاقة بتدرج
  gradient: "bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl",
  
  // بطاقة مرتفعة
  elevated: "bg-card rounded-xl shadow-soft-lg hover:shadow-soft-xl transition-all duration-300",
  
  // بطاقة بحدود منقطة
  outlined: "bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl",
  
  // بطاقة تفاعلية
  interactive: "bg-card border rounded-xl shadow-soft-sm hover:shadow-soft-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer",
  
  // بطاقة مسطحة
  flat: "bg-gray-50 dark:bg-gray-800/50 rounded-xl",
  
  // بطاقة بتوهج
  glow: "bg-card border rounded-xl shadow-glow-sm hover:shadow-glow-md transition-all duration-300",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أنماط الأزرار - Button Styles
// ═══════════════════════════════════════════════════════════════════════════

export const buttonStyles = {
  // الأزرار الأساسية
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft-sm hover:shadow-soft-md",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  
  // أزرار الإطار
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  
  // أزرار الحالات
  destructive: "bg-red-500 text-white hover:bg-red-600 shadow-soft-sm",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-soft-sm",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-soft-sm",
  info: "bg-blue-500 text-white hover:bg-blue-600 shadow-soft-sm",
  
  // أزرار مميزة
  gradient: "bg-gradient-to-r from-primary to-emerald-600 text-white shadow-glow-sm hover:shadow-glow-md",
  glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30",
  
  // أزرار ERP
  erpPrimary: "bg-erp-navy text-white hover:bg-erp-navy/90 shadow-soft-sm",
  erpTeal: "bg-erp-teal text-erp-navy hover:bg-erp-teal/90 shadow-soft-sm",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أحجام النصوص - Text Sizes
// ═══════════════════════════════════════════════════════════════════════════

export const textSizes = {
  xs: "text-xs",      // 12px
  sm: "text-sm",      // 14px
  base: "text-base",  // 16px
  lg: "text-lg",      // 18px
  xl: "text-xl",      // 20px
  "2xl": "text-2xl",  // 24px
  "3xl": "text-3xl",  // 30px
  "4xl": "text-4xl",  // 36px
  "5xl": "text-5xl",  // 48px
  "6xl": "text-6xl",  // 60px
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أوزان الخطوط - Font Weights
// ═══════════════════════════════════════════════════════════════════════════

export const fontWeights = {
  thin: "font-thin",         // 100
  light: "font-light",       // 300
  normal: "font-normal",     // 400
  medium: "font-medium",     // 500
  semibold: "font-semibold", // 600
  bold: "font-bold",         // 700
  extrabold: "font-extrabold", // 800
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// المسافات - Spacing
// ═══════════════════════════════════════════════════════════════════════════

export const spacing = {
  // مسافات الأقسام
  section: "py-12 md:py-16 lg:py-20",
  sectionSm: "py-8 md:py-12",
  sectionLg: "py-16 md:py-24 lg:py-32",
  
  // مسافات الحاوية
  container: "px-4 md:px-6 lg:px-8",
  containerWide: "px-4 md:px-8 lg:px-12",
  containerNarrow: "px-4 md:px-6",
  
  // مسافات البطاقات
  card: "p-4 md:p-6",
  cardSm: "p-3 md:p-4",
  cardLg: "p-6 md:p-8",
  
  // مسافات العناصر
  button: "px-4 py-2",
  buttonSm: "px-3 py-1.5",
  buttonLg: "px-6 py-3",
  input: "px-3 py-2",
  
  // الفجوات
  gap: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// الظلال - Shadows
// ═══════════════════════════════════════════════════════════════════════════

export const shadows = {
  none: "shadow-none",
  sm: "shadow-soft-sm",     // خفيف
  md: "shadow-soft-md",     // متوسط
  lg: "shadow-soft-lg",     // كبير
  xl: "shadow-soft-xl",     // ضخم
  glow: "shadow-glow-md",   // توهج
  glowSm: "shadow-glow-sm", // توهج خفيف
  inner: "shadow-inner",    // داخلي
  teal: "shadow-teal",      // ظل ERP teal
  navy: "shadow-navy",      // ظل ERP navy
  lift: "shadow-lift",      // ظل الرفع
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// الحدود - Borders
// ═══════════════════════════════════════════════════════════════════════════

export const borders = {
  none: "border-0",
  default: "border border-border",
  light: "border border-gray-200 dark:border-gray-800",
  dark: "border border-gray-300 dark:border-gray-700",
  primary: "border border-primary/30",
  dashed: "border-2 border-dashed border-gray-300 dark:border-gray-700",
  thick: "border-2 border-border",
  focus: "ring-2 ring-primary ring-offset-2",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// الحواف - Border Radius
// ═══════════════════════════════════════════════════════════════════════════

export const radius = {
  none: "rounded-none",   // 0
  sm: "rounded-md",       // 6px
  md: "rounded-lg",       // 8px
  lg: "rounded-xl",       // 12px
  xl: "rounded-2xl",      // 16px
  "2xl": "rounded-3xl",   // 24px
  full: "rounded-full",   // دائري
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ألوان حسب القطاع - Sector Colors
// ═══════════════════════════════════════════════════════════════════════════

export const sectorColors = {
  // قطاع النسيج والأقمشة
  textile: {
    primary: "#10b981",   // أخضر
    secondary: "#059669",
    accent: "#34d399",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  
  // القطاع المالي
  finance: {
    primary: "#3b82f6",   // أزرق
    secondary: "#2563eb",
    accent: "#60a5fa",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  
  // القطاع الطبي
  medical: {
    primary: "#8b5cf6",   // بنفسجي
    secondary: "#7c3aed",
    accent: "#a78bfa",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  
  // قطاع النقل والأسطول
  fleet: {
    primary: "#f59e0b",   // برتقالي
    secondary: "#d97706",
    accent: "#fbbf24",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  
  // قطاع التجزئة
  retail: {
    primary: "#ec4899",   // وردي
    secondary: "#db2777",
    accent: "#f472b6",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    text: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-800",
  },
  
  // قطاع التصنيع
  manufacturing: {
    primary: "#6366f1",   // نيلي
    secondary: "#4f46e5",
    accent: "#818cf8",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ألوان الحالات للجداول والبادجات - Status Colors
// ═══════════════════════════════════════════════════════════════════════════

export const statusColors = {
  // حالات إيجابية
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  
  // حالات الانتظار
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  
  // حالات سلبية
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  
  // حالات تحذيرية
  warning: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  expired: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  
  // حالات معلوماتية
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  
  // حالات خاصة
  premium: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  featured: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أنماط المدخلات - Input Styles
// ═══════════════════════════════════════════════════════════════════════════

export const inputStyles = {
  default: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  error: "border-red-500 focus-visible:ring-red-500",
  success: "border-green-500 focus-visible:ring-green-500",
  glass: "bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-white/30",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أنماط التراكب - Overlay Styles
// ═══════════════════════════════════════════════════════════════════════════

export const overlayStyles = {
  default: "fixed inset-0 bg-black/50",
  light: "fixed inset-0 bg-black/30",
  dark: "fixed inset-0 bg-black/70",
  blur: "fixed inset-0 bg-black/50 backdrop-blur-sm",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// الانتقالات - Transitions
// ═══════════════════════════════════════════════════════════════════════════

export const transitions = {
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",
  slower: "transition-all duration-500",
  colors: "transition-colors duration-200",
  transform: "transition-transform duration-200",
  opacity: "transition-opacity duration-200",
  shadow: "transition-shadow duration-200",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// تصدير جميع الأنماط كـ object واحد
// ═══════════════════════════════════════════════════════════════════════════

export const designSystem = {
  colors,
  gradients,
  cardStyles,
  buttonStyles,
  textSizes,
  fontWeights,
  spacing,
  shadows,
  borders,
  radius,
  sectorColors,
  statusColors,
  inputStyles,
  overlayStyles,
  transitions,
} as const;

export default designSystem;
