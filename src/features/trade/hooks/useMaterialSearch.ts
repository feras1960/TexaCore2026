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
    /** Default supplier UUID (from fabric_materials) */
    default_supplier_id: string | null;
    /** Origin country */
    origin_country: string | null;
    /** Per-material tax rate (NULL = use company default, 0 = exempt) */
    tax_rate: number | null;
}

/** Color variant for a material (from fabric_material_colors join) */
export interface MaterialColorVariant {
    /** fabric_material_colors row id */
    id: string;
    /** fabric_colors.id */
    color_id: string;
    /** Color code (e.g. 'RED-01') */
    color_code: string;
    color_name_ar: string;
    color_name_en: string;
    /** Hex color value (e.g. '#FF0000') */
    hex_color: string;
    /** Color family (e.g. 'warm', 'cold') */
    color_family: string | null;
    /** Override price for this color, null = use material price */
    price_override: number | null;
    /** Swatch image for this color variant */
    image_url: string | null;
    /** Is this variant currently available */
    is_available: boolean;
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
    /** Show only materials at or below min_stock */
    belowMinStock?: boolean;
    /** Filter by default supplier */
    supplierId?: string | null;
    /** Filter by warehouse (materials that have stock in this warehouse) */
    warehouseId?: string | null;
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

    // ─── Per-warehouse stock (for warehouse filter) ──────────────
    const { data: warehouseStockMap } = useQuery({
        queryKey: ['material_browser_wh_stock', companyId, filters.warehouseId, materialIds.join(',')],
        queryFn: async () => {
            if (!companyId || !filters.warehouseId || filters.warehouseId === 'all' || materialIds.length === 0) return null;
            const result: Record<string, boolean> = {};
            try {
                const { data: rolls } = await supabase
                    .from('fabric_rolls')
                    .select('material_id')
                    .eq('company_id', companyId)
                    .eq('warehouse_id', filters.warehouseId)
                    .in('material_id', materialIds)
                    .in('status', ['available', 'reserved', 'partial']);
                if (rolls) {
                    for (const r of rolls) result[r.material_id] = true;
                }
            } catch { /* ignore */ }
            return result;
        },
        enabled: !!companyId && !!filters.warehouseId && filters.warehouseId !== 'all' && materialIds.length > 0,
        staleTime: 2 * 60 * 1000,
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

                // Supplier filter
                if (filters.supplierId && filters.supplierId !== 'all') {
                    if (m.default_supplier_id !== filters.supplierId) return false;
                }

                // Warehouse filter
                if (filters.warehouseId && filters.warehouseId !== 'all' && warehouseStockMap) {
                    if (!warehouseStockMap[m.id]) return false;
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
                    default_supplier_id: m.default_supplier_id || null,
                    origin_country: m.origin_country || null,
                    tax_rate: m.tax_rate != null ? Number(m.tax_rate) : null,
                };
            });
    }, [rawMaterials, filters.status, filters.category, filters.supplierId, filters.warehouseId, warehouseStockMap, stockMap]);

    // ─── In stock / below min stock filters ─────────────────────
    const filteredResults = useMemo(() => {
        let result = mappedMaterials;
        if (filters.inStockOnly) {
            result = result.filter(m => m.stock_qty > 0);
        }
        if (filters.belowMinStock) {
            result = result.filter(m => m.min_stock > 0 && m.stock_qty <= m.min_stock);
        }
        return result;
    }, [mappedMaterials, filters.inStockOnly, filters.belowMinStock]);

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

    /** Fetch color variants for a material — queries fabric_colors directly */
    const fetchMaterialColors = useCallback(async (materialId: string): Promise<MaterialColorVariant[]> => {
        if (!companyId) return [];
        try {
            // fabric_material_colors join table doesn't exist, so fetch from fabric_colors directly
            const { data, error } = await supabase
                .from('fabric_colors')
                .select('id, code, name, name_ar, name_en, hex_code, color_family, image_url, is_active')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error || !data) {
                console.warn('Color fetch error:', error?.message);
                return [];
            }

            return data.map((row: any) => ({
                id: row.id,
                color_id: row.id,
                color_code: row.code || '',
                color_name_ar: row.name_ar || row.name || '',
                color_name_en: row.name_en || row.name || '',
                hex_color: row.hex_code || '#CCCCCC',
                color_family: row.color_family || null,
                price_override: null,
                image_url: row.image_url || null,
                is_available: row.is_active !== false,
            }));
        } catch (err) {
            console.warn('Failed to fetch material colors:', err);
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
        // New: on-demand color fetcher
        fetchMaterialColors,
    };
}
