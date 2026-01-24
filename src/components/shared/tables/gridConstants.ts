// Grid Constants - Separated for HMR compatibility

export const MARKER_COLORS = {
  red: { bg: '#FEE2E2', border: '#EF4444', name: 'أحمر' },
  orange: { bg: '#FFEDD5', border: '#F97316', name: 'برتقالي' },
  yellow: { bg: '#FEF9C3', border: '#EAB308', name: 'أصفر' },
  green: { bg: '#DCFCE7', border: '#22C55E', name: 'أخضر' },
  blue: { bg: '#DBEAFE', border: '#3B82F6', name: 'أزرق' },
  purple: { bg: '#F3E8FF', border: '#A855F7', name: 'بنفسجي' },
  pink: { bg: '#FCE7F3', border: '#EC4899', name: 'وردي' },
  gray: { bg: '#F3F4F6', border: '#6B7280', name: 'رمادي' },
  white: { bg: '#FFFFFF', border: '#E5E7EB', name: 'أبيض' },
} as const;

export type MarkerColorId = keyof typeof MARKER_COLORS | null;
