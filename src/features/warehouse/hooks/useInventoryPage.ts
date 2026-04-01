/**
 * ═══════════════════════════════════════════════════════════
 * 🏭 useInventoryPage — Data hook for the full Inventory Page
 * يجلب كل المواد مع إحصاءات المخزون + بيانات الفلاتر
 * ✅ Currency filter: جلب العملات من الشركة + تحويل أسعار تلقائي
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCompanyCurrencies, currencyMetadata, getCurrencyDisplayName } from '@/hooks/useCompanyCurrencies';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';

export { getCurrencyDisplayName };

// ─── Types ───────────────────────────────────────────────

export interface InventoryMaterialRow {
    material_id: string;
    material_name_ar: string;
    material_name_en: string;
    material_code: string;
    material_unit: string;
    group_id: string | null;
    purchase_price: number;
    selling_price: number;
    min_stock: number;
    season: string | null;          // winter | spring | summer | autumn | null

    // Aggregated stock
    total_rolls: number;
    total_meters: number;           // sum of rolls current_length
    available_meters: number;
    reserved_meters: number;
    warehouse_count: number;
    color_ids: string[];          // for color dots
    avg_cost_per_meter: number;
    total_stock_value: number;

    // Dual-stock model
    current_stock: number;          // total stock from fabric_materials (opening balance)
    loose_stock: number;            // current_stock - total_meters (rolls)

    // Currency
    material_currency: string;      // currency code from fabric_materials (e.g. 'USD')
    default_warehouse_id: string | null;  // warehouse for loose stock

    // Container link (last received)
    last_container_number: string | null;
}

export interface FilterOptions {
    warehouses: { id: string; name_ar: string; name_en: string }[];
    materials: { id: string; name_ar: string; name_en: string; code: string }[];
    colors: { id: string; name_ar: string; name_en: string; hex_code: string }[];
    batches: { id: string; batch_number: string }[];
    currencies: { code: string; label: string; symbol: string }[]; // عملات الشركة
}

export interface InventoryFilters {
    search: string;
    warehouseId: string;
    colorId: string;
    materialId: string;              // quick jump to specific material
    batchId: string;
    season: string;
    currencyCode: string;
    status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    stockType: 'all' | 'rolls' | 'loose' | 'mixed';
    minMeters: string;
    maxMeters: string;
    showEmpty: boolean;
}


export function useInventoryPage() {
    // ─── Currency system ────────────────────────────────
    const { baseCurrency, supportedCurrencies } = useCompanyCurrencies();
    const { lookupRate } = useExchangeRateLookup();
    const { currencyCode: companyCurrency } = useCompanyCurrency();
    const { companyId } = useAuth();
    const queryClient = useQueryClient();

    // ─── Build currency options reactively from supportedCurrencies ───
    // This useMemo reacts immediately when useCompanyCurrencies resolves
    const currencyFilterOptions = useMemo(() => {
        if (!supportedCurrencies || supportedCurrencies.length === 0) return [];
        return supportedCurrencies.map((code: string) => ({
            code,
            // label resolved by component based on user language
            label: `${currencyMetadata[code]?.symbol || ''} ${code}`,
            symbol: currencyMetadata[code]?.symbol || code,
        }));
    }, [supportedCurrencies]);

    const [materials, setMaterials] = useState<InventoryMaterialRow[]>([]);
    const [allRolls, setAllRolls] = useState<any[]>([]); // raw rolls for warehouse re-aggregation;
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        warehouses: [],
        materials: [],
        colors: [],
        batches: [],
        currencies: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<InventoryFilters>({
        search: '',
        warehouseId: 'all',
        colorId: 'all',
        materialId: 'all',
        batchId: 'all',
        season: '',
        currencyCode: '',
        status: 'all',
        stockType: 'all',
        minMeters: '',
        maxMeters: '',
        showEmpty: false,
    });

    // ─── Sync currencies into filterOptions whenever supportedCurrencies loads ───
    useEffect(() => {
        if (currencyFilterOptions.length > 0) {
            setFilterOptions(prev => ({ ...prev, currencies: currencyFilterOptions }));
        }
    }, [currencyFilterOptions]);

    // ─── Fetch All Data ────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        setError(null);

        try {
            // ⚡ PARALLEL LOADING — all queries fire simultaneously
            // Previously: sequential (rolls → containers → materials → filters) = ~2-3s
            // Now: parallel = ~500ms (only as slow as the slowest query)

            // 1. Check preloaded caches first
            const cachedRolls = queryClient.getQueryData(['inventory-preload-rolls', companyId]) as any[] | null;
            const cachedMats = queryClient.getQueryData(['inventory-preload-materials', companyId]) as any[] | null;
            const cachedFilters = queryClient.getQueryData(['inventory-preload-filters', companyId]) as any;

            // 2. Fire ALL queries in parallel
            const [rollsResult, matsResult, warehousesResult, colorsResult, batchesResult] = await Promise.all([
                // Rolls
                cachedRolls
                    ? Promise.resolve(cachedRolls)
                    : supabase
                        .from('fabric_rolls')
                        .select(`
                            id, material_id, warehouse_id, color_id,
                            current_length, reserved_length, cost_per_meter,
                            status, container_id,
                            warehouses!left(id, name_ar, name_en)
                        `)
                        .eq('company_id', companyId)
                        .in('status', ['available', 'reserved', 'partial'])
                        .then(r => { if (r.error) throw r.error; return r.data || []; }),

                // Materials
                cachedMats
                    ? Promise.resolve(cachedMats)
                    : supabase
                        .from('fabric_materials')
                        .select('id, name_ar, name_en, code, unit, group_id, purchase_price, selling_price, min_stock, status, season, current_stock, currency, default_warehouse_id')
                        .eq('company_id', companyId)
                        .eq('status', 'active')
                        .then(r => { if (r.error) throw r.error; return r.data || []; }),

                // Warehouses
                supabase.from('warehouses').select('id, name_ar, name_en')
                    .eq('company_id', companyId).eq('is_active', true)
                    .order('created_at', { ascending: true })
                    .then(r => r.data || []),

                // Colors
                cachedFilters?.colors?.length > 0
                    ? Promise.resolve(cachedFilters.colors)
                    : supabase.from('fabric_colors').select('id, name_ar, name_en, hex_code')
                        .eq('company_id', companyId).eq('is_active', true)
                        .then(r => r.data || []),

                // Batches
                cachedFilters?.batches?.length > 0
                    ? Promise.resolve(cachedFilters.batches)
                    : supabase.from('batches').select('id, batch_number')
                        .eq('company_id', companyId).order('created_at', { ascending: false })
                        .then(r => r.data || []),
            ]);

            const rolls = rollsResult;
            const mats = matsResult;

            // Cache raw rolls for warehouse re-aggregation on filter change
            setAllRolls(rolls || []);

            // 3. Resolve container numbers (only if rolls have containers)
            const containerIds = [...new Set(
                (rolls || [])
                    .map((r: any) => r.container_id)
                    .filter(Boolean) as string[]
            )];

            const containerNumberMap = new Map<string, string>();
            if (containerIds.length > 0) {
                const { data: containers } = await supabase
                    .from('containers')
                    .select('id, container_number')
                    .in('id', containerIds);
                for (const c of containers || []) {
                    if (c.id && c.container_number) {
                        containerNumberMap.set(c.id, c.container_number);
                    }
                }
            }

            // Set filter options — currencies managed separately by useMemo/useEffect
            setFilterOptions(prev => ({
                ...prev,
                warehouses: warehousesResult,
                materials: (mats || []).map((m: any) => ({ id: m.id, name_ar: m.name_ar, name_en: m.name_en || m.name_ar, code: m.code || '' })),
                colors: colorsResult,
                batches: batchesResult,
                // currencies comes from the useMemo above — keep existing value
            }));

            // 4. Aggregate rolls by material
            const materialMap = new Map<string, InventoryMaterialRow>();

            // Initialize all materials (even those with 0 stock)
            for (const mat of mats || []) {
                materialMap.set(mat.id, {
                    material_id: mat.id,
                    material_name_ar: mat.name_ar || '',
                    material_name_en: mat.name_en || mat.name_ar || '',
                    material_code: mat.code || '',
                    material_unit: mat.unit || 'meter',
                    group_id: mat.group_id || null,
                    purchase_price: Number(mat.purchase_price) || 0,
                    selling_price: Number(mat.selling_price) || 0,
                    min_stock: Number(mat.min_stock) || 0,
                    season: mat.season || null,
                    total_rolls: 0,
                    total_meters: 0,
                    available_meters: 0,
                    reserved_meters: 0,
                    warehouse_count: 0,
                    color_ids: [],
                    avg_cost_per_meter: 0,
                    total_stock_value: 0,
                    current_stock: Number(mat.current_stock) || 0,
                    loose_stock: 0,
                    material_currency: mat.currency || '',
                    default_warehouse_id: mat.default_warehouse_id || null,
                    last_container_number: null,
                });
            }

            // Aggregate rolls
            const warehouseTracker = new Map<string, Set<string>>(); // materialId → warehouses
            const costAccumulator = new Map<string, { totalCost: number; count: number }>();

            for (const roll of rolls || []) {
                const matId = roll.material_id;
                if (!matId) continue;
                const existing = materialMap.get(matId);
                if (!existing) continue;

                const len = Number(roll.current_length) || 0;
                const cost = Number(roll.cost_per_meter) || 0;

                existing.total_rolls += 1;
                existing.total_meters += len;
                if (roll.status === 'available') existing.available_meters += len;
                if (roll.status === 'reserved') existing.reserved_meters += len;

                // Track unique warehouses
                if (!warehouseTracker.has(matId)) warehouseTracker.set(matId, new Set());
                if (roll.warehouse_id) warehouseTracker.get(matId)!.add(roll.warehouse_id);

                // Track unique colors
                if (roll.color_id && !existing.color_ids.includes(roll.color_id)) {
                    existing.color_ids.push(roll.color_id);
                }

                // Accumulate cost for average
                if (cost > 0) {
                    const acc = costAccumulator.get(matId) || { totalCost: 0, count: 0 };
                    acc.totalCost += cost * len;
                    acc.count += len;
                    costAccumulator.set(matId, acc);
                }

                // Track last container
                // Resolve container number from pre-fetched map
                const containerNum = roll.container_id
                    ? containerNumberMap.get(roll.container_id)
                    : undefined;
                if (containerNum && !existing.last_container_number) {
                    existing.last_container_number = containerNum;
                }
            }

            // Finalize computed fields
            for (const [matId, row] of materialMap.entries()) {
                row.warehouse_count = warehouseTracker.get(matId)?.size || 0;
                const acc = costAccumulator.get(matId);
                if (acc && acc.count > 0) {
                    row.avg_cost_per_meter = acc.totalCost / acc.count;
                    row.total_stock_value = acc.totalCost;
                }
                // Compute loose stock: current_stock - rolled meters
                row.loose_stock = Math.max(0, row.current_stock - row.total_meters);
            }

            setMaterials(Array.from(materialMap.values()));
        } catch (err: any) {
            console.error('[useInventoryPage] Error:', err);
            setError(err.message || 'Failed to load inventory');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Client-side Filtering ────────────────────────────
    const filteredMaterials = useMemo(() => {
        let result = [...materials];

        // Material quick filter
        if (filters.materialId && filters.materialId !== 'all') {
            result = result.filter(m => m.material_id === filters.materialId);
        }

        // ─── Warehouse filter: re-aggregate rolls for the selected warehouse ───
        // This ensures quantities (meters, rolls, value) reflect only the selected warehouse
        if (filters.warehouseId && filters.warehouseId !== 'all') {
            const selectedWhId = filters.warehouseId;

            // Re-aggregate rolls for this warehouse
            const whRolls = allRolls.filter(r => r.warehouse_id === selectedWhId);
            const whMap = new Map<string, { rolls: number; total: number; available: number; reserved: number; value: number }>();
            for (const roll of whRolls) {
                const existing = whMap.get(roll.material_id);
                const len = Number(roll.current_length) || 0;
                const avail = Math.max(0, len - (Number(roll.reserved_length) || 0));
                const reserved = Number(roll.reserved_length) || 0;
                const cost = (Number(roll.cost_per_meter) || 0) * len;
                if (existing) {
                    existing.rolls++;
                    existing.total += len;
                    existing.available += avail;
                    existing.reserved += reserved;
                    existing.value += cost;
                } else {
                    whMap.set(roll.material_id, { rolls: 1, total: len, available: avail, reserved, value: cost });
                }
            }

            // Build a set of material IDs that have rolls in ANY warehouse
            const materialsWithRolls = new Set<string>(allRolls.map(r => r.material_id).filter(Boolean));

            // Determine the first warehouse ID for fallback
            const firstWhId = filterOptions.warehouses.length > 0 ? filterOptions.warehouses[0].id : null;

            // Override material rows with warehouse-specific quantities
            // Also keep materials with loose stock assigned to this warehouse
            result = result
                .map(m => {
                    const wh = whMap.get(m.material_id);
                    const hasRollsHere = !!wh;
                    const hasRollsAnywhere = materialsWithRolls.has(m.material_id);

                    // Check if loose stock belongs to this warehouse:
                    // 1. default_warehouse_id matches selected
                    // 2. No default + has rolls HERE (first warehouse with rolls)
                    // 3. No default + no rolls ANYWHERE → fallback to first warehouse
                    const looseAssignedHere = m.loose_stock > 0 && (
                        m.default_warehouse_id === selectedWhId ||
                        (!m.default_warehouse_id && hasRollsHere) ||
                        (!m.default_warehouse_id && !hasRollsAnywhere && selectedWhId === firstWhId)
                    );
                    const keepLoose = looseAssignedHere ? m.loose_stock : 0;

                    return {
                        ...m,
                        total_rolls: wh?.rolls || 0,
                        total_meters: wh?.total || 0,
                        available_meters: wh?.available || 0,
                        reserved_meters: wh?.reserved || 0,
                        total_stock_value: wh?.value || 0,
                        loose_stock: keepLoose,
                    };
                })
                .filter(m => m.total_rolls > 0 || m.loose_stock > 0); // only materials present in this warehouse
        }

        // Hide empty (unless showEmpty) — show materials that have rolls OR loose stock
        if (!filters.showEmpty) {
            result = result.filter(m => m.total_rolls > 0 || m.loose_stock > 0);
        }

        // Search: name, code, OR color name (ar/en)
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            result = result.filter(m => {
                if (m.material_name_ar.includes(q)) return true;
                if (m.material_name_en.toLowerCase().includes(q)) return true;
                if (m.material_code.toLowerCase().includes(q)) return true;
                // Search by color name — look up color names from filterOptions
                return m.color_ids.some(cid => {
                    const color = filterOptions.colors.find(c => c.id === cid);
                    return color && (
                        color.name_ar.toLowerCase().includes(q) ||
                        color.name_en.toLowerCase().includes(q)
                    );
                });
            });
        }

        // Color filter
        if (filters.colorId && filters.colorId !== 'all') {
            result = result.filter(m => m.color_ids.includes(filters.colorId));
        }

        // Season filter
        if (filters.season) {
            result = result.filter(m => m.season === filters.season);
        }

        // Status filter (includes loose stock in effective total)
        if (filters.status !== 'all') {
            result = result.filter(m => {
                const effectiveTotal = m.total_meters + m.loose_stock;
                const effectiveAvailable = m.available_meters + m.loose_stock;
                if (filters.status === 'out_of_stock') return effectiveTotal <= 0;
                if (filters.status === 'low_stock') return effectiveTotal > 0 && effectiveTotal <= m.min_stock;
                if (filters.status === 'in_stock') return effectiveAvailable > 0 && (m.min_stock <= 0 || effectiveTotal > m.min_stock);
                return true;
            });
        }

        // Meters range
        if (filters.minMeters) {
            result = result.filter(m => m.total_meters >= Number(filters.minMeters));
        }
        if (filters.maxMeters) {
            result = result.filter(m => m.total_meters <= Number(filters.maxMeters));
        }

        // Stock type filter
        if (filters.stockType && filters.stockType !== 'all') {
            result = result.filter(m => {
                const hasRolls = m.total_rolls > 0;
                const hasLoose = m.loose_stock > 0;
                if (filters.stockType === 'rolls') return hasRolls && !hasLoose;
                if (filters.stockType === 'loose') return !hasRolls && hasLoose;
                if (filters.stockType === 'mixed') return hasRolls && hasLoose;
                return true;
            });
        }

        return result;
    }, [materials, allRolls, filters, filterOptions.colors]);


    // ─── Active currency (filter currency or base) ────────
    const activeCurrency = filters.currencyCode || baseCurrency || companyCurrency || 'UAH';

    // ─── Convert price to selected currency ───────────────
    const convertPrice = useCallback((price: number, fromCurrency = 'UAH'): number => {
        if (!price || price <= 0) return 0;
        if (fromCurrency === activeCurrency) return price;
        const rate = lookupRate(fromCurrency, activeCurrency);
        return price * rate;
    }, [lookupRate, activeCurrency]);

    // ─── Summary Stats ─────────────────────────────────────
    const summary = useMemo(() => ({
        totalMaterials: filteredMaterials.filter(m => m.total_rolls > 0 || m.loose_stock > 0).length,
        totalRolls: filteredMaterials.reduce((s, m) => s + m.total_rolls, 0),
        totalMeters: filteredMaterials.reduce((s, m) => s + m.total_meters, 0),
        totalValue: filteredMaterials.reduce((s, m) => s + m.total_stock_value, 0),
        availableMeters: filteredMaterials.reduce((s, m) => s + m.available_meters, 0),
        totalLooseStock: filteredMaterials.reduce((s, m) => s + m.loose_stock, 0),
    }), [filteredMaterials]);

    const hasActiveFilters = filters.search !== '' ||
        filters.warehouseId !== 'all' ||
        filters.colorId !== 'all' ||
        filters.batchId !== 'all' ||
        !!filters.currencyCode ||
        filters.status !== 'all' ||
        filters.stockType !== 'all' ||
        !!filters.minMeters ||
        !!filters.maxMeters;

    const resetFilters = useCallback(() => {
        setFilters({
            search: '',
            warehouseId: 'all',
            colorId: 'all',
            materialId: 'all',
            batchId: 'all',
            season: '',
            currencyCode: '',
            status: 'all',
            stockType: 'all',
            minMeters: '',
            maxMeters: '',
            showEmpty: false,
        });
    }, []);

    return {
        materials: filteredMaterials,
        allMaterials: materials,
        filterOptions,
        filters,
        setFilters,
        summary,
        loading,
        error,
        refetch: fetchData,
        hasActiveFilters,
        resetFilters,
        // Currency utilities
        activeCurrency,
        convertPrice,
        baseCurrency,
        supportedCurrencies,
    };
}
