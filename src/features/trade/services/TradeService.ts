import { supabase } from '@/lib/supabase';
import { TradeDocument, TradeItem, PurchaseTransaction, PurchaseTransactionItem, StageAdvanceResult, TransactionStageLog } from '../types';
import type { PurchaseStage } from '../config/stageConfig';
import { documentStatusService as DSS } from '@/services/documentStatusService';


/**
 * Trade Document Table Mapping
 * يربط نوع المستند مع اسم الجدول والأعمدة المناسبة
 */
const DOC_TYPE_TABLE_MAP: Record<string, {
    table: string;
    itemsTable: string;
    partyField: string;
    dateField: string;
    numberField: string;
    amountField: string;
    foreignKey: string;
}> = {
    quotation: {
        table: 'quotations',
        itemsTable: 'quotation_items',
        partyField: 'customer_id',
        dateField: 'quotation_date',
        numberField: 'quotation_number',
        amountField: 'total_amount',
        foreignKey: 'quotation_id',
    },
    reservation: {
        table: 'transit_reservations',
        itemsTable: 'reservation_items',
        partyField: 'customer_id',
        dateField: 'reservation_date',
        numberField: 'reservation_number',
        amountField: 'total_amount',
        foreignKey: 'reservation_id',
    },
    order: {
        table: 'sales_orders',
        itemsTable: 'sales_order_items',
        partyField: 'customer_id',
        dateField: 'order_date',
        numberField: 'order_number',
        amountField: 'total_amount',
        foreignKey: 'order_id',
    },
    delivery: {
        table: 'sales_deliveries',
        itemsTable: 'delivery_note_items',
        partyField: 'customer_id',
        dateField: 'delivery_date',
        numberField: 'delivery_number',
        amountField: 'total_amount',
        foreignKey: 'delivery_id',
    },
    invoice: {
        table: 'sales_transactions',
        itemsTable: 'sales_transaction_items',
        partyField: 'customer_id',
        dateField: 'doc_date',
        numberField: 'invoice_no',
        amountField: 'total_amount',
        foreignKey: 'transaction_id',
    },
    // Purchase equivalents
    purchase_order: {
        table: 'purchase_orders',
        itemsTable: 'purchase_order_items',
        partyField: 'supplier_id',
        dateField: 'order_date',
        numberField: 'order_number',
        amountField: 'total_amount',
        foreignKey: 'order_id',
    },
    purchase_invoice: {
        table: 'purchase_transactions',
        itemsTable: 'purchase_transaction_items',
        partyField: 'supplier_id',
        dateField: 'doc_date',
        numberField: 'invoice_no',
        amountField: 'total_amount',
        foreignKey: 'transaction_id',
    },
    purchase_receipt: {
        table: 'purchase_receipts',
        itemsTable: 'purchase_receipt_items',
        partyField: 'supplier_id',
        dateField: 'receipt_date',
        numberField: 'receipt_number',
        amountField: 'total_amount',
        foreignKey: 'receipt_id',
    },
    // ═══ New Document Types (Phase 2) ═══
    purchase_return: {
        table: 'purchase_returns',
        itemsTable: 'purchase_return_items',
        partyField: 'supplier_id',
        dateField: 'return_date',
        numberField: 'return_number',
        amountField: 'total_amount',
        foreignKey: 'return_id',
    },
    sales_return: {
        table: 'sales_returns',
        itemsTable: 'sales_return_items',
        partyField: 'customer_id',
        dateField: 'return_date',
        numberField: 'return_number',
        amountField: 'total_amount',
        foreignKey: 'return_id',
    },
    purchase_quotation: {
        table: 'purchase_quotations',
        itemsTable: 'purchase_quotation_items',
        partyField: 'supplier_id',
        dateField: 'quotation_date',
        numberField: 'quotation_number',
        amountField: 'total_amount',
        foreignKey: 'quotation_id',
    },
    purchase_request: {
        table: 'purchase_requests',
        itemsTable: 'purchase_request_items',
        partyField: 'requested_by',
        dateField: 'request_date',
        numberField: 'request_number',
        amountField: 'estimated_amount',
        foreignKey: 'request_id',
    },
    // ═══ Stock Transfers ═══
    stock_transfer: {
        table: 'stock_transfers',
        itemsTable: 'stock_transfer_items',
        partyField: 'from_warehouse_id', // transfers use warehouses, not parties
        dateField: 'transfer_date',
        numberField: 'transfer_number',
        amountField: 'total_meters',
        foreignKey: 'transfer_id',
    },
};

/**
 * Helper: Build a single item row for insert into any items table
 */
function buildItemRow(
    item: any,
    index: number,
    foreignKey: string,
    parentId: string,
): Record<string, any> {
    const isMaterial = !!item.material_id;

    const row: Record<string, any> = {
        [foreignKey]: parentId,
        line_number: index + 1,
        description: item.description || item.item_name || item.material_name_ar || item.material_name_en || item.item_code || '',
        item_code: item.item_code || '',
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        subtotal: Number(item.subtotal) || (Number(item.quantity) * Number(item.unit_price)) || 0,
        total: Number(item.total) || Number(item.subtotal) || 0,
        unit: item.unit || 'piece',
        notes: item.notes || null,
        // Tax & Discount
        tax_rate: Number(item.tax_rate) || 0,
        tax_amount: Number(item.tax_amount) || 0,
        discount_amount: Number(item.discount_amount) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        // Fabric-specific (color/roll)
        color_id: item.color_id || null,
        color_name: item.color_name || null,
        roll_id: item.roll_id || null,
        roll_code: item.roll_code || null,
        // Warehouse
        warehouse_id: item.warehouse_id || null,
    };

    // Route ID to proper column
    if (isMaterial) {
        row.material_id = item.material_id;
    } else if (item.item_id) {
        row.product_id = item.item_id;
    }

    return row;
}

export const TradeService = {
    /**
     * Create a trade document of any type
     * @param doc - The trade document data
     * @param docType - quotation | reservation | order | delivery | invoice
     * @param currency - Dynamic currency from company settings
     */
    async createTradeDocument(
        doc: Partial<TradeDocument>,
        docType: string = 'invoice',
        currency?: string
    ) {
        // Resolve table mapping
        const mapping = DOC_TYPE_TABLE_MAP[docType];
        if (!mapping) {
            throw new Error(`Unknown document type: ${docType}`);
        }

        // Resolve tenant_id from auth user
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;
        const tenantId = authUser?.user_metadata?.tenant_id || authUser?.app_metadata?.tenant_id;

        if (!tenantId) {
            // Fallback: try user_profiles
            if (authUser?.id) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('tenant_id')
                    .eq('id', authUser.id)
                    .single();
                if (!profile?.tenant_id) {
                    throw new Error('tenant_id not found for current user');
                }
                // Use profile tenant_id below
                (doc as any)._resolved_tenant_id = profile.tenant_id;
            } else {
                throw new Error('tenant_id not found - user not authenticated');
            }
        }

        const resolvedTenantId = tenantId || (doc as any)._resolved_tenant_id;
        const resolvedCompanyId = (doc as any).company_id;

        // Auto-generate document number
        const docNumber = await this.getNextReferenceNumber(docType);

        // 1. Prepare Header payload
        // warehouse_id exists on these tables (after Phase 1 fix)
        const TABLES_WITH_WAREHOUSE = [
            'sales_orders', 'purchase_orders', 'purchase_transactions', 'sales_transactions', 'sales_deliveries',
            'purchase_receipts', 'purchase_returns', 'sales_returns'
        ];
        const isTransfer = docType === 'stock_transfer';

        const headerPayload: Record<string, any> = {
            tenant_id: resolvedTenantId,
            ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {}),
            [mapping.numberField]: docNumber,
            [mapping.dateField]: doc.date || new Date().toISOString(),
            notes: doc.notes,
            status: 'draft',
            created_by: authUser?.id,
        };

        if (isTransfer) {
            // ═══ Transfer-specific fields ═══
            const extra = doc as any;
            const fromWh = extra.from_warehouse_id || doc.warehouse_id || extra.warehouse_id;
            const toWh = extra.to_warehouse_id;
            console.log('[TradeService] 🔄 Transfer create — from:', fromWh, 'to:', toWh, 'raw:', { from_warehouse_id: extra.from_warehouse_id, warehouse_id: doc.warehouse_id, to_warehouse_id: extra.to_warehouse_id });
            headerPayload.from_warehouse_id = fromWh;
            headerPayload.to_warehouse_id = toWh;
            headerPayload.total_rolls = (doc.items || []).length;
            headerPayload.total_meters = (doc.items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
        } else {
            // ═══ Standard trade fields ═══
            headerPayload[mapping.partyField] = doc.party_id;
            headerPayload.currency = currency || doc.currency || '';
            headerPayload.exchange_rate = doc.exchange_rate || 1;
            if (mapping.table.includes('_transactions')) {
                headerPayload.status = undefined;
                headerPayload.stage = 'draft';
            }
            headerPayload[mapping.amountField] = doc.grand_total || doc.subtotal || 0;
            headerPayload.subtotal = doc.subtotal || 0;
            headerPayload.tax_amount = doc.tax_total || 0;

            // Only add warehouse_id for tables that have this column
            if (TABLES_WITH_WAREHOUSE.includes(mapping.table) && doc.warehouse_id) {
                headerPayload.warehouse_id = doc.warehouse_id;
            }
        }

        // Purchase-specific fields
        const extra = doc as any;
        if (extra.supplier_invoice_number) headerPayload.supplier_invoice_number = extra.supplier_invoice_number;
        if (extra.supplier_invoice_date) headerPayload.supplier_invoice_date = extra.supplier_invoice_date;
        if (extra.payment_terms) headerPayload.payment_terms_days = extra.payment_terms;
        if (extra.due_date) headerPayload.due_date = extra.due_date;
        if (extra.supplier_notes) headerPayload.supplier_notes = extra.supplier_notes;
        if (extra.expenses) headerPayload.expenses = extra.expenses;
        if (extra.attachments) headerPayload.attachments = extra.attachments;

        // Add linked order ID for deliveries
        if (docType === 'delivery' && (doc as any)._linkedOrderId) {
            headerPayload.source_order_id = (doc as any)._linkedOrderId;
        }

        const { data: header, error: headerError } = await supabase
            .from(mapping.table)
            .insert(headerPayload)
            .select()
            .single();

        if (headerError) throw headerError;

        // 2. Insert Items
        if (doc.items && doc.items.length > 0) {
            if (isTransfer) {
                // Transfer items have a different structure
                const transferItems = doc.items.map((item: any) => ({
                    transfer_id: header.id,
                    material_id: item.material_id,
                    roll_id: item.roll_id || null,
                    quantity: Number(item.quantity) || 0,
                    is_jit_roll: item.is_jit_roll || false,
                    notes: item.notes || null,
                }));
                const { error: itemsError } = await supabase
                    .from(mapping.itemsTable)
                    .insert(transferItems);
                if (itemsError) {
                    console.error('[TradeService] Transfer items insert failed:', itemsError);
                }
            } else {
                const itemsToInsert = doc.items.map((item: any, index: number) =>
                    buildItemRow(item, index, mapping.foreignKey, header.id)
                );

                const { error: itemsError } = await supabase
                    .from(mapping.itemsTable)
                    .insert(itemsToInsert);

                if (itemsError && itemsError.message?.includes('material_id')) {
                    console.warn('[TradeService] material_id column not found, retrying without it...');
                    const fallbackItems = itemsToInsert.map(({ material_id, ...rest }: any) => rest);
                    const { error: retryError } = await supabase
                        .from(mapping.itemsTable)
                        .insert(fallbackItems);
                    if (retryError) throw retryError;
                } else if (itemsError) {
                    throw itemsError;
                }
            }
        }

        return header;
    },

    /**
     * POS Sale — Create invoice + auto-execute delivery + deduct inventory
     * @param doc - The invoice data with items
     * @param currency - Dynamic currency
     */
    async createPOSSale(doc: Partial<TradeDocument>, currency?: string) {
        // 1. Create the sales invoice
        const invoice = await this.createTradeDocument(doc, 'invoice', currency);

        // 2. Auto-create delivery note (status = 'delivered')
        const deliveryPayload: Record<string, any> = {
            customer_id: doc.party_id,
            warehouse_id: doc.warehouse_id,
            delivery_date: new Date().toISOString(),
            currency: currency || doc.currency || '',
            exchange_rate: doc.exchange_rate || 1,
            status: 'delivered', // Already executed
            source_invoice_id: invoice.id,
            notes: `POS Auto-Delivery for Invoice #${invoice.invoice_number || invoice.id}`,
            total_amount: doc.grand_total || doc.subtotal || 0,
            subtotal: doc.subtotal || 0,
        };

        const { data: delivery, error: deliveryError } = await supabase
            .from('sales_deliveries')
            .insert(deliveryPayload)
            .select()
            .single();

        if (deliveryError) {
            console.error('POS Auto-Delivery failed:', deliveryError);
            // Don't throw — invoice is still valid
        } else if (delivery) {
            // 🎛️ DSS: POS delivery is always fully delivered immediately
            const companyId = (doc as any).company_id;
            if (companyId) {
                await DSS.onDeliveryCompleted({
                    documentType: 'sales_delivery',
                    documentId: delivery.id,
                    companyId,
                    deliveryId: delivery.id,
                    deliveryNumber: delivery.delivery_number || delivery.id,
                    isFullyDelivered: true,
                    isPartial: false,
                    totalQty: doc.items?.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0) || 0,
                });
            }
        }

        // 3. Deduct inventory for each item
        if (doc.items && doc.items.length > 0 && doc.warehouse_id) {
            const inventoryUpdates = doc.items.map(async (item) => {
                try {
                    // Try to call the inventory deduction function
                    const { error } = await supabase.rpc('deduct_inventory', {
                        p_warehouse_id: doc.warehouse_id,
                        p_product_id: item.item_id,
                        p_quantity: item.quantity,
                        p_reference_type: 'pos_sale',
                        p_reference_id: invoice.id,
                    });
                    if (error) {
                        console.error(`Inventory deduction failed for item ${item.item_id}:`, error);
                    }
                } catch (e) {
                    console.error(`Inventory deduction error for item ${item.item_id}:`, e);
                }
            });
            await Promise.allSettled(inventoryUpdates);
        }

        // 4. Update invoice stage to posted
        await supabase
            .from('sales_transactions')
            .update({ stage: 'posted' })
            .eq('id', invoice.id);

        return { invoice, delivery };
    },

    /**
     * Convert document from one type to another
     * Copies header/items from source and creates target
     */
    async convertDocument(
        sourceId: string,
        sourceType: string,
        targetType: string,
        currency?: string
    ) {
        const sourceMapping = DOC_TYPE_TABLE_MAP[sourceType];
        const targetMapping = DOC_TYPE_TABLE_MAP[targetType];

        if (!sourceMapping || !targetMapping) {
            throw new Error(`Invalid type conversion: ${sourceType} → ${targetType}`);
        }

        // Fetch source document
        const { data: source, error: fetchError } = await supabase
            .from(sourceMapping.table)
            .select('*')
            .eq('id', sourceId)
            .single();

        if (fetchError) throw fetchError;

        // Fetch source items
        const { data: sourceItems } = await supabase
            .from(sourceMapping.itemsTable)
            .select('*')
            .eq(sourceMapping.foreignKey, sourceId);

        // Create target document
        const TABLES_WITH_WAREHOUSE = ['sales_orders', 'purchase_orders', 'sales_deliveries'];
        const targetPayload: Record<string, any> = {
            [targetMapping.partyField]: source[sourceMapping.partyField],
            [targetMapping.dateField]: new Date().toISOString(),
            currency: currency || source.currency,
            exchange_rate: source.exchange_rate || 1,
            notes: source.notes,
            status: 'draft',
            [targetMapping.amountField]: source[sourceMapping.amountField],
            subtotal: source.subtotal,
            // Link back to source
            [`source_${sourceType}_id`]: sourceId,
        };

        // Only add warehouse_id for tables that have this column
        if (TABLES_WITH_WAREHOUSE.includes(targetMapping.table) && source.warehouse_id) {
            targetPayload.warehouse_id = source.warehouse_id;
        }

        const { data: target, error: createError } = await supabase
            .from(targetMapping.table)
            .insert(targetPayload)
            .select()
            .single();

        if (createError) throw createError;

        // Copy items to target
        if (sourceItems && sourceItems.length > 0) {
            const targetItems = sourceItems.map((item: any, i: number) => ({
                [targetMapping.foreignKey]: target.id,
                line_number: i + 1,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total,
                unit: item.unit,
            }));

            await supabase
                .from(targetMapping.itemsTable)
                .insert(targetItems);
        }

        return target;
    },

    /**
     * Update Trade Document — Full update including items
     */
    async updateTradeDocument(
        id: string,
        updates: Partial<TradeDocument> & Record<string, any>,
        docType: string = 'invoice'
    ) {
        const mapping = DOC_TYPE_TABLE_MAP[docType];
        if (!mapping) throw new Error(`Unknown document type: ${docType}`);

        // Build dynamic update payload — only include defined fields
        const isTransfer = docType === 'stock_transfer';
        const payload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (isTransfer) {
            // ─── Transfer-specific fields ───
            if (updates.from_warehouse_id !== undefined) payload.from_warehouse_id = updates.from_warehouse_id;
            if (updates.to_warehouse_id !== undefined) payload.to_warehouse_id = updates.to_warehouse_id;
            if (updates.notes !== undefined) payload.notes = updates.notes;
            if (updates.date !== undefined) payload[mapping.dateField] = updates.date;
            // Recalculate totals from items
            if (updates.items) {
                payload.total_rolls = updates.items.length;
                payload.total_meters = updates.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
            }
        } else {
            const TABLES_WITH_WAREHOUSE = ['sales_orders', 'purchase_orders', 'purchase_transactions', 'sales_transactions', 'sales_deliveries',
                'purchase_receipts', 'purchase_returns', 'sales_returns'];
            if (updates.party_id !== undefined) payload[mapping.partyField] = updates.party_id;
            if (updates.warehouse_id !== undefined && TABLES_WITH_WAREHOUSE.includes(mapping.table)) {
                payload.warehouse_id = updates.warehouse_id;
            }
            if (updates.date !== undefined) payload[mapping.dateField] = updates.date;
            if (updates.currency !== undefined) payload.currency = updates.currency;
            if (updates.exchange_rate !== undefined) payload.exchange_rate = updates.exchange_rate;
            if (updates.notes !== undefined) payload.notes = updates.notes;
            if (updates.grand_total !== undefined || updates.subtotal !== undefined) {
                payload[mapping.amountField] = updates.grand_total || updates.subtotal;
            }
            if (updates.subtotal !== undefined) payload.subtotal = updates.subtotal;
            if (updates.tax_total !== undefined) payload.tax_amount = updates.tax_total;

            // ─── Purchase-specific fields ───
            if (updates.supplier_invoice_number !== undefined) payload.supplier_invoice_number = updates.supplier_invoice_number;
            if (updates.supplier_invoice_date !== undefined) payload.supplier_invoice_date = updates.supplier_invoice_date;
            if (updates.payment_terms !== undefined) payload.payment_terms_days = updates.payment_terms;
            if (updates.due_date !== undefined) payload.due_date = updates.due_date;
            if (updates.supplier_notes !== undefined) payload.supplier_notes = updates.supplier_notes;
            if (updates.receipt_mode !== undefined) payload.receipt_mode = updates.receipt_mode;

            // ─── JSONB fields ───
            if (updates.expenses !== undefined) {
                payload.expenses = updates.expenses;
                payload.expenses_total = Array.isArray(updates.expenses)
                    ? updates.expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
                    : 0;
            }
            if (updates.attachments !== undefined) payload.attachments = updates.attachments;
        }

        // 1. Update Header
        const { error } = await supabase
            .from(mapping.table)
            .update(payload)
            .eq('id', id);

        if (error) {
            // 🚨 FAILSAFE: If standard update fails (RLS), try RPC for status updates
            if (updates.status && (docType === 'purchase_order' || docType === 'purchase_invoice')) {
                console.warn(`[TradeService] Standard update failed for ${docType}, attempting RPC bypass...`);
                const rpcResult = await this.updatePurchaseStatusBypass(id, docType, updates.status);
                if (rpcResult) return; // RPC succeeded
            }
            throw error;
        }

        // 2. Update Items (delete existing + re-insert)
        if (updates.items && updates.items.length > 0) {
            // Delete existing items
            const { error: deleteError } = await supabase
                .from(mapping.itemsTable)
                .delete()
                .eq(mapping.foreignKey, id);

            if (deleteError) {
                console.error('[TradeService] Failed to delete old items:', deleteError);
            }

            if (isTransfer) {
                // Transfer items have a different structure
                const transferItems = updates.items.map((item: any) => ({
                    transfer_id: id,
                    material_id: item.material_id,
                    roll_id: item.roll_id || null,
                    quantity: Number(item.quantity) || 0,
                    is_jit_roll: item.is_jit_roll || false,
                    notes: item.notes || null,
                }));
                const { error: itemsError } = await supabase
                    .from(mapping.itemsTable)
                    .insert(transferItems);
                if (itemsError) {
                    console.error('[TradeService] Transfer items update failed:', itemsError);
                }
            } else {
                // Insert new items using shared helper
                const itemsToInsert = updates.items.map((item: any, index: number) =>
                    buildItemRow(item, index, mapping.foreignKey, id)
                );

                const { error: itemsError } = await supabase
                    .from(mapping.itemsTable)
                    .insert(itemsToInsert);

                if (itemsError && itemsError.message?.includes('material_id')) {
                    console.warn('[TradeService] material_id column not found on update, retrying without it...');
                    const fallbackItems = itemsToInsert.map(({ material_id, ...rest }: any) => rest);
                    const { error: retryError } = await supabase
                        .from(mapping.itemsTable)
                        .insert(fallbackItems);
                    if (retryError) console.error('[TradeService] Items update retry failed:', retryError);
                } else if (itemsError) {
                    console.error('[TradeService] Items update failed:', itemsError);
                }
            }
        }
    },

    /**
     * Update Purchase Document Status (RLS Bypass)
     * Uses a SECURITY DEFINER function to ensure status updates persist.
     */
    async updatePurchaseStatusBypass(id: string, docType: string, status: string): Promise<boolean> {
        const table = DOC_TYPE_TABLE_MAP[docType]?.table;
        if (!table) return false;

        try {
            const { error } = await supabase.rpc(
                'update_purchase_document_status_bypass_rls',
                {
                    p_table: table,
                    p_id: id,
                    p_status: status,
                    p_receipt_id: null,
                    p_receipt_number: null
                }
            );

            if (error) {
                console.error('[TradeService] RPC Bypass failed:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('[TradeService] RPC Exception:', err);
            return false;
        }
    },

    /**
     * Generate Draft Reference Number (temporary — replaced on confirmation)
     * Drafts get a temporary DRAFT-XXXXXX number that doesn't consume sequential IDs
     */
    async getNextReferenceNumber(_docType: string = 'invoice'): Promise<string> {
        const timestamp = Date.now().toString().slice(-6);
        return `DRAFT-${timestamp}`;
    },

    /**
     * Assign Permanent Sequential Number — called ONLY at confirmation
     * This generates a proper sequential number like PI-2026-000001
     * and updates the document in the database
     */
    async assignPermanentNumber(
        docId: string,
        docType: string,
        companyId: string,
    ): Promise<string> {
        const mapping = DOC_TYPE_TABLE_MAP[docType];
        if (!mapping) throw new Error(`Unknown document type: ${docType}`);

        // Prefix mapping per document type
        const prefixes: Record<string, string> = {
            quotation: 'SQ',
            reservation: 'RES',
            order: 'SO',
            delivery: 'DN',
            invoice: 'SI',
            purchase_quotation: 'PQ',
            purchase_order: 'PO',
            purchase_invoice: 'PI',
            purchase_receipt: 'GR',
            purchase_return: 'PR',
            purchase_request: 'REQ',
            sales_return: 'SR',
            stock_transfer: 'ST',
        };

        const prefix = prefixes[docType] || 'DOC';
        const year = new Date().getFullYear();
        const searchPattern = `${prefix}-${year}-`;

        // Query the highest existing sequential number for this prefix+year+company
        const { data } = await supabase
            .from(mapping.table)
            .select(mapping.numberField)
            .eq('company_id', companyId)
            .like(mapping.numberField, `${searchPattern}%`)
            .order(mapping.numberField, { ascending: false })
            .limit(1);

        let nextNum = 1;
        if (data && data.length > 0) {
            const lastNo = data[0][mapping.numberField];
            if (lastNo) {
                const numPart = lastNo.replace(searchPattern, '');
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed)) {
                    nextNum = parsed + 1;
                }
            }
        }

        const permanentNumber = `${prefix}-${year}-${String(nextNum).padStart(6, '0')}`;

        // Update the document with the permanent number
        const { error } = await supabase
            .from(mapping.table)
            .update({
                [mapping.numberField]: permanentNumber,
                updated_at: new Date().toISOString(),
            })
            .eq('id', docId);

        if (error) {
            // Handle unique constraint violation (race condition) — retry with next number
            if (error.code === '23505') {
                const retryNumber = `${prefix}-${year}-${String(nextNum + 1).padStart(6, '0')}`;
                const { error: retryError } = await supabase
                    .from(mapping.table)
                    .update({
                        [mapping.numberField]: retryNumber,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', docId);
                if (retryError) throw retryError;
                console.log(`📝 Permanent number assigned (retry): ${retryNumber}`);
                return retryNumber;
            }
            throw error;
        }

        console.log(`📝 Permanent number assigned: ${permanentNumber}`);
        return permanentNumber;
    },

    /**
     * Fetch a trade document WITH its items
     * Used when viewing/editing an existing document
     */
    async getTradeDocumentWithItems(
        docId: string,
        docType: string
    ): Promise<{ header: any; items: any[] }> {
        const mapping = DOC_TYPE_TABLE_MAP[docType];
        if (!mapping) {
            throw new Error(`Unknown document type: ${docType}`);
        }

        // Fetch header
        const { data: header, error: headerError } = await supabase
            .from(mapping.table)
            .select('*')
            .eq('id', docId)
            .single();

        if (headerError) throw headerError;

        // Fetch items — tables without line_number go straight to created_at ordering
        const TABLES_WITHOUT_LINE_NUMBER = new Set([
            'stock_transfer_items',
            'purchase_receipt_items',
        ]);
        const orderField = TABLES_WITHOUT_LINE_NUMBER.has(mapping.itemsTable)
            ? 'created_at'
            : 'line_number';

        let items: any[] = [];
        const { data: itemsData, error: itemsError } = await supabase
            .from(mapping.itemsTable)
            .select('*')
            .eq(mapping.foreignKey, docId)
            .order(orderField, { ascending: true });

        if (itemsError && orderField === 'line_number') {
            // Fallback to created_at if line_number doesn't exist
            const { data: fallbackData, error: fallbackError } = await supabase
                .from(mapping.itemsTable)
                .select('*')
                .eq(mapping.foreignKey, docId)
                .order('created_at', { ascending: true });

            if (fallbackError) {
                console.warn(`[TradeService] Failed to fetch items from ${mapping.itemsTable}:`, fallbackError.message);
            } else {
                items = fallbackData || [];
            }
        } else if (itemsError) {
            console.warn(`[TradeService] Failed to fetch items from ${mapping.itemsTable}:`, itemsError.message);
        } else {
            items = itemsData || [];
        }

        // ── إثراء بنود المناقلة بأسماء المواد (stock_transfer_items لا يحتوي على اسم المادة) ──
        if (docType === 'stock_transfer' && items.length > 0) {
            const materialIds = [...new Set(items.map((i: any) => i.material_id).filter(Boolean))];
            if (materialIds.length > 0) {
                const { data: materials } = await supabase
                    .from('fabric_materials')
                    .select('id, name_ar, name_en, code')
                    .in('id', materialIds);

                const matMap = new Map((materials || []).map((m: any) => [m.id, m]));
                items = items.map((item: any) => {
                    const mat = matMap.get(item.material_id);
                    return {
                        ...item,
                        material_name_ar: mat?.name_ar || '',
                        material_name_en: mat?.name_en || '',
                        item_code: mat?.code || '',
                        description: mat?.name_ar || '',
                    };
                });
            }
        }

        // ── إثراء البنود بالرولونات واسم المستودع (فواتير المبيعات المسلَّمة) ──
        if (docType === 'invoice' && header?.stage && ['delivered', 'posted', 'in_delivery', 'in_transit', 'sent_to_branch', 'at_branch', 'completed', 'confirmed'].includes(header.stage) && items.length > 0) {
            let rollsByMat: Record<string, any[]> = {};
            let deliveryWarehouseNameAr: string | null = null;
            let deliveryWarehouseNameEn: string | null = null;
            let deliveryWarehouseId: string | null = null;

            // الطريقة 1: delivery_notes + delivery_note_items (no FK embeds — separate queries)
            try {
                const { data: deliveryNotes } = await supabase
                    .from('delivery_notes')
                    .select('id, warehouse_id')
                    .eq('sales_order_id', docId);

                if (deliveryNotes && deliveryNotes.length > 0) {
                    // Warehouse name
                    const firstDn = deliveryNotes[0];
                    if (firstDn.warehouse_id) {
                        deliveryWarehouseId = firstDn.warehouse_id;
                        const { data: wh } = await supabase
                            .from('warehouses').select('name_ar, name_en')
                            .eq('id', firstDn.warehouse_id).maybeSingle();
                        deliveryWarehouseNameAr = wh?.name_ar || null;
                        deliveryWarehouseNameEn = wh?.name_en || null;
                    }

                    // Items: delivery_note_items for these notes
                    const dnIds = deliveryNotes.map((d: any) => d.id);
                    const { data: dnItems } = await supabase
                        .from('delivery_note_items')
                        .select('roll_id, material_id, quantity_delivered')
                        .in('delivery_note_id', dnIds)
                        .not('roll_id', 'is', null);

                    if (dnItems && dnItems.length > 0) {
                        const rollIds = dnItems.map((d: any) => d.roll_id).filter(Boolean);
                        const { data: rollsData } = await supabase
                            .from('fabric_rolls')
                            .select('id, roll_number, current_length, status, color_name')
                            .in('id', rollIds);
                        const rollMap = new Map((rollsData || []).map((r: any) => [r.id, r]));

                        for (const di of dnItems) {
                            if (!di.material_id || !di.roll_id) continue;
                            const roll = rollMap.get(di.roll_id);
                            if (!roll) continue;
                            if (!rollsByMat[di.material_id]) rollsByMat[di.material_id] = [];
                            rollsByMat[di.material_id].push({
                                roll_id: roll.id,
                                roll_number: roll.roll_number,
                                length: di.quantity_delivered || roll.current_length,
                                status: roll.status,
                                color_name: roll.color_name || undefined,
                            });
                        }
                    }
                }
            } catch { /* ignore */ }

            // الطريقة 2: inventory_movements (تحتوي roll_id)
            if (Object.keys(rollsByMat).length === 0) {
                try {
                    const { data: movements, error: movementsErr } = await supabase
                        .from('inventory_movements')
                        .select('roll_id, material_id, quantity')
                        .eq('reference_id', docId)
                        .eq('reference_type', 'sale_invoice')
                        .not('roll_id', 'is', null);

                    if (movementsErr) console.error('[fetchById] ❌ Movements Method 2 Error:', movementsErr);
                    console.log('[fetchById] 📦 Method 2 movements count:', movements?.length);

                    if (movements && movements.length > 0) {
                        const seenRolls = new Set<string>();
                        const uniqueMovements = movements.filter((m: any) => {
                            if (seenRolls.has(m.roll_id)) return false;
                            seenRolls.add(m.roll_id);
                            return true;
                        });

                        const rollIds = uniqueMovements.map((m: any) => m.roll_id);
                        const { data: rollsData } = await supabase
                            .from('fabric_rolls')
                            .select('id, roll_number, current_length, status, material_id, color_name')
                            .in('id', rollIds);
                        const rollMap = new Map((rollsData || []).map((r: any) => [r.id, r]));

                        for (const mv of uniqueMovements) {
                            const matId = mv.material_id || rollMap.get(mv.roll_id)?.material_id;
                            if (!matId) continue;
                            const roll = rollMap.get(mv.roll_id);
                            if (!rollsByMat[matId]) rollsByMat[matId] = [];
                            rollsByMat[matId].push({
                                roll_id: mv.roll_id,
                                roll_number: roll?.roll_number || '',
                                length: mv.quantity || roll?.current_length || 0,
                                status: roll?.status || 'in_transit',
                                color_name: roll?.color_name || undefined,
                            });
                        }
                    }
                } catch (e: any) { 
                    console.error('[fetchById] ❌ Exception in Method 2:', e);
                }
            }

            // الطريقة 3: fallback — fabric_rolls
            if (Object.keys(rollsByMat).length === 0) {
                const matIds = [...new Set(items.map((i: any) => i.material_id).filter(Boolean))];
                if (matIds.length > 0) {
                    const { data: rolls } = await supabase
                        .from('fabric_rolls')
                        .select('id, roll_number, current_length, status, material_id, color_name')
                        .in('material_id', matIds)
                        .in('status', ['sold', 'delivered', 'in_transit']);
                    if (rolls && rolls.length > 0) {
                        for (const r of rolls) {
                            if (!rollsByMat[r.material_id]) rollsByMat[r.material_id] = [];
                            rollsByMat[r.material_id].push({
                                roll_id: r.id, roll_number: r.roll_number,
                                length: r.current_length, status: r.status,
                                color_name: r.color_name || undefined,
                            });
                        }
                    }
                }
            }

            // جلب اسم المستودع إن لزم
            if (deliveryWarehouseId && !deliveryWarehouseNameAr) {
                try {
                    const { data: wh } = await supabase
                        .from('warehouses').select('name_ar, name_en').eq('id', deliveryWarehouseId).maybeSingle();
                    if (wh) { deliveryWarehouseNameAr = wh.name_ar; deliveryWarehouseNameEn = wh.name_en; }
                } catch { /* ignore */ }
            }

            // تطبيق الرولونات واسم المستودع على كل بند
            items = items.map((item: any) => {
                const rolls = rollsByMat[item.material_id] || [];
                const deliveredQty = rolls.reduce((s: number, r: any) => s + Number(r.length || 0), 0);
                console.log(`[fetchById] 🛠️ Item ${item.material_id} - found ${rolls.length} rolls from methods.`);
                return {
                    ...item,
                    delivery_rolls: rolls,
                    delivered_qty: deliveredQty || item.delivered_qty || 0,
                    warehouse_name_ar: deliveryWarehouseNameAr || item.warehouse_name_ar || null,
                    warehouse_name_en: deliveryWarehouseNameEn || item.warehouse_name_en || null,
                };
            });

            // إضافة معلومات المستودع للـ header
            if (deliveryWarehouseNameAr) {
                header.delivery_warehouse_name_ar = deliveryWarehouseNameAr;
                header.delivery_warehouse_name_en = deliveryWarehouseNameEn;
                header.delivery_warehouse_id = deliveryWarehouseId;
            }
        }

        return { header, items };
    },

    // ═══════════════════════════════════════════════════════════════
    // 🆕 Unified Transaction Methods (purchase_transactions)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a new unified purchase transaction (starts as draft)
     */
    async createUnifiedTransaction(
        data: Partial<PurchaseTransaction>,
        items?: Partial<PurchaseTransactionItem>[],
        transactionType: 'purchase' | 'sale' = 'purchase'
    ): Promise<PurchaseTransaction> {
        const table = transactionType === 'purchase' ? 'purchase_transactions' : 'sales_transactions';
        const itemsTable = transactionType === 'purchase' ? 'purchase_transaction_items' : 'sales_transaction_items';

        // Resolve auth
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;
        if (!authUser) throw new Error('User not authenticated');

        const tenantId = authUser.user_metadata?.tenant_id || authUser.app_metadata?.tenant_id;
        if (!tenantId) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('id', authUser.id)
                .single();
            if (!profile?.tenant_id) throw new Error('tenant_id not found');
            data.tenant_id = profile.tenant_id;
        } else {
            data.tenant_id = tenantId;
        }

        // Build header
        const header: Record<string, any> = {
            tenant_id: data.tenant_id,
            company_id: data.company_id,
            branch_id: data.branch_id || null,
            stage: 'draft',
            doc_date: data.doc_date || new Date().toISOString().split('T')[0],
            currency: data.currency || '',
            exchange_rate: data.exchange_rate || 1,
            supplier_id: data.supplier_id || null,
            supplier_name: data.supplier_name || null,
            warehouse_id: data.warehouse_id || null,
            receipt_mode: data.receipt_mode || 'direct',
            container_id: (data as any).container_id || null,
            subtotal: Number(data.subtotal) || 0,
            discount_amount: Number(data.discount_amount) || 0,
            discount_percent: Number(data.discount_percent) || 0,
            tax_amount: Number(data.tax_amount) || 0,
            expenses_total: Number(data.expenses_total) || 0,
            total_amount: Number(data.total_amount) || 0,
            paid_amount: 0,
            balance: Number(data.total_amount) || 0,
            payment_terms_days: data.payment_terms_days || 0,
            notes: data.notes || null,
            supplier_notes: data.supplier_notes || null,
            internal_notes: data.internal_notes || null,
            expenses: data.expenses || null,
            created_by: authUser.id,
            created_by_name: authUser.user_metadata?.full_name || authUser.email || '',
        };

        const { data: created, error } = await supabase
            .from(table)
            .insert(header)
            .select()
            .single();

        if (error) throw error;

        // Insert items
        if (items && items.length > 0) {
            const itemRows = items.map((item, index) => ({
                transaction_id: created.id,
                line_number: index + 1,
                product_id: item.product_id || null,
                material_id: item.material_id || null,
                item_code: item.item_code || '',
                description: item.description || '',
                description_ar: item.description_ar || '',
                quantity: Number(item.quantity) || 0,
                received_qty: 0,
                returned_qty: 0,
                unit: item.unit || 'piece',
                unit_price: Number(item.unit_price) || 0,
                discount_amount: Number(item.discount_amount) || 0,
                discount_percent: Number(item.discount_percent) || 0,
                tax_rate: Number(item.tax_rate) || 0,
                tax_amount: Number(item.tax_amount) || 0,
                subtotal: Number(item.subtotal) || 0,
                total: Number(item.total) || 0,
                color_id: item.color_id || null,
                color_name: item.color_name || null,
                roll_id: item.roll_id || null,
                roll_code: item.roll_code || null,
                rolls_count: item.rolls_count || null,
                warehouse_id: item.warehouse_id || null,
                cost_price: item.cost_price || null,
                notes: item.notes || null,
            }));

            const { error: itemsError } = await supabase
                .from(itemsTable)
                .insert(itemRows);

            if (itemsError) throw itemsError;
        }

        return created as PurchaseTransaction;
    },

    /**
     * Update a unified transaction (header + items)
     */
    async updateUnifiedTransaction(
        id: string,
        data: Partial<PurchaseTransaction>,
        items?: Partial<PurchaseTransactionItem>[],
        transactionType: 'purchase' | 'sale' = 'purchase'
    ): Promise<PurchaseTransaction> {
        const table = transactionType === 'purchase' ? 'purchase_transactions' : 'sales_transactions';
        const itemsTable = transactionType === 'purchase' ? 'purchase_transaction_items' : 'sales_transaction_items';

        // Remove read-only fields
        const { id: _id, tenant_id, created_at, created_by, version, ...updateData } = data as any;

        // Update header
        const { data: updated, error } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Replace items if provided
        if (items) {
            // Delete existing items
            await supabase.from(itemsTable).delete().eq('transaction_id', id);

            // Insert new items
            if (items.length > 0) {
                const itemRows = items.map((item, index) => ({
                    transaction_id: id,
                    line_number: index + 1,
                    product_id: item.product_id || null,
                    material_id: item.material_id || null,
                    item_code: item.item_code || '',
                    description: item.description || '',
                    description_ar: item.description_ar || '',
                    quantity: Number(item.quantity) || 0,
                    received_qty: Number(item.received_qty) || 0,
                    returned_qty: Number(item.returned_qty) || 0,
                    unit: item.unit || 'piece',
                    unit_price: Number(item.unit_price) || 0,
                    discount_amount: Number(item.discount_amount) || 0,
                    discount_percent: Number(item.discount_percent) || 0,
                    tax_rate: Number(item.tax_rate) || 0,
                    tax_amount: Number(item.tax_amount) || 0,
                    subtotal: Number(item.subtotal) || 0,
                    total: Number(item.total) || 0,
                    color_id: item.color_id || null,
                    color_name: item.color_name || null,
                    roll_id: item.roll_id || null,
                    roll_code: item.roll_code || null,
                    rolls_count: item.rolls_count || null,
                    warehouse_id: item.warehouse_id || null,
                    cost_price: item.cost_price || null,
                    landed_cost: item.landed_cost || null,
                    notes: item.notes || null,
                }));

                const { error: itemsError } = await supabase
                    .from(itemsTable)
                    .insert(itemRows);

                if (itemsError) throw itemsError;
            }
        }

        return updated as PurchaseTransaction;
    },

    /**
     * Get a unified transaction by ID with items and stage logs
     */
    async getUnifiedById(
        id: string,
        transactionType: 'purchase' | 'sale' = 'purchase',
        options: { withItems?: boolean; withLogs?: boolean } = { withItems: true, withLogs: true }
    ): Promise<{ transaction: PurchaseTransaction; items: PurchaseTransactionItem[]; logs: TransactionStageLog[] }> {
        const table = transactionType === 'purchase' ? 'purchase_transactions' : 'sales_transactions';
        const itemsTable = transactionType === 'purchase' ? 'purchase_transaction_items' : 'sales_transaction_items';

        // Fetch header
        const { data: transaction, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fetch items
        let items: PurchaseTransactionItem[] = [];
        if (options.withItems) {
            const { data: itemsData } = await supabase
                .from(itemsTable)
                .select('*')
                .eq('transaction_id', id)
                .order('line_number', { ascending: true });
            items = (itemsData || []) as PurchaseTransactionItem[];
        }

        // Fetch stage logs
        let logs: TransactionStageLog[] = [];
        if (options.withLogs) {
            const { data: logsData } = await supabase
                .from('transaction_stage_log')
                .select('*')
                .eq('transaction_id', id)
                .eq('transaction_type', transactionType)
                .order('performed_at', { ascending: true });
            logs = (logsData || []) as TransactionStageLog[];
        }

        return { transaction: transaction as PurchaseTransaction, items, logs };
    },

    /**
     * List unified transactions with filters
     */
    async getUnifiedList(
        transactionType: 'purchase' | 'sale' = 'purchase',
        filters: {
            stage?: PurchaseStage | PurchaseStage[];
            supplier_id?: string;
            dateFrom?: string;
            dateTo?: string;
            search?: string;
            companyId?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ data: PurchaseTransaction[]; count: number }> {
        const table = transactionType === 'purchase' ? 'purchase_transactions' : 'sales_transactions';

        let query = supabase
            .from(table)
            .select('*', { count: 'exact' })
            .eq('is_active', true);

        if (filters.companyId) {
            query = query.eq('company_id', filters.companyId);
        }

        if (filters.stage) {
            if (Array.isArray(filters.stage)) {
                query = query.in('stage', filters.stage);
            } else {
                query = query.eq('stage', filters.stage);
            }
        }

        if (filters.supplier_id) {
            query = query.eq('supplier_id', filters.supplier_id);
        }

        if (filters.dateFrom) {
            query = query.gte('doc_date', filters.dateFrom);
        }

        if (filters.dateTo) {
            query = query.lte('doc_date', filters.dateTo);
        }

        if (filters.search) {
            query = query.or(`supplier_name.ilike.%${filters.search}%,draft_no.ilike.%${filters.search}%,order_no.ilike.%${filters.search}%,invoice_no.ilike.%${filters.search}%`);
        }

        query = query
            .order('updated_at', { ascending: false })
            .range(
                filters.offset || 0,
                (filters.offset || 0) + (filters.limit || 50) - 1
            );

        const { data, count, error } = await query;
        if (error) throw error;

        return { data: (data || []) as PurchaseTransaction[], count: count || 0 };
    },

    /**
     * Advance transaction stage via RPC (calls advance_transaction_stage DB function)
     */
    async advanceStage(
        transactionId: string,
        targetStage: PurchaseStage,
        transactionType: 'purchase' | 'sale' = 'purchase',
        options?: { notes?: string; cancellation_reason?: string; companyId?: string; }
    ): Promise<StageAdvanceResult> {
        const { data, error } = await supabase.rpc('advance_transaction_stage', {
            p_type: transactionType,
            p_transaction_id: transactionId,
            p_new_stage: targetStage,
            p_notes: options?.notes || null,
            p_cancellation_reason: options?.cancellation_reason || null,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // 🎛️ DSS: Sync status on key stage transitions
        if (options?.companyId) {
            const companyId = options.companyId;

            if (transactionType === 'purchase' && targetStage === 'posted') {
                // فاتورة شراء تُرحَّل → حالتها تصبح pending (جاهزة للاستلام)
                await DSS.onReceiptStarted({
                    documentType: 'purchase_transaction',
                    documentId: transactionId,
                    companyId,
                });
            }

            if (transactionType === 'sale' && (targetStage === 'posted' || targetStage === 'confirmed')) {
                // فاتورة مبيعات → تُصبح pending delivery
                await DSS.onDeliveryStarted({
                    documentType: 'sales_invoice',
                    documentId: transactionId,
                    companyId,
                });
            }
        }

        return {
            success: true,
            from_stage: data?.from_stage,
            to_stage: data?.to_stage,
            generated_number: data?.generated_number,
            performed_by: data?.performed_by,
            performed_by_name: data?.performed_by_name,
        };
    },

    /**
     * Delete a unified transaction (soft delete — sets is_active = false)
     */
    async deleteUnifiedTransaction(
        id: string,
        transactionType: 'purchase' | 'sale' = 'purchase'
    ): Promise<void> {
        const table = transactionType === 'purchase' ? 'purchase_transactions' : 'sales_transactions';

        const { error } = await supabase
            .from(table)
            .update({ is_active: false })
            .eq('id', id)
            .in('stage', ['draft', 'cancelled']); // Only allow delete for drafts and cancelled

        if (error) throw error;
    },

    /**
     * Duplicate a transaction as a new draft
     */
    async duplicateUnifiedTransaction(
        sourceId: string,
        transactionType: 'purchase' | 'sale' = 'purchase'
    ): Promise<PurchaseTransaction> {
        // Fetch source
        const { transaction, items } = await this.getUnifiedById(sourceId, transactionType, { withItems: true, withLogs: false });

        // Create new draft from source
        const newData: Partial<PurchaseTransaction> = {
            company_id: transaction.company_id,
            branch_id: transaction.branch_id,
            supplier_id: transaction.supplier_id,
            supplier_name: transaction.supplier_name,
            warehouse_id: transaction.warehouse_id,
            receipt_mode: transaction.receipt_mode,
            currency: transaction.currency,
            exchange_rate: transaction.exchange_rate,
            subtotal: transaction.subtotal,
            discount_amount: transaction.discount_amount,
            discount_percent: transaction.discount_percent,
            tax_amount: transaction.tax_amount,
            expenses_total: transaction.expenses_total,
            total_amount: transaction.total_amount,
            payment_terms_days: transaction.payment_terms_days,
            notes: transaction.notes,
            supplier_notes: transaction.supplier_notes,
            internal_notes: transaction.internal_notes,
            expenses: transaction.expenses,
        };

        // Reset received quantities for items
        const newItems = items.map(item => ({
            ...item,
            id: undefined,
            transaction_id: undefined,
            received_qty: 0,
            returned_qty: 0,
            created_at: undefined,
            updated_at: undefined,
        })) as Partial<PurchaseTransactionItem>[];

        return this.createUnifiedTransaction(newData, newItems, transactionType);
    },
};
