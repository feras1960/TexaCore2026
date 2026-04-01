/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Module — تعريف بيانات المستودعات لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * يُعرّف كل الـ queries الخاصة بقسم المستودعات.
 * QueryKeys يجب أن تتطابق تماماً مع ما تستخدمه الصفحات.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { warehouseService } from '@/services/warehouseService';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

export const warehouseModule: DataModule = {
  code: 'warehouse',
  label: { ar: 'المستودعات', en: 'Warehouse' },
  queries: [
    // ─── 0a. Inventory Preload: Rolls (for instant InventoryPage) ─
    {
      queryKey: ['inventory-preload-rolls', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('fabric_rolls')
          .select(`
            id, material_id, warehouse_id, color_id,
            current_length, reserved_length, cost_per_meter,
            status, container_id,
            warehouses!left(id, name_ar, name_en)
          `)
          .eq('company_id', companyId)
          .in('status', ['available', 'reserved', 'partial']);
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 0b. Inventory Preload: Materials ─────────────────────
    {
      queryKey: ['inventory-preload-materials', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('fabric_materials')
          .select('id, name_ar, name_en, code, unit, group_id, purchase_price, selling_price, min_stock, status, season, current_stock, currency, default_warehouse_id')
          .eq('company_id', companyId)
          .eq('status', 'active');
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 1. Warehouse List (SEMI-STATIC) ────────────────────
    {
      queryKey: ['warehouse', 'list', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getAll(companyId);
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },


    // ─── 2. Materials List (SEMI-STATIC — no filters for preload) ─
    {
      queryKey: ['warehouse', 'materials', null, undefined, undefined],
      queryFn: async (companyId: string) => {
        const data = await warehouseService.getMaterials(companyId, {});
        return data.map((m: any) => ({
          ...m,
          parent_id: m.parent_material_id || m.parent_id || m.group_id,
        }));
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Material Groups (SEMI-STATIC) ───────────────────
    // Note: queryKey includes tenantId which we set to undefined for preload
    // useAuth() in the hook adds it dynamically — DataEngine seeds the base
    {
      queryKey: ['warehouse', 'groups', null, undefined],
      queryFn: async (companyId: string) => {
        return warehouseService.getGroups(companyId, undefined);
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 4. Dashboard Stats (LIVE — low staleTime) ──────────
    {
      queryKey: ['warehouse', 'dashboard-stats', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getDashboardStats(companyId).catch(() => ({
          totalWarehouses: 0,
          totalMaterials: 0,
          totalRolls: 0,
          activeReservations: 0,
          pendingDeliveries: 0,
          lowStockItems: 0,
        }));
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 5. Low Stock Items ─────────────────────────────────
    {
      queryKey: ['warehouse', 'low-stock', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getLowStockItems(companyId, 5).catch(() => []);
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 6. Warehouse Capacity ──────────────────────────────
    {
      queryKey: ['warehouse', 'capacity', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getWarehouseCapacity(companyId).catch(() => []);
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 7. Recent Activity (last 5 movements) ─────────────
    {
      queryKey: ['warehouse', 'recent-activity', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getInventoryMovements(companyId, { limit: 5 }).catch(() => []);
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 8. Branches + Warehouses Tree ──────────────────────
    {
      queryKey: ['warehouse', 'tree', null],
      queryFn: async (companyId: string) => {
        // Fetch branches
        const { data: branchesData } = await supabase
          .from('branches')
          .select('id, code, name_ar, name_en, city, branch_type, is_main, is_active')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('is_main', { ascending: false });

        // Fetch warehouses
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('id, code, name_ar, name_en, warehouse_type, branch_id, is_active')
          .eq('company_id', companyId)
          .order('code');

        // Fetch bin location counts
        const { data: binStats } = await supabase
          .from('bin_locations')
          .select('warehouse_id')
          .eq('company_id', companyId);

        const locationsCountMap: Record<string, number> = {};
        (binStats || []).forEach((b: any) => {
          if (b.warehouse_id) {
            locationsCountMap[b.warehouse_id] = (locationsCountMap[b.warehouse_id] || 0) + 1;
          }
        });

        const warehousesWithStats = (warehousesData || []).map((w: any) => ({
          ...w,
          locations_count: locationsCountMap[w.id] || 0,
        }));

        return {
          branches: branchesData || [],
          warehousesWithStats,
        };
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 9. Default Branch ──────────────────────────────────
    {
      queryKey: ['warehouse', 'default-branch', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('branches')
          .select('id')
          .eq('company_id', companyId)
          .limit(1)
          .maybeSingle();
        return data?.id || null;
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 10. Inventory Movements (last 10) ──────────────────
    {
      queryKey: ['warehouse', 'inventory-movements', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getInventoryMovements(companyId, { limit: 10 });
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 11. Pending Receipts ───────────────────────────────
    {
      queryKey: ['warehouse', 'pending-receipts', null],
      queryFn: async (companyId: string) => {
        return warehouseService.getPendingReceipts(companyId).catch(() => []);
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolveWarehouseQueries(companyId: string): DataModule {
  return {
    ...warehouseModule,
    queries: warehouseModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
