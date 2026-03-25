-- ═══════════════════════════════════════════════════════════════
-- Fix: Add material_id column to purchase_invoice_items
-- The column was defined in migration 00008 but not present in DB
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE purchase_invoice_items 
  ADD COLUMN IF NOT EXISTS material_id UUID;

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_material_id 
  ON purchase_invoice_items(material_id);

-- Comment
COMMENT ON COLUMN purchase_invoice_items.material_id IS 'Fabric material reference (from fabric_materials table)';
