-- ═══════════════════════════════════════════════════════════════
-- STEP 70 REVISED: Company Accounting Settings Only
-- ═══════════════════════════════════════════════════════════════
-- Description: Company-specific accounting settings
-- Note: exchange_rates already exists in migration 00010
-- Author: System
-- Date: 2026-01-31
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Part 1: Company Accounting Settings Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_accounting_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Base Currency
    base_currency VARCHAR(3) DEFAULT 'UAH',
    
    -- Fiscal Year
    fiscal_year_start_month INTEGER DEFAULT 1,
    fiscal_year_end_month INTEGER DEFAULT 12,
    
    -- Entry Numbering
    entry_number_prefix VARCHAR(10),
    entry_number_reset_yearly BOOLEAN DEFAULT true,
    
    -- Tax Settings
    default_vat_rate DECIMAL(5, 2) DEFAULT 20.00,
    default_income_tax_rate DECIMAL(5, 2) DEFAULT 18.00,
    enable_vat BOOLEAN DEFAULT true,
    
    -- Default Accounts
    default_cash_account_id UUID REFERENCES chart_of_accounts(id),
    default_bank_account_id UUID REFERENCES chart_of_accounts(id),
    default_revenue_account_id UUID REFERENCES chart_of_accounts(id),
    default_expense_account_id UUID REFERENCES chart_of_accounts(id),
    default_receivable_account_id UUID REFERENCES chart_of_accounts(id),
    default_payable_account_id UUID REFERENCES chart_of_accounts(id),
    
    -- Display Settings
    decimal_places INTEGER DEFAULT 2,
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    number_format VARCHAR(20) DEFAULT '1,234.56',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_company_settings_company ON company_accounting_settings(company_id);

COMMENT ON TABLE company_accounting_settings IS 'Company-specific accounting settings and preferences';

-- ═══════════════════════════════════════════════════════════════
-- Part 2: Get Company Settings Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_company_accounting_settings(p_company_id UUID)
RETURNS company_accounting_settings
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_settings company_accounting_settings;
BEGIN
    SELECT * INTO v_settings
    FROM company_accounting_settings
    WHERE company_id = p_company_id;
    
    IF v_settings IS NULL THEN
        RAISE EXCEPTION 'No accounting settings found for company %', p_company_id;
    END IF;
    
    RETURN v_settings;
END;
$$;

COMMENT ON FUNCTION get_company_accounting_settings IS 'Get accounting settings for a company';

-- ═══════════════════════════════════════════════════════════════
-- Part 3: Initialize Settings for Next Revolution
-- ═══════════════════════════════════════════════════════════════

INSERT INTO company_accounting_settings (
    company_id,
    base_currency,
    fiscal_year_start_month,
    fiscal_year_end_month,
    default_vat_rate,
    default_income_tax_rate,
    enable_vat,
    decimal_places,
    date_format
)
VALUES (
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'UAH',
    1,
    12,
    20.00,
    18.00,
    true,
    2,
    'DD/MM/YYYY'
)
ON CONFLICT (company_id) DO UPDATE
SET base_currency = EXCLUDED.base_currency;

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 70 REVISED completed successfully!';
    RAISE NOTICE '   - company_accounting_settings table created';
    RAISE NOTICE '   - Next Revolution settings initialized';
    RAISE NOTICE '   - Note: exchange_rates already exists in migration 00010';
END $$;
