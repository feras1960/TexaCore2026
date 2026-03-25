import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type StatType = 'positive' | 'negative' | 'neutral' | 'info' | 'warning';

interface StatCardProps {
  label: string;
  value: number | string;
  type?: StatType;
  suffix?: string;
  prefix?: string;
  subLabel?: string;          // secondary text shown below value (e.g. rolls count)
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  className?: string;
  size?: 'default' | 'compact';
  formatValue?: (value: number | string) => string;
}

const TYPE_STYLES: Record<StatType, { bg: string; text: string; border: string }> = {
  positive: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-100 dark:border-green-800',
  },
  negative: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-800',
  },
  neutral: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800',
  },
};

export function StatCard({
  label,
  value,
  type = 'neutral',
  suffix,
  prefix,
  subLabel,
  change,
  changeLabel,
  icon: Icon,
  className,
  size = 'default',
  formatValue,
}: StatCardProps) {
  const isCompact = size === 'compact';
  const styles = TYPE_STYLES[type];
  const displayValue = formatValue ? formatValue(value as string | number) : value;

  const renderChange = () => {
    if (change === undefined) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const changeColor = isPositive
      ? 'text-green-600 dark:text-green-400'
      : isNegative
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500';

    return (
      <div className={cn('flex items-center gap-1 text-xs font-medium', changeColor)}>
        <TrendIcon className="w-3 h-3" />
        <span>{Math.abs(change)}%</span>
        {changeLabel && <span className="text-gray-400">({changeLabel})</span>}
      </div>
    );
  };

  return (
    <motion.div
      className={cn(
        'rounded-xl border transition-colors',
        isCompact ? 'p-2.5 hover:shadow-sm' : 'p-4 hover:shadow-md',
        // Skip default bg/border if custom className has gradient (glass cards)
        className?.includes('bg-gradient') ? '' : styles.bg,
        className?.includes('bg-gradient') ? '' : styles.border,
        className
      )}
      initial={{ opacity: 0, y: isCompact ? 10 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={isCompact ? undefined : { scale: 1.02, y: -2 }}
      whileTap={isCompact ? undefined : { scale: 0.98 }}
    >
      <div className={cn('flex items-center justify-between', isCompact ? 'gap-2' : 'items-start')}>
        <div className={isCompact ? 'space-y-0' : 'space-y-1'}>
          <p className={cn('font-medium text-gray-500 dark:text-gray-400', isCompact ? 'text-xs' : 'text-xs')}>{label}</p>
          <motion.p
            className={cn('font-bold font-cairo', isCompact ? 'text-xl leading-tight' : 'text-2xl', styles.text)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {prefix}
            {displayValue}
            {suffix && <span className={cn('font-normal ms-1', isCompact ? 'text-xs' : 'text-sm')}>{suffix}</span>}
          </motion.p>
          {subLabel && (
            <span className={cn('font-medium text-purple-600 dark:text-purple-400', isCompact ? 'text-[11px]' : 'text-xs')}>{subLabel}</span>
          )}
          {renderChange()}
        </div>
        {Icon && (
          <motion.div
            className={cn('rounded-lg', styles.bg, isCompact ? 'p-1.5' : 'p-2')}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <Icon className={cn(styles.text, isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, cols = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[cols], className)}>
      {children}
    </div>
  );
}
