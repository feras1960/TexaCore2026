-- ═══════════════════════════════════════════════════════════════
-- FIX: Add warehouse_id column to purchase_orders and purchase_invoices
-- ═══════════════════════════════════════════════════════════════

-- Add warehouse_id to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- Add warehouse_id to purchase_invoices  
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_warehouse ON purchase_invoices(warehouse_id);

-- Verify
SELECT 'warehouse_id added successfully ✅' as result;
