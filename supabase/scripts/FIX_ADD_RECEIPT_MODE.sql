-- ═══════════════════════════════════════════════════════════════
-- Add receipt_mode to purchase_orders and purchase_invoices
-- Values: 'direct' (domestic/local) | 'international' (container/shipping)
-- Default: 'direct'
-- ═══════════════════════════════════════════════════════════════

-- Add receipt_mode column with default 'direct'
ALTER TABLE purchase_orders 
    ADD COLUMN IF NOT EXISTS receipt_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (receipt_mode IN ('direct', 'international'));

ALTER TABLE purchase_invoices 
    ADD COLUMN IF NOT EXISTS receipt_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (receipt_mode IN ('direct', 'international'));

-- Create indexes for filtering by receipt_mode
CREATE INDEX IF NOT EXISTS idx_purchase_orders_receipt_mode ON purchase_orders(receipt_mode);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_receipt_mode ON purchase_invoices(receipt_mode);

-- Verify
SELECT 'receipt_mode added successfully ✅' as result;
