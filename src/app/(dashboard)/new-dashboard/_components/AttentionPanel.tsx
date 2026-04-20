import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { AlertCircle } from 'lucide-react';
import { AttentionItem } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { motion } from 'framer-motion';

const SEVERITY_STYLES: Record<string, { dot: string; ring: string; label: string }> = {
  danger:  { dot: 'bg-rose-500',   ring: 'ring-rose-500/20',   label: 'عاجل' },
  warning: { dot: 'bg-amber-500',  ring: 'ring-amber-500/20',  label: 'تحذير' },
  info:    { dot: 'bg-blue-500',   ring: 'ring-blue-500/20',   label: 'معلومة' },
};

export function AttentionPanel({
  items,
  loading,
}: {
  items?: AttentionItem[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="يتطلب انتباهك"
      action={
        items && items.length > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-50 px-1.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {items.length}
          </span>
        ) : null
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="كل شيء على ما يرام"
          description="لا توجد تنبيهات تتطلب إجراءً الآن."
        />
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {items.map((item) => {
            const s = SEVERITY_STYLES[item.severity];
            return (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ring-4 ${s.dot} ${s.ring}`}
                  aria-label={`خطورة ${s.label}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                    {item.subtitle}
                  </p>
                </div>
                {item.actionHref && (
                  <a
                    href={item.actionHref}
                    className="flex-shrink-0 text-xs font-medium text-teal-600 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    {item.actionLabel ?? 'عرض'}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
