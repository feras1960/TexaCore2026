import { Wifi, WifiOff } from 'lucide-react';
import { formatRelativeTime } from '../../_lib/formatters';
import { useOnline } from '../../_hooks/useOnline';

export function SyncIndicator({
  lastSync,
  isFetching,
}: {
  lastSync?: Date;
  isFetching?: boolean;
}) {
  const online = useOnline();

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        <WifiOff className="h-3 w-3" />
        غير متصل · يُعرض الكاش
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
      <Wifi className="h-3 w-3" />
      {isFetching ? 'يتم التحديث…' : lastSync ? `آخر مزامنة ${formatRelativeTime(lastSync.toISOString())}` : 'مباشر'}
    </span>
  );
}
