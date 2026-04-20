import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const BADGE_TONE = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
  neutral: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
} as const;

export function SectionCard({
  title,
  icon: Icon,
  badge,
  badgeTone = 'neutral',
  action,
  children,
  className = '',
  noPadding = false,
}: {
  title: string;
  icon?: LucideIcon;
  badge?: string;
  badgeTone?: keyof typeof BADGE_TONE;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900',
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400" />}
          <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</h2>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', BADGE_TONE[badgeTone])}>
              {badge}
            </span>
          )}
        </div>
        {action}
      </header>
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
