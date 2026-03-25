-- ═══════════════════════════════════════════════════════════════
-- STEP 67: Add Missing Columns to Chart of Accounts
-- ═══════════════════════════════════════════════════════════════
-- Description: Adds external_code and other missing columns
-- Author: System
-- Date: 2026-01-30
-- ═══════════════════════════════════════════════════════════════

-- Add external_code column (for bank account numbers, etc.)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS external_code VARCHAR(100);

-- Add currency column (for multi-currency accounts)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'SAR';

-- Add is_system column (to mark system-generated accounts)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coa_external_code ON chart_of_accounts(external_code) WHERE external_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coa_currency ON chart_of_accounts(currency);
CREATE INDEX IF NOT EXISTS idx_coa_is_system ON chart_of_accounts(is_system) WHERE is_system = true;

-- Add comments
COMMENT ON COLUMN chart_of_accounts.external_code IS 'External reference code (e.g., bank account number)';
COMMENT ON COLUMN chart_of_accounts.currency IS 'Currency code for the account (ISO 4217)';
COMMENT ON COLUMN chart_of_accounts.is_system IS 'System-generated account that should not be deleted';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ STEP 67 completed successfully!';
    RAISE NOTICE '   - external_code column added';
    RAISE NOTICE '   - currency column added';
    RAISE NOTICE '   - is_system column added';
    RAISE NOTICE '   - Indexes created';
END $$;
