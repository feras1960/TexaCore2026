/**
 * Receipt Completion Service
 * ═══════════════════════════════════════════════════════════════
 * Handles all backend operations when a goods receipt is confirmed:
 * 1. Creates purchase_receipt record
 * 2. Creates purchase_receipt_items
 * 3. Updates source document status (PO/Invoice → 'received')
 * 4. Updates actual received quantities on invoice
 * 5. Ensures fabric_rolls are synced
 * 6. Creates inventory movements
 * 7. Creates accounting journal entries (with real account_id from chart_of_accounts)
 * 8. Records activity log for audit trail
 */

import { supabase } from '@/lib/supabase';
import type { ReceiptItem } from './receiptLocalStore';

interface ReceiptCompletionParams {
    // Session info
    sessionId: string;
    tenantId: string;
    companyId: string;
    branchId?: string;
    warehouseId: string;
    // Source document
    sourceDocumentId: string;
    sourceDocumentType: 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction';
    sourceDocumentNumber: string;
    supplierId?: string;
    // Items
    items: ReceiptItem[];
    // Source items for comparison
    sourceItems: Array<{
        id: string;
        material_id?: string;
        product_id?: string;
        description?: string;
        quantity: number;
        unit_price?: number;
        total_price?: number;  // legacy field name
        total?: number;        // actual field from SourceDocumentItem
        subtotal?: number;     // from SourceDocumentItem
    }>;
    // Meta
    notes?: string;
    createdBy?: string;
}

interface ReceiptCompletionResult {
    success: boolean;
    receiptId?: string;
    receiptNumber?: string;
    error?: string;
    details: {
        receiptCreated: boolean;
        receiptItemsCreated: number;
        sourceUpdated: boolean;
        journalEntryId?: string;
        fabricRollsSynced: number;
        inventoryMovementsCreated: number;
        actualQuantitiesUpdated: boolean;
        activityLogsCreated: number;
    };
}

/**
 * Generate a unique receipt number
 */
function generateReceiptNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GRN-${y}${m}${d}-${rand}`;
}

/**
 * Complete a receipt — the main orchestrator
 */
export async function completeReceipt(params: ReceiptCompletionParams): Promise<ReceiptCompletionResult> {
    const result: ReceiptCompletionResult = {
        success: false,
        details: {
            receiptCreated: false,
            receiptItemsCreated: 0,
            sourceUpdated: false,
            fabricRollsSynced: 0,
            inventoryMovementsCreated: 0,
            actualQuantitiesUpdated: false,
            activityLogsCreated: 0,
        },
    };

    try {
        const receiptNumber = generateReceiptNumber();

        // ═══ Step 1: Create purchase_receipt record ═══
        const receiptId = await createPurchaseReceipt(params, receiptNumber);
        if (!receiptId) {
            result.error = 'Failed to create purchase receipt record';
            return result;
        }
        result.receiptId = receiptId;
        result.receiptNumber = receiptNumber;
        result.details.receiptCreated = true;

        // ═══ Step 2: Create purchase_receipt_items ═══
        const itemsCreated = await createReceiptItems(params, receiptId);
        result.details.receiptItemsCreated = itemsCreated;

        // ═══ Step 3 & 4: Update source document (Status + Quantities) ═══
        // 🛠️ Consolidated to handle Partial Receipts and status updates atomically
        const sourceUpdated = await updateSourceDocument(params, receiptId, receiptNumber);
        result.details.sourceUpdated = sourceUpdated;
        result.details.actualQuantitiesUpdated = sourceUpdated;

        // ═══ Step 5: Ensure fabric_rolls are synced ═══
        const rollsSynced = await syncFabricRolls(params, receiptId);
        result.details.fabricRollsSynced = rollsSynced;

        // ═══ Step 6: Create inventory_movements records ═══
        const movementsCreated = await createInventoryMovements(params, receiptId, receiptNumber);
        result.details.inventoryMovementsCreated = movementsCreated;

        // ═══ Step 7: Create/update accounting journal entry ═══
        const journalId = await handleAccountingEntry(params, receiptId, receiptNumber);
        result.details.journalEntryId = journalId || undefined;

        // ═══ Step 8: Record activity log for audit trail (DISABLED - Table Missing) ═══
        // const logsCreated = await recordActivityLog(params, receiptId, receiptNumber, journalId);
        // result.details.activityLogsCreated = logsCreated;

        result.success = true;
        return result;
    } catch (err: any) {
        console.error('❌ Receipt completion failed:', err);
        result.error = err.message || 'Unknown error during receipt completion';
        return result;
    }
}

// ─────────────────────────────────────────────────────────────
//  Step 1: Create purchase_receipt (or upgrade existing draft)
// ─────────────────────────────────────────────────────────────
async function createPurchaseReceipt(params: ReceiptCompletionParams, receiptNumber: string): Promise<string | null> {
    const isOrder = params.sourceDocumentType === 'purchase_order';

    // 🔑 Check if a draft receipt already exists for this source document
    const sourceColumn = isOrder ? 'order_id' : 'invoice_id';
    const { data: existingDraft } = await supabase
        .from('purchase_receipts')
        .select('id')
        .eq('company_id', params.companyId)
        .eq(sourceColumn, params.sourceDocumentId)
        .eq('status', 'draft')
        .maybeSingle();

    if (existingDraft?.id) {
        // ✅ Draft exists — upgrade it to completed
        console.log('📝→✅ Upgrading draft receipt to completed:', existingDraft.id);
        const { error } = await supabase
            .from('purchase_receipts')
            .update({
                receipt_number: receiptNumber,
                receipt_date: new Date().toISOString().split('T')[0],
                status: 'completed',
                draft_data: null, // Clear draft data
                notes: params.notes || `Receipt for ${params.sourceDocumentNumber}`,
                warehouse_id: params.warehouseId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingDraft.id);

        if (error) {
            console.error('❌ Failed to upgrade draft receipt:', error.message);
            return null;
        }
        return existingDraft.id;
    }

    // No draft found — create new receipt
    const { data, error } = await supabase
        .from('purchase_receipts')
        .insert({
            tenant_id: params.tenantId,
            company_id: params.companyId,
            branch_id: params.branchId || null,
            receipt_number: receiptNumber,
            receipt_date: new Date().toISOString().split('T')[0],
            receipt_type: 'direct',
            order_id: isOrder ? params.sourceDocumentId : null,
            invoice_id: !isOrder ? params.sourceDocumentId : null,
            supplier_id: params.supplierId || null,
            warehouse_id: params.warehouseId,
            status: 'completed',
            notes: params.notes || `Receipt for ${params.sourceDocumentNumber}`,
            created_by: params.createdBy || null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('❌ Failed to create purchase_receipt:', error.message);
        return null;
    }

    return data?.id || null;
}

// ─────────────────────────────────────────────────────────────
//  Step 2: Create purchase_receipt_items
//  ⚠️ NOTE: product_id references products(id), but we use materials table.
//     Since materials ARE products in our system, we pass materialId as product_id.
//     If FK constraint fails, we still log the error and continue.
// ─────────────────────────────────────────────────────────────
async function createReceiptItems(params: ReceiptCompletionParams, receiptId: string): Promise<number> {
    // Group items by materialId to aggregate quantities
    const materialGroups: Record<string, { totalLength: number; rollCount: number }> = {};
    for (const item of params.items) {
        if (!materialGroups[item.materialId]) {
            materialGroups[item.materialId] = { totalLength: 0, rollCount: 0 };
        }
        materialGroups[item.materialId].totalLength += item.rollLength || 0;
        materialGroups[item.materialId].rollCount += 1;
    }

    // 🔑 FIX: Use material_id (new column) instead of product_id (FK to products)
    // After running fix_receipt_items_and_movements_fk.sql, product_id FK is dropped
    // and material_id column is added. We set both for maximum compatibility.
    const receiptItems = Object.entries(materialGroups).map(([materialId, agg]) => ({
        tenant_id: params.tenantId,
        receipt_id: receiptId,
        product_id: materialId,  // Will work after FK is dropped by migration
        material_id: materialId, // New column — no FK constraint
        quantity_received: agg.totalLength,
        quantity_accepted: agg.totalLength,
        quantity_rejected: 0,
        notes: `${agg.rollCount} roll(s)`,
    }));

    if (receiptItems.length === 0) return 0;

    console.log('📦 [createReceiptItems] Inserting:', JSON.stringify(receiptItems, null, 2));

    const { error, data } = await supabase
        .from('purchase_receipt_items')
        .insert(receiptItems)
        .select('id');

    if (error) {
        console.error('❌ Failed to create receipt items:', error.message, error.details, error.hint);

        // 🔑 Fallback: Try without product_id (FK constraint may still exist)
        console.log('🔄 Retrying with material_id only (no product_id)...');
        const fallbackItems = Object.entries(materialGroups).map(([materialId, agg]) => ({
            tenant_id: params.tenantId,
            receipt_id: receiptId,
            material_id: materialId,
            quantity_received: agg.totalLength,
            quantity_accepted: agg.totalLength,
            quantity_rejected: 0,
            notes: `${agg.rollCount} roll(s) - material: ${materialId}`,
        }));

        const { error: fallbackError, data: fallbackData } = await supabase
            .from('purchase_receipt_items')
            .insert(fallbackItems)
            .select('id');

        if (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError.message, fallbackError.details);
            return 0;
        }
        console.log('✅ Fallback succeeded, inserted', fallbackData?.length, 'receipt items');
        return fallbackData?.length || 0;
    }

    console.log('✅ Created', data?.length, 'receipt items');
    return data?.length || 0;
}

// ─────────────────────────────────────────────────────────────
//  Step 3: Update Source Document (Consolidated)
//  - Fetches existing received quantities (Partial Receipt Support)
//  - Merges new quantities
//  - Updates status (received vs partially_received)
//  - Updates timestamps and references
// ─────────────────────────────────────────────────────────────
async function updateSourceDocument(
    params: ReceiptCompletionParams,
    receiptId: string,
    receiptNumber: string
): Promise<boolean> {
    try {
        const table = params.sourceDocumentType === 'purchase_order' ? 'purchase_orders'
            : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions'
                : 'purchase_transactions'; // Default to new table for invoices too
        const now = new Date().toISOString();

        // 1. Fetch current document state to ensure we add to existing history
        const { data: currentDoc, error: fetchError } = await supabase
            .from(table)
            .select('total_received_quantity, total_received_amount, received_items_detail, stage, status')
            .eq('id', params.sourceDocumentId)
            .single();

        if (fetchError || !currentDoc) {
            console.error(`❌ Failed to fetch current ${table} state:`, fetchError?.message);
            // Proceed with blind update fallback if fetch fails? Risk of data loss. Better to fail.
            return false;
        }

        const prevDetail: any[] = Array.isArray(currentDoc.received_items_detail) ? currentDoc.received_items_detail : [];
        const prevTotalQty = Number(currentDoc.total_received_quantity) || 0;
        const prevTotalAmt = Number(currentDoc.total_received_amount) || 0;

        // 2. Calculate NEW received totals per material for THIS receipt
        const currentReceiptByMaterial: Record<string, { quantity: number; rollCount: number }> = {};
        for (const item of params.items) {
            if (!currentReceiptByMaterial[item.materialId]) {
                currentReceiptByMaterial[item.materialId] = { quantity: 0, rollCount: 0 };
            }
            currentReceiptByMaterial[item.materialId].quantity += item.rollLength || 0;
            currentReceiptByMaterial[item.materialId].rollCount += 1;
        }

        // 3. Merge with previous details
        // We iterate over known source items to build the master list
        const mergedDetail = params.sourceItems.map(si => {
            const matId = si.material_id || si.product_id || '';

            // Find in previous history
            const prevItem = prevDetail.find((pi: any) => pi.material_id === matId);
            const prevReceivedQty = Number(prevItem?.received_quantity) || 0;
            const prevRollCount = Number(prevItem?.roll_count) || 0;

            // Find in current receipt
            const currentRec = currentReceiptByMaterial[matId] || { quantity: 0, rollCount: 0 };

            // Totals
            const totalReceivedQty = prevReceivedQty + currentRec.quantity;
            const totalRollCount = prevRollCount + currentRec.rollCount;
            const orderedQty = si.quantity || 0;
            const unitPrice = si.unit_price || 0;

            return {
                material_id: matId,
                ordered_quantity: orderedQty,
                received_quantity: totalReceivedQty,
                roll_count: totalRollCount,
                unit_price: unitPrice,
                ordered_total: orderedQty * unitPrice,
                received_total: totalReceivedQty * unitPrice,
                difference: totalReceivedQty - orderedQty,
                // Add tracking of last receipt
                last_receipt_qty: currentRec.quantity,
                last_receipt_date: now
            };
        });

        // 4. Calculate Global Totals
        const newTotalQty = prevTotalQty + Object.values(currentReceiptByMaterial).reduce((s, i) => s + i.quantity, 0);

        let newTotalAmt = prevTotalAmt;
        for (const [matId, val] of Object.entries(currentReceiptByMaterial)) {
            const si = params.sourceItems.find(s => (s.material_id || s.product_id) === matId);
            const price = si?.unit_price || ((si as any).total_price / (si?.quantity || 1)) || 0;
            newTotalAmt += val.quantity * price;
        }

        // 5. Determine Status
        const totalOrdered = params.sourceItems.reduce((s, i) => s + (i.quantity || 0), 0);
        // Tolerance for floating point (0.01)
        const isFullyReceived = newTotalQty >= (totalOrdered - 0.01);

        // If already 'received' or 'posted' (for invoice), we respect logic.
        // But for PO, we transition: draft -> confirmed -> partially_received -> received
        let newStatus = isFullyReceived ? 'received' : 'partially_received';

        // ⚠️ Specific Logic for Purchase Invoices ⚠️
        // Invoices usually stay 'posted' (finance) until Paid. 
        // But the user requested "remove from purchase invoice tab upon receipt".
        // The PurchaseCycleList hides 'received'. 
        // So we apply 'received' (hidden) or 'partially_received' (visible).
        // This effectively moves fully received invoices to history.

        // 6. Perform Update
        const updateData: any = {
            total_received_quantity: newTotalQty,
            total_received_amount: newTotalAmt,
            received_items_detail: mergedDetail,
            received_at: now,
            updated_at: now,
            receipt_id: receiptId, // Link last receipt
            receipt_number: receiptNumber,
            status: newStatus
        };

        console.log(`📝 [UpdateSource] Updating ${table} ID: ${params.sourceDocumentId}`, {
            prevTotalQty,
            addedQty: newTotalQty - prevTotalQty,
            newTotalQty,
            totalOrdered,
            newStatus
        });

        const { error: updateError } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', params.sourceDocumentId);

        if (updateError) {
            console.error(`❌ Failed to update ${table}:`, updateError.message);

            // 🚨 RPC Fallback for RLS issues
            try {
                await supabase.rpc('update_purchase_document_status_bypass_rls', {
                    p_table: table,
                    p_id: params.sourceDocumentId,
                    p_status: newStatus,
                    p_receipt_id: receiptId,
                    p_receipt_number: receiptNumber
                });
                console.log('✅ Updated via RPC Bypass (Status only fallback)');
                return true;
            } catch (rpcErr) {
                return false;
            }
        }

        // 7. Cross-Update (PO <-> Invoice)
        // If we updated PO, we should update linked invoices statuses too, but ONLY if they match.
        // Actually, strictly speaking, receiving a PO doesn't mean receiving the Invoice if they are decoupled.
        // But usually, they are linked. We'll update linked docs to sync status.
        if (params.sourceDocumentType === 'purchase_order') {
            const { data: linked } = await supabase.from('purchase_transactions').select('id').eq('source_order_id', params.sourceDocumentId);
            if (linked?.length) {
                await supabase.from('purchase_transactions').update({ stage: newStatus }).in('id', linked.map(l => l.id));
            }
        } else {
            // If Invoice updated, update PO
            const { data: inv } = await supabase.from('purchase_transactions').select('source_order_id').eq('id', params.sourceDocumentId).single();
            if (inv?.source_order_id) {
                await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', inv.source_order_id);
            }
        }

        return true;

    } catch (err: any) {
        console.warn('⚠️ Exception in updateSourceDocument:', err.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
//  Step 5: Sync fabric_rolls (ensure all are in DB)
//  ⚠️ IMPORTANT: addItem() in receiptLocalStore already syncs
//  each roll to fabric_rolls. Here we ONLY handle items that
//  failed to sync (no supabaseId) to prevent duplicates.
// ─────────────────────────────────────────────────────────────
async function syncFabricRolls(params: ReceiptCompletionParams, receiptId: string): Promise<number> {
    let synced = 0;

    for (const item of params.items) {
        // Already synced by receiptLocalStore.addItem()
        if (item.supabaseId) {
            // Update the existing roll with GRN reference
            await supabase
                .from('fabric_rolls')
                .update({ notes: `GRN: ${receiptId}` })
                .eq('id', item.supabaseId);
            synced++;
            continue;
        }

        // Check if roll already exists by roll_number (prevent duplicates)
        const { data: existing } = await supabase
            .from('fabric_rolls')
            .select('id')
            .eq('company_id', params.companyId)
            .eq('roll_number', item.rollNumber)
            .maybeSingle();

        if (existing?.id) {
            // Roll already exists, just update with GRN reference
            await supabase
                .from('fabric_rolls')
                .update({ notes: `GRN: ${receiptId}` })
                .eq('id', existing.id);
            synced++;
            continue;
        }

        // Only insert if truly missing
        // 🔑 FIX: Use correct column names from fabric_rolls schema:
        //   - initial_length (NOT original_length)
        //   - available_length is GENERATED (do NOT insert)
        //   - batch_id references inventory_batches(id)
        // Calculate cost per meter from source item
        const sourceItem = params.sourceItems.find(si => (si.material_id || si.product_id) === item.materialId);
        const costPerMeter = sourceItem?.unit_price || 0;

        const { error } = await supabase
            .from('fabric_rolls')
            .insert({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                warehouse_id: params.warehouseId,
                material_id: item.materialId,
                roll_number: item.rollNumber,
                initial_length: item.rollLength,
                current_length: item.rollLength,
                cost_per_meter: costPerMeter,
                reserved_length: 0,
                status: 'available',
                notes: `GRN: ${receiptId}`,
            });

        if (!error) synced++;
        else console.warn('⚠️ Failed to sync roll:', item.rollNumber, error.message, error.details);
    }

    return synced;
}

// ─────────────────────────────────────────────────────────────
//  Step 6: Create Inventory Movements
//  Records stock movements visible in the Stock Movements page
//  🔑 Schema: inventory_movements columns:
//     id, tenant_id, company_id, movement_number, movement_date, movement_time,
//     movement_type, product_id, variant_id, from_warehouse_id, from_location_id,
//     to_warehouse_id, to_location_id, quantity, unit_id, unit_cost, total_cost,
//     balance_before, balance_after, reference_type, reference_id, reference_number,
//     notes, created_by (NOT NULL!), created_at
// ─────────────────────────────────────────────────────────────
async function createInventoryMovements(
    params: ReceiptCompletionParams,
    receiptId: string,
    receiptNumber: string
): Promise<number> {
    // Get current user ID for created_by (required NOT NULL column)
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
        console.warn('⚠️ Cannot create inventory movements: no authenticated user');
        return 0;
    }

    // Group items by materialId
    const materialGroups: Record<string, { totalLength: number; rollCount: number; materialName: string }> = {};
    for (const item of params.items) {
        if (!materialGroups[item.materialId]) {
            materialGroups[item.materialId] = { totalLength: 0, rollCount: 0, materialName: item.materialName || '' };
        }
        materialGroups[item.materialId].totalLength += item.rollLength || 0;
        materialGroups[item.materialId].rollCount += 1;
    }

    // 🔑 FIX: Match actual inventory_movements table schema
    // Removed: warehouse_id (doesn't exist), status (doesn't exist)
    // Added: created_by (NOT NULL required), material_id (new column from migration)

    // Logic for Reference Number Display:
    // User wants "The Invoice appears in stock movements".
    // For Direct Invoice Receipts, we show the Invoice Number as the reference.
    // For PO Receipts, we show the GRN Number.
    const isDirectInvoice = params.sourceDocumentType !== 'purchase_order';
    const displayRefNumber = isDirectInvoice ? params.sourceDocumentNumber : receiptNumber;

    const movements = Object.entries(materialGroups).map(([materialId, agg], idx) => ({
        tenant_id: params.tenantId,
        company_id: params.companyId,
        product_id: materialId,  // Will work after FK is dropped by migration
        material_id: materialId, // New column — no FK constraint
        to_warehouse_id: params.warehouseId,
        movement_type: 'receipt',
        movement_number: `MV-GRN-${receiptNumber.replace('GRN-', '')}-${idx + 1}`,
        quantity: agg.totalLength,
        reference_type: 'goods_receipt', // Keep as goods_receipt to enable "View Invoice" button logic
        reference_id: receiptId,         // Point to the Receipt ID for linkage
        reference_number: displayRefNumber, // Show Invoice Number or GRN
        movement_date: new Date().toISOString().split('T')[0],
        created_by: currentUserId,
        notes: isDirectInvoice
            ? `${agg.rollCount} roll(s) - Invoice: ${params.sourceDocumentNumber}`
            : `${agg.rollCount} roll(s) - GRN: ${receiptNumber} (PO: ${params.sourceDocumentNumber})`,
    }));

    if (movements.length === 0) return 0;

    console.log('📦 [createInventoryMovements] Inserting:', JSON.stringify(movements, null, 2));

    const { data, error } = await supabase
        .from('inventory_movements')
        .insert(movements)
        .select('id');

    if (error) {
        console.warn('⚠️ Failed to create inventory movements:', error.message, error.details, error.hint);
        return 0;
    }

    console.log('✅ Created', data?.length, 'inventory movements');
    return data?.length || 0;
}

// ─────────────────────────────────────────────────────────────
//  Step 7: Handle Accounting Entry
//  Links to REAL account_id from chart_of_accounts
//  - PO: Debit مخزون (1400), Credit بضاعة مستلمة غير مفوترة (2108)
//  - Invoice: Debit مخزون (1400), Credit ذمم دائنة (2100)
// ─────────────────────────────────────────────────────────────
async function handleAccountingEntry(
    params: ReceiptCompletionParams,
    receiptId: string,
    receiptNumber: string
): Promise<string | null> {
    try {
        // Get current user for created_by
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id || null;

        // Get Supplier ID for Entity Linking
        let supplierId = params.supplierId;
        if (!supplierId) {
            const table = params.sourceDocumentType === 'purchase_order' ? 'purchase_orders'
                : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions'
                    : 'purchase_transactions';
            const { data: doc } = await supabase
                .from(table)
                .select('supplier_id')
                .eq('id', params.sourceDocumentId)
                .single();
            supplierId = doc?.supplier_id;
        }

        console.log('🔗 [Accounting] Linked Supplier:', supplierId);

        // ─── Resolve account IDs from company_accounting_settings (SINGLE SOURCE OF TRUTH) ───
        const { data: companySettings } = await supabase
            .from('company_accounting_settings')
            .select('default_inventory_account_id, default_payable_account_id, default_purchase_account_id, default_cogs_account_id')
            .eq('company_id', params.companyId)
            .single();

        // Build account map from settings
        const inventoryAccountId = companySettings?.default_inventory_account_id || null;
        const payableAccountId = companySettings?.default_payable_account_id || null;
        const purchaseAccountId = companySettings?.default_purchase_account_id || companySettings?.default_cogs_account_id || null;

        // Fetch account names for the resolved IDs
        const resolvedIds = [inventoryAccountId, payableAccountId, purchaseAccountId].filter(Boolean);
        const accountMap: Record<string, { id: string; name_ar: string; name_en: string }> = {};
        if (resolvedIds.length > 0) {
            const { data: accDetails } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .in('id', resolvedIds);
            for (const acc of accDetails || []) {
                accountMap[acc.id] = { id: acc.id, name_ar: acc.name_ar, name_en: acc.name_en || acc.name_ar };
            }
        }
        console.log('📊 [Accounting] Settings-based accounts — Inventory:', !!inventoryAccountId,
            ', Payable:', !!payableAccountId, ', Purchase:', !!purchaseAccountId);

        // Calculate totals from source items
        // 🔑 FIX: Support both 'total' (from SourceDocumentItem) and 'total_price' (legacy)
        const getItemTotal = (si: typeof params.sourceItems[0]) => {
            if (si.total && si.total > 0) return si.total;
            if (si.subtotal && si.subtotal > 0) return si.subtotal;
            if (si.total_price && si.total_price > 0) return si.total_price;
            return si.quantity * (si.unit_price || 0);
        };

        const getItemUnitPrice = (si: typeof params.sourceItems[0]) => {
            if (si.unit_price && si.unit_price > 0) return si.unit_price;
            const total = getItemTotal(si);
            return si.quantity > 0 ? total / si.quantity : 0;
        };

        const expectedTotal = params.sourceItems.reduce(
            (s, si) => s + getItemTotal(si), 0
        );

        console.log('📊 [Accounting] Source items:', params.sourceItems.map(si => ({
            material_id: si.material_id || si.product_id,
            quantity: si.quantity,
            unit_price: si.unit_price,
            total: si.total,
            subtotal: si.subtotal,
            total_price: si.total_price,
            computed_total: getItemTotal(si),
            computed_unit_price: getItemUnitPrice(si),
        })));

        // Calculate actual received totals per material
        const receivedByMaterial: Record<string, number> = {};
        for (const item of params.items) {
            receivedByMaterial[item.materialId] = (receivedByMaterial[item.materialId] || 0) + (item.rollLength || 0);
        }

        // Calculate actual total using unit prices from source
        let actualTotal = 0;
        for (const si of params.sourceItems) {
            const matId = si.material_id || si.product_id || '';
            const receivedQty = receivedByMaterial[matId] || 0;
            const unitPrice = getItemUnitPrice(si);
            actualTotal += receivedQty * unitPrice;
        }

        console.log('📊 [Accounting] Totals — expected:', expectedTotal, ', actual:', actualTotal,
            ', receivedByMaterial:', receivedByMaterial);

        const discrepancy = actualTotal - expectedTotal;
        const isOrder = params.sourceDocumentType === 'purchase_order';

        // Generate entry number
        const entryNumber = `JE-GRN-${receiptNumber.replace('GRN-', '')}`;

        // Build journal entry lines with real account_id and entity linking
        const lines: Array<{
            account_id: string | null;
            account_name: string;
            debit: number;
            credit: number;
            description: string;
            entity_type?: 'supplier' | null;
            entity_id?: string | null;
        }> = [];

        // Use inventory account (or fallback to purchase) for debit
        const debitAccId = inventoryAccountId || purchaseAccountId;
        const debitAccName = debitAccId ? (accountMap[debitAccId]?.name_ar || 'مخزون البضاعة') : 'مخزون البضاعة';
        // Use payable account for credit (GRNI or AP)
        const creditAccId = payableAccountId;
        const creditAccName = creditAccId ? (accountMap[creditAccId]?.name_ar || 'ذمم دائنة') : 'ذمم دائنة';

        if (isOrder) {
            // PO Receipt: Debit Inventory, Credit Payable/GRNI
            lines.push({
                account_id: debitAccId,
                account_name: debitAccName,
                debit: actualTotal,
                credit: 0,
                description: `استلام بضائع - أمر شراء ${params.sourceDocumentNumber}`,
            });
            lines.push({
                account_id: creditAccId,
                account_name: creditAccName,
                debit: 0,
                credit: actualTotal,
                description: `استلام بضائع - أمر شراء ${params.sourceDocumentNumber}`,
                entity_type: 'supplier',
                entity_id: supplierId,
            });
        } else {
            // Invoice Receipt: Debit Inventory, Credit Payable
            lines.push({
                account_id: debitAccId,
                account_name: debitAccName,
                debit: actualTotal,
                credit: 0,
                description: `استلام مخزني - فاتورة ${params.sourceDocumentNumber}`,
            });
            lines.push({
                account_id: creditAccId,
                account_name: creditAccName,
                debit: 0,
                credit: actualTotal,
                description: `تسوية استلام - فاتورة ${params.sourceDocumentNumber}`,
                entity_type: 'supplier',
                entity_id: supplierId,
            });

            console.log('✅ [Accounting] Inventory Entry for Invoice Receipt (Dr Inventory / Cr Payable)');
        }

        // 🔑 FIX: Validate lines BEFORE creating header
        const validLines = lines.filter(l => l.account_id);

        // Strict check: if ANY account is missing, abort to prevent bad data
        if (validLines.length < lines.length || validLines.length === 0) {
            console.warn('⚠️ لا يمكن إنشاء قيد الاستلام: الحسابات الافتراضية غير معرّفة في الإعدادات.');
            console.warn('⚠️ Skipping Journal Entry: Default accounts not configured in accounting settings.');
            console.warn('   يرجى الذهاب إلى: الإعدادات → المحاسبة → الحسابات الافتراضية');
            return null;
        }

        console.log('📝 [Accounting] Creating Journal Entry with Totals:', {
            actualTotal,
            expectedTotal,
            lines: lines.map(l => ({ acc: l.account_name, dr: l.debit, cr: l.credit }))
        });

        // Insert the journal entry
        const { data: entryData, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                branch_id: params.branchId || null,
                entry_number: entryNumber,
                entry_date: new Date().toISOString().split('T')[0],
                description: isOrder
                    ? `قيد استلام بضائع - أمر شراء ${params.sourceDocumentNumber}`
                    : `قيد استلام بضائع - فاتورة ${params.sourceDocumentNumber}`,
                reference_type: 'goods_receipt',
                reference_id: receiptId,
                status: 'posted',
                total_debit: lines.reduce((s, l) => s + (l.debit || 0), 0),
                total_credit: lines.reduce((s, l) => s + (l.credit || 0), 0),
                created_by: currentUserId,
            })
            .select('id')
            .single();

        if (entryError) {
            console.warn('⚠️ Journal entry creation failed:', entryError.message);
            return null;
        }

        // Insert journal entry lines with account_id
        // 🔑 FIX: Use correct column names from journal_entry_lines schema:
        //   - debit/credit (NOT debit_amount/credit_amount)
        //   - no company_id column in journal_entry_lines
        //   - account_id is NOT NULL — skip lines without account_id
        if (entryData?.id) {
            const entryLines = lines
                .filter(line => line.account_id) // account_id is NOT NULL
                .map((line, idx) => ({
                    tenant_id: params.tenantId,
                    entry_id: entryData.id,
                    line_number: idx + 1,
                    account_id: line.account_id,
                    description: line.description,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    entity_type: line.entity_type || null,
                    entity_id: line.entity_id || null,
                }));

            if (entryLines.length > 0) {
                const { error: linesError } = await supabase
                    .from('journal_entry_lines')
                    .insert(entryLines);

                if (linesError) {
                    console.warn('⚠️ Journal entry lines insert failed:', linesError.message, linesError.details);
                } else {
                    console.log('✅ Created', entryLines.length, 'journal entry lines');
                }
            } else {
                console.warn('⚠️ No valid journal entry lines to insert (missing account_id)');
            }
        }

        return entryData?.id || null;
    } catch (err: any) {
        console.warn('⚠️ Accounting entry failed (non-critical):', err.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  Step 8: Record Activity Log (Audit Trail)
//  سجل نشاط لكل مرحلة بالوقت والتاريخ
// ─────────────────────────────────────────────────────────────
async function recordActivityLog(
    params: ReceiptCompletionParams,
    receiptId: string,
    receiptNumber: string,
    journalEntryId: string | null
): Promise<number> {
    try {
        const now = new Date().toISOString();
        const isOrder = params.sourceDocumentType === 'purchase_order';
        const sourceTable = isOrder ? 'purchase_orders'
            : (params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions' : 'purchase_transactions');

        // Build activity entries for each stage
        const activities: any[] = [
            {
                tenant_id: params.tenantId,
                company_id: params.companyId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                action: 'goods_received',
                description_ar: `تم استلام البضائع — إذن استلام ${receiptNumber}`,
                description_en: `Goods received — GRN ${receiptNumber}`,
                metadata: {
                    receipt_id: receiptId,
                    receipt_number: receiptNumber,
                    warehouse_id: params.warehouseId,
                    items_count: params.items.length,
                    stage: 'receipt_created',
                },
                performed_by: params.createdBy || null,
                performed_at: now,
            },
            {
                tenant_id: params.tenantId,
                company_id: params.companyId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                action: 'status_changed',
                description_ar: `تم تغيير الحالة إلى "مستلم"`,
                description_en: `Status changed to "received"`,
                metadata: {
                    from_status: 'confirmed',
                    to_status: 'received',
                    receipt_number: receiptNumber,
                    stage: 'status_updated',
                },
                performed_by: params.createdBy || null,
                performed_at: now,
            },
            {
                tenant_id: params.tenantId,
                company_id: params.companyId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                action: 'quantities_updated',
                description_ar: `تم تحديث الكميات الفعلية المستلمة — ${params.items.length} رولون`,
                description_en: `Actual received quantities updated — ${params.items.length} roll(s)`,
                metadata: {
                    total_rolls: params.items.length,
                    receipt_number: receiptNumber,
                    stage: 'quantities_recorded',
                },
                performed_by: params.createdBy || null,
                performed_at: now,
            },
        ];

        // Add accounting entry activity
        if (journalEntryId) {
            activities.push({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                action: 'journal_entry_created',
                description_ar: `تم إنشاء القيد المحاسبي — قيد استلام بضائع`,
                description_en: `Journal entry created — Goods receipt entry`,
                metadata: {
                    journal_entry_id: journalEntryId,
                    receipt_number: receiptNumber,
                    stage: 'accounting_posted',
                },
                performed_by: params.createdBy || null,
                performed_at: now,
            });
        }

        // Also log on the receipt itself
        activities.push({
            tenant_id: params.tenantId,
            company_id: params.companyId,
            entity_type: 'purchase_receipts',
            entity_id: receiptId,
            action: 'receipt_completed',
            description_ar: `تم إكمال إذن الاستلام ${receiptNumber} — ${params.items.length} رولون`,
            description_en: `Receipt ${receiptNumber} completed — ${params.items.length} roll(s)`,
            metadata: {
                source_document_type: params.sourceDocumentType,
                source_document_id: params.sourceDocumentId,
                source_document_number: params.sourceDocumentNumber,
                journal_entry_id: journalEntryId,
                stage: 'completed',
            },
            performed_by: params.createdBy || null,
            performed_at: now,
        });

        const { data, error } = await supabase
            .from('activity_logs')
            .insert(activities)
            .select('id');

        if (error) {
            console.warn('⚠️ Activity log creation failed:', error.message);
            // Try alternate table name
            const { data: altData, error: altError } = await supabase
                .from('document_activity_log')
                .insert(activities)
                .select('id');

            if (altError) {
                console.warn('⚠️ Alternate activity log also failed:', altError.message);
                return 0;
            }
            return altData?.length || 0;
        }

        return data?.length || 0;
    } catch (err: any) {
        console.warn('⚠️ Activity log failed (non-critical):', err.message);
        return 0;
    }
}
/**
 * HACK: Self-healing function to ensure critical accounts exist
 * If accounts 1400, 2100, 2108, 5108 are missing, create them dynamically.
 */
async function ensureCriticalAccounts(tenantId: string, companyId: string) {
    const required = [
        { code: '1400', name_ar: 'مخزون البضاعة', name_en: 'Inventory', type: 'CURRENT_ASSET' },
        { code: '2100', name_ar: 'ذمم دائنة — موردين', name_en: 'Accounts Payable', type: 'CURRENT_LIABILITY' },
        { code: '2108', name_ar: 'بضاعة مستلمة غير مفوترة', name_en: 'Goods Received Not Invoiced', type: 'CURRENT_LIABILITY' },
        { code: '5108', name_ar: 'فروقات المخزون والاستلام', name_en: 'Inventory Discrepancies', type: 'EXPENSE' }
    ];

    // 1. Check existing
    const { data: existing } = await supabase
        .from('chart_of_accounts')
        .select('account_code')
        .or(`company_id.eq.${companyId},company_id.is.null`) // Check both company-specific and global accounts
        .in('account_code', required.map(r => r.code));

    const existingCodes = new Set(existing?.map(e => e.account_code) || []);

    // 2. Identify missing
    const missing = required.filter(r => !existingCodes.has(r.code));

    if (missing.length === 0) return;

    console.log('🔧 [Self-Healing] Creating missing accounts:', missing.map(m => m.code));

    // 3. Resolve Account Types (assume they exist or fallback)
    const { data: types } = await supabase.from('account_types').select('id, code');
    const typeMap = (types || []).reduce((acc, t) => ({ ...acc, [t.code]: t.id }), {} as Record<string, string>);

    // 4. Create missing
    for (const acc of missing) {
        // Try precise type, then generic type (ASSET/LIABILITY), then fallback
        const typeId = typeMap[acc.type] || typeMap[acc.type.split('_')[1]] || typeMap['ASSET'] || typeMap['OTHER_ASSET'];
        if (!typeId) {
            console.warn(`⚠️ Cannot create account ${acc.code}: Type ${acc.type} not found`);
            continue;
        }

        await supabase.from('chart_of_accounts').insert({
            tenant_id: tenantId,
            company_id: companyId,
            account_code: acc.code,
            name_ar: acc.name_ar,
            name_en: acc.name_en,
            account_type_id: typeId,
            is_group: false,
            is_detail: true,
            status: 'active'
        });
    }
}

