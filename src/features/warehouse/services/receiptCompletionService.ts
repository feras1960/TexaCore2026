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
import { documentStatusService as DSS } from '@/services/documentStatusService';


interface ReceiptCompletionParams {
    // Session info
    sessionId: string;
    tenantId: string;
    companyId: string;
    branchId?: string;
    warehouseId: string;
    // Source document
    sourceDocumentId: string;
    sourceDocumentType: 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction' | 'container';
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
    // 🔑 Variance tracking (for accountant review flow)
    varianceStatus?: 'ok' | 'requires_review';   // 'requires_review' = out-of-tolerance
    varianceAmount?: number;                       // diff in meters (signed: + excess, - shortage)
    variancePct?: number;                          // diff as % of expected
    varianceTolerancePct?: number;                 // tolerance used (e.g. 1%)
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

        // ═══ Stage 2: PARALLEL — Steps 2,3,5 (all independent, need receiptId) ═══
        const [itemsResult, sourceResult, syncResult] = await Promise.allSettled([
            createReceiptItems(params, receiptId),
            updateSourceDocument(params, receiptId, receiptNumber),
            syncFabricRolls(params, receiptId),
        ]);

        if (itemsResult.status === 'fulfilled') result.details.receiptItemsCreated = itemsResult.value;
        if (sourceResult.status === 'fulfilled') {
            result.details.sourceUpdated = sourceResult.value;
            result.details.actualQuantitiesUpdated = sourceResult.value;
        }
        if (syncResult.status === 'fulfilled') result.details.fabricRollsSynced = syncResult.value;

        // ═══ Stage 3: PARALLEL — Steps 5.5,6,7,8 (post-processing) ═══
        const [, movementsResult, journalResult, activityResult] = await Promise.allSettled([
            params.sourceDocumentType === 'container'
                ? finalizeFabricRollCosts(params.sourceDocumentId)
                : Promise.resolve(),
            createInventoryMovements(params, receiptId, receiptNumber),
            handleAccountingEntry(params, receiptId, receiptNumber, params.varianceStatus, params.varianceAmount, params.variancePct),
            recordActivityLog(params, receiptId, receiptNumber, null),
        ]);

        if (movementsResult.status === 'fulfilled') {
            result.details.inventoryMovementsCreated = movementsResult.value as number;
        }
        if (journalResult.status === 'fulfilled') {
            result.details.journalEntryId = (journalResult.value as string | null) || undefined;
        }
        if (activityResult.status === 'fulfilled') {
            result.details.activityLogsCreated = activityResult.value as number;
        }

        result.success = true;

        // ═══ Variance Notification — alert accountants when review needed ═══
        if (params.varianceStatus === 'requires_review') {
            sendVarianceNotification(params, receiptNumber).catch(err =>
                console.warn('⚠️ Variance notification failed (non-fatal):', err.message)
            );
        }

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
    const isContainer = params.sourceDocumentType === 'container';
    const isInvoice = !isOrder && !isContainer;

    // 🛡️ DUPLICATE GUARD — Check ALL active receipts for this source document
    const sourceColumn = isOrder ? 'order_id' : isContainer ? 'container_id' : 'invoice_id';
    const { data: existingReceipts } = await supabase
        .from('purchase_receipts')
        .select('id, status, receipt_number')
        .eq('company_id', params.companyId)
        .eq(sourceColumn, params.sourceDocumentId)
        .not('status', 'in', '("cancelled","rejected")');

    const existingDraft = existingReceipts?.find(r => r.status === 'draft' || r.status === 'in_progress');
    const existingCompleted = existingReceipts?.find(r => r.status === 'completed');

    // ⛔ BLOCK if already completed
    if (existingCompleted) {
        console.error('⛔ DUPLICATE RECEIPT BLOCKED:', existingCompleted.receipt_number);
        throw new Error(
            `تم استلام هذه الوثيقة بالفعل (${existingCompleted.receipt_number}). يُمنع تسجيل استلام مكرر.`
        );
    }

    if (existingDraft?.id) {
        // ✅ Draft exists — upgrade it to completed
        console.log('📝→✅ Upgrading draft receipt to completed:', existingDraft.id);

        // Fetch draft_data to preserve started_at info
        const { data: draftRecord } = await supabase
            .from('purchase_receipts')
            .select('draft_data, created_by')
            .eq('id', existingDraft.id)
            .single();

        const draftData = (draftRecord?.draft_data as any) || {};
        const startedAt = draftData.started_at || draftRecord?.created_by;
        const completedAt = new Date().toISOString();

        // Calculate duration
        let durationMinutes = 0;
        if (startedAt) {
            durationMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
        }

        const activityLog = {
            started_at: draftData.started_at || null,
            started_by: draftData.started_by || draftRecord?.created_by || null,
            completed_at: completedAt,
            completed_by: params.createdBy || null,
            duration_minutes: durationMinutes,
        };

        const { error } = await supabase
            .from('purchase_receipts')
            .update({
                receipt_number: receiptNumber,
                receipt_date: new Date().toISOString().split('T')[0],
                status: 'completed',
                draft_data: { activity_log: activityLog }, // Keep activity log, clear items
                notes: params.notes || `Receipt for ${params.sourceDocumentNumber}`,
                warehouse_id: params.warehouseId,
                updated_at: completedAt,
                // 🔑 Variance fields — for accountant/manager review
                ...(params.varianceAmount !== undefined && {
                    variance_status: params.varianceStatus || 'ok',
                    variance_amount: params.varianceAmount,
                    variance_pct: params.variancePct || 0,
                    variance_tolerance_pct: params.varianceTolerancePct || 1,
                }),
            })
            .eq('id', existingDraft.id);

        if (error) {
            console.error('❌ Failed to upgrade draft receipt:', error.message);
            return null;
        }
        console.log(`✅ Receipt completed — duration: ${durationMinutes} minutes`);
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
            receipt_type: isContainer ? 'container' : 'direct',
            order_id: isOrder ? params.sourceDocumentId : null,
            invoice_id: isInvoice ? params.sourceDocumentId : null,
            container_id: isContainer ? params.sourceDocumentId : null,
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
        const isContainer = params.sourceDocumentType === 'container';
        const table = params.sourceDocumentType === 'purchase_order' ? 'purchase_orders'
            : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions'
                : isContainer ? 'containers'
                    : 'purchase_invoices'; // NEW unified table for purchase_invoice types
        const now = new Date().toISOString();

        // 1. Fetch current document state to ensure we add to existing history
        // 🔑 FIX: Different tables have different column names
        //   - purchase_invoices: total_received_quantity, total_received_amount, received_items_detail
        //   - containers: total_received_items (no total_received_quantity/amount/items_detail)
        //   - purchase_orders/transactions: stage, status
        const selectCols = isContainer
            ? 'total_received_items, status'
            : table === 'purchase_invoices'
                ? 'total_received_quantity, total_received_amount, received_items_detail, status'
                : 'stage, status';

        const { data: currentDoc, error: fetchError } = await supabase
            .from(table)
            .select(selectCols)
            .eq('id', params.sourceDocumentId)
            .single();

        if (fetchError || !currentDoc) {
            console.error(`❌ Failed to fetch current ${table} state:`, fetchError?.message);
            // Continue with zero defaults if fetch fails — better than blocking the entire receipt
            console.warn('⚠️ Proceeding with zero defaults for partial receipt tracking');
        }

        const prevDetail: any[] = Array.isArray((currentDoc as any)?.received_items_detail) ? (currentDoc as any).received_items_detail : [];
        const prevTotalQty = Number((currentDoc as any)?.total_received_quantity || (currentDoc as any)?.total_received_items) || 0;
        const prevTotalAmt = Number((currentDoc as any)?.total_received_amount) || 0;

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
        // Tolerance for floating point (0.01m)
        const isFullyReceived = totalOrdered > 0 && newTotalQty >= (totalOrdered - 0.01);
        const isPartial = !isFullyReceived && newTotalQty > 0;

        // ══════════════════════════════════════════════════════════════
        // STATUS MAP — unified across all document types
        //   fully received  → 'received'
        //   partial         → 'partially_received'
        //   (sent on start) → 'in_progress'  (handled in createDraftReceipt)
        // ══════════════════════════════════════════════════════════════
        const newStatus = isFullyReceived ? 'received' : 'partially_received';

        // 6. Perform Update — adapt fields per target table
        const updateData: any = { updated_at: now };

        if (table === 'purchase_invoices') {
            // receipt_status values: 'pending' | 'in_progress' | 'partial' | 'received'
            updateData.receipt_status = isFullyReceived ? 'received' : 'partial';
            // receiving_status mirrors newStatus for granular tracking
            updateData.receiving_status = newStatus;
            updateData.total_received_quantity = newTotalQty;
            updateData.total_received_amount = newTotalAmt;
            updateData.received_items_detail = mergedDetail;
            updateData.received_at = now;
            updateData.receipt_id = receiptId;
            updateData.receipt_number = receiptNumber;

        } else if (table === 'containers') {
            // Container allowed statuses: draft|booked|loading|in_transit|at_port|customs|cleared|in_receiving|received|closed
            updateData.status = isFullyReceived ? 'received' : 'in_receiving';
            updateData.received_date = isFullyReceived ? now.split('T')[0] : null;
            updateData.total_received_items = newTotalQty;
            updateData.receiving_notes = `GRN: ${receiptNumber} — ${isFullyReceived ? 'مكتمل' : 'جزئي'}`;
            updateData.receiving_warehouse_id = params.warehouseId;

            // ═══ FIX: Update each container_item.received_quantity + received_rolls ═══
            // Fetch container_items to map material_id → item id
            const { data: containerItems } = await supabase
                .from('container_items')
                .select('id, material_id, expected_quantity, received_quantity, received_rolls')
                .eq('container_id', params.sourceDocumentId);

            if (containerItems && containerItems.length > 0) {
                for (const ci of containerItems) {
                    const matId = ci.material_id;
                    const received = currentReceiptByMaterial[matId];
                    if (!received) continue;

                    // Accumulate on top of what's already there
                    const prevQty = Number(ci.received_quantity) || 0;
                    const prevRolls = Number(ci.received_rolls) || 0;
                    const newQty = prevQty + received.quantity;
                    const newRolls = prevRolls + received.rollCount;

                    await supabase
                        .from('container_items')
                        .update({
                            received_quantity: newQty,
                            received_rolls: newRolls,
                            updated_at: now,
                        })
                        .eq('id', ci.id);

                    // Also ensure fabric_rolls.container_item_id is set correctly
                    await supabase
                        .from('fabric_rolls')
                        .update({ container_item_id: ci.id })
                        .eq('container_id', params.sourceDocumentId)
                        .eq('material_id', matId)
                        .is('container_item_id', null);
                }
                console.log(`✅ [Container] Updated received_quantity/rolls for ${containerItems.length} container_items`);

                // ═══ CRITICAL: Sync received quantities to linked purchase_transaction_items ═══
                // A container may have multiple linked purchase invoices (purchase_transactions).
                // Each purchase_transaction has items (purchase_transaction_items) with received_qty.
                // When we receive the container, we need to update those items too.
                try {
                    const { data: linkedTransactions } = await supabase
                        .from('purchase_transactions')
                        .select('id, stage')
                        .eq('container_id', params.sourceDocumentId)
                        .not('stage', 'in', '("cancelled")');

                    if (linkedTransactions && linkedTransactions.length > 0) {
                        for (const txn of linkedTransactions) {
                            // Fetch transaction items
                            const { data: txnItems } = await supabase
                                .from('purchase_transaction_items')
                                .select('id, material_id, product_id, quantity, received_qty')
                                .eq('transaction_id', txn.id);

                            if (!txnItems || txnItems.length === 0) continue;

                            let totalOrdered = 0;
                            let totalReceived = 0;

                            for (const txnItem of txnItems) {
                                const matId = txnItem.material_id || txnItem.product_id;
                                if (!matId) continue;

                                // Find the matching container_item to get actual received_quantity
                                const matchingCI = containerItems.find(ci => ci.material_id === matId);
                                if (!matchingCI) continue;

                                // Also add from current receipt
                                const currentRec = currentReceiptByMaterial[matId];
                                const prevReceivedQty = Number(txnItem.received_qty) || 0;
                                const addedQty = currentRec ? currentRec.quantity : 0;
                                const newReceivedQty = prevReceivedQty + addedQty;

                                if (addedQty > 0) {
                                    await supabase
                                        .from('purchase_transaction_items')
                                        .update({
                                            received_qty: newReceivedQty,
                                            updated_at: now,
                                        })
                                        .eq('id', txnItem.id);
                                }

                                totalOrdered += Number(txnItem.quantity) || 0;
                                totalReceived += newReceivedQty;
                            }

                            // Update transaction stage based on received status
                            const txnFullyReceived = totalOrdered > 0 && totalReceived >= (totalOrdered - 0.01);
                            const txnNewStage = txnFullyReceived ? 'received' : (totalReceived > 0 ? 'partially_received' : txn.stage);

                            if (txnNewStage !== txn.stage) {
                                await supabase
                                    .from('purchase_transactions')
                                    .update({
                                        stage: txnNewStage,
                                        updated_at: now,
                                    })
                                    .eq('id', txn.id);
                            }

                            console.log(`✅ [Container→Transaction] Synced received_qty for ${txnItems.length} items in txn ${txn.id} (stage: ${txn.stage} → ${txnNewStage})`);
                        }
                        console.log(`✅ [Container] Synced received quantities to ${linkedTransactions.length} linked purchase_transactions`);
                    }
                } catch (syncErr: any) {
                    // Non-fatal — don't block the receipt completion
                    console.warn('⚠️ [Container] Failed to sync received_qty to purchase_transaction_items (non-fatal):', syncErr.message);
                }
            }

        } else if (table === 'purchase_orders') {
            updateData.status = newStatus;

        } else {
            // LEGACY purchase_transactions
            updateData.stage = newStatus;
            updateData.status = newStatus;
        }

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

        // ════ 7. Cross-Update via DSS — مركز التحكم ════
        //   كل منطق التحديث المتضاعف في documentStatusService
        const docType = isContainer ? 'container'
            : params.sourceDocumentType === 'purchase_order' ? 'purchase_order'
                : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transaction'
                    : 'purchase_invoice';

        const dssResult = await DSS.onReceiptCompleted({
            documentType: docType,
            documentId: params.sourceDocumentId,
            companyId: params.companyId,
            receiptId,
            receiptNumber,
            isFullyReceived,
            isPartial,
            totalQty: newTotalQty,
            warehouseId: params.warehouseId,
        });

        if (dssResult.success) {
            console.log('🎛️ [DSS] Receipt completed — updated:', dssResult.updatedTables.join(', '));
        } else {
            console.warn('⚠️ [DSS] onReceiptCompleted partial failure:', dssResult.error);
        }

        return true;

    } catch (err: any) {
        console.warn('⚠️ Exception in updateSourceDocument:', err.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
//  Step 5.5: Finalize fabric_roll costs from container_items
//  Called after syncFabricRolls for containers only.
//  Updates cost_per_meter → final_unit_cost from container_items,
//  sets cost_status = 'finalized', and fills allocated_expenses.
// ─────────────────────────────────────────────────────────────
async function finalizeFabricRollCosts(containerId: string): Promise<void> {
    try {
        // Fetch container_items with final cost
        const { data: containerItems } = await supabase
            .from('container_items')
            .select('id, material_id, unit_cost, final_unit_cost')
            .eq('container_id', containerId)
            .gt('final_unit_cost', 0);

        if (!containerItems || containerItems.length === 0) return;

        for (const ci of containerItems) {
            const finalCost = Number(ci.final_unit_cost) || 0;
            const unitCost = Number(ci.unit_cost) || 0;
            if (finalCost <= 0) continue;

            await supabase
                .from('fabric_rolls')
                .update({
                    cost_per_meter: finalCost,
                    final_landed_cost: finalCost,
                    allocated_expenses: parseFloat((finalCost - unitCost).toFixed(4)),
                    cost_status: 'finalized',
                    updated_at: new Date().toISOString(),
                })
                .eq('container_item_id', ci.id)
                .neq('cost_status', 'finalized'); // skip already-finalized rolls
        }

        console.log(`✅ [Step 5.5] Finalized roll costs for ${containerItems.length} container_items in container ${containerId}`);
    } catch (err: any) {
        // Non-fatal — don't block the receipt
        console.warn('⚠️ [Step 5.5] finalizeFabricRollCosts failed (non-fatal):', err.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  Step 5: Sync fabric_rolls (ensure all are in DB)
//  ⚠️ IMPORTANT: addItem() in receiptLocalStore already syncs
//  each roll to fabric_rolls. Here we:
//  1. Update existing rolls with the GRN reference AND cost (if missing)
//  2. Insert any truly missing rolls (fallback)
// ─────────────────────────────────────────────────────────────
async function syncFabricRolls(params: ReceiptCompletionParams, receiptId: string): Promise<number> {
    let synced = 0;
    const isContainer = params.sourceDocumentType === 'container';
    const containerId = isContainer ? params.sourceDocumentId : null;

    // ═══ OPTIMIZATION: Batch rolls by category ═══
    // Category 1: Already synced (have supabaseId) → bulk update by IDs
    // Category 2: Unknown (no supabaseId) → check existence then insert/update
    const alreadySynced: { id: string; materialId: string }[] = [];
    const needsCheck: typeof params.items = [];

    for (const item of params.items) {
        if (item.supabaseId) {
            alreadySynced.push({ id: item.supabaseId, materialId: item.materialId });
        } else {
            needsCheck.push(item);
        }
    }

    // ── Batch 1: Bulk-update already-synced rolls (single query per material group) ──
    if (alreadySynced.length > 0) {
        // Group by materialId to resolve cost once per material
        const byMaterial = new Map<string, string[]>();
        for (const r of alreadySynced) {
            const arr = byMaterial.get(r.materialId) || [];
            arr.push(r.id);
            byMaterial.set(r.materialId, arr);
        }

        const batchPromises = Array.from(byMaterial.entries()).map(async ([matId, ids]) => {
            const sourceItem = params.sourceItems.find(
                si => (si.material_id || si.product_id) === matId
            );
            const costPerMeter = sourceItem?.unit_price || 0;
            const containerItemId = isContainer && sourceItem?.id ? sourceItem.id : null;

            const updateData: any = {
                notes: `GRN: ${receiptId}`,
                ...(costPerMeter > 0 ? {
                    cost_per_meter: costPerMeter,
                    supplier_unit_cost: costPerMeter,
                    estimated_landed_cost: costPerMeter,
                    cost_status: 'provisional',
                } : {}),
                ...(containerId ? {
                    container_id: containerId,
                    container_item_id: containerItemId,
                } : {}),
            };

            // Update all rolls of this material in one query
            const { error, count } = await supabase
                .from('fabric_rolls')
                .update(updateData)
                .in('id', ids);

            if (!error) return ids.length;
            console.warn(`⚠️ Batch update failed for ${ids.length} rolls:`, error.message);
            return 0;
        });

        const results = await Promise.all(batchPromises);
        synced += results.reduce((sum, n) => sum + n, 0);
    }

    // ── Batch 2: Check & insert/update unknown rolls (parallel in chunks of 10) ──
    if (needsCheck.length > 0) {
        // First, fetch ALL existing rolls in one query
        const rollNumbers = needsCheck.map(i => i.rollNumber);
        const { data: existingRolls } = await supabase
            .from('fabric_rolls')
            .select('id, roll_number, cost_per_meter, container_id')
            .eq('company_id', params.companyId)
            .in('roll_number', rollNumbers);

        const existingMap = new Map((existingRolls || []).map(r => [r.roll_number, r]));

        // Separate into updates vs inserts
        const toUpdate: { id: string; data: any }[] = [];
        const toInsert: any[] = [];

        for (const item of needsCheck) {
            const sourceItem = params.sourceItems.find(
                si => (si.material_id || si.product_id) === item.materialId
            );
            const costPerMeter = (item as any).unitPrice || sourceItem?.unit_price || 0;
            const containerItemId = isContainer && sourceItem?.id ? sourceItem.id : null;

            const existing = existingMap.get(item.rollNumber);

            if (existing?.id) {
                toUpdate.push({
                    id: existing.id,
                    data: {
                        notes: `GRN: ${receiptId}`,
                        ...(costPerMeter > 0 && (!existing.cost_per_meter || existing.cost_per_meter === 0) ? {
                            cost_per_meter: costPerMeter,
                            supplier_unit_cost: costPerMeter,
                            estimated_landed_cost: costPerMeter,
                            cost_status: 'provisional',
                        } : {}),
                        ...(containerId && !existing.container_id ? {
                            container_id: containerId,
                            container_item_id: containerItemId,
                        } : {}),
                    },
                });
            } else {
                toInsert.push({
                    tenant_id: params.tenantId,
                    company_id: params.companyId,
                    warehouse_id: params.warehouseId,
                    material_id: item.materialId,
                    roll_number: item.rollNumber,
                    initial_length: item.rollLength,
                    current_length: item.rollLength,
                    cost_per_meter: costPerMeter,
                    supplier_unit_cost: costPerMeter,
                    estimated_landed_cost: costPerMeter,
                    cost_status: costPerMeter > 0 ? 'provisional' : 'pending',
                    container_id: containerId,
                    container_item_id: containerItemId,
                    reserved_length: 0,
                    status: 'available',
                    notes: `GRN: ${receiptId}`,
                });
            }
        }

        // Parallel updates (chunks of 10)
        if (toUpdate.length > 0) {
            const updateChunks = [];
            for (let i = 0; i < toUpdate.length; i += 10) {
                updateChunks.push(toUpdate.slice(i, i + 10));
            }
            const updateResults = await Promise.all(
                updateChunks.map(chunk =>
                    Promise.all(chunk.map(u =>
                        supabase.from('fabric_rolls').update(u.data).eq('id', u.id)
                    ))
                )
            );
            synced += toUpdate.length;
        }

        // Bulk insert all new rolls in one query
        if (toInsert.length > 0) {
            const { data: inserted, error } = await supabase
                .from('fabric_rolls')
                .insert(toInsert)
                .select('id');

            if (!error) {
                synced += inserted?.length || 0;
            } else {
                console.warn('⚠️ Bulk insert failed, trying one-by-one:', error.message);
                // Fallback: insert one by one
                for (const roll of toInsert) {
                    const { error: e } = await supabase.from('fabric_rolls').insert(roll);
                    if (!e) synced++;
                }
            }
        }
    }

    console.log(`✅ [syncFabricRolls] Synced ${synced}/${params.items.length} rolls (batched)`);
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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

    const movements = Object.entries(materialGroups).map(([materialId, agg], idx) => {
        // 🔑 Get unit_cost from source item for proper cost tracking
        const sourceItem = params.sourceItems.find(si => (si.material_id || si.product_id) === materialId);
        const unitCost = sourceItem?.unit_price || 0;

        return {
            tenant_id: params.tenantId,
            company_id: params.companyId,
            product_id: materialId,  // Will work after FK is dropped by migration
            material_id: materialId, // New column — no FK constraint
            to_warehouse_id: params.warehouseId,
            movement_type: params.sourceDocumentType === 'container' ? 'container_receipt' : 'receipt',

            movement_number: `MV-GRN-${receiptNumber.replace('GRN-', '')}-${idx + 1}`,
            quantity: agg.totalLength,
            unit_cost: unitCost,       // 🔑 Required by update_inventory_stock trigger for weighted avg
            total_cost: agg.totalLength * unitCost,
            reference_type: 'goods_receipt', // Keep as goods_receipt to enable "View Invoice" button logic
            reference_id: receiptId,         // Point to the Receipt ID for linkage
            reference_number: displayRefNumber, // Show Invoice Number or GRN
            movement_date: new Date().toISOString().split('T')[0],
            created_by: currentUserId,
            notes: isDirectInvoice
                ? `${agg.rollCount} roll(s) - Invoice: ${params.sourceDocumentNumber}`
                : `${agg.rollCount} roll(s) - GRN: ${receiptNumber} (PO: ${params.sourceDocumentNumber})`,
        };
    });

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
    receiptNumber: string,
    varianceStatus?: 'ok' | 'requires_review',
    varianceAmount?: number,
    variancePct?: number
): Promise<string | null> {
    try {
        // Get current user for created_by
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        const currentUserId = user?.id || null;

        // Get Supplier ID for Entity Linking
        let supplierId = params.supplierId;
        if (!supplierId) {
            const table = params.sourceDocumentType === 'purchase_order' ? 'purchase_orders'
                : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions'
                    : params.sourceDocumentType === 'container' ? 'containers'
                        : 'purchase_invoices';
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

        // ═══════════════════════════════════════════════════════════════
        // 🔑 CONTAINER FIX: For container receipts, actualTotal must equal
        // the EXACT debit balance on the container account (sum of all
        // capitalized costs: FOB + shipping + other expenses).
        // This ensures Dr Inventory = Cr Container = container balance → ZERO.
        //
        // If we use item unit_price only, we miss the capitalized expenses
        // and leave a debit balance on the container account.
        // ═══════════════════════════════════════════════════════════════
        let containerAccountBalance: number | null = null;
        if (params.sourceDocumentType === 'container') {
            try {
                // Get container account id
                const { data: contDoc } = await supabase
                    .from('containers')
                    .select('container_account_id')
                    .eq('id', params.sourceDocumentId)
                    .single();

                if (contDoc?.container_account_id) {
                    // Sum all posted DEBIT lines on the container account
                    const { data: contLines } = await supabase
                        .from('journal_entry_lines')
                        .select('debit, credit, entry_id')
                        .eq('account_id', contDoc.container_account_id);

                    if (contLines?.length) {
                        // Get only posted entries
                        const entryIds = [...new Set(contLines.map(l => l.entry_id).filter(Boolean))];
                        const { data: postedEntries } = await supabase
                            .from('journal_entries')
                            .select('id')
                            .in('id', entryIds)
                            .eq('status', 'posted');
                        const postedSet = new Set(postedEntries?.map(e => e.id));

                        let contDr = 0, contCr = 0;
                        contLines.forEach(l => {
                            if (postedSet.has(l.entry_id)) {
                                contDr += Number(l.debit || 0);
                                contCr += Number(l.credit || 0);
                            }
                        });
                        const balance = contDr - contCr;
                        if (balance > 0) {
                            containerAccountBalance = balance;
                            console.log('✅ [Accounting] Container account balance used for GRN:',
                                { balance, contDr, contCr, itemsBased: actualTotal });
                        }
                    }
                }
            } catch (balErr) {
                console.warn('⚠️ [Accounting] Could not read container account balance, using items-based total:', balErr);
            }
        }

        // Use container account balance if available (more accurate), else fall back to items-based
        if (containerAccountBalance !== null && containerAccountBalance > 0) {
            actualTotal = containerAccountBalance;
        }

        console.log('📊 [Accounting] Totals — expected:', expectedTotal, ', actual:', actualTotal,
            ', containerAccountBalance:', containerAccountBalance,
            ', receivedByMaterial:', receivedByMaterial);


        const discrepancy = actualTotal - expectedTotal;
        const isOrder = params.sourceDocumentType === 'purchase_order';
        const isContainer = params.sourceDocumentType === 'container';

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

        if (isContainer) {
            // ═══ CONTAINER RECEIPT ═══
            // Each container has a dedicated account created by DB trigger (trg_create_container_account)
            // under parent 1143 (بضاعة بالطريق). This account is MANDATORY.
            // On receipt:  Debit Inventory (المخزون)  /  Credit Container Account (إقفال حساب الكونتينر)
            const { data: containerDoc } = await supabase
                .from('containers')
                .select('container_account_id, container_number')
                .eq('id', params.sourceDocumentId)
                .single();

            const containerAccountId = containerDoc?.container_account_id || null;

            // ❌ ABORT if no container account — this should never happen (created by trigger)
            if (!containerAccountId) {
                console.error('❌ [Accounting] Container has no container_account_id! Cannot create receipt entry.',
                    { containerId: params.sourceDocumentId });
                return null; // Skip accounting — don't create bad entries
            }

            let containerAccountName = 'حساب الكونتينر';
            const { data: accDetail } = await supabase
                .from('chart_of_accounts')
                .select('id, name_ar, name_en')
                .eq('id', containerAccountId)
                .single();
            if (accDetail) {
                containerAccountName = accDetail.name_ar || accDetail.name_en || containerAccountName;
                accountMap[accDetail.id] = { id: accDetail.id, name_ar: accDetail.name_ar, name_en: accDetail.name_en || accDetail.name_ar };
            }

            const containerNum = containerDoc?.container_number || params.sourceDocumentNumber;

            // Debit: Inventory (المخزون)  
            lines.push({
                account_id: debitAccId,
                account_name: debitAccName,
                debit: actualTotal,
                credit: 0,
                description: `استلام كونتينر ${containerNum} - نقل للمخزون`,
            });
            // Credit: Container Account (إقفال حساب الكونتينر — الحساب الثابت المرتبط)
            lines.push({
                account_id: containerAccountId,
                account_name: containerAccountName,
                debit: 0,
                credit: actualTotal,
                description: `إقفال حساب كونتينر ${containerNum}`,
                entity_type: 'supplier',
                entity_id: supplierId,
            });

            console.log('✅ [Accounting] Container Receipt Entry (Dr Inventory / Cr Container Account)', {
                containerAccountId,
                containerAccountName,
                amount: actualTotal,
            });
        } else if (isOrder) {
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

        // Build variance note for accountant (shown in description when out-of-tolerance)
        const varianceNote = varianceStatus === 'requires_review' && varianceAmount !== undefined
            ? ` | ⚠ فارق ${varianceAmount > 0 ? '+' : ''}${varianceAmount}م (${variancePct?.toFixed(1)}%) — يحتاج مراجعة`
            : '';

        // Insert the journal entry — ALWAYS posted immediately
        // Accountant can adjust amounts via journal entry edit if variance requires correction
        const { data: entryData, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                branch_id: params.branchId || null,
                entry_number: entryNumber,
                entry_date: new Date().toISOString().split('T')[0],
                description: isOrder
                    ? `قيد استلام بضائع - أمر شراء ${params.sourceDocumentNumber}${varianceNote}`
                    : `قيد استلام بضائع - فاتورة ${params.sourceDocumentNumber}${varianceNote}`,
                reference_type: 'goods_receipt',
                reference_id: receiptId,
                status: 'posted', // 🔑 Always posted — accountant adjusts entry if needed
                total_debit: lines.reduce((s, l) => s + (l.debit || 0), 0),
                total_credit: lines.reduce((s, l) => s + (l.credit || 0), 0),
                created_by: currentUserId,
                // Tag for accountant review filter
                ...(varianceStatus === 'requires_review' ? { notes: `variance:${varianceAmount}m/${variancePct?.toFixed(1)}%` } : {}),
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
            // 🔑 FIX: journal_entry_lines uses party_type/party_id (NOT entity_type/entity_id)
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
                    party_type: line.entity_type || null,
                    party_id: line.entity_id || null,
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
            : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transactions'
                : params.sourceDocumentType === 'container' ? 'containers'
                    : 'purchase_invoices';

        // Get current user for created_by
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        const currentUserId = user?.id || params.createdBy || null;

        // Build activity entries — using `document_activity` table schema:
        // entity_type, entity_id, activity_type, content, event_code, metadata, created_by
        const activities: any[] = [
            {
                tenant_id: params.tenantId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                activity_type: 'goods_received',
                event_code: 'GR_COMPLETED',
                content: `تم استلام البضائع — إذن استلام ${receiptNumber} (${params.items.length} رولون)`,
                metadata: {
                    receipt_id: receiptId,
                    receipt_number: receiptNumber,
                    warehouse_id: params.warehouseId,
                    items_count: params.items.length,
                    variance_status: params.varianceStatus,
                },
                created_by: currentUserId,
                created_at: now,
            },
            {
                tenant_id: params.tenantId,
                entity_type: 'purchase_receipts',
                entity_id: receiptId,
                activity_type: 'receipt_completed',
                event_code: 'GRN_POSTED',
                content: `${receiptNumber} — ${params.items.length} رولون${params.varianceStatus === 'requires_review' ? ' ⚠ يحتاج مراجعة' : ' ✓'}`,
                metadata: {
                    source_document_type: params.sourceDocumentType,
                    source_document_id: params.sourceDocumentId,
                    source_document_number: params.sourceDocumentNumber,
                    journal_entry_id: journalEntryId,
                    variance_status: params.varianceStatus,
                    variance_amount: params.varianceAmount,
                },
                created_by: currentUserId,
                created_at: now,
            },
        ];

        // Add journal entry activity if created
        if (journalEntryId) {
            activities.push({
                tenant_id: params.tenantId,
                entity_type: sourceTable,
                entity_id: params.sourceDocumentId,
                activity_type: 'journal_entry_created',
                event_code: 'JE_POSTED',
                content: `قيد محاسبي استلام مرحَّل — ${receiptNumber}`,
                metadata: {
                    journal_entry_id: journalEntryId,
                    receipt_number: receiptNumber,
                },
                created_by: currentUserId,
                created_at: now,
            });
        }

        const { data, error } = await supabase
            .from('document_activity')
            .insert(activities)
            .select('id');

        if (error) {
            console.warn('⚠️ Activity log failed:', error.message);
            return 0;
        }

        console.log('✅ Activity log created:', data?.length, 'entries');
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

// ─────────────────────────────────────────────────────────────
//  Variance Notification — إشعار المحاسب عند وجود فروقات
// ─────────────────────────────────────────────────────────────
async function sendVarianceNotification(
    params: ReceiptCompletionParams,
    receiptNumber: string,
): Promise<void> {
    // Find admin/super_admin users to notify
    const { data: adminRoles } = await supabase
        .from('roles')
        .select('id')
        .or('is_super_admin.eq.true,code.ilike.%admin%,code.ilike.%account%')
        .eq('tenant_id', params.tenantId);

    if (!adminRoles || adminRoles.length === 0) return;

    const roleIds = adminRoles.map(r => r.id);
    const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role_id', roleIds);

    if (!adminUsers || adminUsers.length === 0) return;

    const uniqueUserIds = [...new Set(adminUsers.map(u => u.user_id))];

    const variancePct = params.variancePct ? `${params.variancePct.toFixed(1)}%` : '';
    const varianceAmt = params.varianceAmount ? `${params.varianceAmount.toFixed(1)}` : '';

    const title = `⚠️ فروقات كميات — ${params.sourceDocumentNumber} | ⚠️ Quantity Variance — ${params.sourceDocumentNumber}`;
    const body = `إذن استلام ${receiptNumber} — فرق ${varianceAmt} متر (${variancePct}). يحتاج مراجعة محاسبية | Receipt ${receiptNumber} — variance ${varianceAmt} meters (${variancePct}). Needs accountant review`;

    const notifications = uniqueUserIds.map(userId => ({
        tenant_id: params.tenantId,
        user_id: userId,
        title,
        body,
        type: 'warning' as const,
        source_type: 'container',
        source_id: params.sourceDocumentId,
        metadata: {
            container_number: params.sourceDocumentNumber,
            receipt_number: receiptNumber,
            variance_amount: params.varianceAmount,
            variance_pct: params.variancePct,
            action_required: 'variance_review',
        },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) {
        console.warn('⚠️ Variance notification insert failed:', error.message);
    } else {
        console.log(`🔔 Variance notification sent to ${uniqueUserIds.length} user(s)`);
    }
}
