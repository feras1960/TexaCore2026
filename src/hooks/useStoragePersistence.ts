/**
 * ════════════════════════════════════════════════════════════════
 * 💾 useStoragePersistence — Hook لإدارة التخزين الدائم
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type StorageStatus,
  getStorageStatus,
  requestPersistentStorage,
  cleanupOldCache,
} from '@/lib/storage/storagePersistence';

interface UseStoragePersistenceReturn {
  status: StorageStatus | null;
  isPersisted: boolean;
  isLoading: boolean;
  error: Error | null;
  requestPersistence: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  cleanup: (threshold?: number) => Promise<{ cleaned: boolean; freedMB: number }>;
}

export function useStoragePersistence(): UseStoragePersistenceReturn {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch status on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        const s = await getStorageStatus();
        if (!cancelled) {
          setStatus(s);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    init();

    // Refresh every 5 minutes
    const interval = setInterval(async () => {
      try {
        const s = await getStorageStatus();
        if (!cancelled) setStatus(s);
      } catch { /* ignore periodic errors */ }
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    try {
      const result = await requestPersistentStorage();
      const s = await getStorageStatus();
      setStatus(s);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getStorageStatus();
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const cleanup = useCallback(async (threshold = 80) => {
    const result = await cleanupOldCache(threshold);
    await refreshStatus();
    return result;
  }, [refreshStatus]);

  return {
    status,
    isPersisted: status?.isPersisted ?? false,
    isLoading,
    error,
    requestPersistence,
    refreshStatus,
    cleanup,
  };
}
