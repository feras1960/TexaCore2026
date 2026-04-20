/**
 * ════════════════════════════════════════════════════════
 * Dashboard Kit — Shared Types
 * Used across ALL department dashboards
 * ════════════════════════════════════════════════════════
 */
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

// ─── KPI ────────────────────────────────────────────────
export interface KpiItem {
  id: string;
  label: string;
  value: number;
  currency?: string;
  icon: LucideIcon;
  color: string;
  deltaPct?: number;
  sparkline?: number[];
  breakdown?: Array<{ key: string; label: string; pct: number }>;
  suffix?: string;
  secondaryLabel?: string;
  secondaryTone?: Tone;
}

export type Tone = 'neutral' | 'warning' | 'danger' | 'success';

// ─── Hero ───────────────────────────────────────────────
export interface HeroConfig {
  label: string;
  value: number;
  currency?: string;
  valueSuffix?: string;
  deltaPct?: number;
  deltaAbs?: number;
  deltaLabel?: string;
  sparkline?: number[];
  badges?: Array<{ label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>;
  actions?: ReactNode;
  secondaryLabel?: string;
  secondaryValue?: number | string;
  secondarySubLabel?: string;
  // ── Live sync ───────────────────────────
  lastSync?: Date | null;
  isFetching?: boolean;
}

// ─── List Panel ─────────────────────────────────────────
export interface ListItem {
  id: string;
  rank?: number;
  title: string;
  subtitle?: string;
  value: number | string;
  valueFormatted?: string;
  valueSub?: string;
  tags?: Array<{ label: string; className: string }>;
  icon?: LucideIcon;
  iconClassName?: string;
}
