/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ useDataPreloader — التحميل المسبق الذكي للبيانات الأساسية
 * ════════════════════════════════════════════════════════════════
 *
 * يُستدعى مرة واحدة في MainLayout بعد تسجيل الدخول.
 * يحمّل البنية التحتية بالتوازي في الخلفية:
 *
 * 🔴 Tier 1 (فوري): الحسابات، المواد، المستودعات، العملات
 * 🟡 Tier 2 (بعد 1s): إحصائيات، شجرة الفروع، الأطراف
 *
 * ─── لا يؤثر على سرعة العرض ─── كل شيء في الخلفية ───
 * ─── لا تكرار ─── يحترم React Query caching ───
 * ─── Graceful failure ─── إذا فشل → الصفحة تجلب عادي ───
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { accountsService } from '@/services/accountsService';
import { warehouseService } from '@/services/warehouseService';
import { preloadAccounts } from '@/components/ui/InlineAccountCell';
import { preloadCurrencies } from '@/features/accounting/hooks/useViewCurrency';
import { preloadExchangeRates } from '@/hooks/useExchangeRateLookup';

// ═══════════════════════════════════════════════
// Cache Durations (same as useWarehouseQueries)
// ═══════════════════════════════════════════════
const SEMI_STATIC = 10 * 60 * 1000;  // 10 min
const DYNAMIC     = 2  * 60 * 1000;  //  2 min
const GC_TIME     = 30 * 60 * 1000;  // 30 min

export function useDataPreloader() {
    const { companyId, user } = useAuth();
    const { language } = useLanguage();
    const queryClient = useQueryClient();
    const hasPreloaded = useRef(false);
    const tenantId = user?.user_metadata?.tenant_id;

    useEffect(() => {
        if (!companyId || hasPreloaded.current) return;
        hasPreloaded.current = true;

        const t0 = performance.now();

        // ═══════════════════════════════════════════════
        // 🔴 Tier 1: Critical — Load immediately in parallel
        // ═══════════════════════════════════════════════
        const tier1 = Promise.allSettled([
            // 1. Chart of Accounts (all)
            queryClient.prefetchQuery({
                queryKey: ['accounts', companyId, 'all'],
                queryFn: () => accountsService.getAll(companyId!, { includePartyAccounts: true }),
                staleTime: SEMI_STATIC,
                gcTime: GC_TIME,
            }),

            // 2. Fabric Materials (core list)
            queryClient.prefetchQuery({
                queryKey: ['warehouse', 'materials', companyId, undefined, undefined],
                queryFn: () => warehouseService.getMaterials(companyId!, {}).then(
                    (data: any[]) => data.map((m: any) => ({
                        ...m,
                        parent_id: m.parent_material_id || m.parent_id || m.group_id,
                    }))
                ),
                staleTime: SEMI_STATIC,
                gcTime: GC_TIME,
            }),

            // 3. Material Groups (tree)
            queryClient.prefetchQuery({
                queryKey: ['warehouse', 'groups', companyId, tenantId],
                queryFn: () => warehouseService.getGroups(companyId!, tenantId),
                staleTime: SEMI_STATIC,
                gcTime: GC_TIME,
            }),

            // 4. Warehouses
            queryClient.prefetchQuery({
                queryKey: ['warehouse', 'list', companyId],
                queryFn: () => warehouseService.getAll(companyId!),
                staleTime: SEMI_STATIC,
                gcTime: GC_TIME,
            }),

            // 5. Accounting Defaults
            queryClient.prefetchQuery({
                queryKey: ['accounting_defaults', companyId],
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('company_accounting_settings')
                        .select(`
                            default_cash_account_id, default_bank_account_id,
                            default_receivable_account_id, default_payable_account_id,
                            default_revenue_account_id, default_sales_account_id,
                            default_expense_account_id, default_purchase_account_id,
                            default_cogs_account_id, default_inventory_account_id,
                            default_tax_input_account_id, default_tax_output_account_id,
                            default_fx_gain_account_id, default_fx_loss_account_id,
                            default_freight_in_account_id
                        `)
                        .eq('company_id', companyId)
                        .single();
                    if (error || !data) return null;
                    const accountIds = Object.values(data).filter(Boolean) as string[];
                    if (accountIds.length === 0) return { settings: data, codes: {} };
                    const { data: accounts } = await supabase
                        .from('chart_of_accounts')
                        .select('id, account_code, name_ar, name_en')
                        .in('id', accountIds);
                    const codeMap: Record<string, { code: string; nameAr: string; nameEn: string }> = {};
                    accounts?.forEach((acc: any) => {
                        codeMap[acc.id] = { code: acc.account_code, nameAr: acc.name_ar, nameEn: acc.name_en };
                    });
                    return { settings: data, codes: codeMap };
                },
                staleTime: 60000,
                gcTime: GC_TIME,
            }),

            // 6-8. Existing preloaders (currencies, exchange rates, inline accounts)
            Promise.resolve(preloadAccounts(companyId!)),
            Promise.resolve(preloadCurrencies(companyId!)),
            Promise.resolve(preloadExchangeRates(companyId!)),

            // 9. 🏭 Inventory Page — fabric_rolls (preload for instant inventory access)
            queryClient.prefetchQuery({
                queryKey: ['inventory-preload-rolls', companyId],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('fabric_rolls')
                        .select('id, material_id, warehouse_id, color_id, current_length, reserved_length, cost_per_meter, status, container_id, warehouses!left(id, name_ar, name_en)')
                        .eq('company_id', companyId)
                        .in('status', ['available', 'reserved', 'partial']);
                    return data || [];
                },
                staleTime: DYNAMIC,
                gcTime: GC_TIME,
            }),

            // 10. 🏭 Inventory Page — filter options (colors, batches)
            queryClient.prefetchQuery({
                queryKey: ['inventory-preload-filters', companyId],
                queryFn: async () => {
                    const [colorsRes, batchesRes] = await Promise.all([
                        supabase.from('fabric_colors').select('id, name_ar, name_en, hex_code').eq('company_id', companyId).eq('is_active', true),
                        supabase.from('batches').select('id, batch_number').eq('company_id', companyId).order('created_at', { ascending: false }),
                    ]);
                    return { colors: colorsRes.data || [], batches: batchesRes.data || [] };
                },
                staleTime: SEMI_STATIC,
                gcTime: GC_TIME,
            }),

            // 11. 🏭 Inventory Page — fabric_materials (all active materials for inventory aggregation)
            queryClient.prefetchQuery({
                queryKey: ['inventory-preload-materials', companyId],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('fabric_materials')
                        .select('id, name_ar, name_en, code, unit, group_id, purchase_price, selling_price, min_stock, status, season, current_stock, currency, default_warehouse_id')
                        .eq('company_id', companyId)
                        .eq('status', 'active');
                    return data || [];
                },
                staleTime: DYNAMIC,
                gcTime: GC_TIME,
            }),
        ]);

        tier1.then(() => {
            const t1 = performance.now();
            console.log(`⚡ [DataPreloader] Tier 1 complete in ${Math.round(t1 - t0)}ms`);
        });

        // ═══════════════════════════════════════════════
        // 🟡 Tier 2: Important — Load after 1 second delay
        // ═══════════════════════════════════════════════
        const tier2Timeout = setTimeout(() => {
            Promise.allSettled([
                // Dashboard stats
                queryClient.prefetchQuery({
                    queryKey: ['warehouse', 'dashboard-stats', companyId],
                    queryFn: () => warehouseService.getDashboardStats(companyId!).catch(() => ({
                        totalWarehouses: 0, totalMaterials: 0, totalRolls: 0,
                        activeReservations: 0, pendingDeliveries: 0, lowStockItems: 0,
                    })),
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // Branches + Warehouses tree
                queryClient.prefetchQuery({
                    queryKey: ['warehouse', 'tree', companyId],
                    queryFn: async () => {
                        const [branchesRes, warehousesRes, binRes] = await Promise.all([
                            supabase.from('branches').select('id, code, name_ar, name_en, city, branch_type, is_main, is_active')
                                .eq('company_id', companyId).eq('is_active', true).order('is_main', { ascending: false }),
                            supabase.from('warehouses').select('id, code, name_ar, name_en, warehouse_type, branch_id, is_active')
                                .eq('company_id', companyId).order('code'),
                            supabase.from('bin_locations').select('warehouse_id').eq('company_id', companyId),
                        ]);
                        const locMap: Record<string, number> = {};
                        (binRes.data || []).forEach((b: any) => {
                            if (b.warehouse_id) locMap[b.warehouse_id] = (locMap[b.warehouse_id] || 0) + 1;
                        });
                        return {
                            branches: branchesRes.data || [],
                            warehousesWithStats: (warehousesRes.data || []).map((w: any) => ({
                                ...w, locations_count: locMap[w.id] || 0,
                            })),
                        };
                    },
                    staleTime: SEMI_STATIC,
                    gcTime: GC_TIME,
                }),

                // Suppliers (matches Parties.tsx queryKey)
                queryClient.prefetchQuery({
                    queryKey: ['parties_suppliers', companyId, language],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('suppliers')
                            .select('*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false });
                        return (data || []).map((s: any) => ({ ...s, type: 'supplier' as const }));
                    },
                    staleTime: 30_000,
                    gcTime: GC_TIME,
                }),

                // Customers (matches Parties.tsx queryKey)
                queryClient.prefetchQuery({
                    queryKey: ['parties_customers', companyId, language],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('customers')
                            .select('*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false });
                        return (data || []).map((c: any) => ({ ...c, type: 'customer' as const }));
                    },
                    staleTime: 30_000,
                    gcTime: GC_TIME,
                }),

                // 🏭 Inventory preloads moved to Tier 1 for instant access
            ]).then(() => {
                const t2 = performance.now();
                console.log(`⚡ [DataPreloader] Tier 2 complete in ${Math.round(t2 - t0)}ms`);
            });
        }, 1000);

        return () => clearTimeout(tier2Timeout);
    }, [companyId, tenantId, language]); // eslint-disable-line react-hooks/exhaustive-deps
}
