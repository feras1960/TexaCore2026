/**
 * 🔍 useMaterialSearch — Hook for searching materials in Trade context
 * بحث ذكي عن المواد مع الأسعار والكميات المتاحة
 *
 * ✅ Uses existing warehouse hooks (proven to work!)
 * ✅ Fetches real stock from fabric_rolls (same as MaterialInventoryTab)
 * ✅ Debounced search for performance
 * ✅ Filters by group, category, stock
 * ✅ Per-material warehouse breakdown on demand
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMaterials, useMaterialGroups } from '@/features/warehouse/hooks/useWarehouseQueries';
import { warehouseService } from '@/services/warehouseService';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────

export interface MaterialSearchResult {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    group_id: string | null;
    group_name_ar: string;
    group_name_en: string;
    category: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    currency: string;
    default_width: number;
    min_stock: number;
    status: string;
    /** Total available from all rolls */
    stock_qty: number;
    /** Number of available rolls */
    roll_count: number;
    /** Thumbnail image */
    swatch_url: string | null;
    images: any[];
}

/** Stock breakdown per warehouse for a material */
export interface MaterialWarehouseStock {
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    roll_count: number;
    total_length: number;
    available_length: number;
    reserved_length: number;
    last_updated: string | null;
}

/** Individual roll detail */
export interface MaterialRollDetail {
    id: string;
    roll_number: string;
    warehouse_id: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    initial_length: number;
    current_length: number;
    reserved_length: number;
    available_length: number;
    status: string;
    supplier_name?: string;
    received_date?: string;
    created_at: string;
}

export interface MaterialSearchFilters {
    search?: string;
    groupId?: string | null;
    category?: string | null;
    status?: string;
    inStockOnly?: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useMaterialSearch(filters: MaterialSearchFilters = {}) {
    const { companyId } = useCompany();
    const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    // Debounce the search input
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDebouncedSearch(filters.search || '');
        }, 300);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [filters.search]);

    // ─── Use existing warehouse hooks (proven to work!) ─────────
    const {
        materials: rawMaterials,
        loading: materialsLoading,
        error: materialsError,
    } = useMaterials({
        search: debouncedSearch || undefined,
        categoryId: filters.groupId !== 'all' ? (filters.groupId || undefined) : undefined,
    });

    const {
        groups: rawGroups,
        loading: groupsLoading,
    } = useMaterialGroups();

    // ─── Fetch real stock totals from fabric_rolls ──────────────
    // Uses the same approach as MaterialInventoryTab
    const materialIds = useMemo(() => {
        if (!rawMaterials || rawMaterials.length === 0) return [];
        return rawMaterials.map((m: any) => m.id);
    }, [rawMaterials]);

    const { data: stockMap } = useQuery({
        queryKey: ['material_browser_stock', companyId, materialIds.join(',')],
        queryFn: async () => {
            if (!companyId || materialIds.length === 0) return {};

            // Fetch from fabric_rolls — bulk aggregation
            const result: Record<string, { stock_qty: number; roll_count: number }> = {};

            // Use warehouseService.getMaterialStockByWarehouse for each material
            // (batch approach — fetch all at once from fabric_rolls)
            try {
                const { data: rolls, error } = await supabase
                    .from('fabric_rolls')
                    .select('material_id, current_length, available_length, reserved_length, status')
                    .eq('company_id', companyId)
                    .in('material_id', materialIds)
                    .in('status', ['available', 'reserved', 'partial']);

                if (error) {
                    console.warn('Stock fetch error:', error.message);
                    return {};
                }

                if (!rolls) return {};

                // Aggregate by material_id
                for (const roll of rolls) {
                    if (!result[roll.material_id]) {
                        result[roll.material_id] = { stock_qty: 0, roll_count: 0 };
                    }
                    result[roll.material_id].stock_qty += Number(roll.available_length) || 0;
                    result[roll.material_id].roll_count += 1;
                }
            } catch (err: any) {
                console.warn('Stock batch fetch exception:', err);
            }

            return result;
        },
        enabled: !!companyId && materialIds.length > 0,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // ─── Map to MaterialSearchResult format ─────────────────────
    const mappedMaterials = useMemo((): MaterialSearchResult[] => {
        if (!rawMaterials || rawMaterials.length === 0) return [];

        return rawMaterials
            .filter((m: any) => {
                // Status filter
                if (filters.status && m.status !== filters.status) return false;
                if (!filters.status && m.status !== 'active') return false;

                // Category filter
                if (filters.category && filters.category !== 'all' && m.category !== filters.category) {
                    return false;
                }

                return true;
            })
            .map((m: any) => {
                // Use real stock from fabric_rolls
                const stock = stockMap?.[m.id];
                return {
                    id: m.id,
                    code: m.code || '',
                    name_ar: m.name_ar || '',
                    name_en: m.name_en || m.name_ar || '',
                    group_id: m.group_id || null,
                    group_name_ar: m.group?.name_ar || '',
                    group_name_en: m.group?.name_en || m.group?.name_ar || '',
                    category: m.category || 'mixed',
                    unit: m.unit || 'meter',
                    purchase_price: Number(m.purchase_price || 0),
                    selling_price: Number(m.selling_price || 0),
                    currency: m.currency || 'USD',
                    default_width: Number(m.default_width || 150),
                    min_stock: Number(m.min_stock || 0),
                    status: m.status || 'active',
                    stock_qty: stock?.stock_qty ?? 0,
                    roll_count: stock?.roll_count ?? 0,
                    swatch_url: m.swatch_url || null,
                    images: m.images || [],
                };
            });
    }, [rawMaterials, filters.status, filters.category, stockMap]);

    // ─── In stock filter ────────────────────────────────────────
    const filteredResults = useMemo(() => {
        if (filters.inStockOnly) {
            return mappedMaterials.filter(m => m.stock_qty > 0);
        }
        return mappedMaterials;
    }, [mappedMaterials, filters.inStockOnly]);

    // ─── Map groups ─────────────────────────────────────────────
    const mappedGroups = useMemo(() => {
        if (!rawGroups || rawGroups.length === 0) return [];
        return rawGroups.map((g: any) => ({
            id: g.id,
            code: g.code || '',
            name_ar: g.name_ar || '',
            name_en: g.name_en || g.name_ar || '',
            icon: g.icon || '📁',
            color: g.color || '',
        }));
    }, [rawGroups]);

    // ─── Per-material warehouse breakdown (on demand) ───────────
    const fetchWarehouseStock = useCallback(async (materialId: string): Promise<MaterialWarehouseStock[]> => {
        if (!companyId) return [];
        try {
            return await warehouseService.getMaterialStockByWarehouse(companyId, materialId);
        } catch (err) {
            console.warn('Failed to fetch warehouse stock:', err);
            return [];
        }
    }, [companyId]);

    const fetchRollDetails = useCallback(async (materialId: string, warehouseId?: string): Promise<MaterialRollDetail[]> => {
        if (!companyId) return [];
        try {
            return await warehouseService.getMaterialRollsDetail(companyId, materialId, warehouseId);
        } catch (err) {
            console.warn('Failed to fetch roll details:', err);
            return [];
        }
    }, [companyId]);

    return {
        materials: filteredResults,
        groups: mappedGroups,
        isLoading: materialsLoading || groupsLoading,
        isSearching: materialsLoading,
        error: materialsError,
        totalCount: filteredResults.length,
        // New: on-demand stock detail fetchers
        fetchWarehouseStock,
        fetchRollDetails,
    };
}
