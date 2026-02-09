import { supabase } from '@/lib/supabase';
import { TradeDocument, TradeItem } from '../types';

export const TradeService = {
    // === Create New Trade Document ===
    async createTradeDocument(doc: TradeDocument, mode: 'sales' | 'purchase') {
        const tableName = mode === 'sales' ? 'sales_invoices' : 'purchase_invoices';
        const partyField = mode === 'sales' ? 'customer_id' : 'supplier_id';
        const itemsTableName = mode === 'sales' ? 'sales_invoice_items' : 'purchase_invoice_items';
        const invoiceKey = mode === 'sales' ? 'invoice_id' : 'invoice_id'; // assuming same key name

        // 1. Prepare Header payload
        const headerPayload = {
            [partyField]: doc.party_id,
            warehouse_id: doc.warehouse_id,
            invoice_number: doc.reference_number,
            invoice_date: doc.date,
            currency: 'SAR',
            exchange_rate: doc.exchange_rate || 1,
            notes: doc.notes,
            status: 'draft',
            total_amount: doc.total_amount,
            subtotal: doc.total_amount, // simplification
            tax_amount: 0,
            // created_by, tenant_id handled by RLS/Trigger or Auth context if needed
        };

        const { data: header, error: headerError } = await supabase
            .from(tableName)
            .insert(headerPayload)
            .select()
            .single();

        if (headerError) throw headerError;

        // 2. Insert Items
        if (doc.items && doc.items.length > 0) {
            // Note: Schema might require product_id. 
            // If items are text-based (adhoc), ensure table supports NULL product_id or use special placeholder.
            const itemsToInsert = doc.items.map((item, index) => ({
                [invoiceKey]: header.id,
                line_number: index + 1,
                // product_id: ... needs to be handled if item selected
                // item_description: item.item_name, // Mapping item name to description
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total,
                // unit: item.unit,
            }));

            const { error: itemsError } = await supabase
                .from(itemsTableName)
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return header;
    },

    // === Update Trade Document ===
    async updateTradeDocument(id: string, updates: Partial<TradeDocument>, mode: 'sales' | 'purchase') {
        const tableName = mode === 'sales' ? 'sales_invoices' : 'purchase_invoices';

        // Update header
        const { error } = await supabase
            .from(tableName)
            .update({
                total_amount: updates.total_amount,
                notes: updates.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Full update of items logic would go here (delete + re-insert)
    },

    // === Generate Reference Number ===
    async getNextReferenceNumber(mode: 'sales' | 'purchase'): Promise<string> {
        const prefix = mode === 'sales' ? 'INV-SAL' : 'INV-PUR';
        const year = new Date().getFullYear();
        // Mock generation - ideally call a backend function or query max
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${year}-${random}`;
    }
};
