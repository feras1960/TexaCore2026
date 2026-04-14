/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse React Query Hooks
 * هوكات تحميل بيانات المخازن بنظام الكاش الذكي
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE POLICY (from data-loading-policy.md):
 * ─────────────────────────────────────────────────────
 * - All queries use React Query for automatic caching
 * - staleTime varies by data category:
 *   • Semi-static (warehouses, materials): 10 min
 *   • Dynamic (movements, inventory): 2 min
 *   • Live (dashboard stats): 1 min
 * - gcTime: 30 min (keeps data even after unmount)
 * - Navigating between tabs/sections → INSTANT (from cache)
 * - Data refresh only on:
 *   1. Manual refresh button
 *   2. After create/update/delete (invalidateQueries)
 *   3. staleTime expiry + component remount
 *   4. After real-time event from Supabase (another user's change)
 *
 * 🔄 REALTIME:
 * ─────────────────────────────────────────────────────
 * Each hook auto-subscribes to its relevant Supabase table.
 * When another user makes changes:
 *   DB Change → WebSocket → invalidateQueries → background refetch → UI update ✨
 *
 * queryKey Standards:
 *   ['warehouse', 'entity', companyId, ...filters]
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { warehouseService } from '@/services/warehouseService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

// ═══════════════════════════════════════════════
// Cache Duration Constants
// ═══════════════════════════════════════════════
const SEMI_STATIC = 10 * 60 * 1000;  // 10 min - warehouses, materials, groups
const DYNAMIC = 2 * 60 * 1000;  //  2 min - movements, inventory
const LIVE = 1 * 60 * 1000;  //  1 min - dashboard stats
const GC_TIME = 30 * 60 * 1000;  // 30 min - keep in cache after unmount

// ═══════════════════════════════════════════════
// 1. Warehouse List
// ═══════════════════════════════════════════════
export function useWarehouses() {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: ['warehouse', 'list', companyId],
        queryFn: () => warehouseService.getAll(companyId!),
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: auto-update when any user adds/edits/deletes warehouses
    useRealtimeInvalidation({
        table: 'warehouses',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [
            ['warehouse', 'list', companyId],
            ['warehouse', 'dashboard-stats', companyId],
            ['warehouse', 'capacity', companyId],
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'list', companyId] });
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-stats', companyId] });
    };

    return {
        warehouses: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch,
        invalidate,
    };
}

// ═══════════════════════════════════════════════
// 2. Materials List
// ═══════════════════════════════════════════════
interface UseMaterialsOptions {
    search?: string;
    categoryId?: string;
}

export function useMaterials(options?: UseMaterialsOptions) {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: ['warehouse', 'materials', companyId, options?.search, options?.categoryId],
        queryFn: async () => {
            if (!companyId) return [];
            const data = await warehouseService.getMaterials(companyId, {
                search: options?.search || undefined,
                categoryId: options?.categoryId !== 'all' ? options?.categoryId : undefined,
            });
            return data.map((m: any) => ({
                ...m,
                // المتغيرات الفرعية: parent_material_id يشير للمادة الأم
                // المواد العادية: group_id يشير للمجموعة
                parent_id: m.parent_material_id || m.parent_id || m.group_id,
            }));
        },
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: auto-update when any user adds/edits/deletes materials
    useRealtimeInvalidation({
        table: 'fabric_materials',
        companyId,
        queryKeys: [
            ['warehouse', 'materials'],
            ['warehouse', 'dashboard-stats', companyId],
        ],
    });

    // 🔄 Realtime: auto-update when rolls change (affects rolls_count & rolls_total_length in tree)
    useRealtimeInvalidation({
        table: 'fabric_rolls',
        companyId,
        queryKeys: [
            ['warehouse', 'materials'],
            ['warehouse', 'dashboard-stats', companyId],
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'materials'] });
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-stats', companyId] });
    };

    return {
        materials: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch,
        invalidate,
    };
}

// ═══════════════════════════════════════════════
// 3. Material Groups
// ═══════════════════════════════════════════════
export function useMaterialGroups() {
    const { companyId, user } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = user?.user_metadata?.tenant_id;

    const query = useCachedQuery({
        queryKey: ['warehouse', 'groups', companyId, tenantId],
        queryFn: () => warehouseService.getGroups(companyId!, tenantId),
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: auto-update when any user adds/edits/deletes groups
    useRealtimeInvalidation({
        table: 'fabric_groups',
        companyId,
        queryKeys: [
            ['warehouse', 'groups'],
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'groups'] });
    };

    return {
        groups: query.data || [],
        loading: query.isLoading,
        refetch: query.refetch,
        invalidate,
    };
}

// ═══════════════════════════════════════════════
// 4. Dashboard Stats
// ═══════════════════════════════════════════════
export function useWarehouseDashboard() {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();

    // Stats query
    const statsQuery = useCachedQuery({
        queryKey: ['warehouse', 'dashboard-stats', companyId],
        queryFn: () => warehouseService.getDashboardStats(companyId!).catch(() => ({
            totalWarehouses: 0,
            totalMaterials: 0,
            totalRolls: 0,
            activeReservations: 0,
            pendingDeliveries: 0,
            lowStockItems: 0,
        })),
        enabled: !!companyId,
        staleTime: LIVE,
        gcTime: GC_TIME,
    });

    // Low stock items
    const lowStockQuery = useCachedQuery({
        queryKey: ['warehouse', 'low-stock', companyId],
        queryFn: () => warehouseService.getLowStockItems(companyId!, 5).catch(() => []),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // Warehouse capacity
    const capacityQuery = useCachedQuery({
        queryKey: ['warehouse', 'capacity', companyId],
        queryFn: () => warehouseService.getWarehouseCapacity(companyId!).catch(() => []),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // Recent activity
    const activityQuery = useCachedQuery({
        queryKey: ['warehouse', 'recent-activity', companyId],
        queryFn: () => warehouseService.getInventoryMovements(companyId!, { limit: 5 }).catch(() => []),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: Dashboard listens to rolls & movements for live updates
    useRealtimeInvalidation({
        table: 'fabric_rolls',
        companyId,
        queryKeys: [
            ['warehouse', 'dashboard-stats', companyId],
            ['warehouse', 'low-stock', companyId],
            ['warehouse', 'capacity', companyId],
        ],
    });

    useRealtimeInvalidation({
        table: 'inventory_movements',
        companyId,
        queryKeys: [
            ['warehouse', 'recent-activity', companyId],
            ['warehouse', 'dashboard-stats', companyId],
            ['warehouse', 'inventory-movements', companyId],
            ['warehouse', 'stock-movements', companyId],
        ],
    });

    const loading = statsQuery.isLoading || lowStockQuery.isLoading || capacityQuery.isLoading || activityQuery.isLoading;
    const error = statsQuery.error?.message || null;

    const refetchAll = () => {
        statsQuery.refetch();
        lowStockQuery.refetch();
        capacityQuery.refetch();
        activityQuery.refetch();
    };

    return {
        stats: statsQuery.data || null,
        lowStockItems: lowStockQuery.data || [],
        warehouseCapacity: capacityQuery.data || [],
        recentActivity: activityQuery.data || [],
        loading,
        error,
        refetch: refetchAll,
    };
}

// ═══════════════════════════════════════════════
// 5. Inventory (Overview + Movements + Capacity)
// ═══════════════════════════════════════════════
export function useInventory() {
    const { companyId } = useAuth();

    const statsQuery = useCachedQuery({
        // ⚡ Share same queryKey as useWarehouseDashboard → no duplicate fetch
        queryKey: ['warehouse', 'dashboard-stats', companyId],
        queryFn: () => warehouseService.getDashboardStats(companyId!),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const movementsQuery = useCachedQuery({
        queryKey: ['warehouse', 'inventory-movements', companyId],
        queryFn: () => warehouseService.getInventoryMovements(companyId!, { limit: 10 }),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const capacityQuery = useCachedQuery({
        queryKey: ['warehouse', 'capacity', companyId],
        queryFn: () => warehouseService.getWarehouseCapacity(companyId!),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const loading = statsQuery.isLoading || movementsQuery.isLoading || capacityQuery.isLoading;

    const refetch = () => {
        statsQuery.refetch();
        movementsQuery.refetch();
        capacityQuery.refetch();
    };

    return {
        stats: statsQuery.data || null,
        movements: movementsQuery.data || [],
        warehouseCapacity: capacityQuery.data || [],
        loading,
        refetch,
    };
}

// ═══════════════════════════════════════════════
// 6. Stock Movements (with filters)
// ═══════════════════════════════════════════════
interface MovementFilters {
    warehouse?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export function useStockMovements(filters?: MovementFilters) {
    const { companyId } = useAuth();

    // ─── Helper: is this an AbortError? ─────────────────────────────────────────
    // AbortErrors happen when React Query cancels a query (component unmount /
    // React Strict Mode double-invoke / tab switch). They are harmless but Supabase-js
    // leaks them as "Uncaught (in promise)" because it creates internal Promises.
    // Fix: silently return [] instead of rethrowing — the component is gone anyway.
    const isAbort = (err: any) =>
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('aborted') ||
        String(err?.message || '').toLowerCase().includes('signal');

    const movementsQuery = useCachedQuery({
        queryKey: ['warehouse', 'stock-movements', companyId, filters],
        queryFn: async () => {
            try {
                return await warehouseService.getInventoryMovements(companyId!, {
                    warehouseId: filters?.warehouse !== 'all' ? filters?.warehouse : undefined,
                    movementType: filters?.movementType !== 'all' ? filters?.movementType : undefined,
                    dateFrom: filters?.dateFrom || undefined,
                    dateTo: filters?.dateTo || undefined,
                    limit: 500,
                });
            } catch (err: any) {
                if (isAbort(err)) return []; // ← silently swallow, not rethrow
                return [];
            }
        },
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
        retry: false, // No retries — aborts don't benefit from retrying
    });

    const pendingQuery = useCachedQuery({
        queryKey: ['warehouse', 'pending-receipts', companyId],
        queryFn: async () => {
            try {
                return await warehouseService.getPendingReceipts(companyId!);
            } catch (err: any) {
                if (isAbort(err)) return []; // ← silently swallow, not rethrow
                return [];
            }
        },
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
        retry: false,
    });

    // ─── Completed Receipts (current month) ──────────────────────────────────
    const completedQuery = useCachedQuery({
        queryKey: ['warehouse', 'completed-receipts', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            try {
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                const { data, error } = await supabase
                    .from('purchase_receipts')
                    .select('id, receipt_number, status, receipt_date, invoice_id, container_id, order_id, warehouse_id, created_at, updated_at')
                    .eq('company_id', companyId)
                    .eq('status', 'completed')
                    .gte('updated_at', monthStart.toISOString())
                    .order('updated_at', { ascending: false })
                    .limit(100);

                if (error) {
                    console.warn('[completedReceipts] error:', error.message);
                    return [];
                }
                return data || [];
            } catch (err: any) {
                if (isAbort(err)) return []; // ← silently swallow, not rethrow
                return [];
            }
        },
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
        retry: false,
    });

    // ⚡ Pull on Demand — لا Realtime. التحديث يدوي بزر الضغط أو عند انتهاء staleTime

    return {
        movements: movementsQuery.data || [],
        pendingReceipts: pendingQuery.data || [],
        completedReceipts: completedQuery.data || [],
        loading: movementsQuery.isLoading || pendingQuery.isLoading,
        completedLoading: completedQuery.isLoading,
        error: movementsQuery.error?.message || null,
        refetch: () => {
            movementsQuery.refetch();
            pendingQuery.refetch();
            completedQuery.refetch();
        },
    };
}

// ═══════════════════════════════════════════════
// 7. Default Branch (for warehouse creation)
// ═══════════════════════════════════════════════
export function useDefaultBranch() {
    const { companyId, tenantId } = useAuth();

    const query = useCachedQuery({
        queryKey: ['warehouse', 'default-branch', companyId],
        queryFn: async () => {
            if (!companyId || !tenantId) return null;

            // Try to find existing branch
            const { data } = await supabase
                .from('branches')
                .select('id')
                .eq('company_id', companyId)
                .limit(1)
                .maybeSingle();

            if (data?.id) return data.id;

            // Create default branch if not found
            const { data: newBranch, error: createError } = await supabase
                .from('branches')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    name: 'الفرع الرئيسي',
                    code: 'MAIN-001',
                    is_main: true,
                    is_active: true,
                })
                .select('id')
                .single();

            if (createError) {
                console.error('Error creating default branch:', createError);
                return null;
            }

            return newBranch?.id || null;
        },
        enabled: !!companyId && !!tenantId,
        staleTime: Infinity, // Never re-fetch, branch rarely changes
        gcTime: GC_TIME,
    });

    return {
        defaultBranchId: query.data || null,
        loading: query.isLoading,
    };
}

// ═══════════════════════════════════════════════
// 8. Branches with Warehouses (for Tree View)
// ═══════════════════════════════════════════════
export function useBranchesWithWarehouses() {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: ['warehouse', 'tree', companyId],
        queryFn: async () => {
            if (!companyId) return { branches: [], warehousesWithStats: [] };

            // ── 1. جلب الفروع ──────────────────────────────────────
            const { data: branchesData } = await supabase
                .from('branches')
                .select('id, code, name_ar, name_en, name_ru, name_uk, name_tr, name_de, name_it, name_ro, name_pl, city, branch_type, is_main, is_active')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('is_main', { ascending: false });

            // ── 2. جلب المستودعات ──────────────────────────────────
            const { data: warehousesData, error: whError } = await supabase
                .from('warehouses')
                .select('id, code, name_ar, name_en, name_ru, name_uk, name_tr, name_de, name_it, name_ro, name_pl, warehouse_type, branch_id, is_active')
                .eq('company_id', companyId)
                .order('code');
            if (whError) console.error('[useBranchesWithWarehouses] warehouses error:', whError);


            // ── 3. جلب عدد المواقع لكل مستودع ──────────────────────
            const { data: binStats } = await supabase
                .from('bin_locations')
                .select('warehouse_id')
                .eq('company_id', companyId);

            // Build locations count map
            const locationsCountMap: Record<string, number> = {};
            (binStats || []).forEach((b: any) => {
                if (b.warehouse_id) {
                    locationsCountMap[b.warehouse_id] = (locationsCountMap[b.warehouse_id] || 0) + 1;
                }
            });

            // Enrich warehouses with locations count
            const warehousesWithStats = (warehousesData || []).map((w: any) => ({
                ...w,
                locations_count: locationsCountMap[w.id] || 0,
            }));

            return {
                branches: branchesData || [],
                warehousesWithStats,
            };
        },
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime — يتحدث عند تغيير المستودعات أو المواقع
    useRealtimeInvalidation({
        table: 'warehouses',
        companyId,
        queryKeys: [['warehouse', 'tree', companyId]],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'tree', companyId] });
    };

    return {
        branches: query.data?.branches || [],
        warehousesWithStats: query.data?.warehousesWithStats || [],
        loading: query.isLoading,
        refetch: query.refetch,
        invalidate,
    };
}
