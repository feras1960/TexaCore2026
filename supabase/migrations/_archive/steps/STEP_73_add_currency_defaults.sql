-- ═══════════════════════════════════════════════════════════════
-- STEP 73: Currency Defaults and Supported Currencies
-- ═══════════════════════════════════════════════════════════════
-- Description: Add supported currencies list and module-specific defaults
-- Author: System
-- Date: 2026-02-01
-- ═══════════════════════════════════════════════════════════════

-- Add columns to company_accounting_settings if they don't exist
DO $$
BEGIN
    -- supported_currencies (array of text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_accounting_settings' AND column_name = 'supported_currencies') THEN
        ALTER TABLE company_accounting_settings ADD COLUMN supported_currencies TEXT[] DEFAULT ARRAY['SAR'];
    END IF;

    -- default_sales_currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_accounting_settings' AND column_name = 'default_sales_currency') THEN
        ALTER TABLE company_accounting_settings ADD COLUMN default_sales_currency VARCHAR(3) DEFAULT 'SAR';
    END IF;

    -- default_purchase_currency (Local)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_accounting_settings' AND column_name = 'default_purchase_currency') THEN
        ALTER TABLE company_accounting_settings ADD COLUMN default_purchase_currency VARCHAR(3) DEFAULT 'SAR';
    END IF;

    -- default_international_purchase_currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_accounting_settings' AND column_name = 'default_international_purchase_currency') THEN
        ALTER TABLE company_accounting_settings ADD COLUMN default_international_purchase_currency VARCHAR(3) DEFAULT 'USD';
    END IF;
END $$;

-- Update existing settings to have defaults
UPDATE company_accounting_settings 
SET 
  supported_currencies = ARRAY['SAR', 'USD', 'EUR'] 
WHERE supported_currencies IS NULL OR array_length(supported_currencies, 1) IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '✅ STEP 73 completed successfully!';
    RAISE NOTICE '   - Added supported_currencies';
    RAISE NOTICE '   - Added default module currencies';
END $$;
