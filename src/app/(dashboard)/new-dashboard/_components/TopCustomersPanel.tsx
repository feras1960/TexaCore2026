import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { Users } from 'lucide-react';
import { TopCustomer } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { formatCurrency } from '../_lib/formatters';
import { useLanguage } from '@/app/providers/LanguageProvider';

export function TopCustomersPanel({
  items,
  loading,
  onCustomerClick,
}: {
  items?: TopCustomer[];
  loading: boolean;
  onCustomerClick?: (customer: TopCustomer) => void;
}) {
  const { t } = useLanguage();
  const isClickable = Boolean(onCustomerClick);

  return (
    <SectionCard
      title={t('dashboard.topCustomers')}
      action={
        <a
          href="/customers?sort=outstanding"
          className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          {t('dashboard.viewAll')} →
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
        <EmptyState icon={Users} title={t('dashboard.noCustomers')} />
      ) : (
        <ul className="divide-y divide-stone-50 dark:divide-stone-800/50">
          {items.map((c, i) => {
            const isPositive = c.outstanding > 0;
            const isNegative = c.outstanding < 0;
            return (
              <li
                key={c.id}
                onClick={() => onCustomerClick?.(c)}
                className={`flex items-center justify-between py-2 first:pt-0 last:pb-0 rounded-md transition-all duration-150 ${
                  isClickable
                    ? 'cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/15 hover:shadow-sm px-1.5 -mx-1.5 active:scale-[0.99]'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                      isPositive
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : isNegative
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-sm text-stone-900 dark:text-stone-100">
                    {c.name}
                  </span>
                </div>
                <span
                  className={`flex-shrink-0 text-sm font-medium tabular-nums ${
                    isPositive
                      ? 'text-amber-700 dark:text-amber-400'
                      : isNegative
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {formatCurrency(c.outstanding, c.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
