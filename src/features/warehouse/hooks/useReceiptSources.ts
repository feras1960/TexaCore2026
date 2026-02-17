/**
 * ════════════════════════════════════════════════════════════════
 * 📋 useReceiptSources — جلب المصادر المتاحة لإذن الاستلام
 * ════════════════════════════════════════════════════════════════
 *
 * يجلب من قاعدة البيانات الفعلية:
 * ┌──────────────────────┬──────────────────────┬──────────────────────┐
 * │ النوع                │ الجدول               │ جدول البنود          │
 * ├──────────────────────┼──────────────────────┼──────────────────────┤
 * │ فاتورة شراء          │ purchase_transactions │ purchase_transaction_items│
 * │ فاتورة شراء داخلي    │ purchase_transactions │ purchase_transaction_items│
 * │ أمر شراء             │ purchase_orders       │ purchase_order_items │
 * │ كونتينر              │ containers            │ container_items      │
 * │ مرتجع                │ purchase_returns      │ purchase_return_items│
 * │ مناقلة               │ (لم يُبنَ بعد)       │ —                    │
 * └──────────────────────┴──────────────────────┴──────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';

// ─── Types ───────────────────────────────────────────────────

export type SourceDocType = 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction' | 'container' | 'purchase_return';

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
export type ReceiptTypeKey = 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count';

const RECEIPT_TYPE_TO_SOURCE: Record<ReceiptTypeKey, SourceDocType[]> = {
    purchase_local: ['purchase_order', 'purchase_invoice', 'purchase_invoice_local', 'purchase_transaction'],
    container: ['container'],
    transfer: [], // not built yet
    return: ['purchase_return'],
    stock_count: [], // will connect to stock_counts table later
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
    });

    // ─── 3. Purchase Invoices (from purchase_transactions — at invoice/posted stage, ready for receipt) ──────
    const { data: rawInvoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ['receipt_src_invoices', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                // Invoice/Posted stage transactions are ready for goods receipt
                .in('stage', ['invoice', 'posted', 'partial_paid', 'partially_received'])
                .order('doc_date', { ascending: false });
            if (error) { console.warn('[useReceiptSources] invoices:', error.message); return []; }
            return data || [];
        },
        enabled: !!companyId,
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
    });

    // ─── 7. Fetch Items for Purchase Invoices ────────────────
    const invoiceIds = rawInvoices.map((i: any) => i.id);
    const { data: invoiceItems = [], isLoading: loadingII } = useQuery({
        queryKey: ['receipt_invoice_items', invoiceIds],
        queryFn: async () => {
            if (invoiceIds.length === 0) return [];
            const { data, error } = await supabase
                .from('purchase_transaction_items')
                .select('*')
                .in('transaction_id', invoiceIds);
            if (error) return [];
            return data || [];
        },
        enabled: invoiceIds.length > 0,
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
    });

    // ════════════════════════════════════════════════════════════
    // Build unified SourceDocument[] 
    // ════════════════════════════════════════════════════════════

    const mapItems = (raw: any[], fkField: string, parentId: string): SourceDocumentItem[] =>
        raw.filter((i: any) => i[fkField] === parentId).map((i: any) => ({
            id: i.id,
            material_id: i.material_id,
            product_id: i.product_id,
            description: i.description || '',
            quantity: i.quantity || 0,
            unit_price: i.unit_price || 0,
            subtotal: i.subtotal || 0,
            total: i.total || i.subtotal || 0,
            unit: i.unit,
            notes: i.notes,
            received_quantity: 0,
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

    // ─── Purchase Invoices ───────────────────────────────────
    const purchaseInvoiceDocs: SourceDocument[] = rawInvoices.map((pi: any) => {
        const supplierName = suppliersMap[pi.supplier_id] || '';
        const isLocal = pi.receipt_mode === 'direct';
        return {
            id: pi.id,
            document_number: pi.invoice_no || pi.invoice_number || pi.id?.substring(0, 8),
            type: isLocal ? 'purchase_invoice_local' as const : 'purchase_transaction' as const,
            label: `${pi.invoice_no || pi.invoice_number || pi.id?.substring(0, 8)}${supplierName ? ` - ${supplierName}` : ''}`,
            supplier_name: supplierName,
            supplier_id: pi.supplier_id || '',
            date: pi.doc_date || pi.invoice_date,
            total_amount: pi.total_amount || 0,
            currency: pi.currency || '',
            status: pi.stage || pi.status || 'draft',
            confirmation_status: pi.confirmation_status || '',
            receipt_mode: pi.receipt_mode || 'direct',
            warehouse_id: pi.warehouse_id,
            items: mapItems(invoiceItems, 'transaction_id', pi.id),
            original_table: 'purchase_transactions',
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

    // ─── All sources combined ────────────────────────────────
    const allDocuments: SourceDocument[] = [
        ...purchaseOrderDocs,
        ...purchaseInvoiceDocs,
        ...containerDocs,
        ...returnDocs,
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
        || loadingOI || loadingII || loadingCI || loadingRI;

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
    };
}
