import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import {
  Clock, FileText, CreditCard, Receipt, Package, BookOpen,
  ShoppingCart, Truck, ClipboardList, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import type { ActivityItem, ActivityType } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { formatCurrency, formatRelativeTime } from '../_lib/formatters';

/* ─── Icon & Color per activity type ─── */
const ACTIVITY_META: Record<string, { icon: any; color: string; bg: string }> = {
  sale:           { icon: Receipt,          color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  purchase:       { icon: ShoppingCart,     color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-900/30' },
  payment:        { icon: ArrowUpCircle,    color: 'text-red-500 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-900/30' },
  receipt:        { icon: ArrowDownCircle,  color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-900/30' },
  journal:        { icon: BookOpen,         color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-900/30' },
  delivery:       { icon: Truck,            color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/30' },
  purchase_order: { icon: ClipboardList,    color: 'text-sky-600 dark:text-sky-400',        bg: 'bg-sky-50 dark:bg-sky-900/30' },
  sales_order:    { icon: ClipboardList,    color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-900/30' },
  inventory:      { icon: Package,          color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/30' },
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  posted:    { label: 'مرحّل',  cls: 'text-emerald-600 dark:text-emerald-400' },
  draft:     { label: 'مسودة',  cls: 'text-amber-600 dark:text-amber-400' },
  confirmed: { label: 'مؤكد',   cls: 'text-blue-600 dark:text-blue-400' },
  pending:   { label: 'معلّق',  cls: 'text-orange-600 dark:text-orange-400' },
  delivered: { label: 'تم التسليم', cls: 'text-violet-600 dark:text-violet-400' },
  cancelled: { label: 'ملغي',   cls: 'text-red-500 dark:text-red-400' },
  paid:      { label: 'مدفوع',  cls: 'text-emerald-600 dark:text-emerald-400' },
};

function getMeta(type: string) {
  return ACTIVITY_META[type] || { icon: FileText, color: 'text-stone-600 dark:text-stone-400', bg: 'bg-stone-100 dark:bg-stone-800' };
}

export function RecentActivityPanel({
  items,
  loading,
  onActivityClick,
}: {
  items?: ActivityItem[];
  loading: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
}) {
  const isClickable = Boolean(onActivityClick);

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
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState icon={Clock} title="لا يوجد نشاط اليوم" />
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pe-1">
          {items.map((a) => {
            const meta = getMeta(a.type);
            const Icon = meta.icon;
            const statusInfo = a.status ? STATUS_LABELS[a.status] : null;

            return (
              <li
                key={a.id}
                onClick={() => onActivityClick?.(a)}
                className={`flex items-start gap-3 rounded-lg p-2 transition-all duration-150 ${
                  isClickable
                    ? 'cursor-pointer hover:bg-stone-100/80 dark:hover:bg-stone-700/40 hover:shadow-sm active:scale-[0.99]'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                {/* Icon */}
                <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Row 1: Type label + doc number */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${meta.color}`}>
                      {a.typeLabel}
                    </span>
                    {a.docNumber && (
                      <span className="text-xs font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded">
                        {a.docNumber}
                      </span>
                    )}
                    {statusInfo && (
                      <span className={`text-[10px] font-medium ${statusInfo.cls}`}>
                        ({statusInfo.label})
                      </span>
                    )}
                  </div>

                  {/* Row 2: Party name + amount */}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-sm text-stone-800 dark:text-stone-200 truncate">
                      {a.partyName || a.title || '—'}
                    </span>
                    {a.amount != null && a.amount !== 0 && (
                      <span className="text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100 flex-shrink-0">
                        {formatCurrency(a.amount, a.currency ?? 'USD')}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Timestamp + actor */}
                  <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500">
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
