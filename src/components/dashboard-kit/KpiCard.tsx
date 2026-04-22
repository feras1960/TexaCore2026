/**
 * ════════════════════════════════════════════════════════
 * KpiCard — Unified KPI card for ALL dashboards
 * ════════════════════════════════════════════════════════
 *
 * Features: icon badge, label, value (CountUp), TrendBadge,
 * MiniSparkline, breakdown pills, secondary label.
 * All optional — minimal usage: { id, label, value, icon, color }
 */

import { type KpiItem, type Tone } from './types';
import { TrendBadge } from './TrendBadge';
import { CurrencyValue } from './CurrencyValue';
import { MiniSparkline } from './MiniSparkline';
import { formatCurrency } from './formatters';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'text-stone-500 dark:text-stone-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

export function KpiCard({ kpi, index = 0 }: { kpi: KpiItem; index?: number }) {
  // Guard: icon must be a valid React component — fallback to Wallet if missing
  const Icon = kpi.icon ?? Wallet;
  const color = kpi.color ?? '#0ea5e9';
  const isCurrency = !!kpi.currency;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group flex cursor-default flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
      tabIndex={0}
      aria-label={`${kpi.label}: ${isCurrency ? formatCurrency(kpi.value, kpi.currency) : kpi.value}`}
    >
      {/* Row 1: Icon + Label + Trend */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${color}15`, color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {kpi.label}
          </span>
        </div>
        {typeof kpi.deltaPct === 'number' && <TrendBadge value={kpi.deltaPct} />}
      </div>

      {/* Row 2: Value */}
      <div className="mt-3">
        {isCurrency ? (
          <CurrencyValue value={kpi.value} currency={kpi.currency} size="lg" />
        ) : (
          <span className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            <CountUp end={kpi.value} duration={0.7} separator="," />
          </span>
        )}
      </div>

      {/* Row 3: Sparkline (optional) */}
      {kpi.sparkline && kpi.sparkline.length > 0 && (
        <div className="mt-2">
          <MiniSparkline data={kpi.sparkline} color={color} height={24} />
        </div>
      )}

      {/* Row 4: Breakdown pills (optional) */}
      {kpi.breakdown && kpi.breakdown.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {kpi.breakdown.map((b) => (
            <span
              key={b.key}
              className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            >
              {b.label} {b.pct}%
            </span>
          ))}
        </div>
      )}

      {/* Row 5: Suffix / secondary label (optional) */}
      {kpi.suffix && (
        <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-500">{kpi.suffix}</p>
      )}
      {kpi.secondaryLabel && (
        <p className={`mt-1.5 text-[11px] ${TONE_CLASSES[kpi.secondaryTone ?? 'neutral']}`}>
          {kpi.secondaryLabel}
        </p>
      )}
    </motion.article>
  );
}
