/**
 * ═══════════════════════════════════════════════════════════
 * 🏭 useInventoryPage — Data hook for the full Inventory Page
 * يجلب كل المواد مع إحصاءات المخزون + بيانات الفلاتر
 * ✅ Currency filter: جلب العملات من الشركة + تحويل أسعار تلقائي
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCompanyCurrencies, currencyMetadata, getCurrencyDisplayName } from '@/hooks/useCompanyCurrencies';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { matchesSearch } from '@/lib/utils/normalizeSearch';

export { getCurrencyDisplayName };

// ─── Types ───────────────────────────────────────────────

export interface InventoryMaterialRow {
    material_id: string;
    material_name_ar: string;
    material_name_en: string;
    material_name_ru: string;
    material_name_uk: string;
    material_name_tr: string;
    material_code: string;
    material_unit: string;
    group_id: string | null;
    purchase_price: number;
    selling_price: number;
    min_stock: number;
    season: string | null;          // winter | spring | summer | autumn | null

    // Extended prices (from custom_fields)
    wholesale_price: number;         // سعر الجملة
    half_wholesale_price: number;    // سعر نصف الجملة
    special_price: number;           // سعر خاص
    cost_price: number;              // سعر التكلفة

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
    const [allStock, setAllStock] = useState<any[]>([]); // inventory_stock for per-warehouse distribution
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        warehouses: [],
        materials: [],
        colors: [],
        batches: [],
        currencies: [],
    });
    const [loading, setLoading] = useState(false); // ⚡ Start false — cache will provide data instantly
    const [error, setError] = useState<string | null>(null);
    const hasDataLoaded = useRef(false); // Track if we've shown data (cache or fresh)

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
    // ⚡ Phase 1: Show cached data INSTANTLY from React Query / DataEngine
    // 🔄 Phase 2: Silently refresh from Supabase in background
    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!companyId) return;

        // ────────────────────────────────────────────────────
        // PHASE 1: INSTANT — Read from React Query cache (0ms)
        // DataEngine preloads these on login → already in cache
        // ⚡ Check for cache EXISTENCE (not length!) — empty inventory is valid cached data
        // ────────────────────────────────────────────────────
        let hadCachedData = false;
        if (!forceRefresh) {
            const cachedRolls = queryClient.getQueryData(['inventory-preload-rolls', companyId]) as any[] | undefined;
            const cachedMats = queryClient.getQueryData(['inventory-preload-materials', companyId]) as any[] | undefined;
            const cachedStock = queryClient.getQueryData(['inventory-preload-stock', companyId]) as any[] | undefined;

            // ⚡ Check if arrays EXIST in cache (even if empty = valid!)
            if (cachedRolls !== undefined && cachedMats !== undefined) {
                hadCachedData = true;
                hasDataLoaded.current = true;
                _processAndSetData(cachedRolls, cachedMats, cachedStock);
                // Don't show loading — data is already visible!
            }
        }

        // ────────────────────────────────────────────────────
        // PHASE 2: BACKGROUND — Fetch fresh data from Supabase
        // If we had cache, this runs SILENTLY (no loading spinner).
        // If NO cache was found, show loading spinner.
        // ────────────────────────────────────────────────────
        if (!hadCachedData && !hasDataLoaded.current) {
            setLoading(true);
        }
        setError(null);

        try {
            const [rollsResult, matsResult, warehousesResult, colorsResult, batchesResult, stockResult] = await Promise.all([
                supabase
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

                supabase
                    .from('fabric_materials')
                    .select('id, name_ar, name_en, name_ru, name_uk, name_tr, code, unit, group_id, purchase_price, selling_price, min_stock, status, season, current_stock, currency, default_warehouse_id, custom_fields')
                    .eq('company_id', companyId)
                    .eq('status', 'active')
                    .then(r => { if (r.error) throw r.error; return r.data || []; }),

                supabase.from('warehouses').select('id, name_ar, name_en')
                    .eq('company_id', companyId).eq('is_active', true)
                    .order('created_at', { ascending: true })
                    .then(r => r.data || []),

                supabase.from('fabric_colors').select('id, name_ar, name_en, hex_code')
                    .eq('company_id', companyId).eq('is_active', true)
                    .then(r => r.data || []),

                supabase.from('batches').select('id, batch_number')
                    .eq('company_id', companyId).order('created_at', { ascending: false })
                    .then(r => r.data || []),

                // inventory_stock for per-warehouse loose stock distribution
                supabase.from('inventory_stock')
                    .select('material_id, warehouse_id, quantity_on_hand, average_cost')
                    .eq('company_id', companyId)
                    .then(r => r.data || []),
            ]);

            // Cache for next time
            queryClient.setQueryData(['inventory-preload-rolls', companyId], rollsResult);
            queryClient.setQueryData(['inventory-preload-materials', companyId], matsResult);
            queryClient.setQueryData(['inventory-preload-stock', companyId], stockResult);

            // Update filter options
            setFilterOptions(prev => ({
                ...prev,
                warehouses: warehousesResult,
                materials: (matsResult || []).map((m: any) => ({ id: m.id, name_ar: m.name_ar, name_en: m.name_en || m.name_ar, code: m.code || '' })),
                colors: colorsResult,
                batches: batchesResult,
            }));

            // Process & set data (includes inventory_stock for loose stock)
            hasDataLoaded.current = true;
            _processAndSetData(rollsResult, matsResult, stockResult);
        } catch (err: any) {
            console.error('[useInventoryPage] Error:', err);
            setError(err.message || 'Failed to load inventory');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    // ─── Shared data processing logic ─────────────────────
    const _processAndSetData = useCallback((rolls: any[], mats: any[], stockData?: any[]) => {
        // Resolve container numbers
        const containerIds = [...new Set(
            rolls.map((r: any) => r.container_id).filter(Boolean) as string[]
        )];

        // Aggregate rolls by material
        const materialMap = new Map<string, InventoryMaterialRow>();

        // Initialize all materials
        for (const mat of mats || []) {
            const cf = mat.custom_fields || {};
            materialMap.set(mat.id, {
                material_id: mat.id,
                material_name_ar: mat.name_ar || '',
                material_name_en: mat.name_en || mat.name_ar || '',
                material_name_ru: mat.name_ru || '',
                material_name_uk: mat.name_uk || '',
                material_name_tr: mat.name_tr || '',
                material_code: mat.code || '',
                material_unit: mat.unit || 'meter',
                group_id: mat.group_id || null,
                purchase_price: Number(mat.purchase_price) || 0,
                selling_price: Number(mat.selling_price) || 0,
                min_stock: Number(mat.min_stock) || 0,
                season: mat.season || null,
                // Extended prices from custom_fields
                wholesale_price: Number(cf._wholesale_price || 0),
                half_wholesale_price: Number(cf._half_wholesale_price || 0),
                special_price: Number(cf._special_price || 0),
                cost_price: Number(cf._cost_price || 0),
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

        // Aggregate
        const warehouseTracker = new Map<string, Set<string>>();
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

            if (!warehouseTracker.has(matId)) warehouseTracker.set(matId, new Set());
            if (roll.warehouse_id) warehouseTracker.get(matId)!.add(roll.warehouse_id);

            if (roll.color_id && !existing.color_ids.includes(roll.color_id)) {
                existing.color_ids.push(roll.color_id);
            }

            if (cost > 0) {
                const acc = costAccumulator.get(matId) || { totalCost: 0, count: 0 };
                acc.totalCost += cost * len;
                acc.count += len;
                costAccumulator.set(matId, acc);
            }
        }

        // ═══ Build inventory_stock index for per-warehouse data ═══
        const stockByMaterial = new Map<string, { warehouse_id: string; qty: number; avg_cost: number }[]>();
        if (stockData && stockData.length > 0) {
            for (const sr of stockData) {
                const matId = sr.material_id;
                if (!matId) continue;
                const qty = Number(sr.quantity_on_hand) || 0;
                if (qty <= 0) continue;
                if (!stockByMaterial.has(matId)) stockByMaterial.set(matId, []);
                stockByMaterial.get(matId)!.push({
                    warehouse_id: sr.warehouse_id,
                    qty,
                    avg_cost: Number(sr.average_cost) || 0,
                });
            }
        }

        // Finalize
        for (const [matId, row] of materialMap.entries()) {
            const rollWhCount = warehouseTracker.get(matId)?.size || 0;
            const acc = costAccumulator.get(matId);
            if (acc && acc.count > 0) {
                row.avg_cost_per_meter = acc.totalCost / acc.count;
                row.total_stock_value = acc.totalCost;
            }
            const stockEntries = stockByMaterial.get(matId);
            let totalStockQty = 0;
            if (stockEntries && stockEntries.length > 0) {
                totalStockQty = stockEntries.reduce((s, e) => s + e.qty, 0);
            }

            // Reliable source of truth for total stock is inventory_stock or fallback to fabric_materials
            if (totalStockQty > 0 || (stockEntries && stockEntries.length > 0)) {
                row.current_stock = Math.max(totalStockQty, row.total_meters);
            } else {
                row.current_stock = Math.max(row.current_stock, row.total_meters);
            }
            
            row.loose_stock = Math.max(0, row.current_stock - row.total_meters);

            // For materials with loose stock but no rolls, use inventory_stock for warehouse_count & value
            if (stockEntries && stockEntries.length > 0) {
                // warehouse_count: combine roll warehouses + stock warehouses
                const allWhIds = new Set<string>(warehouseTracker.get(matId) || []);
                for (const se of stockEntries) allWhIds.add(se.warehouse_id);
                row.warehouse_count = allWhIds.size;

                // If no roll-based value, compute from inventory_stock avg_cost
                if (row.total_stock_value === 0 && row.current_stock > 0) {
                    const totalFromStock = stockEntries.reduce((s, e) => s + (e.qty * (e.avg_cost || row.purchase_price)), 0);
                    if (totalFromStock > 0) {
                        row.total_stock_value = totalFromStock;
                        row.avg_cost_per_meter = totalFromStock / row.current_stock;
                    } else if (row.purchase_price > 0) {
                        // Fallback: use purchase_price for valuation
                        row.total_stock_value = row.current_stock * row.purchase_price;
                        row.avg_cost_per_meter = row.purchase_price;
                    }
                }
            } else {
                row.warehouse_count = rollWhCount;
                // Fallback valuation for loose-only materials without inventory_stock
                if (row.total_stock_value === 0 && row.current_stock > 0 && row.purchase_price > 0) {
                    row.total_stock_value = row.current_stock * row.purchase_price;
                    row.avg_cost_per_meter = row.purchase_price;
                }
            }
        }

        // Store raw rolls + stock for warehouse re-aggregation
        setAllRolls(rolls || []);
        setAllStock(stockData || []);
        setMaterials(Array.from(materialMap.values()));
        setLoading(false);
    }, []);

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
            // Build inventory_stock index for this warehouse
            const stockInWh = new Map<string, number>();
            for (const sr of allStock) {
                if (sr.warehouse_id === selectedWhId) {
                    const qty = Number(sr.quantity_on_hand) || 0;
                    if (qty > 0) stockInWh.set(sr.material_id, qty);
                }
            }

            // Override material rows with warehouse-specific quantities
            result = result
                .map(m => {
                    const wh = whMap.get(m.material_id);
                    const rollTotal = wh?.total || 0;
                    const stockQty = stockInWh.get(m.material_id) || 0;
                    // Loose stock for this warehouse = inventory_stock qty - roll total
                    const looseHere = Math.max(0, stockQty - rollTotal);

                    // current_stock for this warehouse view
                    const effectiveStock = Math.max(stockQty, rollTotal);

                    return {
                        ...m,
                        total_rolls: wh?.rolls || 0,
                        total_meters: rollTotal,
                        available_meters: wh?.available || 0,
                        reserved_meters: wh?.reserved || 0,
                        total_stock_value: wh?.value || (looseHere > 0 ? looseHere * m.purchase_price : 0),
                        loose_stock: looseHere,
                        current_stock: effectiveStock,
                    };
                })
                .filter(m => m.total_rolls > 0 || m.loose_stock > 0); // only materials present in this warehouse
        }

        // Hide empty (unless showEmpty) — show materials that have rolls OR loose stock
        if (!filters.showEmpty) {
            result = result.filter(m => m.total_rolls > 0 || m.loose_stock > 0);
        }

        // Search: smart multi-language multi-term search
        if (filters.search) {
            result = result.filter(m => matchesSearch(
                filters.search,
                m.material_name_ar,
                m.material_name_en,
                m.material_name_ru,
                m.material_name_uk,
                m.material_name_tr,
                m.material_code,
                // Include color names
                ...m.color_ids.map(cid => {
                    const color = filterOptions.colors.find(c => c.id === cid);
                    return color ? `${color.name_ar} ${color.name_en}` : '';
                }),
            ));
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
    }, [materials, allRolls, allStock, filters, filterOptions.colors]);


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
        allRolls, // expose for local warehouse stock computation
        allStock, // ⚡ expose for sync loose stock computation without loading flash
        filterOptions,
        filters,
        setFilters,
        summary,
        loading,
        error,
        refetch: () => fetchData(true),
        hasActiveFilters,
        resetFilters,
        // Currency utilities
        activeCurrency,
        convertPrice,
        baseCurrency,
        supportedCurrencies,
    };
}
