import { supabase } from '@/lib/supabase';
import { TradeDocument, TradeItem } from '../types';

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
        table: 'sales_invoices',
        itemsTable: 'sales_invoice_items',
        partyField: 'customer_id',
        dateField: 'invoice_date',
        numberField: 'invoice_number',
        amountField: 'total_amount',
        foreignKey: 'invoice_id',
    },
    // Purchase equivalents
    purchase_invoice: {
        table: 'purchase_invoices',
        itemsTable: 'purchase_invoice_items',
        partyField: 'supplier_id',
        dateField: 'invoice_date',
        numberField: 'invoice_number',
        amountField: 'total_amount',
        foreignKey: 'invoice_id',
    },
};

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

        // 1. Prepare Header payload
        const headerPayload: Record<string, any> = {
            [mapping.partyField]: doc.party_id,
            warehouse_id: doc.warehouse_id,
            [mapping.dateField]: doc.date || new Date().toISOString(),
            currency: currency || doc.currency || '',
            exchange_rate: doc.exchange_rate || 1,
            notes: doc.notes,
            status: 'draft',
            [mapping.amountField]: doc.grand_total || doc.subtotal || 0,
            subtotal: doc.subtotal || 0,
            tax_amount: doc.tax_total || 0,
        };

        // Add linked order ID for deliveries
        if (docType === 'delivery' && doc._linkedOrderId) {
            headerPayload.source_order_id = doc._linkedOrderId;
        }

        const { data: header, error: headerError } = await supabase
            .from(mapping.table)
            .insert(headerPayload)
            .select()
            .single();

        if (headerError) throw headerError;

        // 2. Insert Items
        if (doc.items && doc.items.length > 0) {
            const itemsToInsert = doc.items.map((item, index) => ({
                [mapping.foreignKey]: header.id,
                line_number: index + 1,
                product_id: item.item_id || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total,
                unit: item.unit,
                notes: item.notes,
            }));

            const { error: itemsError } = await supabase
                .from(mapping.itemsTable)
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
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

        // 4. Update invoice status to posted
        await supabase
            .from('sales_invoices')
            .update({ status: 'posted' })
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
        const targetPayload: Record<string, any> = {
            [targetMapping.partyField]: source[sourceMapping.partyField],
            warehouse_id: source.warehouse_id,
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
     * Update Trade Document
     */
    async updateTradeDocument(
        id: string,
        updates: Partial<TradeDocument>,
        docType: string = 'invoice'
    ) {
        const mapping = DOC_TYPE_TABLE_MAP[docType];
        if (!mapping) throw new Error(`Unknown document type: ${docType}`);

        const { error } = await supabase
            .from(mapping.table)
            .update({
                [mapping.amountField]: updates.grand_total || updates.subtotal,
                notes: updates.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Generate Reference Number
     */
    async getNextReferenceNumber(docType: string = 'invoice'): Promise<string> {
        const prefixes: Record<string, string> = {
            quotation: 'QUO',
            reservation: 'RES',
            order: 'SO',
            delivery: 'DN',
            invoice: 'INV',
        };
        const prefix = prefixes[docType] || 'DOC';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${year}-${random}`;
    },
};
