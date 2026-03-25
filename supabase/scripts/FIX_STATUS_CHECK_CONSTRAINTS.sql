-- ═══════════════════════════════════════════════════════════════
-- FIX: Update status CHECK constraints to include ALL needed values
-- Including: 'confirmed', 'saved', and all other required statuses
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Drop existing status check constraints
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_status_check;
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Step 2: Recreate with ALL needed statuses
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
    CHECK (status IN ('draft', 'saved', 'pending', 'approved', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'posted', 'received', 'partially_received', 'closed'));

ALTER TABLE purchase_invoices ADD CONSTRAINT purchase_invoices_status_check 
    CHECK (status IN ('draft', 'saved', 'pending', 'approved', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'posted', 'paid', 'partially_paid', 'overdue', 'closed'));

ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_status_check 
    CHECK (status IN ('draft', 'saved', 'pending', 'approved', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'posted', 'delivered', 'partially_delivered', 'closed'));

ALTER TABLE sales_invoices ADD CONSTRAINT sales_invoices_status_check 
    CHECK (status IN ('draft', 'saved', 'pending', 'approved', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'posted', 'paid', 'partially_paid', 'overdue', 'closed'));

ALTER TABLE quotations ADD CONSTRAINT quotations_status_check 
    CHECK (status IN ('draft', 'saved', 'pending', 'approved', 'confirmed', 'sent', 'accepted', 'rejected', 'expired', 'cancelled', 'closed'));

-- Verify
SELECT 'Status constraints updated successfully ✅' as result;
