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
    /** Total available stock (current_stock = loose + rolled) */
    stock_qty: number;
    /** Number of available rolls */
    roll_count: number;
    /** Total length in tracked rolls */
    rolls_total_length: number;
    /** Loose stock (unrolled/unassigned meters = current_stock - rolls_total_length) */
    loose_stock: number;
    /** Raw current_stock from fabric_materials */
    current_stock: number;
    /** Thumbnail image */
    swatch_url: string | null;
    images: any[];
    /** Default supplier UUID (from fabric_materials) */
    default_supplier_id: string | null;
    /** Origin country */
    origin_country: string | null;
    /** Per-material tax rate (NULL = use company default, 0 = exempt) */
    tax_rate: number | null;
    /** Variant engine fields */
    is_variant_parent?: boolean;
    has_variants?: boolean;
    parent_material_id?: string | null;
    variant_id?: string | null;
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
    /** Loose stock (unrolled meters) in this warehouse */
    loose_stock?: number;
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

/** Roll data for variant hierarchy — includes material_id for grouping */
export interface VariantRollData {
    id: string;
    roll_number: string;
    material_id: string;
    warehouse_id: string;
    current_length: number;
    available_length: number;
    reserved_length: number;
    status: string;
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
    const { companyId, company } = useCompany();
    const companyCurrency = company?.default_currency || 'USD';
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
                // 1. Check fabric_rolls for materials in this warehouse
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

                // 2. Also include materials with loose stock in this warehouse
                //    (default_warehouse_id = selected warehouse AND current_stock > 0)
                if (rawMaterials) {
                    for (const m of rawMaterials as any[]) {
                        if (m.default_warehouse_id === filters.warehouseId && Number(m.current_stock) > 0) {
                            result[m.id] = true;
                        }
                    }
                }
            } catch { /* ignore */ }
            return result;
        },
        enabled: !!companyId && !!filters.warehouseId && filters.warehouseId !== 'all' && materialIds.length > 0,
        staleTime: 2 * 60 * 1000,
    });

    // ─── Aggregate children stock for variant parents ─────────────
    // المواد الأم لا تملك رولونات مباشرة — الرصيد على المتغيرات الفرعية
    const parentStockMap = useMemo(() => {
        if (!rawMaterials || !stockMap) return {};

        const result: Record<string, { stock_qty: number; roll_count: number }> = {};

        // Find all children and sum their stock to their parent
        for (const m of rawMaterials as any[]) {
            if (m.parent_material_id && stockMap[m.id]) {
                if (!result[m.parent_material_id]) {
                    result[m.parent_material_id] = { stock_qty: 0, roll_count: 0 };
                }
                result[m.parent_material_id].stock_qty += stockMap[m.id].stock_qty;
                result[m.parent_material_id].roll_count += stockMap[m.id].roll_count;
            }
        }

        return result;
    }, [rawMaterials, stockMap]);

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
                // ─── Dual Stock Model ───
                // current_stock = total (loose + rolled) from fabric_materials
                // rolls data from stockMap (fabric_rolls aggregation)
                // loose_stock = current_stock - rolls_total_length
                const stock = stockMap?.[m.id];
                const isParent = !!m.is_variant_parent || !!m.has_variants;

                // للمواد الأم: استخدم مجموع أرصدة المتغيرات الفرعية
                const parentStock = isParent ? parentStockMap[m.id] : null;

                // Raw values from warehouseService.getMaterials()
                const rawCurrentStock = Number(m.current_stock || 0);
                const rawRollsCount = Number(m.rolls_count || 0);
                const rawRollsTotalLength = Number(m.rolls_total_length || 0);
                const rawLooseStock = Number(m.loose_stock || 0);

                // For rolls, prefer our fresh stockMap query (more up-to-date)
                const rollsQty = stock?.stock_qty ?? rawRollsTotalLength;
                const rollsCount = stock?.roll_count ?? rawRollsCount;

                // Total = max(current_stock, rolls_qty) to handle both data sources
                // current_stock includes everything (loose + rolled)
                // If current_stock is 0 but rolls have data, use rolls
                const totalStockQty = rawCurrentStock > 0
                    ? Math.max(rawCurrentStock, rollsQty)
                    : rollsQty;

                // Loose stock = total - rolled portion
                const looseStock = Math.max(0, totalStockQty - rollsQty);

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
                    currency: m.currency || companyCurrency,
                    default_width: Number(m.default_width || 150),
                    min_stock: Number(m.min_stock || 0),
                    status: m.status || 'active',
                    stock_qty: isParent
                        ? (parentStock?.stock_qty ?? 0) + totalStockQty
                        : totalStockQty,
                    roll_count: isParent
                        ? (parentStock?.roll_count ?? 0) + rollsCount
                        : rollsCount,
                    rolls_total_length: rollsQty,
                    loose_stock: isParent ? rawLooseStock : looseStock,
                    current_stock: rawCurrentStock,
                    swatch_url: m.swatch_url || null,
                    images: m.images || [],
                    default_supplier_id: m.default_supplier_id || null,
                    origin_country: m.origin_country || null,
                    tax_rate: m.tax_rate != null ? Number(m.tax_rate) : null,
                    // Variant engine fields
                    is_variant_parent: !!m.is_variant_parent,
                    has_variants: !!m.has_variants,
                    parent_material_id: m.parent_material_id || null,
                    variant_id: m.variant_id || null,
                };
            })
            // ⚠️ فلترة: إخفاء المتغيرات الفرعية من القائمة الرئيسية
            // (تظهر فقط تحت المادة الأم عند فتحها)
            .filter((m: MaterialSearchResult) => !m.parent_material_id);
    }, [rawMaterials, filters.status, filters.category, filters.supplierId, filters.warehouseId, warehouseStockMap, stockMap, parentStockMap]);

    // ─── In stock / below min stock filters ─────────────────────
    const filteredResults = useMemo(() => {
        let result = mappedMaterials;
        if (filters.inStockOnly) {
            // السماح للمواد الأم بالظهور دائماً — رصيدها على المتغيرات الفرعية
            result = result.filter(m => m.stock_qty > 0 || m.is_variant_parent || m.has_variants);
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

    /** Fetch variant children for a parent material — returns them grouped by variant group */
    const fetchVariantChildren = useCallback(async (parentMaterialId: string): Promise<MaterialSearchResult[]> => {
        if (!companyId) return [];
        try {
            const { data, error } = await supabase
                .from('fabric_materials')
                .select('*, group:fabric_groups!group_id(id, name_ar, name_en)')
                .eq('parent_material_id', parentMaterialId)
                .eq('status', 'active')
                .order('name_ar');

            if (error || !data) return [];

            return data.map((m: any) => {
                const stock = stockMap?.[m.id];
                return {
                    id: m.id,
                    code: m.code || '',
                    name_ar: m.name_ar || '',
                    name_en: m.name_en || m.name_ar || '',
                    group_id: m.group_id || null,
                    group_name_ar: m.group?.name_ar || '',
                    group_name_en: m.group?.name_en || '',
                    category: m.category || 'mixed',
                    unit: m.unit || 'meter',
                    purchase_price: Number(m.purchase_price || 0),
                    selling_price: Number(m.selling_price || 0),
                    currency: m.currency || companyCurrency,
                    default_width: Number(m.default_width || 150),
                    min_stock: Number(m.min_stock || 0),
                    status: m.status || 'active',
                    stock_qty: Number(m.current_stock || 0) || (stock?.stock_qty ?? 0),
                    roll_count: stock?.roll_count ?? 0,
                    rolls_total_length: stock?.stock_qty ?? 0,
                    loose_stock: Math.max(0, Number(m.current_stock || 0) - (stock?.stock_qty ?? 0)),
                    current_stock: Number(m.current_stock || 0),
                    swatch_url: m.swatch_url || null,
                    images: m.images || [],
                    default_supplier_id: m.default_supplier_id || null,
                    origin_country: m.origin_country || null,
                    tax_rate: m.tax_rate != null ? Number(m.tax_rate) : null,
                    is_variant_parent: false,
                    has_variants: false,
                    parent_material_id: m.parent_material_id || null,
                    variant_id: m.variant_id || null,
                };
            });
        } catch (err) {
            console.warn('Failed to fetch variant children:', err);
            return [];
        }
    }, [companyId, stockMap]);

    /** Fetch all rolls for variant children — single query for hierarchical view */
    const fetchVariantRolls = useCallback(async (childMaterialIds: string[]): Promise<VariantRollData[]> => {
        if (!companyId || childMaterialIds.length === 0) return [];
        try {
            const { data, error } = await supabase
                .from('fabric_rolls')
                .select('id, roll_number, material_id, warehouse_id, current_length, available_length, reserved_length, status')
                .eq('company_id', companyId)
                .in('material_id', childMaterialIds)
                .in('status', ['available', 'reserved', 'partial'])
                .order('warehouse_id')
                .order('material_id');

            if (error || !data) return [];

            return data.map((r: any) => ({
                id: r.id,
                roll_number: r.roll_number || '',
                material_id: r.material_id,
                warehouse_id: r.warehouse_id,
                current_length: Number(r.current_length) || 0,
                available_length: Number(r.available_length) || 0,
                reserved_length: Number(r.reserved_length) || 0,
                status: r.status || 'available',
            }));
        } catch (err) {
            console.warn('Failed to fetch variant rolls:', err);
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
        // On-demand stock detail fetchers
        fetchWarehouseStock,
        fetchRollDetails,
        // On-demand color fetcher (legacy)
        fetchMaterialColors,
        // Variant children fetcher
        fetchVariantChildren,
        // Variant rolls fetcher (for hierarchical view)
        fetchVariantRolls,
    };
}
