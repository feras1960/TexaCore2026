-- ═══════════════════════════════════════════════════════════════════════
-- 🧹 CLEANUP ORPHANED DELIVERY DATA
-- ═══════════════════════════════════════════════════════════════════════
-- Purpose: Fix existing data issues where invoices were deleted but
-- delivery records (inventory_movements, sold rolls) remained orphaned.
--
-- Run this script AFTER deploying protect_delivered_invoices.sql
-- Date: 2026-03-31
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ Step 1: Find orphaned inventory_movements (reference_id points to deleted invoice) ═══
-- These are movements where the sales_transaction no longer exists
SELECT 
    im.id as movement_id,
    im.reference_id,
    im.reference_number,
    im.roll_id,
    im.material_id,
    im.quantity,
    im.movement_type,
    im.movement_date,
    CASE WHEN st.id IS NULL THEN '❌ ORPHANED' ELSE '✅ OK' END as status
FROM inventory_movements im
LEFT JOIN sales_transactions st ON st.id = im.reference_id
WHERE im.movement_type IN ('sale', 'issue', 'delivery')
  AND im.reference_id IS NOT NULL
ORDER BY CASE WHEN st.id IS NULL THEN 0 ELSE 1 END, im.movement_date DESC;

-- ═══ Step 2: Count orphaned records ═══
SELECT 
    'orphaned_movements' as type,
    COUNT(*) as count
FROM inventory_movements im
LEFT JOIN sales_transactions st ON st.id = im.reference_id
WHERE im.movement_type IN ('sale', 'issue', 'delivery')
  AND im.reference_id IS NOT NULL
  AND st.id IS NULL;

-- ═══ Step 3: Find rolls stuck in 'sold' status without a valid sales transaction ═══
SELECT 
    fr.id as roll_id,
    fr.roll_number,
    fr.material_id,
    fr.current_length,
    fr.status,
    fr.warehouse_id,
    im.reference_id as original_invoice_id,
    im.reference_number as original_invoice_no,
    CASE WHEN st.id IS NULL THEN '❌ ORPHANED (invoice deleted)' ELSE '✅ OK' END as invoice_status
FROM fabric_rolls fr
LEFT JOIN inventory_movements im ON im.roll_id = fr.id AND im.movement_type IN ('sale', 'issue', 'delivery')
LEFT JOIN sales_transactions st ON st.id = im.reference_id
WHERE fr.status = 'sold'
ORDER BY CASE WHEN st.id IS NULL THEN 0 ELSE 1 END, fr.roll_number;

-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ CLEANUP EXECUTION (UNCOMMENT TO RUN)
-- ═══════════════════════════════════════════════════════════════════════

-- Step 4A: Reset orphaned rolls back to 'available'
-- (Rolls that were marked 'sold' but their invoice was deleted)
/*
UPDATE fabric_rolls fr
SET status = 'available', updated_at = NOW()
WHERE fr.status = 'sold'
  AND fr.id IN (
    SELECT DISTINCT im.roll_id 
    FROM inventory_movements im
    LEFT JOIN sales_transactions st ON st.id = im.reference_id
    WHERE im.movement_type IN ('sale', 'issue', 'delivery')
      AND im.reference_id IS NOT NULL
      AND st.id IS NULL
      AND im.roll_id IS NOT NULL
  );
*/

-- Step 4B: Delete orphaned inventory_movements
/*
DELETE FROM inventory_movements im
WHERE im.movement_type IN ('sale', 'issue', 'delivery')
  AND im.reference_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sales_transactions st WHERE st.id = im.reference_id
  );
*/

-- Step 4C: Reset rolls with NO movements at all but status = 'sold'
/*
UPDATE fabric_rolls fr
SET status = 'available', updated_at = NOW()
WHERE fr.status = 'sold'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements im 
    WHERE im.roll_id = fr.id 
      AND im.movement_type IN ('sale', 'issue', 'delivery')
  );
*/

-- Step 4D: Delete orphaned journal entries (COGS entries with no invoice)
/*
DELETE FROM journal_entry_lines
WHERE entry_id IN (
    SELECT je.id FROM journal_entries je
    WHERE je.reference_type IN ('sales_invoice', 'sales_cogs')
      AND je.reference_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM sales_transactions st WHERE st.id = je.reference_id
      )
);

DELETE FROM journal_entries je
WHERE je.reference_type IN ('sales_invoice', 'sales_cogs')
  AND je.reference_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sales_transactions st WHERE st.id = je.reference_id
  );
*/

-- ═══ Step 5: Verify cleanup ═══
-- After running cleanup, check everything is clean:
/*
SELECT 'orphaned_movements' as check_type, COUNT(*) as remaining
FROM inventory_movements im
LEFT JOIN sales_transactions st ON st.id = im.reference_id
WHERE im.movement_type IN ('sale', 'issue', 'delivery') AND im.reference_id IS NOT NULL AND st.id IS NULL
UNION ALL
SELECT 'orphaned_sold_rolls', COUNT(*)
FROM fabric_rolls WHERE status = 'sold' AND id NOT IN (
    SELECT DISTINCT roll_id FROM inventory_movements WHERE roll_id IS NOT NULL AND movement_type IN ('sale', 'issue', 'delivery')
)
UNION ALL
SELECT 'orphaned_journal_entries', COUNT(*)
FROM journal_entries WHERE reference_type IN ('sales_invoice', 'sales_cogs') AND reference_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sales_transactions WHERE id = journal_entries.reference_id);
*/
