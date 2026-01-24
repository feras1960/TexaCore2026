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
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  className?: string;
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
  change,
  changeLabel,
  icon: Icon,
  className,
  formatValue,
}: StatCardProps) {
  const styles = TYPE_STYLES[type];
  const displayValue = formatValue ? formatValue(value) : value;

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
        'rounded-xl border p-4 transition-colors hover:shadow-md',
        styles.bg,
        styles.border,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <motion.p 
            className={cn('text-2xl font-bold font-cairo', styles.text)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {prefix}
            {displayValue}
            {suffix && <span className="text-sm font-normal ms-1">{suffix}</span>}
          </motion.p>
          {renderChange()}
        </div>
        {Icon && (
          <motion.div 
            className={cn('p-2 rounded-lg', styles.bg)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <Icon className={cn('w-5 h-5', styles.text)} />
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
