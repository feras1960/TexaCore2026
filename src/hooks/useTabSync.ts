/**
 * ════════════════════════════════════════════════════════════════
 * 📡 useTabSync — Hook للتنسيق بين التبويبات
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTabSync, type SyncMessage } from '@/lib/sync/tabSyncChannel';

interface UseTabSyncReturn {
  /** Broadcast a message to all other tabs */
  broadcast: (message: Omit<SyncMessage, 'tabId'>) => void;
  /** Is this tab the leader? (only leader runs Realtime) */
  isLeader: boolean;
  /** This tab's unique ID */
  tabId: string;
}

export function useTabSync(): UseTabSyncReturn {
  const tabSync = getTabSync();
  const queryClient = useQueryClient();
  const [isLeader, setIsLeader] = useState(tabSync.isLeader);
  const isLeaderRef = useRef(tabSync.isLeader);

  useEffect(() => {
    const sync = getTabSync();

    // Update leader state periodically
    const leaderCheck = setInterval(() => {
      if (sync.isLeader !== isLeaderRef.current) {
        isLeaderRef.current = sync.isLeader;
        setIsLeader(sync.isLeader);
      }
    }, 2000);

    // Listen for cache updates from other tabs
    const unsub1 = sync.subscribe('CACHE_UPDATED', (msg) => {
      if (msg.type === 'CACHE_UPDATED') {
        console.log(`📡 [TabSync] Received cache update for: ${msg.queryKeys.join(', ')}`);
        msg.queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    });

    // Listen for data changes from other tabs
    const unsub2 = sync.subscribe('DATA_CHANGED', (msg) => {
      if (msg.type === 'DATA_CHANGED') {
        console.log(`📡 [TabSync] Data changed: ${msg.table} (${msg.operation})`);
        // Invalidate related queries
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(k => 
              typeof k === 'string' && k.toLowerCase().includes(msg.table.replace(/_/g, ''))
            );
          },
        });
      }
    });

    // Listen for logout from other tabs
    const unsub3 = sync.subscribe('LOGOUT', () => {
      console.log('📡 [TabSync] Logout received from another tab — reloading...');
      window.location.href = '/login';
    });

    // Listen for leader changes
    const unsub4 = sync.subscribe('LEADER_CLAIM', () => {
      setTimeout(() => {
        isLeaderRef.current = sync.isLeader;
        setIsLeader(sync.isLeader);
      }, 500);
    });

    const unsub5 = sync.subscribe('LEADER_ACK', () => {
      setTimeout(() => {
        isLeaderRef.current = sync.isLeader;
        setIsLeader(sync.isLeader);
      }, 500);
    });

    return () => {
      clearInterval(leaderCheck);
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [queryClient]);

  const broadcast = useCallback((message: Omit<SyncMessage, 'tabId'>) => {
    getTabSync().broadcast(message);
  }, []);

  return {
    broadcast,
    isLeader,
    tabId: tabSync.tabId,
  };
}
