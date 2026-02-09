-- Add shipment_id to purchase_invoices to link invoices to containers/shipments
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_shipment_id ON purchase_invoices(shipment_id);

-- Ensure shipments table has necessary columns for container management
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR(100),
ADD COLUMN IF NOT EXISTS port_of_discharge VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_line VARCHAR(100),
ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS etd DATE,
ADD COLUMN IF NOT EXISTS eta DATE,
ADD COLUMN IF NOT EXISTS container_size VARCHAR(20),
ADD COLUMN IF NOT EXISTS container_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS customs_declaration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS clearance_date DATE;

-- Update status check constraint if exists (or ensure status column accepts these values)
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_status_check 
CHECK (status IN ('ordered', 'shipped', 'at_port', 'cleared', 'received', 'closed', 'cancelled'));
