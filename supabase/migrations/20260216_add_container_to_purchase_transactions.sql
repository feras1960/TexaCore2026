-- ═══════════════════════════════════════════════════════════════
-- إضافة ربط الفاتورة بالكونتينر مباشرة
-- ═══════════════════════════════════════════════════════════════

-- 1. Add container_id to purchase_transactions
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS container_id uuid REFERENCES containers(id);
COMMENT ON COLUMN purchase_transactions.container_id IS 'الكونتينر المرتبط - يُحدّث تلقائياً عند استيراد الفاتورة للكونتينر';

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_purchase_transactions_container_id 
ON purchase_transactions(container_id) WHERE container_id IS NOT NULL;

-- 3. Backfill: Link existing invoices that are already in containers
UPDATE purchase_transactions pt
SET container_id = ci.container_id
FROM (
    SELECT DISTINCT purchase_invoice_id, container_id
    FROM container_items
    WHERE purchase_invoice_id IS NOT NULL
) ci
WHERE pt.id = ci.purchase_invoice_id
AND pt.container_id IS NULL;

-- 4. Verify
SELECT pt.id, pt.order_number, pt.container_id, c.container_number, c.status as container_status
FROM purchase_transactions pt
JOIN containers c ON c.id = pt.container_id
WHERE pt.container_id IS NOT NULL;
