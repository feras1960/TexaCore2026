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

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { useMaterials, useMaterialGroups } from '@/features/warehouse/hooks/useWarehouseQueries';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// ─── Cache timing constants ──────────────────────────────────────────
const STOCK_STALE = 3 * 60 * 1000;   // 3 min — stock changes often
const STOCK_GC    = 15 * 60 * 1000;  // 15 min — keep in memory
const STATIC_STALE = 5 * 60 * 1000;  // 5 min — warehouses, groups
const STATIC_GC    = 30 * 60 * 1000; // 30 min

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
    /** Default warehouse for this material */
    default_warehouse_id?: string | null;
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
    /** Filter by design classification (سادة, منقوش, مطبوع...) — value_id from variant_data.design */
    designId?: string | null;
    /** Filter by color (أبيض, أسود, كحلي...) — value_id from variant_data.color */
    colorId?: string | null;
    status?: string;
    inStockOnly?: boolean;
    /** Show only materials at or below min_stock */
    belowMinStock?: boolean;
    /** Filter by default supplier */
    supplierId?: string | null;
    /** Filter by warehouse (materials that have stock in this warehouse) */
    warehouseId?: string | null;
    /** Show all materials flat (don't hide children) */
    flatMode?: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useMaterialSearch(filters: MaterialSearchFilters = {}) {
    // ⚡ useAuth provides companyId INSTANTLY from cached user metadata
    // useCompany needs to fetch company data first → causes stock query delay
    const { companyId: authCompanyId } = useAuth();
    const { company } = useCompany();
    const companyId = authCompanyId || company?.id || null;
    const companyCurrency = company?.default_currency || 'USD';
    const queryClient = useQueryClient();

    // ─── Use existing warehouse hooks (proven to work with SELECT *) ─────────
    // ⚡ Load ALL materials once (no search param = stable cache key)
    // Then filter locally for instant search results
    const {
        materials: allMaterials,
        loading: materialsLoading,
        error: materialsError,
    } = useMaterials({
        // Don't pass search — we filter locally for instant results
        // Only pass real fabric_groups IDs to API — parent_xxx groups are filtered locally
        categoryId: filters.groupId !== 'all' && !filters.groupId?.startsWith('parent_') ? (filters.groupId || undefined) : undefined,
    });

    // ⚡ Arabic text normalization — أ إ آ → ا, ة → ه, remove tashkeel
    const normalizeAr = useCallback((text: string): string => {
        return text
            .toLowerCase()
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[\u064B-\u065F\u0670]/g, ''); // remove tashkeel diacritics
    }, []);

    // ⚡ Client-side search filter — instant, no network delay
    const rawMaterials = useMemo(() => {
        if (!allMaterials || allMaterials.length === 0) return [];
        const searchRaw = (filters.search || '').trim().toLowerCase();
        if (!searchRaw) return allMaterials;
        const searchNorm = normalizeAr(searchRaw);

        return allMaterials.filter((m: any) => {
            const nameAr = normalizeAr(m.name_ar || '');
            const nameEn = (m.name_en || '').toLowerCase();
            const code = (m.code || '').toLowerCase();
            // Also search in variant_data (color, design names)
            const vd = m.variant_data;
            const colorAr = normalizeAr(vd?.color?.name_ar || '');
            const colorEn = (vd?.color?.name_en || '').toLowerCase();
            const designAr = normalizeAr(vd?.design?.name_ar || '');
            const designEn = (vd?.design?.name_en || '').toLowerCase();
            return nameAr.includes(searchNorm) || nameEn.includes(searchNorm) || code.includes(searchNorm)
                || colorAr.includes(searchNorm) || colorEn.includes(searchNorm)
                || designAr.includes(searchNorm) || designEn.includes(searchNorm);
        });
    }, [allMaterials, filters.search, normalizeAr]);

    const {
        groups: rawGroups,
        loading: groupsLoading,
    } = useMaterialGroups();

    // ─── ⚡ Stock computed from cached rolls — INSTANT, no network! ──────
    // DataEngine preloads 'inventory-preload-rolls' on app startup.
    // We subscribe to the same cache key so we get re-rendered when data arrives.
    const { data: cachedRolls } = useCachedQuery({
        queryKey: ['inventory-preload-rolls', companyId],
        queryFn: async () => {
            // Fallback: fetch if not in cache (shouldn't happen — DataEngine preloads)
            if (!companyId) return [];
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
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 30 * 60 * 1000,
    });

    // ⚡ All materials with full variant detail (for fetchVariantChildren)
    // Uses the same proven SELECT * approach
    const { data: cachedMaterials } = useCachedQuery({
        queryKey: ['materials-full-detail', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data } = await supabase
                .from('fabric_materials')
                .select('*')
                .eq('company_id', companyId)
                .eq('status', 'active');
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 0, // always treat as stale so it refetches on mount
        refetchOnMount: true,
        gcTime: 30 * 60 * 1000,
    });

    // ⚡ stockMap — computed from cached rolls (0ms, no network)
    const stockMap = useMemo(() => {
        if (!cachedRolls || cachedRolls.length === 0) return {} as Record<string, { stock_qty: number; roll_count: number }>;
        const result: Record<string, { stock_qty: number; roll_count: number }> = {};
        for (const roll of cachedRolls) {
            const matId = roll.material_id;
            if (!matId) continue;
            if (!result[matId]) {
                result[matId] = { stock_qty: 0, roll_count: 0 };
            }
            result[matId].stock_qty += Number(roll.current_length) || 0;
            result[matId].roll_count += 1;
        }
        return result;
    }, [cachedRolls]);

    // ⚡ warehouseStockMap — computed from cached rolls (0ms, no network)
    const warehouseStockMap = useMemo(() => {
        if (!filters.warehouseId || filters.warehouseId === 'all') return null;
        if (!cachedRolls || cachedRolls.length === 0) return null;
        const result: Record<string, boolean> = {};
        for (const roll of cachedRolls) {
            if (roll.warehouse_id === filters.warehouseId) {
                result[roll.material_id] = true;
            }
        }
        // Include materials with loose stock in this warehouse
        if (rawMaterials) {
            for (const m of rawMaterials as any[]) {
                if (m.default_warehouse_id === filters.warehouseId && Number(m.current_stock) > 0) {
                    result[m.id] = true;
                }
            }
        }
        return result;
    }, [cachedRolls, filters.warehouseId, rawMaterials]);

    // 🔄 Realtime: auto-update when materials or price lists change
    useRealtimeInvalidation({
        table: 'fabric_materials',
        companyId,
        queryKeys: [
            ['materials-full-detail', companyId],
        ],
    });

    useRealtimeInvalidation({
        table: 'price_list_items',
        companyId,
        queryKeys: [
            ['price_list_items'],
            ['customer_pricing_profile'],
        ],
    });

    // ─── Aggregate children stock for variant parents ─────────────
    // المواد الأم لا تملك رصيد مباشر — الرصيد على المتغيرات الفرعية
    const parentStockMap = useMemo(() => {
        if (!rawMaterials) return {};

        const result: Record<string, {
            stock_qty: number; roll_count: number;
            min_price: number; max_price: number;
            all_same_price: boolean; uniform_price: number;
            child_prices: Set<number>;
        }> = {};

        // Find all children and sum their stock (current_stock) to their parent
        for (const m of rawMaterials as any[]) {
            if (m.parent_material_id) {
                if (!result[m.parent_material_id]) {
                    result[m.parent_material_id] = {
                        stock_qty: 0, roll_count: 0,
                        min_price: Infinity, max_price: 0,
                        all_same_price: true, uniform_price: 0,
                        child_prices: new Set<number>(),
                    };
                }
                const entry = result[m.parent_material_id];
                // Use current_stock from fabric_materials (always available)
                const childStock = Number(m.current_stock || 0);
                // Also check stockMap (fabric_rolls) as additional source
                const rollStock = stockMap?.[m.id];
                entry.stock_qty += Math.max(childStock, rollStock?.stock_qty ?? 0);
                entry.roll_count += rollStock?.roll_count ?? 0;
                // Track price range from children
                const childPrice = Number(m.selling_price || 0);
                if (childPrice > 0) {
                    entry.min_price = Math.min(entry.min_price, childPrice);
                    entry.max_price = Math.max(entry.max_price, childPrice);
                    entry.child_prices.add(childPrice);
                }
            }
        }
        // Finalize: determine if all children share the same price
        for (const key of Object.keys(result)) {
            const entry = result[key];
            if (entry.min_price === Infinity) entry.min_price = 0;
            entry.all_same_price = entry.child_prices.size <= 1;
            entry.uniform_price = entry.all_same_price ? (entry.child_prices.values().next().value || 0) : 0;
        }

        return result;
    }, [rawMaterials, stockMap]);

    // ─── Map to MaterialSearchResult format ─────────────────────
    const mappedMaterials = useMemo((): MaterialSearchResult[] => {
        if (!rawMaterials || rawMaterials.length === 0) return [];

        // Build parent material filter from groupId (parent_xxx prefix)
        const parentGroupId = filters.groupId?.startsWith('parent_') ? filters.groupId.replace('parent_', '') : null;

        // Build design filter — find parents whose children match the design value_id
        // ⚡ Use allMaterials (full unfiltered set) to find ALL children with matching variant_data
        const activeDesignId = filters.designId && filters.designId !== 'all' ? filters.designId : null;
        let designMatchIds: Set<string> | null = null;
        if (activeDesignId) {
            const pool = cachedMaterials || allMaterials || [];
            designMatchIds = new Set<string>();
            for (const m of pool as any[]) {
                const vd = (m as any).variant_data;
                if (vd?.design?.value_id === activeDesignId) {
                    // Add both the child itself AND its parent
                    designMatchIds.add(m.id);
                    if (m.parent_material_id) designMatchIds.add(m.parent_material_id);
                }
            }
        }

        // Build color filter — find parents whose children match the color value_id
        const activeColorId = filters.colorId && filters.colorId !== 'all' ? filters.colorId : null;
        let colorMatchIds: Set<string> | null = null;
        if (activeColorId) {
            const pool = cachedMaterials || allMaterials || [];
            colorMatchIds = new Set<string>();
            for (const m of pool as any[]) {
                const vd = (m as any).variant_data;
                if (vd?.color?.value_id === activeColorId) {
                    // Add both the child itself AND its parent
                    colorMatchIds.add(m.id);
                    if (m.parent_material_id) colorMatchIds.add(m.parent_material_id);
                }
            }
        }

        // If both design AND color are active, intersect matched IDs
        let combinedMatchIds: Set<string> | null = null;
        if (designMatchIds && colorMatchIds) {
            combinedMatchIds = new Set([...designMatchIds].filter(id => colorMatchIds!.has(id)));
        } else if (designMatchIds) {
            combinedMatchIds = designMatchIds;
        } else if (colorMatchIds) {
            combinedMatchIds = colorMatchIds;
        }

        return rawMaterials
            .filter((m: any) => {
                // Status filter
                if (filters.status && m.status !== filters.status) return false;
                if (!filters.status && m.status !== 'active') return false;

                // Design/Color filter — show only materials (or their parents) that match
                if (combinedMatchIds) {
                    if (!combinedMatchIds.has(m.id)) return false;
                }

                // Parent material group filter — show only this parent and its children
                if (parentGroupId) {
                    const isThisParent = m.id === parentGroupId;
                    const isChildOfParent = m.parent_material_id === parentGroupId;
                    if (!isThisParent && !isChildOfParent) return false;
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
                    selling_price: (() => {
                        const raw = Number(m.selling_price || 0);
                        if (raw > 0) return raw;
                        // For parent materials: use uniform price if all children same, else 0
                        const parentAgg = parentStockMap[m.id];
                        if (!parentAgg) return 0;
                        return parentAgg.all_same_price ? parentAgg.uniform_price : 0;
                    })(),
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
                    default_warehouse_id: m.default_warehouse_id || null,
                };
            })
            // ⚠️ وضع العرض:
            // مجمع (flatMode=false) → إظهار المواد الأم فقط (المتغيرات تظهر تحتها عند الفتح)
            // سائب (flatMode=true) → إظهار المتغيرات الفرعية فقط (بدون المواد الأم)
            .filter((m: MaterialSearchResult) => {
                if (filters.flatMode) {
                    // Flat mode: show only child variants (materials WITH parent)
                    return !!m.parent_material_id;
                }
                // Grouped mode: show only parent/standalone materials (materials WITHOUT parent)
                return !m.parent_material_id;
            });
    }, [rawMaterials, allMaterials, filters.status, filters.designId, filters.colorId, filters.groupId, filters.supplierId, filters.warehouseId, filters.flatMode, warehouseStockMap, stockMap, parentStockMap, cachedMaterials]);

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

    // ─── Variant count per parent (for inline display) ─────────
    const variantCountMap = useMemo(() => {
        if (!rawMaterials) return {};
        const result: Record<string, number> = {};
        for (const m of rawMaterials as any[]) {
            if (m.parent_material_id && m.status === 'active') {
                result[m.parent_material_id] = (result[m.parent_material_id] || 0) + 1;
            }
        }
        return result;
    }, [rawMaterials]);

    // ─── Map groups — parent materials become selectable groups ─────
    const mappedGroups = useMemo(() => {
        // 1. Start with fabric_groups (from DB)
        const dbGroups = (rawGroups || []).map((g: any) => ({
            id: g.id,
            code: g.code || '',
            name_ar: g.name_ar || '',
            name_en: g.name_en || g.name_ar || '',
            icon: g.icon || '📁',
            color: g.color || '',
        }));

        // 2. Extract parent materials as groups
        const pool = rawMaterials || [];
        const parentGroups = (pool as any[])
            .filter((m: any) => (m.is_variant_parent || m.has_variants) && m.status === 'active')
            .map((m: any) => ({
                id: `parent_${m.id}`,
                code: m.code || '',
                name_ar: m.name_ar || '',
                name_en: m.name_en || m.name_ar || '',
                icon: '🧵',
                color: '',
            }));

        // 3. Merge: DB groups first, then parent material groups
        return [...dbGroups, ...parentGroups];
    }, [rawGroups, rawMaterials]);

    // ─── Design classifications from variant_data (for النوع/Type filter) ─────
    const designFilters = useMemo(() => {
        const pool = cachedMaterials || rawMaterials || [];
        const designMap = new Map<string, { id: string; name_ar: string; name_en: string }>();
        for (const m of pool as any[]) {
            const vd = (m as any).variant_data;
            if (vd?.design?.value_id && vd?.design?.name_ar) {
                const designId = vd.design.value_id;
                if (!designMap.has(designId)) {
                    designMap.set(designId, {
                        id: designId,
                        name_ar: vd.design.name_ar,
                        name_en: vd.design.name_en || vd.design.name_ar,
                    });
                }
            }
        }
        return Array.from(designMap.values());
    }, [cachedMaterials, rawMaterials]);

    // ─── Color classifications from variant_data (for اللون/Color filter) ─────
    const colorFilters = useMemo(() => {
        const pool = cachedMaterials || rawMaterials || [];
        const colorMap = new Map<string, { id: string; name_ar: string; name_en: string; hex_code: string }>();
        for (const m of pool as any[]) {
            const vd = (m as any).variant_data;
            if (vd?.color?.value_id && vd?.color?.name_ar) {
                const colorId = vd.color.value_id;
                if (!colorMap.has(colorId)) {
                    colorMap.set(colorId, {
                        id: colorId,
                        name_ar: vd.color.name_ar,
                        name_en: vd.color.name_en || vd.color.name_ar,
                        hex_code: vd.color.hex_code || '#808080',
                    });
                }
            }
        }
        return Array.from(colorMap.values());
    }, [cachedMaterials, rawMaterials]);

    // ─── ⚡ Per-material warehouse breakdown — from cached rolls ───
    const fetchWarehouseStock = useCallback((materialId: string): MaterialWarehouseStock[] => {
        if (!cachedRolls) return [];
        const materialRolls = cachedRolls.filter((r: any) => r.material_id === materialId);
        const whMap = new Map<string, MaterialWarehouseStock>();
        for (const roll of materialRolls) {
            const whId = roll.warehouse_id;
            if (!whId) continue;
            const existing = whMap.get(whId);
            const len = Number(roll.current_length) || 0;
            const avail = Math.max(0, len - (Number(roll.reserved_length) || 0));
            const reserved = Number(roll.reserved_length) || 0;
            const whInfo = roll.warehouses || {};
            if (existing) {
                existing.roll_count += 1;
                existing.total_length += len;
                existing.available_length += avail;
                existing.reserved_length += reserved;
            } else {
                whMap.set(whId, {
                    warehouse_id: whId,
                    warehouse_code: (whInfo as any).code || '',
                    warehouse_name_ar: (whInfo as any).name_ar || '',
                    warehouse_name_en: (whInfo as any).name_en || '',
                    roll_count: 1,
                    total_length: len,
                    available_length: avail,
                    reserved_length: reserved,
                    loose_stock: 0,
                    last_updated: null,
                });
            }
        }
        return Array.from(whMap.values());
    }, [cachedRolls]);

    // ⚡ Roll details — from cached rolls
    const fetchRollDetails = useCallback((materialId: string, warehouseId?: string): MaterialRollDetail[] => {
        if (!cachedRolls) return [];
        const rolls = cachedRolls
            .filter((r: any) => r.material_id === materialId && (!warehouseId || r.warehouse_id === warehouseId))
            .map((r: any) => {
                const whInfo = r.warehouses || {};
                return {
                    id: r.id,
                    roll_number: r.roll_number || '',
                    warehouse_id: r.warehouse_id,
                    warehouse_name_ar: whInfo.name_ar || '',
                    warehouse_name_en: whInfo.name_en || '',
                    initial_length: Number(r.current_length) || 0,
                    current_length: Number(r.current_length) || 0,
                    available_length: Math.max(0, (Number(r.current_length) || 0) - (Number(r.reserved_length) || 0)),
                    reserved_length: Number(r.reserved_length) || 0,
                    cost_per_meter: Number(r.cost_per_meter) || 0,
                    status: r.status || 'available',
                    color_id: r.color_id || null,
                    created_at: r.created_at || '',
                };
            });
        return rolls;
    }, [cachedRolls]);

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

    /** Fetch variant children for a parent material — now computes instantly from cached materials */
    const fetchVariantChildren = useCallback((parentMaterialId: string): MaterialSearchResult[] => {
        const pool = cachedMaterials || rawMaterials || [];
        const children = pool.filter((m: any) => m.parent_material_id === parentMaterialId && m.status === 'active');
        
        return children.map((m: any) => {
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
                stock_qty: Math.max(Number(m.current_stock || 0), stock?.stock_qty ?? 0),
                roll_count: stock?.roll_count ?? Number(m.current_rolls_count || 0),
                rolls_total_length: stock?.stock_qty ?? Number(m.current_stock || 0),
                loose_stock: Number(m.loose_stock || 0) || Math.max(0, Number(m.current_stock || 0) - (stock?.stock_qty ?? 0)),
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
                variant_data: m.variant_data || null,
            };
        });
    }, [companyId, stockMap, queryClient, rawMaterials, cachedMaterials]);

    /** Fetch all rolls for variant children — now computes instantly from cached rolls */
    const fetchVariantRolls = useCallback((childMaterialIds: string[]): VariantRollData[] => {
        if (!companyId || childMaterialIds.length === 0 || !cachedRolls) return [];
        
        const validIds = new Set(childMaterialIds);
        const rolls = cachedRolls.filter((r: any) => validIds.has(r.material_id));

        return rolls.map((r: any) => ({
            id: r.id,
            roll_number: r.roll_number || '',
            material_id: r.material_id,
            warehouse_id: r.warehouse_id,
            current_length: Number(r.current_length) || 0,
            available_length: Math.max(0, (Number(r.current_length) || 0) - (Number(r.reserved_length) || 0)),
            reserved_length: Number(r.reserved_length) || 0,
            status: r.status || 'available',
        }));
    }, [companyId, cachedRolls]);

    return {
        materials: filteredResults,
        groups: mappedGroups,
        designFilters,
        colorFilters,
        variantCountMap,
        parentPriceMap: parentStockMap,
        isLoading: materialsLoading || groupsLoading,
        isSearching: false,  // Search is now instant (client-side filtering)
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
