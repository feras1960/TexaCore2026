/**
 * ════════════════════════════════════════════════════════════════
 * 📋 useReceiptSources — جلب المصادر المتاحة لإذن الاستلام
 * ════════════════════════════════════════════════════════════════
 *
 * يجلب من قاعدة البيانات الفعلية:
 * ┌──────────────────────┬──────────────────────┬────────────────────────────┐
 * │ النوع                │ الجدول               │ جدول البنود                │
 * ├──────────────────────┼──────────────────────┼────────────────────────────┤
 * │ فاتورة شراء (جديد)   │ purchase_invoices     │ purchase_invoice_items      │
 * │ فاتورة شراء (أرشيف)  │ purchase_transactions │ purchase_transaction_items  │
 * │ أمر شراء             │ purchase_orders       │ purchase_order_items       │
 * │ كونتينر              │ containers            │ container_items            │
 * │ مرتجع                │ purchase_returns      │ purchase_return_items      │
 * │ مناقلة               │ (لم يُبنَ بعد)       │ —                          │
 * └──────────────────────┴──────────────────────┴────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';

// ─── Types ───────────────────────────────────────────────────

export type SourceDocType = 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction' | 'container' | 'purchase_return' | 'sales_transaction';

export interface SourceDocumentItem {
    id: string;
    material_id?: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    total: number;
    unit?: string;
    notes?: string;
    /** How many already received (future: from purchase_receipts) */
    received_quantity?: number;
    // ─── Dynamic variant fields (from source document) ───
    /** Color UUID reference */
    color_id?: string;
    /** Color display name */
    color_name?: string;
    // design_id?: string;   // مستقبلي: معرف الرسمة
    // design_name?: string; // مستقبلي: اسم الرسمة
}

export interface SourceDocument {
    id: string;
    /** Display number (PO-XXXX, PI-XXXX, CONT-XXXX) */
    document_number: string;
    /** Document type */
    type: SourceDocType;
    /** Human label for dropdown */
    label: string;
    /** Supplier name (resolved) */
    supplier_name: string;
    supplier_id: string;
    /** Document date */
    date: string;
    /** Total amount */
    total_amount: number;
    /** Currency */
    currency: string;
    /** Current status */
    status: string;
    /** Confirmation status */
    confirmation_status: string;
    /** Receipt mode (direct/international) */
    receipt_mode: string;
    /** Warehouse */
    warehouse_id?: string;
    /** Items/Lines */
    items: SourceDocumentItem[];
    /** Original table name */
    original_table: string;
}

// ─── Receipt type → SourceDocType mapping ────────────────────
export type ReceiptTypeKey = 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count' | 'sales_delivery';

const RECEIPT_TYPE_TO_SOURCE: Record<ReceiptTypeKey, SourceDocType[]> = {
    purchase_local: ['purchase_order', 'purchase_invoice', 'purchase_invoice_local', 'purchase_transaction'],
    container: ['container'],
    transfer: [], // not built yet
    return: ['purchase_return'],
    stock_count: [], // will connect to stock_counts table later
    sales_delivery: ['sales_transaction'],
};

// ─── Hook ────────────────────────────────────────────────────

export function useReceiptSources() {
    const { companyId } = useAuth();
    const { language } = useLanguage();

    // ─── 1. Suppliers map ────────────────────────────────────
    const { data: suppliersMap = {} } = useQuery({
        queryKey: ['receipt_suppliers_map', companyId, language],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);
            if (error) return {};
            return (data || []).reduce((acc: Record<string, string>, s: any) => {
                acc[s.id] = language === 'ar' ? (s.name_ar || s.name_en || '') : (s.name_en || s.name_ar || '');
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    // ─── 2. Purchase Orders (confirmed, not received) ────────
    const { data: rawOrders = [], isLoading: loadingOrders } = useQuery({
        queryKey: ['receipt_src_orders', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('company_id', companyId)
                .eq('confirmation_status', 'confirmed')
                .not('status', 'eq', 'received')
                .order('order_date', { ascending: false });
            if (error) { console.warn('[useReceiptSources] orders:', error.message); return []; }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── 3. Purchase Invoices (NEW: purchase_invoices + LEGACY: purchase_transactions fallback) ──────
    const { data: rawInvoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ['receipt_src_invoices', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const combined: any[] = [];
            const seenIds = new Set<string>();

            // 3a. NEW: purchase_invoices
            const { data: newData, error: newErr } = await supabase
                .from('purchase_invoices')
                .select('*')
                .eq('company_id', companyId)
                .neq('status', 'cancelled')
                .in('document_stage', ['invoice', 'posted', 'confirmed'])
                .not('receipt_status', 'eq', 'received')
                .order('invoice_date', { ascending: false });
            if (newErr) { console.warn('[useReceiptSources] purchase_invoices:', newErr.message); }
            (newData || []).forEach((d: any) => {
                seenIds.add(d.id);
                combined.push({ ...d, _source: 'purchase_invoices' });
            });

            // 3b. LEGACY: purchase_transactions (fallback for archived data)
            const { data: legacyData, error: legacyErr } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .in('stage', ['invoice', 'posted', 'partial_paid', 'partially_received'])
                .order('doc_date', { ascending: false });
            if (legacyErr) { console.warn('[useReceiptSources] purchase_transactions:', legacyErr.message); }
            (legacyData || []).forEach((d: any) => {
                if (!seenIds.has(d.id)) {
                    seenIds.add(d.id);
                    combined.push({ ...d, _source: 'purchase_transactions' });
                }
            });

            return combined;
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── 4. Containers (not received) ────────────────────────
    const { data: rawContainers = [], isLoading: loadingContainers } = useQuery({
        queryKey: ['receipt_src_containers', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('containers')
                .select('*')
                .eq('company_id', companyId)
                .not('status', 'eq', 'received')
                .order('created_at', { ascending: false });
            if (error) { console.warn('[useReceiptSources] containers:', error.message); return []; }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── 5. Purchase Returns (pending) ───────────────────────
    const { data: rawReturns = [], isLoading: loadingReturns } = useQuery({
        queryKey: ['receipt_src_returns', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('purchase_returns')
                .select('*')
                .eq('company_id', companyId)
                .not('status', 'eq', 'received')
                .order('return_date', { ascending: false });
            if (error) { console.warn('[useReceiptSources] returns:', error.message); return []; }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── 6. Fetch Items for Purchase Orders ──────────────────
    const orderIds = rawOrders.map((o: any) => o.id);
    const { data: orderItems = [], isLoading: loadingOI } = useQuery({
        queryKey: ['receipt_order_items', orderIds],
        queryFn: async () => {
            if (orderIds.length === 0) return [];
            const { data, error } = await supabase
                .from('purchase_order_items')
                .select('*')
                .in('order_id', orderIds);
            if (error) return [];
            return data || [];
        },
        enabled: orderIds.length > 0,
        staleTime: 30_000,
    });

    // ─── 7. Fetch Items for Purchase Invoices (dual-source) ────────────────
    const newInvoiceIds = rawInvoices.filter((i: any) => i._source === 'purchase_invoices').map((i: any) => i.id);
    const legacyInvoiceIds = rawInvoices.filter((i: any) => i._source === 'purchase_transactions').map((i: any) => i.id);
    const allInvoiceIds = rawInvoices.map((i: any) => i.id);
    const { data: invoiceItems = [], isLoading: loadingII } = useQuery({
        queryKey: ['receipt_invoice_items', allInvoiceIds],
        queryFn: async () => {
            if (allInvoiceIds.length === 0) return [];
            const combined: any[] = [];

            // 7a. NEW: purchase_invoice_items (FK: invoice_id)
            if (newInvoiceIds.length > 0) {
                const { data, error } = await supabase
                    .from('purchase_invoice_items')
                    .select('*')
                    .in('invoice_id', newInvoiceIds);
                if (!error && data) {
                    // Normalize FK field to 'transaction_id' for unified mapping
                    data.forEach((item: any) => combined.push({ ...item, transaction_id: item.invoice_id }));
                }
            }

            // 7b. LEGACY: purchase_transaction_items (FK: transaction_id)
            if (legacyInvoiceIds.length > 0) {
                const { data, error } = await supabase
                    .from('purchase_transaction_items')
                    .select('*')
                    .in('transaction_id', legacyInvoiceIds);
                if (!error && data) {
                    combined.push(...data);
                }
            }

            return combined;
        },
        enabled: allInvoiceIds.length > 0,
        staleTime: 30_000,
    });

    // ─── 8. Fetch Items for Containers ───────────────────────
    const containerIds = rawContainers.map((c: any) => c.id);
    const { data: containerItems = [], isLoading: loadingCI } = useQuery({
        queryKey: ['receipt_container_items', containerIds],
        queryFn: async () => {
            if (containerIds.length === 0) return [];
            // container_items may or may not exist yet—gracefully handle
            const { data, error } = await supabase
                .from('container_items')
                .select('*')
                .in('container_id', containerIds);
            if (error) {
                // Table might not exist; return empty
                console.warn('[useReceiptSources] container_items:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: containerIds.length > 0,
        staleTime: 30_000,
    });

    // ─── 9. Fetch Items for Purchase Returns ─────────────────
    const returnIds = rawReturns.map((r: any) => r.id);
    const { data: returnItems = [], isLoading: loadingRI } = useQuery({
        queryKey: ['receipt_return_items', returnIds],
        queryFn: async () => {
            if (returnIds.length === 0) return [];
            const { data, error } = await supabase
                .from('purchase_return_items')
                .select('*')
                .in('return_id', returnIds);
            if (error) {
                console.warn('[useReceiptSources] return_items:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: returnIds.length > 0,
        staleTime: 30_000,
    });

    // ─── 10. Sales Transactions (confirmed, for delivery) ────
    const { data: rawSalesInvoices = [], isLoading: loadingSales } = useQuery({
        queryKey: ['receipt_src_sales', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('sales_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .eq('stage', 'confirmed')
                .order('updated_at', { ascending: false });
            if (error) { console.warn('[useReceiptSources] sales_transactions:', error.message); return []; }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── 11. Fetch Items for Sales Transactions ──────────────
    const salesInvoiceIds = rawSalesInvoices.map((s: any) => s.id);
    const { data: salesItems = [], isLoading: loadingSI } = useQuery({
        queryKey: ['receipt_sales_items', salesInvoiceIds],
        queryFn: async () => {
            if (salesInvoiceIds.length === 0) return [];
            const { data, error } = await supabase
                .from('sales_transaction_items')
                .select('*')
                .in('transaction_id', salesInvoiceIds);
            if (error) {
                console.warn('[useReceiptSources] sales_transaction_items:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: salesInvoiceIds.length > 0,
        staleTime: 30_000,
    });

    // ─── 12. Customers map (for sales) ───────────────────────
    const { data: customersMap = {} } = useQuery({
        queryKey: ['receipt_customers_map', companyId, language],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('customers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);
            if (error) return {};
            return (data || []).reduce((acc: Record<string, string>, c: any) => {
                acc[c.id] = language === 'ar' ? (c.name_ar || c.name_en || '') : (c.name_en || c.name_ar || '');
                return acc;
            }, {});
        },
        enabled: !!companyId && rawSalesInvoices.length > 0,
        staleTime: 60000,
    });

    // ════════════════════════════════════════════════════════════
    // Build unified SourceDocument[] 
    // ════════════════════════════════════════════════════════════

    const mapItems = (raw: any[], fkField: string, parentId: string): SourceDocumentItem[] =>
        raw.filter((i: any) => i[fkField] === parentId).map((i: any) => ({
            id: i.id,
            material_id: i.material_id,
            product_id: i.product_id,
            description: i.description || i.item_description || '',
            quantity: i.quantity || i.expected_quantity || 0,
            unit_price: i.unit_price || i.unit_cost || 0,
            subtotal: i.subtotal || i.total_cost || 0,
            total: i.total || i.subtotal || i.total_cost || 0,
            unit: i.unit || i.uom || 'meter',
            notes: i.notes,
            received_quantity: 0,
            // ─── Dynamic variant fields ───
            color_id: i.color_id || null,
            color_name: i.color_name || null,
        }));

    // ─── Purchase Orders ─────────────────────────────────────
    const purchaseOrderDocs: SourceDocument[] = rawOrders.map((po: any) => {
        const supplierName = suppliersMap[po.supplier_id] || '';
        return {
            id: po.id,
            document_number: po.order_number || po.id?.substring(0, 8),
            type: 'purchase_order' as const,
            label: `${po.order_number || po.id?.substring(0, 8)}${supplierName ? ` - ${supplierName}` : ''}`,
            supplier_name: supplierName,
            supplier_id: po.supplier_id || '',
            date: po.order_date,
            total_amount: po.total_amount || 0,
            currency: po.currency || '',
            status: po.status || 'draft',
            confirmation_status: po.confirmation_status || '',
            receipt_mode: po.receipt_mode || 'direct',
            warehouse_id: po.warehouse_id,
            items: mapItems(orderItems, 'order_id', po.id),
            original_table: 'purchase_orders',
        };
    });

    // ─── Purchase Invoices (handles both new & legacy sources) ───────────────────────────────────
    const purchaseInvoiceDocs: SourceDocument[] = rawInvoices.map((pi: any) => {
        const supplierName = suppliersMap[pi.supplier_id] || pi.supplier_name || '';
        const isNewSource = pi._source === 'purchase_invoices';
        const isLocal = pi.receipt_mode === 'direct';
        // Normalize field names
        const docNumber = isNewSource
            ? (pi.invoice_number || pi.id?.substring(0, 8))
            : (pi.invoice_no || pi.invoice_number || pi.id?.substring(0, 8));
        const docDate = isNewSource
            ? pi.invoice_date
            : (pi.doc_date || pi.invoice_date);
        const docStage = isNewSource
            ? (pi.document_stage || pi.status || 'draft')
            : (pi.stage || pi.status || 'draft');
        return {
            id: pi.id,
            document_number: docNumber,
            type: isLocal ? 'purchase_invoice_local' as const : 'purchase_transaction' as const,
            label: `${docNumber}${supplierName ? ` - ${supplierName}` : ''}`,
            supplier_name: supplierName,
            supplier_id: pi.supplier_id || '',
            date: docDate,
            total_amount: pi.total_amount || 0,
            currency: pi.currency || '',
            status: docStage,
            confirmation_status: pi.confirmation_status || '',
            receipt_mode: pi.receipt_mode || 'direct',
            warehouse_id: pi.warehouse_id,
            items: mapItems(invoiceItems, 'transaction_id', pi.id),
            original_table: isNewSource ? 'purchase_invoices' : 'purchase_transactions',
        };
    });

    // ─── Containers ──────────────────────────────────────────
    const containerDocs: SourceDocument[] = rawContainers.map((c: any) => ({
        id: c.id,
        document_number: c.container_number || c.shipment_number || c.id?.substring(0, 8),
        type: 'container' as const,
        label: `${c.container_number || c.shipment_number || c.id?.substring(0, 8)}${c.container_name ? ` - ${c.container_name}` : ''}`,
        supplier_name: c.shipping_company || c.supplier_name || '',
        supplier_id: c.supplier_id || '',
        date: c.eta || c.created_at,
        total_amount: c.total_cost || 0,
        currency: c.currency || '',
        status: c.status || 'ordered',
        confirmation_status: 'confirmed',
        receipt_mode: 'international',
        warehouse_id: c.warehouse_id,
        items: mapItems(containerItems, 'container_id', c.id),
        original_table: 'containers',
    }));

    // ─── Purchase Returns ────────────────────────────────────
    const returnDocs: SourceDocument[] = rawReturns.map((r: any) => {
        const supplierName = suppliersMap[r.supplier_id] || '';
        return {
            id: r.id,
            document_number: r.return_number || r.id?.substring(0, 8),
            type: 'purchase_return' as const,
            label: `${r.return_number || r.id?.substring(0, 8)}${supplierName ? ` - ${supplierName}` : ''}`,
            supplier_name: supplierName,
            supplier_id: r.supplier_id || '',
            date: r.return_date,
            total_amount: r.total_amount || 0,
            currency: r.currency || '',
            status: r.status || 'draft',
            confirmation_status: r.confirmation_status || '',
            receipt_mode: 'direct',
            warehouse_id: r.warehouse_id,
            items: mapItems(returnItems, 'return_id', r.id),
            original_table: 'purchase_returns',
        };
    });

    // ─── Sales Delivery Documents ─────────────────────────────
    const salesDeliveryDocs: SourceDocument[] = rawSalesInvoices.map((si: any) => {
        const customerName = si.customer_name || customersMap[si.customer_id] || '';
        const docNumber = si.invoice_no || si.draft_no || si.id?.substring(0, 8);
        return {
            id: si.id,
            document_number: docNumber,
            type: 'sales_transaction' as const,
            label: `${docNumber}${customerName ? ` - ${customerName}` : ''}`,
            supplier_name: customerName, // Reuse field for customer display
            supplier_id: si.customer_id || '',
            date: si.doc_date,
            total_amount: si.total_amount || 0,
            currency: si.currency || '',
            status: si.stage || 'confirmed',
            confirmation_status: 'confirmed',
            receipt_mode: 'direct',
            warehouse_id: si.warehouse_id,
            items: mapItems(salesItems, 'transaction_id', si.id),
            original_table: 'sales_transactions',
        };
    });

    // ─── All sources combined ────────────────────────────────
    const allDocuments: SourceDocument[] = [
        ...purchaseOrderDocs,
        ...purchaseInvoiceDocs,
        ...containerDocs,
        ...returnDocs,
        ...salesDeliveryDocs,
    ];

    // ════════════════════════════════════════════════════════════
    // Public API
    // ════════════════════════════════════════════════════════════

    /**
     * Get source documents filtered by receipt type
     */
    function getDocumentsForReceiptType(receiptType: ReceiptTypeKey): SourceDocument[] {
        const sourceTypes = RECEIPT_TYPE_TO_SOURCE[receiptType] || [];
        if (sourceTypes.length === 0) return [];
        return allDocuments.filter(d => sourceTypes.includes(d.type));
    }

    /**
     * Get a specific document by ID
     */
    function getDocumentById(id: string): SourceDocument | undefined {
        return allDocuments.find(d => d.id === id);
    }

    const isLoading = loadingOrders || loadingInvoices || loadingContainers || loadingReturns
        || loadingOI || loadingII || loadingCI || loadingRI || loadingSales || loadingSI;

    return {
        /** All source documents */
        allDocuments,
        /** Purchase orders only */
        purchaseOrderDocs,
        /** Purchase invoices (international + local) */
        purchaseInvoiceDocs,
        /** Containers only */
        containerDocs,
        /** Purchase returns only */
        returnDocs,
        /** Get filtered docs for a receipt type */
        getDocumentsForReceiptType,
        /** Get single document by ID */
        getDocumentById,
        /** Loading state */
        isLoading,
        /** Suppliers map */
        suppliersMap,
        /** Sales delivery docs */
        salesDeliveryDocs,
        /** Customers map */
        customersMap,
    };
}
