/**
 * 📊 useMaterialPriceHistory — Hook for fetching material price history
 * جلب آخر أسعار الشراء والبيع لمادة معينة
 *
 * Features:
 *   ✅ Last 5 sale prices (for a specific customer or all)
 *   ✅ Last 3 purchase prices (RBAC: manager only)
 *   ✅ Average price calculation
 *   ✅ Price trend detection (up/down/stable)
 *   ✅ Lazy loading — fetches on demand
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

// ─── Types ─────────────────────────────────────────────────────────

export interface PriceHistoryRecord {
    date: string;
    unit_price: number;
    quantity: number;
    doc_type: 'sale_invoice' | 'purchase_invoice' | 'quotation' | 'sale_order';
    doc_number: string;
    currency: string;
    customer_or_supplier_name?: string;
}

export interface MaterialPriceHistoryResult {
    /** Last sale prices (up to 5) */
    salePrices: PriceHistoryRecord[];
    /** Last purchase prices (up to 3) */
    purchasePrices: PriceHistoryRecord[];
    /** Average sale price */
    avgSalePrice: number | null;
    /** Average purchase price */
    avgPurchasePrice: number | null;
    /** Last sale price */
    lastSalePrice: number | null;
    /** Last purchase price */
    lastPurchasePrice: number | null;
    /** Price trend: 'up' | 'down' | 'stable' | null */
    saleTrend: 'up' | 'down' | 'stable' | null;
    purchaseTrend: 'up' | 'down' | 'stable' | null;
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useMaterialPriceHistory() {
    const { companyId } = useCompany();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<MaterialPriceHistoryResult | null>(null);

    /**
     * Fetch price history for a material
     * @param materialId The material UUID
     * @param customerId Optional: filter by customer
     * @param includePurchase Whether to include purchase prices (RBAC check)
     */
    const fetchPriceHistory = useCallback(async (
        materialId: string,
        customerId?: string,
        includePurchase: boolean = false,
    ): Promise<MaterialPriceHistoryResult> => {
        if (!companyId || !materialId) {
            return emptyResult();
        }

        setLoading(true);
        setError(null);

        try {
            const salePrices: PriceHistoryRecord[] = [];
            const purchasePrices: PriceHistoryRecord[] = [];

            // ─── 1. Sales invoices ───
            await fetchFromSalesInvoices(companyId, materialId, customerId, salePrices);

            // ─── 2. Sales orders ───
            await fetchFromSalesOrders(companyId, materialId, customerId, salePrices);

            // ─── 3. Quotations ───
            await fetchFromQuotations(companyId, materialId, customerId, salePrices);

            // ─── 4. Purchase invoices (if RBAC allows) ───
            if (includePurchase) {
                await fetchFromPurchaseInvoices(companyId, materialId, purchasePrices);
            }

            // Sort by date descending
            salePrices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            purchasePrices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Take top N
            const topSales = salePrices.slice(0, 5);
            const topPurchases = purchasePrices.slice(0, 3);

            // Calculate stats
            const avgSalePrice = topSales.length > 0
                ? topSales.reduce((sum, p) => sum + p.unit_price, 0) / topSales.length
                : null;
            const avgPurchasePrice = topPurchases.length > 0
                ? topPurchases.reduce((sum, p) => sum + p.unit_price, 0) / topPurchases.length
                : null;

            const lastSalePrice = topSales.length > 0 ? topSales[0].unit_price : null;
            const lastPurchasePrice = topPurchases.length > 0 ? topPurchases[0].unit_price : null;

            // Trends
            const saleTrend = calculateTrend(topSales);
            const purchaseTrend = calculateTrend(topPurchases);

            const result: MaterialPriceHistoryResult = {
                salePrices: topSales,
                purchasePrices: topPurchases,
                avgSalePrice,
                avgPurchasePrice,
                lastSalePrice,
                lastPurchasePrice,
                saleTrend,
                purchaseTrend,
            };

            setData(result);
            return result;
        } catch (err: any) {
            const msg = err?.message || 'Unknown error';
            setError(msg);
            console.error('Price history fetch error:', err);
            return emptyResult();
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return {
        fetchPriceHistory,
        reset,
        data,
        loading,
        error,
    };
}

// ═════════════════════════════════════════════════════════════════
// Internal Helpers
// ═════════════════════════════════════════════════════════════════

function emptyResult(): MaterialPriceHistoryResult {
    return {
        salePrices: [],
        purchasePrices: [],
        avgSalePrice: null,
        avgPurchasePrice: null,
        lastSalePrice: null,
        lastPurchasePrice: null,
        saleTrend: null,
        purchaseTrend: null,
    };
}

function calculateTrend(prices: PriceHistoryRecord[]): 'up' | 'down' | 'stable' | null {
    if (prices.length < 2) return null;
    const newest = prices[0].unit_price;
    const oldest = prices[prices.length - 1].unit_price;
    const diff = ((newest - oldest) / oldest) * 100;
    if (Math.abs(diff) < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
}

/** Extract line items from doc.notes JSON (trade document pattern) */
function extractLineItems(doc: any): any[] {
    try {
        const notes = typeof doc.notes === 'string' ? JSON.parse(doc.notes) : doc.notes;
        if (notes?._source && Array.isArray(notes.items)) {
            return notes.items;
        }
    } catch { /* ignore parse errors */ }
    return [];
}

async function fetchFromSalesInvoices(
    companyId: string,
    materialId: string,
    customerId: string | undefined,
    results: PriceHistoryRecord[],
) {
    let query = supabase
        .from('sales_transactions')
        .select('doc_date, invoice_no, currency, notes, customers!inner(name_ar)')
        .eq('company_id', companyId)
        .order('doc_date', { ascending: false })
        .limit(30);

    if (customerId) {
        query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error || !data) return;

    for (const doc of data as any[]) {
        const items = extractLineItems(doc);
        const match = items.find((i: any) => i.material_id === materialId);
        if (match) {
            results.push({
                date: doc.doc_date,
                unit_price: Number(match.unit_price || 0),
                quantity: Number(match.quantity || 0),
                doc_type: 'sale_invoice',
                doc_number: doc.invoice_no || '-',
                currency: doc.currency || 'UAH',
                customer_or_supplier_name: doc.customers?.name_ar,
            });
        }
    }
}

async function fetchFromSalesOrders(
    companyId: string,
    materialId: string,
    customerId: string | undefined,
    results: PriceHistoryRecord[],
) {
    let query = supabase
        .from('sales_orders')
        .select('order_date, order_number, currency, notes')
        .eq('company_id', companyId)
        .order('order_date', { ascending: false })
        .limit(20);

    if (customerId) {
        query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error || !data) return;

    for (const doc of data as any[]) {
        const items = extractLineItems(doc);
        const match = items.find((i: any) => i.material_id === materialId);
        if (match) {
            results.push({
                date: doc.order_date,
                unit_price: Number(match.unit_price || 0),
                quantity: Number(match.quantity || 0),
                doc_type: 'sale_order',
                doc_number: doc.order_number || '-',
                currency: doc.currency || 'UAH',
            });
        }
    }
}

async function fetchFromQuotations(
    companyId: string,
    materialId: string,
    customerId: string | undefined,
    results: PriceHistoryRecord[],
) {
    let query = supabase
        .from('quotations')
        .select('quotation_date, quotation_number, currency, notes')
        .eq('company_id', companyId)
        .order('quotation_date', { ascending: false })
        .limit(20);

    if (customerId) {
        query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error || !data) return;

    for (const doc of data as any[]) {
        const items = extractLineItems(doc);
        const match = items.find((i: any) => i.material_id === materialId);
        if (match) {
            results.push({
                date: doc.quotation_date,
                unit_price: Number(match.unit_price || 0),
                quantity: Number(match.quantity || 0),
                doc_type: 'quotation',
                doc_number: doc.quotation_number || '-',
                currency: doc.currency || 'UAH',
            });
        }
    }
}

async function fetchFromPurchaseInvoices(
    companyId: string,
    materialId: string,
    results: PriceHistoryRecord[],
) {
    const { data, error } = await supabase
        .from('purchase_transactions')
        .select('doc_date, invoice_no, currency, notes, suppliers!inner(name_ar)')
        .eq('company_id', companyId)
        .order('doc_date', { ascending: false })
        .limit(20);

    if (error || !data) return;

    for (const doc of data as any[]) {
        const items = extractLineItems(doc);
        const match = items.find((i: any) => i.material_id === materialId);
        if (match) {
            results.push({
                date: doc.doc_date,
                unit_price: Number(match.unit_price || 0),
                quantity: Number(match.quantity || 0),
                doc_type: 'purchase_invoice',
                doc_number: doc.invoice_no || '-',
                currency: doc.currency || 'UAH',
                customer_or_supplier_name: doc.suppliers?.name_ar,
            });
        }
    }
}

export default useMaterialPriceHistory;
