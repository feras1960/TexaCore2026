import { SkeletonBlock } from './SkeletonBlock';
import { type KpiItem } from './types';
import { KpiCard } from './KpiCard';

export function KpiGrid({ kpis, loading, cols = 4 }: { kpis?: KpiItem[]; loading: boolean; cols?: 2 | 3 | 4 }) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[cols];

  if (loading) {
    return (
      <div className={`grid gap-3 ${colsClass}`}>
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-3 h-6 w-32" />
            <SkeletonBlock className="mt-3 h-6 w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`grid gap-3 ${colsClass}`}>
      {kpis?.map((kpi, i) => (
        <KpiCard key={kpi.id} kpi={kpi} index={i} />
      ))}
    </div>
  );
}
