/**
 * ════════════════════════════════════════════════════════
 * DashboardHero — Dark hero section for ALL dashboards
 * ════════════════════════════════════════════════════════
 *
 * Same visual: slate-900 → teal-950, dots pattern, CountUp, badges.
 * Each department passes its own data (label, value, badges, actions).
 */

import { type HeroConfig } from './types';
import { MiniSparkline } from './MiniSparkline';
import { SkeletonBlock } from './SkeletonBlock';
import { LiveSyncBadge } from './LiveSyncBadge';
import CountUp from 'react-countup';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardHero({ config, loading }: { config?: HeroConfig; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6 text-white dark:bg-stone-900 dark:ring-1 dark:ring-stone-800">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-10 w-56" />
        <SkeletonBlock className="mt-2 h-3 w-40" />
      </div>
    );
  }

  if (!config) return null;

  const { label, value, currency, valueSuffix, deltaPct, deltaAbs, deltaLabel, sparkline, badges, actions, secondaryLabel, secondaryValue, secondarySubLabel, lastSync, isFetching } = config;
  const positive = (deltaPct ?? 0) >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-6 text-white shadow-[0_12px_32px_rgba(15,118,110,0.12)]"
    >
      {/* Dots pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Primary info */}
        <div className="flex-1">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_180px] lg:items-center">
            {/* Main value */}
            <div className="border-stone-700 lg:border-e lg:pe-6">
              <p className="text-xs uppercase tracking-wider text-stone-400">{label}</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-medium tabular-nums lg:text-5xl">
                  <CountUp
                    end={value}
                    duration={1.1}
                    separator=","
                    prefix={currency === 'USD' ? '$' : ''}
                    suffix={currency && currency !== 'USD' ? ` ${currency}` : ''}
                  />
                </span>
                {valueSuffix && <span className="text-sm text-stone-400">{valueSuffix}</span>}
              </div>
              {/* Delta / Badges */}
              <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                {typeof deltaPct === 'number' && (
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(deltaPct).toFixed(1)}%
                  </span>
                )}
                {typeof deltaAbs === 'number' && (
                  <span className="text-stone-400">
                    {positive ? '+' : '−'}${Math.abs(deltaAbs).toLocaleString()} {deltaLabel}
                  </span>
                )}
                {badges?.map((badge, i) => {
                  const toneClass = {
                    success: 'bg-emerald-500/10 text-emerald-300',
                    warning: 'bg-amber-500/10 text-amber-300',
                    danger: 'bg-rose-500/10 text-rose-300',
                    info: 'bg-sky-500/10 text-sky-300',
                    neutral: 'bg-stone-500/10 text-stone-300',
                  }[badge.tone];
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${toneClass}`}>
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Secondary info */}
            {secondaryLabel && (
              <div className="border-stone-700 lg:border-e lg:pe-6">
                <p className="text-xs uppercase tracking-wider text-stone-400">{secondaryLabel}</p>
                <p className="mt-2 text-2xl font-medium tabular-nums">
                  {typeof secondaryValue === 'number' ? (
                    <>$<CountUp end={secondaryValue} duration={0.8} separator="," /></>
                  ) : secondaryValue}
                </p>
                {secondarySubLabel && <p className="mt-1 text-xs text-stone-400">{secondarySubLabel}</p>}
              </div>
            )}

            {/* Sparkline */}
            {sparkline && sparkline.length > 0 && (
              <div className="h-16">
                <MiniSparkline data={sparkline} color="#5EEAD4" height={64} />
                <p className="mt-1 text-[10px] text-stone-500">آخر 14 يومًا</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions (DatePicker, QuickActions, etc.) */}
        {actions && (
          <div className="flex flex-col items-stretch gap-2 w-full lg:w-auto shrink-0 min-w-[200px]">
            {actions}
          </div>
        )}
      </div>
      {/* LiveSyncBadge — bottom-right corner, inside hero */}
      <div className="absolute bottom-3 end-4 z-10">
        <LiveSyncBadge lastSync={lastSync} isFetching={isFetching} variant="hero" />
      </div>
    </motion.section>
  );
}
