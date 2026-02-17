-- ═══════════════════════════════════════════════════════════════
-- Fix: Update purchase invoice totals from their items
-- تحديث مجاميع فواتير المشتريات من البنود
-- Date: 2026-02-12
-- ═══════════════════════════════════════════════════════════════

-- Update purchase_invoices totals from purchase_invoice_items
UPDATE purchase_invoices pi
SET 
    subtotal = COALESCE(item_totals.calc_subtotal, 0),
    total_amount = COALESCE(item_totals.calc_total, 0),
    tax_amount = COALESCE(item_totals.calc_tax, 0)
FROM (
    SELECT 
        invoice_id,
        SUM(subtotal) as calc_subtotal,
        SUM(total) as calc_total,
        SUM(COALESCE(tax_amount, 0)) as calc_tax
    FROM purchase_invoice_items
    GROUP BY invoice_id
) item_totals
WHERE pi.id = item_totals.invoice_id
  AND (pi.total_amount = 0 OR pi.total_amount IS NULL);

-- Update purchase_orders totals from purchase_order_items
UPDATE purchase_orders po
SET 
    subtotal = COALESCE(item_totals.calc_subtotal, 0),
    total_amount = COALESCE(item_totals.calc_total, 0),
    tax_amount = COALESCE(item_totals.calc_tax, 0)
FROM (
    SELECT 
        order_id,
        SUM(subtotal) as calc_subtotal,
        SUM(total) as calc_total,
        SUM(COALESCE(tax_amount, 0)) as calc_tax
    FROM purchase_order_items
    GROUP BY order_id
) item_totals
WHERE po.id = item_totals.order_id
  AND (po.total_amount = 0 OR po.total_amount IS NULL);

-- Verify results
SELECT 'purchase_invoices' as table_name, invoice_number, total_amount, subtotal, status
FROM purchase_invoices
ORDER BY created_at DESC
LIMIT 10;

SELECT 'purchase_orders' as table_name, order_number, total_amount, subtotal, status
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;
