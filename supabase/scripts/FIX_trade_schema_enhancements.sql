-- ═══════════════════════════════════════════════════════════════
-- Enhancing Trade Schema for TexaCore
-- 1. Linking Purchase Invoices to Shipments/Containers
-- 2. Adding Layout/Roll support to Purchase Items
-- 3. Creating Attachments Table
-- ═══════════════════════════════════════════════════════════════

-- 1. Link Purchase Invoices to Shipments (For Landed Cost)
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_invoices.shipment_id IS 'Link to Shipment/Container for Landed Cost Allocation';

-- 2. Link Purchase Orders to Shipments (Optional, early link)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL;

-- 3. Add Roll Support to Purchase Items
ALTER TABLE purchase_invoice_items 
ADD COLUMN IF NOT EXISTS roll_id UUID REFERENCES fabric_rolls(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rolls_count INT DEFAULT 0; -- How many rolls this line represents (if bulk)

COMMENT ON COLUMN purchase_invoice_items.roll_id IS 'Specific Roll ID if purchasing a single tracked roll';
COMMENT ON COLUMN purchase_invoice_items.rolls_count IS 'Number of rolls if purchasing bulk fabric';

-- 4. Create Attachments Table
CREATE TABLE IF NOT EXISTS document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Polymorphic Parent (Can be Purchase Invoice, Order, Customer, etc.)
    parent_id UUID NOT NULL, 
    parent_type VARCHAR(50) NOT NULL, -- 'purchase_invoice', 'sales_order', etc.
    
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100), -- 'pdf', 'image/jpeg', etc.
    file_size BIGINT,
    
    category VARCHAR(50) DEFAULT 'general', -- 'packing_list', 'bill_of_lading', 'contract'
    
    uploaded_by UUID REFERENCES user_profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    notes TEXT
);

-- Indexes for Attachments
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON document_attachments(parent_id, parent_type);
CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON document_attachments(tenant_id);

-- RLS for Attachments
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on attachments" ON document_attachments;
CREATE POLICY "Enable all access for authenticated users on attachments" 
ON document_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Add Reservation Status/ID to Sales Orders (Logic Support)
-- If Reservation is a distinct document (transit_reservations exists), we link it.
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES transit_reservations(id);

-- 6. Grant Permissions
GRANT ALL ON document_attachments TO authenticated;
