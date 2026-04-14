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
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
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
const GC_TIME     = 24 * 60 * 60 * 1000;  // 24 hours (matches persistence)

export function useDataPreloader() {
    const { companyId, user } = useAuth();
    const { language } = useLanguage();
    const queryClient = useQueryClient();
    const hasPreloaded = useRef(false);
    const tenantId = user?.user_metadata?.tenant_id;
    const isRestoring = useIsRestoring();

    useEffect(() => {
        // ⚡ Wait for IndexedDB cache restoration to complete before prefetching
        // This prevents redundant network calls — prefetchQuery respects
        // staleTime so if restored data is fresh, it won't refetch
        if (!companyId || hasPreloaded.current || isRestoring) return;
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

            // 11. 🏭 Inventory Page — fabric_materials (all active materials, full detail for variants)
            queryClient.prefetchQuery({
                queryKey: ['inventory-preload-materials', companyId],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('fabric_materials')
                        .select('*')
                        .eq('company_id', companyId)
                        .eq('status', 'active');
                    return data || [];
                },
                staleTime: DYNAMIC,
                gcTime: GC_TIME,
            }),

            // 12. 👶 Material Variants — same data, dedicated key for useMaterialSearch.fetchVariantChildren
            // This ensures variant lookup always has parent_material_id even after stale cache restore
            queryClient.prefetchQuery({
                queryKey: ['materials-full-detail', companyId],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('fabric_materials')
                        .select('*')
                        .eq('company_id', companyId)
                        .eq('status', 'active');
                    return data || [];
                },
                staleTime: DYNAMIC,
                gcTime: GC_TIME,
            }),

            // 13. 📦 Inventory Stock — per-warehouse breakdown (for material card instant display)
            queryClient.prefetchQuery({
                queryKey: ['inventory-preload-stock', companyId],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('inventory_stock')
                        .select('material_id, warehouse_id, quantity_on_hand, updated_at')
                        .eq('company_id', companyId)
                        .gt('quantity_on_hand', 0);
                    return data || [];
                },
                staleTime: DYNAMIC,
                gcTime: GC_TIME,
            }),

            // 14. 📊 Stock Movements — preload for instant /warehouse/stockMovements access
            queryClient.prefetchQuery({
                queryKey: ['warehouse', 'stock-movements', companyId, { dateFrom: undefined, dateTo: undefined, warehouse: undefined }],
                queryFn: async () => {
                    try {
                        return await warehouseService.getInventoryMovements(companyId!, { limit: 500 });
                    } catch { return []; }
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

                // Suppliers (MUST match Parties.tsx queryKey EXACTLY)
                queryClient.prefetchQuery({
                    queryKey: ['parties_suppliers', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('suppliers')
                            .select('*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false });
                        return (data || []).map((s: any) => ({ ...s, type: 'supplier' as const }));
                    },
                    staleTime: 5 * 60 * 1000,
                    gcTime: GC_TIME,
                }),

                // Customers (MUST match Parties.tsx queryKey EXACTLY)
                queryClient.prefetchQuery({
                    queryKey: ['parties_customers', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('customers')
                            .select('*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false });
                        return (data || []).map((c: any) => ({ ...c, type: 'customer' as const }));
                    },
                    staleTime: 5 * 60 * 1000,
                    gcTime: GC_TIME,
                }),

                // 🏭 Inventory preloads moved to Tier 1 for instant access
            ]).then(() => {
                const t2 = performance.now();
                console.log(`⚡ [DataPreloader] Tier 2 complete in ${Math.round(t2 - t0)}ms`);
            });
        }, 1000);

        // ═══════════════════════════════════════════════
        // 🟣 Tier 3: Background — Load after 3 seconds
        //    القيود، الفواتير، الكونتينرات، أذون التسليم
        //    كل هذه البيانات ستكون جاهزة للفتح الفوري
        // ═══════════════════════════════════════════════
        const tier3Timeout = setTimeout(() => {
            Promise.allSettled([
                // 1. Journal Entries — MUST match useJournalEntries queryKey
                queryClient.prefetchQuery({
                    queryKey: ['accounting', 'journal-entries', companyId, undefined],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('journal_entries')
                            .select(`
                                id, entry_number, entry_date, description, description_ar, description_en,
                                status, is_posted, entry_type, reference_type, reference_id, reference_number,
                                total_debit, total_credit, created_by, currency,
                                lines:journal_entry_lines(
                                    id, account_id, description, debit, credit,
                                    debit_fc, credit_fc, currency, exchange_rate, cost_center_id,
                                    account:chart_of_accounts(account_code, name_ar, name_en)
                                )
                            `)
                            .eq('company_id', companyId)
                            .order('entry_date', { ascending: false })
                            .limit(500);
                        return data || [];
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 2. Sales Transactions — فواتير المبيعات
                queryClient.prefetchQuery({
                    queryKey: ['sales-transactions-preload', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('sales_transactions')
                            .select(`
                                id, invoice_number, transaction_date, status,
                                total_amount, currency, customer_id, warehouse_id,
                                discount_amount, tax_amount, net_amount,
                                payment_status, notes
                            `)
                            .eq('company_id', companyId)
                            .order('transaction_date', { ascending: false })
                            .limit(500);
                        return data || [];
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 3. Purchase Invoices — فواتير المشتريات
                queryClient.prefetchQuery({
                    queryKey: ['purchase-invoices-preload', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('purchase_invoices')
                            .select(`
                                id, invoice_number, invoice_date, status,
                                total_amount, currency, supplier_id,
                                paid_amount, remaining_amount, notes
                            `)
                            .eq('company_id', companyId)
                            .order('invoice_date', { ascending: false })
                            .limit(500);
                        return data || [];
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 4. Containers — الكونتينرات
                queryClient.prefetchQuery({
                    queryKey: ['containers-preload', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('containers')
                            .select(`
                                id, container_number, status, supplier_id,
                                total_cost, currency, arrival_date, notes,
                                container_items(id, material_id, quantity, unit_price, total_price)
                            `)
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false });
                        return data || [];
                    },
                    staleTime: SEMI_STATIC,
                    gcTime: GC_TIME,
                }),

                // 5. Sales Delivery Orders — أذون التسليم
                queryClient.prefetchQuery({
                    queryKey: ['delivery-orders-preload', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('sales_delivery_orders')
                            .select(`
                                id, delivery_number, delivery_date, status,
                                sales_transaction_id, warehouse_id, notes
                            `)
                            .eq('company_id', companyId)
                            .order('delivery_date', { ascending: false })
                            .limit(200);
                        return data || [];
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 6. Funds — MUST match useFunds queryKey
                queryClient.prefetchQuery({
                    queryKey: ['accounting', 'funds', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('chart_of_accounts')
                            .select('id, account_code, name_ar, name_en, current_balance, is_cash_account, is_bank_account, is_group, currency')
                            .eq('company_id', companyId)
                            .eq('is_active', true)
                            .or('is_cash_account.eq.true,is_bank_account.eq.true')
                            .order('account_code', { ascending: true });
                        return data || [];
                    },
                    staleTime: SEMI_STATIC,
                    gcTime: GC_TIME,
                }),

                // ═══ 🛒 E-Commerce Module ═══

                // 7. Ecommerce Orders
                queryClient.prefetchQuery({
                    queryKey: ['ecommerce', 'orders', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('ecommerce_orders')
                            .select('*')
                            .order('created_at', { ascending: false });
                        return data || [];
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 8. Ecommerce Products
                queryClient.prefetchQuery({
                    queryKey: ['ecommerce', 'products', companyId],
                    queryFn: async () => {
                        const { data } = await supabase
                            .from('ecommerce_products')
                            .select('*')
                            .order('created_at', { ascending: false });
                        return data || [];
                    },
                    staleTime: SEMI_STATIC,
                    gcTime: GC_TIME,
                }),

                // 9. Ecommerce Dashboard (KPIs)
                queryClient.prefetchQuery({
                    queryKey: ['ecommerce', 'dashboard', companyId],
                    queryFn: async () => {
                        const [ordersRes, itemsRes] = await Promise.all([
                            supabase.from('ecommerce_orders')
                                .select('id, order_number, customer_name, total_amount, status, payment_status, currency, created_at, customer_phone')
                                .order('created_at', { ascending: false }),
                            supabase.from('ecommerce_order_items').select('product_name, quantity, total_price'),
                        ]);
                        const allOrders = ordersRes.data || [];
                        const validOrders = allOrders.filter((o: any) => !['cancelled', 'returned'].includes(o.status));
                        const sales = validOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
                        const items = itemsRes.data || [];
                        const map: Record<string, { name: any; sold: number; rev: number }> = {};
                        items.forEach((it: any) => {
                            const k = JSON.stringify(it.product_name);
                            if (!map[k]) map[k] = { name: it.product_name, sold: 0, rev: 0 };
                            map[k].sold += it.quantity;
                            map[k].rev += it.total_price;
                        });
                        const topProducts = Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 5)
                            .map(p => ({ product_name: p.name, total_sold: p.sold, total_revenue: p.rev }));
                        return {
                            totalSales: sales,
                            totalOrders: allOrders.length,
                            totalCustomers: new Set(allOrders.map((o: any) => o.customer_phone)).size,
                            pendingOrders: allOrders.filter((o: any) => o.status === 'pending').length,
                            shippedOrders: allOrders.filter((o: any) => o.status === 'shipped').length,
                            completedOrders: allOrders.filter((o: any) => ['delivered', 'completed'].includes(o.status)).length,
                            avgOrderValue: validOrders.length > 0 ? sales / validOrders.length : 0,
                            currency: allOrders[0]?.currency || 'UAH',
                            recentOrders: allOrders.slice(0, 8).map((o: any) => ({
                                id: o.id, order_number: o.order_number, customer_name: o.customer_name,
                                total_amount: o.total_amount, status: o.status, payment_status: o.payment_status,
                                currency: o.currency, created_at: o.created_at,
                            })),
                            topProducts,
                        };
                    },
                    staleTime: DYNAMIC,
                    gcTime: GC_TIME,
                }),

                // 10. Shipping Carriers
                queryClient.prefetchQuery({
                    queryKey: ['ecommerce', 'shipping', companyId],
                    queryFn: async () => {
                        const { data } = await supabase.from('shipping_carriers').select('*').order('carrier_code');
                        return data || [];
                    },
                    staleTime: SEMI_STATIC,
                    gcTime: GC_TIME,
                }),

            ]).then(() => {
                const t3 = performance.now();
                console.log(`⚡ [DataPreloader] Tier 3 complete in ${Math.round(t3 - t0)}ms — All data ready! 🚀`);
            });
        }, 3000);

        return () => {
            clearTimeout(tier2Timeout);
            clearTimeout(tier3Timeout);
        };
    }, [companyId, tenantId, language, isRestoring]); // eslint-disable-line react-hooks/exhaustive-deps
}
