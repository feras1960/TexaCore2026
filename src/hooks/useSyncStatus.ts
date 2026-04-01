/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 useSyncStatus — Hook لمراقبة حالة المزامنة
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDB } from '@/features/warehouse/services/warehouseOfflineDB';
import { stockCountOfflineStore } from '@/features/warehouse/services/stockCountOfflineStore';
import { getStorageStatus, type StorageStatus } from '@/lib/storage/storagePersistence';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  syncingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  storage: StorageStatus | null;
}

export interface PendingItem {
  id: number;
  table: string;
  operation: string;
  status: string;
  attempts: number;
  errorMessage?: string;
  createdAt: string;
}

interface UseSyncStatusReturn extends SyncStatus {
  /** Force sync all pending items */
  forceSync: () => Promise<{ synced: number; failed: number }>;
  /** Retry a specific failed item */
  retryFailed: (id: number) => Promise<boolean>;
  /** Retry all failed items */
  retryAllFailed: () => Promise<{ synced: number; failed: number }>;
  /** Discard a failed item permanently */
  discardFailed: (id: number) => Promise<void>;
  /** Get detailed list of pending/failed items */
  getPendingItems: () => Promise<PendingItem[]>;
  /** Get failed items */
  getFailedItems: () => Promise<PendingItem[]>;
  /** Export pending items as JSON backup */
  exportPending: () => Promise<string>;
  /** Refresh status */
  refresh: () => Promise<void>;
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    failedCount: 0,
    syncingCount: 0,
    lastSyncAt: null,
    isSyncing: false,
    storage: null,
  });

  const isMounted = useRef(true);
  const lastSyncRef = useRef<Date | null>(null);

  // ── Refresh sync queue stats ────────────────────────────
  const refresh = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const stats = await offlineDB.getSyncQueueStats();
      const storage = await getStorageStatus();

      setStatus(prev => ({
        ...prev,
        pendingCount: stats.pending,
        failedCount: stats.errors,
        syncingCount: stats.syncing,
        isOnline: navigator.onLine,
        lastSyncAt: lastSyncRef.current,
        storage,
      }));
    } catch {
      // offlineDB might not be ready yet
    }
  }, []);

  // ── Setup online/offline listeners + polling ────────────
  useEffect(() => {
    isMounted.current = true;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      refresh();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll every 10 seconds
    refresh();
    const interval = setInterval(refresh, 10_000);

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refresh]);

  // ── Force sync ──────────────────────────────────────────
  const forceSync = useCallback(async () => {
    setStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await stockCountOfflineStore.flushSyncQueue();
      lastSyncRef.current = new Date();
      await refresh();
      return result;
    } finally {
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [refresh]);

  // ── Retry single failed item ────────────────────────────
  const retryFailed = useCallback(async (id: number): Promise<boolean> => {
    try {
      await offlineDB.syncQueue.update(id, {
        status: 'pending',
        attempts: 0,
        errorMessage: undefined,
        updatedAt: new Date().toISOString(),
      });
      const result = await stockCountOfflineStore.flushSyncQueue();
      await refresh();
      return result.synced > 0;
    } catch {
      return false;
    }
  }, [refresh]);

  // ── Retry all failed ────────────────────────────────────
  const retryAllFailed = useCallback(async () => {
    try {
      const failed = await offlineDB.syncQueue
        .where('status').equals('error')
        .toArray();

      await Promise.all(
        failed.map(item =>
          offlineDB.syncQueue.update(item.id!, {
            status: 'pending',
            attempts: 0,
            errorMessage: undefined,
            updatedAt: new Date().toISOString(),
          })
        )
      );

      const result = await stockCountOfflineStore.flushSyncQueue();
      lastSyncRef.current = new Date();
      await refresh();
      return result;
    } catch {
      return { synced: 0, failed: 0 };
    }
  }, [refresh]);

  // ── Discard failed item ─────────────────────────────────
  const discardFailed = useCallback(async (id: number) => {
    await offlineDB.syncQueue.delete(id);
    await refresh();
  }, [refresh]);

  // ── Get pending items list ──────────────────────────────
  const getPendingItems = useCallback(async (): Promise<PendingItem[]> => {
    try {
      const items = await offlineDB.syncQueue
        .where('status').anyOf('pending', 'syncing')
        .toArray();
      return items.map(i => ({
        id: i.id!,
        table: i.table,
        operation: i.operation,
        status: i.status,
        attempts: i.attempts,
        errorMessage: i.errorMessage,
        createdAt: i.createdAt,
      }));
    } catch {
      return [];
    }
  }, []);

  // ── Get failed items list ───────────────────────────────
  const getFailedItems = useCallback(async (): Promise<PendingItem[]> => {
    try {
      const items = await offlineDB.syncQueue
        .where('status').equals('error')
        .toArray();
      return items.map(i => ({
        id: i.id!,
        table: i.table,
        operation: i.operation,
        status: i.status,
        attempts: i.attempts,
        errorMessage: i.errorMessage,
        createdAt: i.createdAt,
      }));
    } catch {
      return [];
    }
  }, []);

  // ── Export pending items ────────────────────────────────
  const exportPending = useCallback(async (): Promise<string> => {
    const pending = await offlineDB.syncQueue.toArray();
    const stockItems = await offlineDB.stockCountItems
      .where('syncStatus').anyOf('pending', 'error')
      .toArray();

    const exportData = {
      exportedAt: new Date().toISOString(),
      syncQueue: pending,
      pendingStockItems: stockItems,
    };

    return JSON.stringify(exportData, null, 2);
  }, []);

  return {
    ...status,
    forceSync,
    retryFailed,
    retryAllFailed,
    discardFailed,
    getPendingItems,
    getFailedItems,
    exportPending,
    refresh,
  };
}
