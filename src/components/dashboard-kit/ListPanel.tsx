/**
 * ════════════════════════════════════════════════════════
 * ListPanel — Unified list for ALL dashboards
 * ════════════════════════════════════════════════════════
 *
 * Used for: Top Customers, Top Accounts, Recent Entries,
 * Top Products, Recent Purchases, etc.
 */

import { cn } from '@/lib/utils';
import { type ListItem } from './types';
import { EmptyState } from './EmptyState';
import { SkeletonBlock } from './SkeletonBlock';
import { FileQuestion } from 'lucide-react';

export function ListPanel({
  items,
  loading,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
  currency,
  showRank = true,
}: {
  items?: ListItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  currency?: string;
  showRank?: boolean;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-stone-50 dark:divide-stone-800/50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            {showRank && <SkeletonBlock className="h-6 w-6 rounded-full" />}
            <div className="flex-1">
              <SkeletonBlock className="h-3 w-32 mb-1" />
              <SkeletonBlock className="h-2.5 w-20" />
            </div>
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyState icon={FileQuestion} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="divide-y divide-stone-50 dark:divide-stone-800/50">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/30"
          >
            {/* Left: Rank + Icon + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {showRank && (
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {item.rank ?? i + 1}
                </span>
              )}
              {Icon && !showRank && (
                <div className={cn('p-1.5 rounded-lg', item.iconClassName || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400')}>
                  <Icon className="w-3 h-3" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {/* Tags row */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.tags.map((tag, ti) => (
                      <span key={ti} className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tag.className)}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                {item.subtitle && (
                  <p className="font-mono text-[10px] text-stone-400">{item.subtitle}</p>
                )}
                <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{item.title}</p>
              </div>
            </div>

            {/* Right: Value + Sub-value */}
            <div className="text-end shrink-0 ms-3">
              <p className="font-medium tabular-nums text-sm text-stone-900 dark:text-stone-100">
                {typeof item.value === 'number'
                  ? `${currency ? (currency === 'USD' ? '$' : '') : ''}${Number(item.value).toLocaleString()}${currency && currency !== 'USD' ? ` ${currency}` : ''}`
                  : item.value}
              </p>
              {item.valueSub && (
                <p className="text-[10px] text-stone-400 tabular-nums">{item.valueSub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
