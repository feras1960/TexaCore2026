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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

    const query = useQuery({
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

    const query = useQuery({
        queryKey: ['warehouse', 'materials', companyId, options?.search, options?.categoryId],
        queryFn: async () => {
            if (!companyId) return [];
            const data = await warehouseService.getMaterials(companyId, {
                search: options?.search || undefined,
                categoryId: options?.categoryId !== 'all' ? options?.categoryId : undefined,
            });
            return data.map((m: any) => ({
                ...m,
                parent_id: m.parent_id || m.group_id,
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
            ['warehouse', 'inventory-stats', companyId],
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

    const query = useQuery({
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
    const statsQuery = useQuery({
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
    const lowStockQuery = useQuery({
        queryKey: ['warehouse', 'low-stock', companyId],
        queryFn: () => warehouseService.getLowStockItems(companyId!, 5).catch(() => []),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // Warehouse capacity
    const capacityQuery = useQuery({
        queryKey: ['warehouse', 'capacity', companyId],
        queryFn: () => warehouseService.getWarehouseCapacity(companyId!).catch(() => []),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // Recent activity
    const activityQuery = useQuery({
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
            ['warehouse', 'inventory-stats', companyId],
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

    const statsQuery = useQuery({
        queryKey: ['warehouse', 'inventory-stats', companyId],
        queryFn: () => warehouseService.getDashboardStats(companyId!),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const movementsQuery = useQuery({
        queryKey: ['warehouse', 'inventory-movements', companyId],
        queryFn: () => warehouseService.getInventoryMovements(companyId!, { limit: 10 }),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const capacityQuery = useQuery({
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

    const movementsQuery = useQuery({
        queryKey: ['warehouse', 'stock-movements', companyId, filters],
        queryFn: () => warehouseService.getInventoryMovements(companyId!, {
            warehouseId: filters?.warehouse !== 'all' ? filters?.warehouse : undefined,
            movementType: filters?.movementType !== 'all' ? filters?.movementType : undefined,
            dateFrom: filters?.dateFrom || undefined,
            dateTo: filters?.dateTo || undefined,
            limit: 100,
        }),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    const pendingQuery = useQuery({
        queryKey: ['warehouse', 'pending-receipts', companyId],
        queryFn: () => warehouseService.getPendingReceipts(companyId!),
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    return {
        movements: movementsQuery.data || [],
        pendingReceipts: pendingQuery.data || [],
        loading: movementsQuery.isLoading || pendingQuery.isLoading,
        error: movementsQuery.error?.message || null,
        refetch: () => {
            movementsQuery.refetch();
            pendingQuery.refetch();
        },
    };
}

// ═══════════════════════════════════════════════
// 7. Default Branch (for warehouse creation)
// ═══════════════════════════════════════════════
export function useDefaultBranch() {
    const { companyId, tenantId } = useAuth();

    const query = useQuery({
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
