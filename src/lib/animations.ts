/**
 * Professional Animations System for TexaCore ERP
 * نظام الحركات الاحترافي لـ TexaCore
 * 
 * Usage with Framer Motion:
 * <motion.div {...fadeIn}>Content</motion.div>
 * <motion.div {...slideUp}>Content</motion.div>
 * <motion.button {...buttonTap}>Click</motion.button>
 */

// ═══════════════════════════════════════════════════════════════
// Spring Configurations - إعدادات الزنبرك
// ═══════════════════════════════════════════════════════════════

export const springConfig = {
  /** Smooth and natural - سلس وطبيعي */
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  /** Quick and responsive - سريع ومتجاوب */
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  /** Fun with bounce - مرح مع ارتداد */
  bouncy: { type: "spring" as const, stiffness: 300, damping: 10 },
  /** Slow and elegant - بطيء وأنيق */
  slow: { type: "spring" as const, stiffness: 100, damping: 20 },
  /** Ultra fast - فائق السرعة */
  fast: { type: "spring" as const, stiffness: 500, damping: 35 },
};

// ═══════════════════════════════════════════════════════════════
// Fade Animations - حركات التلاشي
// ═══════════════════════════════════════════════════════════════

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const fadeInSlow = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.4 },
};

// ═══════════════════════════════════════════════════════════════
// Slide Animations - حركات الانزلاق
// ═══════════════════════════════════════════════════════════════

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: springConfig.gentle,
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: springConfig.gentle,
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: springConfig.gentle,
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: springConfig.gentle,
};

/** RTL-aware slide - slides from right in RTL, left in LTR */
export const slideInFromStart = (isRTL: boolean) => ({
  initial: { opacity: 0, x: isRTL ? 20 : -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: isRTL ? 20 : -20 },
  transition: springConfig.gentle,
});

/** RTL-aware slide - slides from left in RTL, right in LTR */
export const slideInFromEnd = (isRTL: boolean) => ({
  initial: { opacity: 0, x: isRTL ? -20 : 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: isRTL ? -20 : 20 },
  transition: springConfig.gentle,
});

// ═══════════════════════════════════════════════════════════════
// Scale Animations - حركات التكبير
// ═══════════════════════════════════════════════════════════════

export const scale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: springConfig.snappy,
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: springConfig.bouncy,
};

export const scaleDown = {
  initial: { opacity: 0, scale: 1.1 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 },
  transition: springConfig.snappy,
};

// ═══════════════════════════════════════════════════════════════
// Stagger Animations - حركات متتالية
// ═══════════════════════════════════════════════════════════════

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: springConfig.gentle,
};

export const staggerItemFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
};

export const staggerItemScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: springConfig.snappy,
};

// ═══════════════════════════════════════════════════════════════
// Hover Animations - حركات التمرير
// ═══════════════════════════════════════════════════════════════

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: springConfig.snappy,
};

export const hoverScaleLarge = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: springConfig.snappy,
};

export const hoverLift = {
  whileHover: { y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.15)" },
  transition: springConfig.gentle,
};

export const hoverLiftSubtle = {
  whileHover: { y: -2, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" },
  transition: springConfig.gentle,
};

export const hoverGlow = {
  whileHover: { 
    boxShadow: "0 0 20px rgba(4, 120, 87, 0.3)",
    borderColor: "rgba(4, 120, 87, 0.5)"
  },
  transition: springConfig.gentle,
};

// ═══════════════════════════════════════════════════════════════
// Button Animations - حركات الأزرار
// ═══════════════════════════════════════════════════════════════

export const buttonTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring" as const, stiffness: 500, damping: 30 },
};

export const buttonTapSubtle = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: { type: "spring" as const, stiffness: 500, damping: 30 },
};

export const iconButton = {
  whileHover: { scale: 1.1, rotate: 5 },
  whileTap: { scale: 0.9 },
  transition: springConfig.snappy,
};

// ═══════════════════════════════════════════════════════════════
// Modal/Sheet Animations - حركات النوافذ
// ═══════════════════════════════════════════════════════════════

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: springConfig.snappy,
};

export const sheetFromRight = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: springConfig.gentle,
};

export const sheetFromLeft = {
  initial: { x: "-100%" },
  animate: { x: 0 },
  exit: { x: "-100%" },
  transition: springConfig.gentle,
};

export const sheetFromBottom = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: springConfig.gentle,
};

// ═══════════════════════════════════════════════════════════════
// List Animations - حركات القوائم
// ═══════════════════════════════════════════════════════════════

export const listItem = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: springConfig.gentle,
};

export const listItemWithHeight = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: springConfig.gentle,
};

// ═══════════════════════════════════════════════════════════════
// Card Animations - حركات البطاقات
// ═══════════════════════════════════════════════════════════════

export const cardHover = {
  whileHover: { 
    y: -8, 
    boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
    transition: springConfig.gentle
  },
};

export const cardPress = {
  whileTap: { 
    scale: 0.98,
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
  transition: springConfig.fast,
};

// ═══════════════════════════════════════════════════════════════
// Notification Animations - حركات الإشعارات
// ═══════════════════════════════════════════════════════════════

export const notificationSlideIn = {
  initial: { opacity: 0, y: -50, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.9 },
  transition: springConfig.bouncy,
};

export const toastSlideIn = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
  transition: springConfig.snappy,
};

// ═══════════════════════════════════════════════════════════════
// Skeleton/Loading Animations - حركات التحميل
// ═══════════════════════════════════════════════════════════════

export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  },
};

export const pulse = {
  animate: {
    opacity: [1, 0.5, 1],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export const spin = {
  animate: {
    rotate: 360,
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: "linear",
  },
};

// ═══════════════════════════════════════════════════════════════
// Page Transitions - انتقالات الصفحات
// ═══════════════════════════════════════════════════════════════

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

export const pageSlide = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
  transition: springConfig.gentle,
};

// ═══════════════════════════════════════════════════════════════
// Utility Functions - دوال مساعدة
// ═══════════════════════════════════════════════════════════════

/** Create a delayed animation variant */
export const withDelay = (animation: object, delay: number) => ({
  ...animation,
  transition: {
    ...(animation as any).transition,
    delay,
  },
});

/** Create custom spring animation */
export const customSpring = (stiffness: number, damping: number) => ({
  type: "spring" as const,
  stiffness,
  damping,
});

/** Create stagger animation with custom values */
export const createStagger = (staggerDelay: number = 0.05, childDelay: number = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: childDelay,
    },
  },
});
