/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 SyncStatusIndicator — مؤشر حالة المزامنة في Header
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, CloudOff, RefreshCw, AlertCircle, Check,
  ChevronDown, HardDrive, Trash2, Download, RotateCcw, X, Wifi, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSyncStatus, type PendingItem } from '@/hooks/useSyncStatus';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';

// ─── Label Helpers ────────────────────────────────────────────

function getTableLabel(table: string, isRtl: boolean): string {
  const labels: Record<string, [string, string]> = {
    stock_count_items: ['بنود الجرد', 'Stock Count Items'],
    fabric_rolls: ['الرولونات', 'Fabric Rolls'],
    fabric_materials: ['المواد', 'Materials'],
  };
  const [ar, en] = labels[table] || [table, table];
  return isRtl ? ar : en;
}

function getOperationLabel(op: string, isRtl: boolean): string {
  const ops: Record<string, [string, string]> = {
    insert: ['إضافة', 'Insert'],
    update: ['تعديل', 'Update'],
    upsert: ['إضافة/تعديل', 'Upsert'],
    delete: ['حذف', 'Delete'],
  };
  const [ar, en] = ops[op] || [op, op];
  return isRtl ? ar : en;
}

function timeAgo(dateStr: string, isRtl: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return isRtl ? 'الآن' : 'just now';
  if (minutes < 60) return isRtl ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isRtl ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isRtl ? `منذ ${days} يوم` : `${days}d ago`;
}

// ─── Main Component ──────────────────────────────────────────

export function SyncStatusIndicator() {
  const { direction } = useLanguage();
  const isRtl = direction === 'rtl';
  const { toast } = useToast();
  const sync = useSyncStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [failedItems, setFailedItems] = useState<PendingItem[]>([]);

  // Total issues count
  const totalIssues = sync.pendingCount + sync.failedCount;

  // Determine status color
  const statusColor = !sync.isOnline
    ? 'text-red-500'
    : sync.failedCount > 0
      ? 'text-amber-500'
      : sync.pendingCount > 0
        ? 'text-blue-500'
        : 'text-emerald-500';

  const statusBg = !sync.isOnline
    ? 'bg-red-500'
    : sync.failedCount > 0
      ? 'bg-amber-500'
      : sync.pendingCount > 0
        ? 'bg-blue-500'
        : '';

  // Load items when drawer opens
  useEffect(() => {
    if (isOpen) {
      sync.getPendingItems().then(setPendingItems);
      sync.getFailedItems().then(setFailedItems);
    }
  }, [isOpen, sync.pendingCount, sync.failedCount]);

  // ── Online/Offline toasts ────────────────────────────────
  const prevOnline = useState(sync.isOnline)[0];
  useEffect(() => {
    if (sync.isOnline && !prevOnline) {
      toast({
        title: isRtl ? '✅ تم استعادة الاتصال' : '✅ Connection restored',
        description: isRtl ? 'جاري المزامنة...' : 'Syncing...',
      });
    } else if (!sync.isOnline && prevOnline) {
      toast({
        title: isRtl ? '📡 انقطع الاتصال' : '📡 Connection lost',
        description: isRtl ? 'العمليات ستُحفظ محلياً' : 'Operations will be saved locally',
        variant: 'destructive',
      });
    }
  }, [sync.isOnline]);

  // ── Handlers ────────────────────────────────────────────
  const handleForceSync = async () => {
    const result = await sync.forceSync();
    toast({
      title: isRtl ? '🔄 اكتملت المزامنة' : '🔄 Sync completed',
      description: isRtl
        ? `تمت مزامنة ${result.synced} عملية${result.failed > 0 ? ` | فشلت ${result.failed}` : ''}`
        : `Synced ${result.synced}${result.failed > 0 ? ` | Failed ${result.failed}` : ''}`,
    });
    sync.getPendingItems().then(setPendingItems);
    sync.getFailedItems().then(setFailedItems);
  };

  const handleRetryItem = async (id: number) => {
    const success = await sync.retryFailed(id);
    toast({
      title: success
        ? (isRtl ? '✅ تمت المزامنة' : '✅ Synced')
        : (isRtl ? '❌ فشلت المزامنة' : '❌ Sync failed'),
    });
    sync.getFailedItems().then(setFailedItems);
  };

  const handleRetryAll = async () => {
    const result = await sync.retryAllFailed();
    toast({
      title: isRtl ? '🔄 إعادة المحاولة' : '🔄 Retry completed',
      description: isRtl
        ? `نجحت ${result.synced} | فشلت ${result.failed}`
        : `Success ${result.synced} | Failed ${result.failed}`,
    });
    sync.getFailedItems().then(setFailedItems);
  };

  const handleDiscard = async (id: number) => {
    await sync.discardFailed(id);
    toast({ title: isRtl ? '🗑️ تم التجاهل' : '🗑️ Discarded' });
    sync.getFailedItems().then(setFailedItems);
  };

  const handleExport = async () => {
    const json = await sync.exportPending();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `texacore-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: isRtl ? '📥 تم التصدير' : '📥 Exported' });
  };

  // ── Storage bar ─────────────────────────────────────────
  const storagePercent = sync.storage?.usagePercentage ?? 0;
  const storageColor = storagePercent > 80 ? 'bg-red-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 relative"
            >
              {/* Icon */}
              {sync.isSyncing ? (
                <RefreshCw className={cn('h-5 w-5 animate-spin', statusColor)} />
              ) : sync.isOnline ? (
                <Cloud className={cn('h-5 w-5', statusColor)} />
              ) : (
                <CloudOff className="h-5 w-5 text-red-500" />
              )}

              {/* Badge */}
              <AnimatePresence>
                {totalIssues > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={cn(
                      'absolute -top-0.5 -end-0.5 h-5 min-w-5 px-1 flex items-center justify-center',
                      'text-[10px] font-bold text-white rounded-full shadow-sm',
                      statusBg
                    )}
                  >
                    {totalIssues > 9 ? '9+' : totalIssues}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-center">
            <p className="font-medium">
              {isRtl ? 'حالة المزامنة' : 'Sync Status'}
            </p>
            <p className="text-xs text-muted-foreground">
              {!sync.isOnline
                ? (isRtl ? 'غير متصل' : 'Offline')
                : sync.pendingCount > 0
                  ? (isRtl ? `${sync.pendingCount} عملية معلقة` : `${sync.pendingCount} pending`)
                  : (isRtl ? 'كل شيء محدث' : 'All synced')
              }
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* ─── Drawer Content ──────────────────────────────── */}
      <SheetContent
        side={isRtl ? 'left' : 'right'}
        className="w-[380px] sm:w-[420px] p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-850">
          <SheetTitle className="flex items-center gap-2">
            {sync.isOnline ? (
              <Wifi className="h-5 w-5 text-emerald-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            {isRtl ? 'حالة المزامنة' : 'Sync Status'}
          </SheetTitle>

          {/* Connection status */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'h-2.5 w-2.5 rounded-full',
              sync.isOnline ? 'bg-emerald-500' : 'bg-red-500'
            )} />
            <span className="text-sm text-muted-foreground">
              {sync.isOnline
                ? (isRtl ? 'متصل بالإنترنت' : 'Connected')
                : (isRtl ? 'غير متصل' : 'Offline')
              }
            </span>
            {sync.lastSyncAt && (
              <span className="text-xs text-muted-foreground ms-auto">
                {isRtl ? 'آخر مزامنة: ' : 'Last sync: '}
                {timeAgo(sync.lastSyncAt.toISOString(), isRtl)}
              </span>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <div className="p-4 space-y-6">

            {/* ─── Pending Items ──────────────────────────── */}
            {pendingItems.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  {isRtl ? `عمليات معلقة (${pendingItems.length})` : `Pending (${pendingItems.length})`}
                </h3>
                <div className="space-y-2">
                  {pendingItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {getTableLabel(item.table, isRtl)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getOperationLabel(item.operation, isRtl)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {timeAgo(item.createdAt, isRtl)}
                        {item.attempts > 0 && ` • ${isRtl ? 'محاولة' : 'attempt'} ${item.attempts}`}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Failed Items ───────────────────────────── */}
            {failedItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    {isRtl ? `عمليات فاشلة (${failedItems.length})` : `Failed (${failedItems.length})`}
                  </h3>
                  {failedItems.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleRetryAll}>
                      <RotateCcw className="h-3 w-3 me-1" />
                      {isRtl ? 'إعادة الكل' : 'Retry all'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {failedItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {getTableLabel(item.table, isRtl)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {isRtl ? 'فشل' : 'Failed'}
                        </Badge>
                      </div>
                      {item.errorMessage && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">
                          {item.errorMessage}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 flex-1"
                          onClick={() => handleRetryItem(item.id)}
                        >
                          <RotateCcw className="h-3 w-3 me-1" />
                          {isRtl ? 'إعادة' : 'Retry'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDiscard(item.id)}
                        >
                          <Trash2 className="h-3 w-3 me-1" />
                          {isRtl ? 'تجاهل' : 'Discard'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── All Synced ─────────────────────────────── */}
            {pendingItems.length === 0 && failedItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium">
                  {isRtl ? 'كل شيء محدث' : 'Everything is synced'}
                </p>
                <p className="text-xs mt-1">
                  {isRtl ? 'لا توجد عمليات معلقة' : 'No pending operations'}
                </p>
              </div>
            )}

            {/* ─── Storage ────────────────────────────────── */}
            {sync.storage && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  {isRtl ? 'التخزين المحلي' : 'Local Storage'}
                </h3>
                <div className="p-3 rounded-lg border">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>{sync.storage.usageMB} MB</span>
                    <span>{sync.storage.quotaMB} MB</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', storageColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${storagePercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className={cn(
                      'font-medium',
                      storagePercent > 80 ? 'text-red-500' : 'text-muted-foreground'
                    )}>
                      {storagePercent}%
                    </span>
                    <span className="text-muted-foreground">
                      {sync.storage.isPersisted
                        ? (isRtl ? '✅ تخزين دائم' : '✅ Persistent')
                        : (isRtl ? '⚠️ قابل للحذف' : '⚠️ Evictable')
                      }
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* ─── Footer Actions ──────────────────────────── */}
        <div className="p-4 border-t flex gap-2">
          <Button
            className="flex-1"
            onClick={handleForceSync}
            disabled={sync.isSyncing || !sync.isOnline}
          >
            {sync.isSyncing ? (
              <RefreshCw className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 me-2" />
            )}
            {isRtl ? 'مزامنة الآن' : 'Sync Now'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 me-2" />
            {isRtl ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
