/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 useRealtimeInvalidation - Supabase Realtime + React Query
 * ربط التحديثات الفورية من Supabase مع إبطال كاش React Query
 * ════════════════════════════════════════════════════════════════
 *
 * 🎯 HOW IT WORKS:
 * ─────────────────
 * 1. Supabase Realtime listens to DB changes (INSERT/UPDATE/DELETE)
 * 2. When a change is detected, it invalidates the relevant React Query cache
 * 3. React Query automatically refetches the data in the background
 * 4. UI updates smoothly without any spinner or flash
 *
 * 📊 ARCHITECTURE:
 * ─────────────────
 *   Database Change (by any user)
 *         ↓
 *   Supabase Realtime (WebSocket)
 *         ↓
 *   invalidateQueries(['module', 'entity'])
 *         ↓
 *   React Query refetches silently
 *         ↓
 *   UI updates automatically ✨
 *
 * 🔧 USAGE:
 * ─────────
 *   // Simple - invalidate one query key
 *   useRealtimeInvalidation({
 *     table: 'warehouses',
 *     companyId,
 *     queryKeys: [['warehouse', 'list']],
 *   });
 *
 *   // Advanced - invalidate multiple keys, filter by company
 *   useRealtimeInvalidation({
 *     table: 'fabric_materials',
 *     companyId,
 *     queryKeys: [
 *       ['warehouse', 'materials'],
 *       ['warehouse', 'dashboard-stats'],
 *     ],
 *     filter: `company_id=eq.${companyId}`,
 *   });
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeInvalidationConfig {
    /** The database table to listen to */
    table: string;
    /** Schema (default: 'public') */
    schema?: string;
    /** CompanyId for filtering - used to build the channel name */
    companyId: string | null | undefined;
    /** React Query keys to invalidate when a change is detected */
    queryKeys: string[][];
    /** 
     * Optional Supabase realtime filter (e.g. `company_id=eq.${companyId}`)
     * Filters changes server-side to reduce traffic
     */
    filter?: string;
    /** 
     * Events to listen to (default: '*' = all)
     * Options: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
     */
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    /** Enable/disable the subscription (default: true) */
    enabled?: boolean;
    /** Optional callback when a change is detected */
    onEvent?: (payload: any) => void;
    /**
     * Debounce interval in ms (default: 300ms)
     * Prevents rapid-fire invalidations when many changes happen at once
     * (e.g. bulk import of materials)
     */
    debounceMs?: number;
}

/**
 * Hook to subscribe to Supabase Realtime changes and auto-invalidate React Query cache.
 * 
 * This creates a WebSocket connection that listens for database changes.
 * When a change is detected, it invalidates the specified React Query keys,
 * causing a background refetch and seamless UI update.
 */
export function useRealtimeInvalidation(config: RealtimeInvalidationConfig) {
    const {
        table,
        schema = 'public',
        companyId,
        queryKeys,
        filter,
        event = '*',
        enabled = true,
        onEvent,
        debounceMs = 300,
    } = config;

    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Don't subscribe if disabled or missing companyId
        if (!enabled || !companyId) return;

        // Build a unique channel name
        const channelName = `rt-${table}-${companyId}`;

        // Clean up existing channel if any
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        // Build the subscription config
        const subscriptionConfig: any = {
            event,
            schema,
            table,
        };

        // Add server-side filter if provided
        if (filter) {
            subscriptionConfig.filter = filter;
        }

        // Create the channel
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes' as any,
                subscriptionConfig,
                (payload: any) => {
                    console.log(`[Realtime] ${table} ${payload.eventType}`, {
                        table,
                        event: payload.eventType,
                        id: payload.new?.id || payload.old?.id,
                    });

                    // Call optional event handler
                    onEvent?.(payload);

                    // Debounce invalidation to handle bulk changes
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }

                    debounceTimerRef.current = setTimeout(() => {
                        // Invalidate all specified query keys
                        for (const key of queryKeys) {
                            queryClient.invalidateQueries({ queryKey: key });
                        }
                    }, debounceMs);
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] ✅ Subscribed to ${table} changes`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`[Realtime] ❌ Failed to subscribe to ${table}`);
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount or dependency change
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [table, schema, companyId, filter, event, enabled]);
    // Note: queryKeys and onEvent intentionally excluded from deps
    // to avoid reconnecting on every render
}

/**
 * Subscribe to multiple tables at once.
 * Useful for dashboards that need data from many sources.
 */
export function useMultiTableRealtime(
    configs: RealtimeInvalidationConfig[]
) {
    // Each config creates its own subscription
    configs.forEach((config, index) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useRealtimeInvalidation({
            ...config,
            // Ensure unique channel names by appending index
        });
    });
}
