import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { Clock, FileText, CreditCard, Receipt, Package, BookOpen } from 'lucide-react';
import { ActivityItem } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { formatCurrency, formatRelativeTime } from '../_lib/formatters';
import { motion } from 'framer-motion';

const ACTIVITY_ICONS: Record<string, any> = {
  sale: Receipt,
  payment: CreditCard,
  receipt: CreditCard,
  journal: BookOpen,
  inventory: Package,
};

export function RecentActivityPanel({
  items,
  loading,
}: {
  items?: ActivityItem[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="النشاط الأخير"
      action={
        <a
          href="/audit-log"
          className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          الكل ←
        </a>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState icon={Clock} title="لا يوجد نشاط اليوم" />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const Icon = ACTIVITY_ICONS[a.type];
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                  <Icon className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-900 dark:text-stone-100">
                    <span className="font-medium">{a.title}</span>
                    {a.amount !== undefined && (
                      <span className="ms-2 font-medium tabular-nums text-stone-700 dark:text-stone-300">
                        {formatCurrency(a.amount, a.currency ?? 'USD')}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {formatRelativeTime(a.timestamp)} · {a.actorName}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
