import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { Truck } from 'lucide-react';
import { TopCustomer } from '../_lib/dashboard-types';   // reuse same shape
import { EmptyState } from './shared/EmptyState';
import { formatCurrency } from '../_lib/formatters';

export function TopSuppliersPanel({
  items,
  loading,
}: {
  items?: TopCustomer[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="أعلى الموردين مديونية"
      action={
        <a
          href="/suppliers?sort=outstanding"
          className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          عرض الكل ←
        </a>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState icon={Truck} title="لا يوجد موردون" />
      ) : (
        <ul className="divide-y divide-stone-50 dark:divide-stone-800/50">
          {items.map((s, i) => {
            const isPositive = s.outstanding > 0;
            const isNegative = s.outstanding < 0;
            return (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                      isPositive
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        : isNegative
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-sm text-stone-900 dark:text-stone-100">
                    {s.name}
                  </span>
                </div>
                <span
                  className={`flex-shrink-0 text-sm font-medium tabular-nums ${
                    isPositive
                      ? 'text-rose-700 dark:text-rose-400'
                      : isNegative
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {formatCurrency(s.outstanding, s.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
