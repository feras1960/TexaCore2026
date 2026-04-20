/**
 * LiveSyncBadge — Real-time indicator for dashboards
 *
 * Since dashboards use Supabase Realtime subscriptions,
 * the default state is "مباشر" (Live) with a pulsing green dot.
 * Only changes when offline or actively fetching.
 *
 * Variants:
 *  - hero: for dark hero background (teal/emerald text)
 *  - inline: for light backgrounds (stone text)
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function LiveSyncBadge({
  isFetching,
  variant = 'hero',
  className,
}: {
  /** @deprecated No longer needed — badge always shows "مباشر" */
  lastSync?: Date | null;
  isFetching?: boolean;
  variant?: 'hero' | 'inline';
  className?: string;
}) {
  const online = useOnline();

  // ── Offline ───────────────────────────────────────────
  if (!online) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        variant === 'hero'
          ? 'bg-rose-500/15 text-rose-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
        className
      )}>
        <WifiOff className="h-3 w-3" />
        غير متصل · كاش
      </span>
    );
  }

  // ── Fetching ──────────────────────────────────────────
  if (isFetching) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        variant === 'hero'
          ? 'bg-sky-500/15 text-sky-300'
          : 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
        className
      )}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        يتم التحديث…
      </span>
    );
  }

  // ── Live (default) ────────────────────────────────────
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
      variant === 'hero'
        ? 'bg-emerald-500/10 text-emerald-300'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
      className
    )}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full',
          variant === 'hero' ? 'bg-emerald-400' : 'bg-emerald-500'
        )} />
      </span>
      مباشر
    </span>
  );
}
