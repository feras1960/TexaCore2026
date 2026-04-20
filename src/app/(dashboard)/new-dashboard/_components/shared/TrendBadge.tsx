import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function TrendBadge({ value, muted = false }: { value: number; muted?: boolean }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const colorClass = muted
    ? 'text-stone-500 dark:text-stone-400'
    : positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
