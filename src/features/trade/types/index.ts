export type TradeDocumentType = 'purchase_order' | 'purchase_invoice' | 'sales_order' | 'sales_invoice' | 'quotation' | 'delivery_note' | 'reservation';

export type TradeDocumentStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'completed' | 'cancelled';

export interface TradeDocument {
    id: string;
    tenant_id: string;
    type: TradeDocumentType; // Derived logic
    status: TradeDocumentStatus;

    // Header Info
    date: string;
    due_date?: string;
    reference_number: string; // e.g., PO-2024-0001
    external_reference?: string; // Vendor Bill No.

    // Parties
    party_id: string; // supplier_id or customer_id
    party_name: string;

    // Warehouse & Logistics
    warehouse_id: string;
    warehouse_name?: string;
    shipment_id?: string; // Optional: Link to Import Shipment
    container_number?: string; // Optional: Display value

    // Financials
    currency: string;
    exchange_rate: number;
    subtotal: number;
    tax_total: number;
    discount_total: number;
    grand_total: number;

    // Workflow
    created_by: string;
    created_at: string;
    updated_at: string;
    notes?: string;

    // Relationships
    items?: TradeItem[];
    attachments?: Attachment[];
}

export interface TradeItem {
    id: string; // database ID or temp ID
    document_id?: string;

    // Product/Material Info
    item_type: 'product' | 'material' | 'service';
    item_id: string; // product_id or material_id
    item_code: string;
    item_name: string;
    item_name_ar?: string;

    // Roll Details (Specific for Fabric)
    color_id?: string;
    color_name?: string;
    roll_id?: string; // If selling a specific roll
    roll_code?: string; // Display

    // Quantity
    quantity: number; // In base unit
    unit: string; // 'meter', 'kg', 'piece'
    rolls_count?: number; // How many rolls if bulk

    // Pricing
    unit_price: number;
    discount_amount: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;

    // Costing (Hidden usually)
    cost_price?: number;

    notes?: string;
}

export interface Attachment {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
}

// For the Grid Fast Input
export interface GridRollItem {
    id: string; // temp unique
    material_id: string;
    color_id: string;
    roll_length: number;
    is_saved: boolean;
}
