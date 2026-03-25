-- ═══════════════════════════════════════════════════════════════
-- Migration: Receipt Tracking Columns for purchase_invoices
-- Date: 2026-02-19
-- Purpose: Add columns to track receipt progress on invoices
--          (partial/full receipts, quantities, linked GRN)
-- ═══════════════════════════════════════════════════════════════

-- 1. الكمية المستلمة التراكمية
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS total_received_quantity numeric DEFAULT 0;

-- 2. المبلغ المستلم التراكمي
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS total_received_amount numeric DEFAULT 0;

-- 3. تفاصيل البنود المستلمة (JSON: material, ordered, received)
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS received_items_detail jsonb;

-- 4. تاريخ آخر استلام
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- 5. ربط بآخر إذن استلام (FK)
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS receipt_id uuid REFERENCES purchase_receipts(id);

-- 6. رقم آخر إذن استلام (للعرض السريع)
ALTER TABLE purchase_invoices 
  ADD COLUMN IF NOT EXISTS receipt_number varchar;

-- ═══════════════════════════════════════════════════════════════
-- Comments for documentation
-- ═══════════════════════════════════════════════════════════════
COMMENT ON COLUMN purchase_invoices.total_received_quantity IS 'Cumulative received qty across all GRNs';
COMMENT ON COLUMN purchase_invoices.total_received_amount IS 'Cumulative received amount across all GRNs';
COMMENT ON COLUMN purchase_invoices.received_items_detail IS 'JSONB: per-item receipt progress [{material_id, ordered, received}]';
COMMENT ON COLUMN purchase_invoices.received_at IS 'Timestamp of last goods receipt';
COMMENT ON COLUMN purchase_invoices.receipt_id IS 'FK to most recent purchase_receipt';
COMMENT ON COLUMN purchase_invoices.receipt_number IS 'Display: most recent GRN number';
