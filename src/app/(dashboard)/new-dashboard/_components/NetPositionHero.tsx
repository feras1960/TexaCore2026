import { EmptyState } from './shared/EmptyState';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { NetPosition } from '../_lib/dashboard-types';
import { MiniSparkline } from './shared/MiniSparkline';
import { LiveSyncBadge } from '@/components/dashboard-kit';
import CountUp from 'react-countup';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function NetPositionHero({
  data,
  loading,
  lastSync,
  isFetching,
}: {
  data?: NetPosition;
  loading: boolean;
  lastSync?: Date | null;
  isFetching?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6 text-white dark:bg-stone-900 dark:ring-1 dark:ring-stone-800">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-10 w-56" />
        <SkeletonBlock className="mt-2 h-3 w-40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <EmptyState
          icon={TrendingUp}
          title="لا توجد بيانات بعد"
          description="سيظهر مركزك المالي هنا بعد إضافة أول معاملة."
          action={{ label: 'إضافة قيد يومية', onClick: () => {} }}
        />
      </div>
    );
  }

  const positive = data.deltaPct7d >= 0;
  const { valueBase, baseCurrency, deltaPct7d, deltaAbs7d, sparkline, todayMovement, todayTxCount } = data;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-6 text-white shadow-[0_12px_32px_rgba(15,118,110,0.12)]"
      aria-labelledby="net-position-heading"
    >
      {/* subtle decorative pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
        aria-hidden="true"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr_180px] lg:items-center">
        {/* Net Position */}
        <div className="border-stone-700 lg:border-e lg:pe-6">
          <p
            id="net-position-heading"
            className="text-xs uppercase tracking-wider text-stone-400"
          >
            صافي المركز المالي
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-medium tabular-nums lg:text-5xl">
              <CountUp
                end={valueBase}
                duration={1.1}
                separator=","
                prefix={baseCurrency === 'USD' ? '$' : ''}
                suffix={baseCurrency !== 'USD' ? ` ${baseCurrency}` : ''}
              />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                positive
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-rose-500/10 text-rose-300'
              }`}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(deltaPct7d).toFixed(1)}%
            </span>
            <span className="text-stone-400">
              {positive ? '+' : '−'}${Math.abs(deltaAbs7d).toLocaleString()} آخر 7 أيام
            </span>
          </div>
        </div>

        {/* Today Movement */}
        <div className="border-stone-700 lg:border-e lg:pe-6">
          <p className="text-xs uppercase tracking-wider text-stone-400">حركة اليوم</p>
          <p className="mt-2 text-2xl font-medium tabular-nums">
            ${todayMovement.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-stone-400">{todayTxCount} معاملات</p>
        </div>

        {/* Sparkline */}
        <div className="h-16">
          <MiniSparkline data={sparkline} color="#5EEAD4" height={64} />
          <p className="mt-1 text-[10px] text-stone-500">آخر 14 يومًا</p>
        </div>
      </div>

      {/* LiveSyncBadge — bottom corner */}
      <div className="absolute bottom-3 end-4 z-10">
        <LiveSyncBadge lastSync={lastSync} isFetching={isFetching} variant="hero" />
      </div>
    </motion.section>
  );
}
