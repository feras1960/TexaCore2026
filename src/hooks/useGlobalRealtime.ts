/**
 * ════════════════════════════════════════════════════════════════
 * 🌐 useGlobalRealtime — مزامنة عالمية لكل الجداول الحرجة
 * ════════════════════════════════════════════════════════════════
 *
 * يُستدعى مرة واحدة في MainLayout بعد تسجيل الدخول.
 * يُنشئ اشتراكات Supabase Realtime لكل الجداول الأساسية
 * بحيث أي تغيير من أي مستخدم → يُحدّث الكاش المحلي فوراً.
 *
 * 🔄 Flow:
 *   مستخدم آخر يضيف قيد ← Supabase Realtime ← invalidateQueries
 *   ← React Query يُعيد جلب البيانات بالخلفية ← الشاشة تتحدث بسلاسة
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Table → Query Keys mapping ──────────────────────────────
// ⚠️ IMPORTANT: queryKeys here MUST match the keys used by pages
//    and DataEngine modules. When adding new modules, update this list.
export const REALTIME_SUBSCRIPTIONS = [
    // ═══ ACCOUNTING ═══
    {
        table: 'chart_of_accounts',
        queryKeys: [
            ['accounts'],
            ['accounting', 'funds'],
            ['accounting_defaults'],
        ],
    },
    {
        table: 'journal_entries',
        queryKeys: [
            ['accounting', 'journal-entries'],
            ['accounts'],
            ['account_ledger'],
            ['dashboard-v11'],  // ← Dashboard: KPIs, Net Position, Cash Flow
        ],
    },
    {
        table: 'journal_entry_lines',
        queryKeys: [
            ['accounting', 'journal-entries'],
            ['accounts'],
            ['account_ledger'],
            ['customer_balances_subledger'],
            ['party_balances_supplier_purchases'],
            ['sales_payments_list'],
            ['dashboard-v11'],  // ← Dashboard: KPIs, Net Position, Cash Flow
        ],
    },
    {
        table: 'exchange_rates',
        queryKeys: [
            ['accounting', 'exchange-rates'],
            ['exchange_rates'],
        ],
    },
    // ═══ SALES ═══
    {
        table: 'sales_transactions',
        queryKeys: [
            ['sales_cycle_full'],
            ['sales_transactions_list'],
            ['customers_sales_stats'],
            ['warehouse', 'pending-receipts'],  // ← أذون التسليم تتحدث فورياً عند تأكيد فاتورة مبيعات
            ['dashboard-v11'],  // ← Dashboard: KPIs, Top Customers, Attention, Recent Activity
        ],
    },
    {
        table: 'customers',
        queryKeys: [
            ['parties_customers'],
            ['customers_list'],
            ['customers_map'],
            ['dashboard-v11'],  // ← Dashboard: Top Customers
        ],
    },
    {
        table: 'sales_delivery_orders',
        queryKeys: [
            ['sales_cycle_full'],
        ],
    },
    // ═══ PURCHASES ═══
    {
        table: 'purchase_transactions',
        queryKeys: [
            ['purchase_transactions_recent'],
            ['purchase_transactions_full'],
            ['purchase_cycle_full'],
            ['suppliers_purchase_stats'],
            ['warehouse', 'pending-receipts'],  // ← أذون الاستلام تتحدث فورياً عند تأكيد فاتورة مشتريات
            ['dashboard-v11'],  // ← Dashboard: KPIs, Attention, Recent Activity
        ],
    },
    {
        table: 'suppliers',
        queryKeys: [
            ['parties_suppliers'],
            ['suppliers_list'],
            ['suppliers_map'],
        ],
    },
    {
        table: 'containers',
        queryKeys: [
            ['containers_list'],
            ['container_invoice_counts'],
            ['container_tax_totals'],
        ],
    },
    // ═══ WAREHOUSE ═══
    {
        table: 'fabric_rolls',
        queryKeys: [
            ['warehouse', 'materials'],
            ['warehouse', 'dashboard-stats'],
            ['inventory-preload-rolls'],
            ['inventory-preload-stock'],
            ['material-inventory'],
        ],
    },
    {
        table: 'fabric_materials',
        queryKeys: [
            ['warehouse', 'materials'],
            ['warehouse', 'groups'],
            ['warehouse', 'dashboard-stats'],
            ['material-inventory'],
            ['inventory-preload-materials'],
            ['inventory-preload-stock'],
        ],
    },
    {
        table: 'inventory_stock',
        queryKeys: [
            ['inventory-preload-stock'],
            ['material-inventory'],
            ['warehouse', 'materials'],
        ],
    },
    {
        table: 'inventory_movements',
        queryKeys: [
            ['material-movements'],
            ['warehouse', 'materials'],
            ['warehouse', 'dashboard-stats'],
        ],
    },
    {
        table: 'warehouses',
        queryKeys: [
            ['warehouse', 'list'],
            ['warehouse', 'tree'],
            ['warehouse', 'capacity'],
            ['warehouse', 'dashboard-stats'],
            // DataEngine preload caches — must be cleared on warehouse changes
            ['inventory-preload-materials'],
            ['inventory-preload-rolls'],
            ['inventory-preload-filters'],
        ],
    },
    {
        table: 'branches',
        queryKeys: [
            ['warehouse', 'tree'],
            ['branches_list'],
            ['warehouse', 'default-branch'],
        ],
    },
    // ═══ CRM ═══
    {
        table: 'contacts',
        queryKeys: [
            ['crm_contacts'],
            ['crm_pipeline_stats'],
            ['crm_pipeline_deals'],
        ],
    },
    // ═══ HR ═══
    {
        table: 'employees',
        queryKeys: [
            ['hr_employees'],
            ['hr_dashboard_stats'],
        ],
    },
    {
        table: 'departments',
        queryKeys: [
            ['hr_departments'],
            ['hr_dashboard_stats'],
        ],
    },
    {
        table: 'employee_contracts',
        queryKeys: [
            ['hr_contracts'],
            ['hr_dashboard_stats'],
        ],
    },
    {
        table: 'leave_requests',
        queryKeys: [
            ['hr_leave_requests'],
            ['hr_dashboard_stats'],
        ],
    },
];

export function useGlobalRealtime() {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();
    const channelsRef = useRef<RealtimeChannel[]>([]);
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const isSetup = useRef(false);

    useEffect(() => {
        if (!companyId || isSetup.current) return;

        // Skip Realtime in local desktop mode — no Realtime service available
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (isLocal) {
            console.log('🌐 [GlobalRealtime] Local mode — skipping WebSocket subscriptions');
            return;
        }

        isSetup.current = true;

        console.log('🌐 [GlobalRealtime] Setting up subscriptions for', REALTIME_SUBSCRIPTIONS.length, 'tables');

        const channels: RealtimeChannel[] = [];

        for (const sub of REALTIME_SUBSCRIPTIONS) {
            const channelName = `global-rt-${sub.table}-${companyId}`;

            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes' as any,
                    {
                        event: '*',
                        schema: 'public',
                        table: sub.table,
                        filter: `company_id=eq.${companyId}`,
                    },
                    (payload: any) => {
                        // Debounce: wait 300ms before invalidating (handles bulk operations)
                        const timerKey = sub.table;
                        const existing = debounceTimers.current.get(timerKey);
                        if (existing) clearTimeout(existing);

                        debounceTimers.current.set(
                            timerKey,
                            setTimeout(() => {
                                const eventType = payload?.eventType || 'UPDATE';
                                console.log(`🔄 [GlobalRealtime] ${sub.table} ${eventType} → invalidating`, sub.queryKeys.length, 'queries');
                                for (const key of sub.queryKeys) {
                                    if (eventType === 'DELETE') {
                                        // DELETE → remove cache entirely so stale data disappears instantly
                                        queryClient.removeQueries({ queryKey: key });
                                    }
                                    // Always invalidate to trigger refetch
                                    queryClient.invalidateQueries({ queryKey: key });
                                }
                                debounceTimers.current.delete(timerKey);
                            }, 300)
                        );
                    }
                )
                .subscribe((status: string) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`🌐 [GlobalRealtime] ✅ ${sub.table}`);
                    }
                });

            channels.push(channel);
        }

        channelsRef.current = channels;

        return () => {
            // Cleanup all channels
            for (const ch of channelsRef.current) {
                supabase.removeChannel(ch);
            }
            channelsRef.current = [];
            isSetup.current = false;
            // Clear all debounce timers
            for (const timer of debounceTimers.current.values()) {
                clearTimeout(timer);
            }
            debounceTimers.current.clear();
        };
    }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps
}
