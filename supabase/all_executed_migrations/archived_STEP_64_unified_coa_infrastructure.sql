-- ═══════════════════════════════════════════════════════════════
-- STEP 64: Unified Extended Chart of Accounts System
-- ═══════════════════════════════════════════════════════════════
-- Description: Creates unified extended COA with dynamic bank accounts,
--              Ukraine FOP features, and country-specific configurations
-- Author: System
-- Date: 2026-01-30
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Part 1: Country Configurations Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS country_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Country Info
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name_ar VARCHAR(200),
    country_name_en VARCHAR(200),
    
    -- Currency
    default_currency VARCHAR(3),
    
    -- Tax Settings
    has_vat BOOLEAN DEFAULT false,
    vat_rate DECIMAL(5, 2),
    has_income_tax BOOLEAN DEFAULT true,
    income_tax_rate DECIMAL(5, 2),
    
    -- FOP/Freelancer Settings
    supports_fop BOOLEAN DEFAULT false,
    fop_groups JSONB,
    
    -- Fiscal Year
    fiscal_year_start_month INTEGER DEFAULT 1,
    
    -- Formats
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    number_format VARCHAR(20) DEFAULT '1,234.56',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE country_configurations IS 'Country-specific configurations for tax, currency, and business rules';

-- Insert Ukraine Configuration
INSERT INTO country_configurations (
    country_code, country_name_ar, country_name_en,
    default_currency, has_vat, vat_rate,
    has_income_tax, income_tax_rate,
    supports_fop, fop_groups
) VALUES (
    'UA', 'أوكرانيا', 'Ukraine',
    'UAH', true, 20.00,
    true, 18.00,
    true, '[
        {"group": "group_1", "limit": 1167000, "tax_rate": 5, "name_ar": "المجموعة 1", "name_en": "Group 1"},
        {"group": "group_2", "limit": 5835000, "tax_rate": 5, "name_ar": "المجموعة 2", "name_en": "Group 2"},
        {"group": "group_3", "limit": 7000000, "tax_rate": 5, "name_ar": "المجموعة 3", "name_en": "Group 3"}
    ]'::jsonb
) ON CONFLICT (country_code) DO NOTHING;

-- Insert Saudi Arabia Configuration
INSERT INTO country_configurations (
    country_code, country_name_ar, country_name_en,
    default_currency, has_vat, vat_rate,
    has_income_tax, income_tax_rate,
    supports_fop
) VALUES (
    'SA', 'السعودية', 'Saudi Arabia',
    'SAR', true, 15.00,
    false, 0.00,
    false
) ON CONFLICT (country_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part 2: Bank Account Limits Table (Ukraine FOP)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bank_account_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    
    -- Account Type
    fop_group VARCHAR(20),
    account_type VARCHAR(50),
    
    -- Limits
    annual_limit DECIMAL(15, 2),
    monthly_limit DECIMAL(15, 2),
    
    -- Tracking
    current_year_total DECIMAL(15, 2) DEFAULT 0,
    current_month_total DECIMAL(15, 2) DEFAULT 0,
    last_reset_date DATE,
    
    -- Alerts
    warning_threshold_percent INTEGER DEFAULT 80,
    alert_threshold_percent INTEGER DEFAULT 95,
    
    -- Metadata
    country_code VARCHAR(2) DEFAULT 'UA',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_fop_group CHECK (fop_group IN ('group_1', 'group_2', 'group_3', NULL)),
    CONSTRAINT valid_thresholds CHECK (
        warning_threshold_percent >= 0 AND 
        warning_threshold_percent <= 100 AND
        alert_threshold_percent >= 0 AND 
        alert_threshold_percent <= 100
    )
);

CREATE INDEX idx_bank_limits_account ON bank_account_limits(account_id);
CREATE INDEX idx_bank_limits_company ON bank_account_limits(company_id);

COMMENT ON TABLE bank_account_limits IS 'Track bank account limits for FOP (Ukraine) and other country-specific limits';

-- ═══════════════════════════════════════════════════════════════
-- Part 3: Tax Payment Schedules Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tax_payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Tax Type
    tax_type VARCHAR(50) NOT NULL,
    tax_name_ar VARCHAR(200),
    tax_name_en VARCHAR(200),
    
    -- Schedule
    frequency VARCHAR(20) NOT NULL,
    payment_day INTEGER,
    
    -- Rate
    tax_rate DECIMAL(5, 2),
    
    -- Linked Accounts
    expense_account_id UUID REFERENCES chart_of_accounts(id),
    liability_account_id UUID REFERENCES chart_of_accounts(id),
    
    -- Country-Specific
    country_code VARCHAR(2) DEFAULT 'UA',
    fop_group VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'quarterly', 'annually')),
    CONSTRAINT valid_payment_day CHECK (payment_day >= 1 AND payment_day <= 31)
);

CREATE INDEX idx_tax_schedules_company ON tax_payment_schedules(company_id);
CREATE INDEX idx_tax_schedules_country ON tax_payment_schedules(country_code);

COMMENT ON TABLE tax_payment_schedules IS 'Monthly/quarterly tax payment schedules by country and company type';

-- ═══════════════════════════════════════════════════════════════
-- Part 4: Add Dynamic Bank Account Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_bank_account(
    p_company_id UUID,
    p_bank_name_ar VARCHAR(200),
    p_bank_name_en VARCHAR(200),
    p_currency VARCHAR(3) DEFAULT 'UAH',
    p_account_number VARCHAR(50) DEFAULT NULL,
    p_fop_group VARCHAR(20) DEFAULT NULL,
    p_annual_limit DECIMAL(15, 2) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_bank_group_id UUID;
    v_next_code VARCHAR(10);
    v_new_account_id UUID;
    v_account_type_id UUID;
BEGIN
    -- Get tenant_id
    SELECT tenant_id INTO v_tenant_id 
    FROM companies 
    WHERE id = p_company_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Company not found';
    END IF;
    
    -- Get bank group account (112)
    SELECT id INTO v_bank_group_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id 
      AND account_code = '112'
      AND is_group = true;
    
    IF v_bank_group_id IS NULL THEN
        RAISE EXCEPTION 'Bank group account (112) not found. Please create unified chart first.';
    END IF;
    
    -- Get account type ID
    SELECT id INTO v_account_type_id
    FROM account_types
    WHERE code = 'CURRENT_ASSET';
    
    -- Generate next code (1121, 1122, ...)
    SELECT COALESCE(
        '112' || (MAX(SUBSTRING(account_code FROM 4)::INTEGER) + 1)::TEXT,
        '1121'
    ) INTO v_next_code
    FROM chart_of_accounts
    WHERE company_id = p_company_id 
      AND account_code LIKE '112%'
      AND LENGTH(account_code) = 4;
    
    -- Create new bank account
    INSERT INTO chart_of_accounts (
        tenant_id, company_id, account_code,
        name_ar, name_en,
        account_type_id, parent_id,
        is_group, is_detail, is_bank_account,
        currency, external_code, is_system
    ) VALUES (
        v_tenant_id, p_company_id, v_next_code,
        p_bank_name_ar, p_bank_name_en,
        v_account_type_id, v_bank_group_id,
        false, true, true,
        p_currency, p_account_number, false
    )
    RETURNING id INTO v_new_account_id;
    
    -- Add FOP limit if specified
    IF p_fop_group IS NOT NULL AND p_annual_limit IS NOT NULL THEN
        INSERT INTO bank_account_limits (
            tenant_id, company_id, account_id,
            fop_group, annual_limit,
            last_reset_date
        ) VALUES (
            v_tenant_id, p_company_id, v_new_account_id,
            p_fop_group, p_annual_limit,
            DATE_TRUNC('year', CURRENT_DATE)::DATE
        );
    END IF;
    
    RAISE NOTICE 'Bank account created: % (%) with code %', p_bank_name_ar, p_currency, v_next_code;
    
    RETURN v_new_account_id;
END;
$$;

COMMENT ON FUNCTION add_bank_account IS 'Dynamically add a new bank account under the bank group (112)';

-- ═══════════════════════════════════════════════════════════════
-- Part 5: Check Bank Limit Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_bank_limit(
    p_account_id UUID,
    p_amount DECIMAL(15, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit RECORD;
    v_new_total DECIMAL(15, 2);
    v_percentage DECIMAL(5, 2);
    v_status VARCHAR(20);
    v_message TEXT;
BEGIN
    -- Get limit info
    SELECT * INTO v_limit
    FROM bank_account_limits
    WHERE account_id = p_account_id
      AND is_active = true;
    
    -- No limit configured
    IF v_limit IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'ok',
            'has_limit', false,
            'message', 'No limit configured'
        );
    END IF;
    
    -- Calculate new total
    v_new_total := v_limit.current_year_total + p_amount;
    v_percentage := (v_new_total / v_limit.annual_limit) * 100;
    
    -- Determine status
    IF v_percentage >= 100 THEN
        v_status := 'exceeded';
        v_message := format('Annual limit exceeded! %s/%s UAH (%.1f%%)', 
            v_new_total, v_limit.annual_limit, v_percentage);
    ELSIF v_percentage >= v_limit.alert_threshold_percent THEN
        v_status := 'alert';
        v_message := format('Alert: Approaching limit! %s/%s UAH (%.1f%%)', 
            v_new_total, v_limit.annual_limit, v_percentage);
    ELSIF v_percentage >= v_limit.warning_threshold_percent THEN
        v_status := 'warning';
        v_message := format('Warning: %s/%s UAH (%.1f%%)', 
            v_new_total, v_limit.annual_limit, v_percentage);
    ELSE
        v_status := 'ok';
        v_message := format('Within limit: %s/%s UAH (%.1f%%)', 
            v_new_total, v_limit.annual_limit, v_percentage);
    END IF;
    
    RETURN jsonb_build_object(
        'status', v_status,
        'has_limit', true,
        'current_total', v_limit.current_year_total,
        'new_total', v_new_total,
        'annual_limit', v_limit.annual_limit,
        'percentage', v_percentage,
        'fop_group', v_limit.fop_group,
        'message', v_message
    );
END;
$$;

COMMENT ON FUNCTION check_bank_limit IS 'Check if a transaction would exceed FOP bank limits';

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 64 completed successfully!';
    RAISE NOTICE '   - Country configurations table created';
    RAISE NOTICE '   - Bank account limits table created';
    RAISE NOTICE '   - Tax payment schedules table created';
    RAISE NOTICE '   - add_bank_account() function created';
    RAISE NOTICE '   - check_bank_limit() function created';
END $$;
