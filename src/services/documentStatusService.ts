/**
 * ════════════════════════════════════════════════════════════════
 * 🎛️  Document Status Service — مركز التحكم بالحالات
 * ════════════════════════════════════════════════════════════════
 *
 * Single source of truth for ALL document lifecycle transitions:
 *
 *   PURCHASE FLOW:
 *     purchase_invoices.receipt_status:
 *       pending → in_progress → partial → received
 *
 *     purchase_orders.status / purchase_transactions.stage:
 *       confirmed → in_progress → partially_received → received
 *
 *     containers.status:
 *       cleared → in_receiving → received
 *
 *   SALES FLOW:
 *     sales_invoices.delivery_status:
 *       pending → in_progress → partial → delivered
 *
 *     sales_orders.status:
 *       confirmed → in_progress → partially_delivered → delivered
 *
 *     sales_deliveries.status:
 *       draft → in_progress → completed
 *
 *   CANCELLATION / REVERSAL:
 *     onReceiptCancelled  → restores purchase docs to 'pending'
 *     onDeliveryCancelled → restores sales docs to 'pending'
 *
 * Usage:
 *   import { documentStatusService as DSS } from '@/services/documentStatusService';
 *
 *   await DSS.onReceiptStarted({ documentType: 'purchase_invoice', documentId, companyId });
 *   await DSS.onReceiptCompleted({ ... });
 *   await DSS.onReceiptCancelled({ documentType: 'container', documentId, companyId, receiptId });
 *   await DSS.onDeliveryStarted({ ... });
 *   await DSS.onDeliveryCompleted({ ... });
 *   await DSS.onDeliveryCancelled({ documentType: 'sales_invoice', documentId, companyId, deliveryId });
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PurchaseDocumentType =
    | 'purchase_invoice'
    | 'purchase_invoice_local'
    | 'purchase_transaction'
    | 'purchase_order'
    | 'container';

export type SalesDocumentType =
    | 'sales_invoice'
    | 'sales_order'
    | 'sales_delivery';

export type DocumentType = PurchaseDocumentType | SalesDocumentType;

interface BaseParams {
    documentType: DocumentType;
    documentId: string;
    companyId: string;
}

interface ReceiptStartedParams extends BaseParams {
    receiptId?: string;
}

interface ReceiptCompletedParams extends BaseParams {
    receiptId: string;
    receiptNumber: string;
    isFullyReceived: boolean;
    isPartial: boolean;
    totalQty: number;
    warehouseId?: string;
    /** IDs of linked invoices (for container cross-update) */
    linkedInvoiceIds?: string[];
}

interface DeliveryStartedParams extends BaseParams {
    deliveryId?: string;
}

interface DeliveryCompletedParams extends BaseParams {
    deliveryId: string;
    deliveryNumber: string;
    isFullyDelivered: boolean;
    isPartial: boolean;
    totalQty: number;
}

interface ReceiptCancelledParams extends BaseParams {
    receiptId: string;
    /** If true, a partial GRN was previously completed — restore to 'partial', else 'pending' */
    hadPreviousReceipts?: boolean;
}

interface DeliveryCancelledParams extends BaseParams {
    deliveryId: string;
    /** If true, other deliveries still active — restore to 'partial', else 'pending' */
    hadPreviousDeliveries?: boolean;
}

interface StatusUpdateResult {
    success: boolean;
    updatedTables: string[];
    error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map DocumentType to the physical Supabase table name
 */
function getTable(docType: DocumentType): string {
    switch (docType) {
        case 'purchase_invoice':
        case 'purchase_invoice_local': return 'purchase_invoices';
        case 'purchase_transaction': return 'purchase_transactions';
        case 'purchase_order': return 'purchase_orders';
        case 'container': return 'containers';
        case 'sales_invoice': return 'sales_invoices';
        case 'sales_order': return 'sales_orders';
        case 'sales_delivery': return 'sales_deliveries';
        default: return 'purchase_invoices';
    }
}

/** Log status change for audit trail (best-effort, never throws) */
async function logStatusChange(params: {
    table: string;
    documentId: string;
    fromStatus: string;
    toStatus: string;
    context: string;
}): Promise<void> {
    try {
        console.log(
            `📋 [DSS] ${params.table} ${params.documentId.slice(0, 8)}... ` +
            `${params.fromStatus} → ${params.toStatus} [${params.context}]`
        );
    } catch { /* silent */ }
}

// ─── Purchase Flow ────────────────────────────────────────────────────────────

/**
 * Called when a warehouse user STARTS receiving goods for a document.
 * Marks the document as "in progress" so all users see it immediately.
 */
async function onReceiptStarted(params: ReceiptStartedParams): Promise<StatusUpdateResult> {
    const { documentType, documentId, companyId, receiptId } = params;
    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    try {
        // ── Update primary document ──
        if (table === 'purchase_invoices') {
            const { error } = await supabase.from('purchase_invoices')
                .update({ receipt_status: 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_invoices');

        } else if (table === 'purchase_transactions') {
            const { error } = await supabase.from('purchase_transactions')
                .update({ stage: 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_transactions');

        } else if (table === 'purchase_orders') {
            const { error } = await supabase.from('purchase_orders')
                .update({ status: 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_orders');

        } else if (table === 'containers') {
            // Containers go to 'in_receiving' when first touched
            const { error } = await supabase.from('containers')
                .update({ status: 'in_receiving', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('containers');

            // Also update all linked invoices via container_items
            const { data: links } = await supabase
                .from('container_items')
                .select('purchase_invoice_id')
                .eq('container_id', documentId)
                .not('purchase_invoice_id', 'is', null);
            const invIds = [...new Set((links || []).map((l: any) => l.purchase_invoice_id).filter(Boolean))];
            if (invIds.length > 0) {
                await supabase.from('purchase_invoices')
                    .update({ receipt_status: 'in_progress', updated_at: now })
                    .in('id', invIds);
                updated.push('purchase_invoices (container-linked)');
            }
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'pending', toStatus: 'in_progress',
            context: `receipt_started${receiptId ? ` receipt=${receiptId.slice(0, 8)}` : ''}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onReceiptStarted error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

/**
 * Called when a receipt is COMPLETED (partial or full).
 * Updates all linked documents atomically.
 */
async function onReceiptCompleted(params: ReceiptCompletedParams): Promise<StatusUpdateResult> {
    const {
        documentType, documentId, companyId,
        receiptId, receiptNumber,
        isFullyReceived, isPartial,
        totalQty, warehouseId,
        linkedInvoiceIds,
    } = params;

    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    // Derived status values
    const receiptStatusVal: string = isFullyReceived ? 'received' : isPartial ? 'partial' : 'in_progress';
    const docStatusVal: string = isFullyReceived ? 'received' : 'partially_received';

    try {
        // ── Update primary document ──
        if (table === 'purchase_invoices') {
            const { error } = await supabase.from('purchase_invoices')
                .update({
                    receipt_status: receiptStatusVal,
                    receiving_status: docStatusVal,
                    receipt_id: receiptId,
                    receipt_number: receiptNumber,
                    received_at: now,
                    updated_at: now,
                })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_invoices');

        } else if (table === 'purchase_transactions') {
            const { error } = await supabase.from('purchase_transactions')
                .update({ stage: docStatusVal, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_transactions');

        } else if (table === 'purchase_orders') {
            const { error } = await supabase.from('purchase_orders')
                .update({ status: docStatusVal, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_orders');
            // Cross: update linked invoices
            const { data: linked } = await supabase.from('purchase_invoices')
                .select('id').eq('order_id', documentId);
            if (linked?.length) {
                await supabase.from('purchase_invoices')
                    .update({ receipt_status: receiptStatusVal, updated_at: now })
                    .in('id', linked.map((l: any) => l.id));
                updated.push('purchase_invoices (PO-linked)');
            }

        } else if (table === 'containers') {
            const statusVal = isFullyReceived ? 'received' : 'in_receiving';
            const { error } = await supabase.from('containers')
                .update({
                    status: statusVal,
                    total_received_items: totalQty,
                    received_date: isFullyReceived ? now.split('T')[0] : null,
                    receiving_warehouse_id: warehouseId || null,
                    receiving_notes: `GRN: ${receiptNumber} — ${isFullyReceived ? 'مكتمل' : 'جزئي'}`,
                    updated_at: now,
                })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('containers');

            // Cross: update all linked invoices via container_items
            const invIds = linkedInvoiceIds?.length ? linkedInvoiceIds : await fetchContainerInvoiceIds(documentId);
            if (invIds.length > 0) {
                await supabase.from('purchase_invoices')
                    .update({ receipt_status: receiptStatusVal, updated_at: now })
                    .in('id', invIds);
                await supabase.from('purchase_transactions')
                    .update({ stage: docStatusVal, updated_at: now })
                    .in('id', invIds);
                updated.push(`purchase_invoices (${invIds.length} container-linked)`);
            }
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'in_progress',
            toStatus: receiptStatusVal,
            context: `receipt_completed receipt=${receiptNumber}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onReceiptCompleted error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

// ─── Sales Flow ───────────────────────────────────────────────────────────────

/**
 * Called when a warehouse user STARTS delivering goods for a sales document.
 */
async function onDeliveryStarted(params: DeliveryStartedParams): Promise<StatusUpdateResult> {
    const { documentType, documentId, companyId, deliveryId } = params;
    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    try {
        if (table === 'sales_invoices') {
            const { error } = await supabase.from('sales_invoices')
                .update({ delivery_status: 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_invoices');

        } else if (table === 'sales_orders') {
            const { error } = await supabase.from('sales_orders')
                .update({ status: 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_orders');
            // Cross: update linked invoice
            const { data: linked } = await supabase.from('sales_invoices')
                .select('id').eq('order_id', documentId);
            if (linked?.length) {
                await supabase.from('sales_invoices')
                    .update({ delivery_status: 'in_progress', updated_at: now })
                    .in('id', linked.map((l: any) => l.id));
                updated.push('sales_invoices (order-linked)');
            }
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'pending', toStatus: 'in_progress',
            context: `delivery_started${deliveryId ? ` delivery=${deliveryId.slice(0, 8)}` : ''}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onDeliveryStarted error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

/**
 * Called when a delivery is COMPLETED (partial or full).
 */
async function onDeliveryCompleted(params: DeliveryCompletedParams): Promise<StatusUpdateResult> {
    const {
        documentType, documentId, companyId,
        deliveryId, deliveryNumber,
        isFullyDelivered, isPartial,
    } = params;

    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    const deliveryStatusVal: string = isFullyDelivered ? 'delivered' : isPartial ? 'partial' : 'in_progress';
    const orderStatusVal: string = isFullyDelivered ? 'delivered' : 'partially_delivered';

    try {
        if (table === 'sales_invoices') {
            const { error } = await supabase.from('sales_invoices')
                .update({
                    delivery_status: deliveryStatusVal,
                    updated_at: now,
                })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_invoices');
            // Cross: update linked order
            const { data: inv } = await supabase.from('sales_invoices')
                .select('order_id').eq('id', documentId).single();
            if (inv?.order_id) {
                await supabase.from('sales_orders')
                    .update({ status: orderStatusVal, updated_at: now })
                    .eq('id', inv.order_id);
                updated.push('sales_orders');
            }

        } else if (table === 'sales_orders') {
            const { error } = await supabase.from('sales_orders')
                .update({ status: orderStatusVal, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_orders');
            // Cross: update linked invoices
            const { data: linked } = await supabase.from('sales_invoices')
                .select('id').eq('order_id', documentId);
            if (linked?.length) {
                await supabase.from('sales_invoices')
                    .update({ delivery_status: deliveryStatusVal, updated_at: now })
                    .in('id', linked.map((l: any) => l.id));
                updated.push('sales_invoices (order-linked)');
            }

        } else if (table === 'sales_deliveries') {
            const { error } = await supabase.from('sales_deliveries')
                .update({ status: isFullyDelivered ? 'completed' : 'in_progress', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_deliveries');
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'in_progress',
            toStatus: deliveryStatusVal,
            context: `delivery_completed delivery=${deliveryNumber}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onDeliveryCompleted error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

// ─── Reversal Flow ────────────────────────────────────────────────────────────

/**
 * Called when a receipt (GRN) is CANCELLED.
 * Reverts the document status back to 'pending' or 'partial'
 * if there are other completed receipts for the same document.
 */
async function onReceiptCancelled(params: ReceiptCancelledParams): Promise<StatusUpdateResult> {
    const { documentType, documentId, companyId, receiptId, hadPreviousReceipts } = params;
    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    // Revert to: 'partial' if other receipts exist, else 'pending'
    const revertStatus = hadPreviousReceipts ? 'partial' : 'pending';
    const revertDocStatus = hadPreviousReceipts ? 'partially_received' : 'confirmed';

    try {
        if (table === 'purchase_invoices') {
            const { error } = await supabase.from('purchase_invoices')
                .update({
                    receipt_status: revertStatus,
                    receipt_id: null,
                    updated_at: now,
                })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_invoices');

        } else if (table === 'purchase_transactions') {
            const { error } = await supabase.from('purchase_transactions')
                .update({ stage: revertDocStatus, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_transactions');

        } else if (table === 'purchase_orders') {
            const { error } = await supabase.from('purchase_orders')
                .update({ status: revertDocStatus, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('purchase_orders');

        } else if (table === 'containers') {
            // Container: revert to 'cleared' if no other receipts, else 'in_receiving'
            const containerRevert = hadPreviousReceipts ? 'in_receiving' : 'cleared';
            const { error } = await supabase.from('containers')
                .update({
                    status: containerRevert,
                    received_date: null,
                    total_received_items: 0,
                    updated_at: now,
                })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('containers');

            // Revert linked invoices
            const invIds = await fetchContainerInvoiceIds(documentId);
            if (invIds.length > 0) {
                await supabase.from('purchase_invoices')
                    .update({ receipt_status: revertStatus, updated_at: now })
                    .in('id', invIds);
                updated.push(`purchase_invoices (${invIds.length} container-linked reverted)`);
            }
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'in_progress/received',
            toStatus: revertStatus,
            context: `receipt_cancelled receipt=${receiptId.slice(0, 8)}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onReceiptCancelled error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

/**
 * Called when a sales delivery is CANCELLED.
 * Reverts sales_invoices and sales_orders back to 'pending' or 'partial'.
 */
async function onDeliveryCancelled(params: DeliveryCancelledParams): Promise<StatusUpdateResult> {
    const { documentType, documentId, companyId, deliveryId, hadPreviousDeliveries } = params;
    const table = getTable(documentType);
    const now = new Date().toISOString();
    const updated: string[] = [];

    const revertStatus = hadPreviousDeliveries ? 'partial' : 'pending';
    const revertOrderStatus = hadPreviousDeliveries ? 'partially_delivered' : 'confirmed';

    try {
        if (table === 'sales_invoices') {
            const { error } = await supabase.from('sales_invoices')
                .update({ delivery_status: revertStatus, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_invoices');
            // Revert linked order
            const { data: inv } = await supabase.from('sales_invoices')
                .select('order_id').eq('id', documentId).single();
            if (inv?.order_id) {
                await supabase.from('sales_orders')
                    .update({ status: revertOrderStatus, updated_at: now })
                    .eq('id', inv.order_id);
                updated.push('sales_orders (reverted)');
            }

        } else if (table === 'sales_orders') {
            const { error } = await supabase.from('sales_orders')
                .update({ status: revertOrderStatus, updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_orders');
            // Revert linked invoices
            const { data: linked } = await supabase.from('sales_invoices')
                .select('id').eq('order_id', documentId);
            if (linked?.length) {
                await supabase.from('sales_invoices')
                    .update({ delivery_status: revertStatus, updated_at: now })
                    .in('id', linked.map((l: any) => l.id));
                updated.push('sales_invoices (order-linked reverted)');
            }

        } else if (table === 'sales_deliveries') {
            const { error } = await supabase.from('sales_deliveries')
                .update({ status: 'cancelled', updated_at: now })
                .eq('id', documentId).eq('company_id', companyId);
            if (!error) updated.push('sales_deliveries');
        }

        await logStatusChange({
            table, documentId,
            fromStatus: 'in_progress/delivered',
            toStatus: revertStatus,
            context: `delivery_cancelled delivery=${deliveryId.slice(0, 8)}`,
        });

        return { success: true, updatedTables: updated };

    } catch (err: any) {
        console.error('[DSS] onDeliveryCancelled error:', err.message);
        return { success: false, updatedTables: updated, error: err.message };
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchContainerInvoiceIds(containerId: string): Promise<string[]> {
    const { data } = await supabase
        .from('container_items')
        .select('purchase_invoice_id')
        .eq('container_id', containerId)
        .not('purchase_invoice_id', 'is', null);
    return [...new Set((data || []).map((l: any) => l.purchase_invoice_id).filter(Boolean))];
}

/**
 * Get current receipt/delivery status for any document
 */
async function getDocumentStatus(documentType: DocumentType, documentId: string): Promise<{
    receiptStatus?: string;
    deliveryStatus?: string;
    status?: string;
    stage?: string;
} | null> {
    const table = getTable(documentType);
    try {
        if (table === 'purchase_invoices') {
            const { data } = await supabase.from('purchase_invoices')
                .select('status, receipt_status, receiving_status').eq('id', documentId).single();
            return data;
        }
        if (table === 'containers') {
            const { data } = await supabase.from('containers')
                .select('status, total_received_items, total_expected_items').eq('id', documentId).single();
            return data;
        }
        if (table === 'sales_invoices') {
            const { data } = await supabase.from('sales_invoices')
                .select('status, delivery_status').eq('id', documentId).single();
            return data;
        }
        if (table === 'purchase_orders') {
            const { data } = await supabase.from('purchase_orders')
                .select('status').eq('id', documentId).single();
            return data;
        }
        if (table === 'sales_orders') {
            const { data } = await supabase.from('sales_orders')
                .select('status').eq('id', documentId).single();
            return data;
        }
        return null;
    } catch {
        return null;
    }
}

// ─── Export as singleton service ──────────────────────────────────────────────

export const documentStatusService = {
    // Purchase Flow
    onReceiptStarted,
    onReceiptCompleted,
    onReceiptCancelled,
    // Sales Flow
    onDeliveryStarted,
    onDeliveryCompleted,
    onDeliveryCancelled,
    // Query
    getDocumentStatus,
};

export default documentStatusService;
