/**
 * ════════════════════════════════════════════════════════
 * Dashboard Kit — Barrel Export
 * ════════════════════════════════════════════════════════
 *
 * All dashboards import from here:
 *   import { KpiGrid, DashboardHero, SectionCard, ListPanel } from '@/components/dashboard-kit';
 */

export { KpiCard } from './KpiCard';
export { KpiGrid } from './KpiGrid';
export { DashboardHero } from './DashboardHero';
export { SectionCard } from './SectionCard';
export { ListPanel } from './ListPanel';
export { TrendBadge } from './TrendBadge';
export { CurrencyValue } from './CurrencyValue';
export { MiniSparkline } from './MiniSparkline';
export { EmptyState } from './EmptyState';
export { SkeletonBlock } from './SkeletonBlock';
export { LiveSyncBadge } from './LiveSyncBadge';

export { formatCurrency, formatRelativeTime, formatDateArabic } from './formatters';
export type { KpiItem, HeroConfig, ListItem, Tone } from './types';
