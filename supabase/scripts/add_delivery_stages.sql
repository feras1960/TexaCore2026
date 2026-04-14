-- ════════════════════════════════════════════════════════════════
-- 🚛 Migration: Add delivery stages to sales_transactions
-- ════════════════════════════════════════════════════════════════
-- Adds: 'in_transit', 'at_branch', 'returned' to stage constraint
-- ════════════════════════════════════════════════════════════════

-- 1. Drop old constraint
ALTER TABLE sales_transactions DROP CONSTRAINT IF EXISTS sales_transactions_stage_check;

-- 2. Add updated constraint with delivery flow stages
ALTER TABLE sales_transactions ADD CONSTRAINT sales_transactions_stage_check 
CHECK (stage = ANY(ARRAY[
    'quotation','reservation','draft','confirmed',
    'in_delivery','in_transit','at_branch',
    'delivered','posted',
    'returned','cancelled','partially_paid','paid'
]));

-- 3. Verify
SELECT 'Stage constraint updated ✅' AS result;
