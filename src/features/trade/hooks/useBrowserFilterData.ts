/**
 * 🔍 useBrowserFilterData — Fetch filter dropdown data for material browsers
 *
 * Provides:
 * - suppliers list (from suppliers table)
 * - colors list (from fabric_colors table)
 * - warehouses list (from useWarehouses hook)
 *
 * Used by both PurchaseMaterialBrowserTab and MaterialBrowserTab
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useWarehouses } from '@/features/warehouse/hooks/useWarehouseQueries';

/** Dropdown item for supplier */
export interface SupplierOption {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
}

/** Dropdown item for color */
export interface ColorOption {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    hex_color: string;
    color_family: string | null;
}

/** Dropdown item for warehouse */
export interface WarehouseOption {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
}

export function useBrowserFilterData() {
    const { companyId } = useCompany();

    // ─── Suppliers ───────────────────────────────────────────────
    const { data: rawSuppliers, isLoading: suppliersLoading } = useQuery({
        queryKey: ['browser_filter_suppliers', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, code, name_ar, name_en')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .order('name_ar');
            if (error) {
                console.warn('Suppliers fetch error:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 min
    });

    // ─── Colors ─────────────────────────────────────────────────
    const { data: rawColors, isLoading: colorsLoading } = useQuery({
        queryKey: ['browser_filter_colors', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('fabric_colors')
                .select('id, code, name_ar, name_en') // Removed potentially missing columns
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('name_ar');
            if (error) {
                console.warn('Colors fetch error:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
    });

    // ─── Warehouses ─────────────────────────────────────────────
    const { warehouses: rawWarehouses, loading: warehousesLoading } = useWarehouses();

    // ─── Map to clean types ─────────────────────────────────────
    const suppliers: SupplierOption[] = useMemo(() =>
        (rawSuppliers || []).map((s: any) => ({
            id: s.id,
            code: s.code || '',
            name_ar: s.name_ar || '',
            name_en: s.name_en || s.name_ar || '',
        })),
        [rawSuppliers]);

    const colors: ColorOption[] = useMemo(() =>
        (rawColors || []).map((c: any) => ({
            id: c.id,
            code: c.code || '',
            name_ar: c.name_ar || '',
            name_en: c.name_en || c.name_ar || '',
            hex_color: c.hex_color || '#CCCCCC',
            color_family: c.color_family || 'basic',
        })),
        [rawColors]);

    const warehouses: WarehouseOption[] = useMemo(() =>
        (rawWarehouses || []).map((w: any) => ({
            id: w.id,
            code: w.code || '',
            name_ar: w.name_ar || '',
            name_en: w.name_en || w.name_ar || '',
        })),
        [rawWarehouses]);

    return {
        suppliers,
        colors,
        warehouses,
        isLoading: suppliersLoading || colorsLoading || warehousesLoading,
    };
}
