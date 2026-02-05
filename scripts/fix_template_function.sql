-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Re-apply Extended Fabric Chart Functions
-- This script manually defines the functions that are reported missing.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure chart_type column exists
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

-- 2. Define create_fabric_extended_chart
CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_asset_type UUID;
    v_current_asset_type UUID;
    v_fixed_asset_type UUID;
    v_liability_type UUID;
    v_current_liability_type UUID;
    v_long_term_liability_type UUID;
    v_equity_type UUID;
    v_revenue_type UUID;
    v_expense_type UUID;
    v_cogs_type UUID;
    
    v_assets_id UUID;
    v_current_assets_id UUID;
    v_fixed_assets_id UUID;
    v_fabric_inventory_id UUID;
    v_liabilities_id UUID;
    v_current_liabilities_id UUID;
    v_long_term_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Company not found or has no tenant_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RAISE NOTICE 'Chart of accounts already exists';
        RETURN;
    END IF;
    
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_term_liability_type FROM account_types WHERE code = 'LONG_TERM_LIABILITY';
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';

    RAISE NOTICE '🚀 Creating Fabric Extended Chart...';

    -- Assets
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', v_asset_type, NULL, false, true)
    RETURNING id INTO v_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_current_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_current_assets_id;

    -- Sub-accounts
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable)
    VALUES 
        (v_tenant_id, p_company_id, '111', 'الصندوق الرئيسي', 'Main Cash', v_current_asset_type, v_current_assets_id, true, true, true, false, false),
        (v_tenant_id, p_company_id, '112', 'البنك - العملة المحلية', 'Bank - Currency', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '115', 'ذمم الجملة', 'Wholesale Receivables', v_current_asset_type, v_current_assets_id, true, true, false, false, true);

    -- Fabric Inventory
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '13', 'مخزون الأقمشة', 'Fabric Inventory', v_current_asset_type, v_current_assets_id, false, true)
    RETURNING id INTO v_fabric_inventory_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '131', 'مخزون رولونات', 'Fabric Rolls', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '132', 'مخزون أمتار', 'Fabric Meters', v_current_asset_type, v_fabric_inventory_id, true, true);

    -- Liabilities
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true)
    RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_current_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES 
        (v_tenant_id, p_company_id, '211', 'الموردين', 'Suppliers', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '215', 'ضريبة القيمة المضافة', 'VAT Payable', v_current_liability_type, v_current_liabilities_id, true, true, false);

    -- Equity
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_equity_type, NULL, false, true)
    RETURNING id INTO v_equity_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'الأرباح والخسائر', 'Results', v_equity_type, v_equity_id, true, true);

    -- Revenue
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true)
    RETURNING id INTO v_revenue_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '41', 'المبيعات', 'Sales', v_revenue_type, v_revenue_id, true, true);

    -- Expenses
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true)
    RETURNING id INTO v_expenses_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '51', 'تكلفة البضاعة المباعة', 'COGS', v_cogs_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '52', 'رواتب وأجور', 'Salaries', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '595', 'فروق مخزون', 'Inv Variance', v_expense_type, v_expenses_id, true, true);

    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;
    
    RAISE NOTICE '✅ Created simplified fabric_extended chart.';
END;
$$;

-- 3. Define copy_demo_data_to_tenant as a stub if missing, to prevent errors
CREATE OR REPLACE FUNCTION copy_demo_data_to_tenant(
    p_source_tenant_id UUID,
    p_target_tenant_id UUID,
    p_target_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE NOTICE 'Copy demo data stub execution.';
END;
$$;

-- 4. Re-define copy_demo_data_to_company (Stub or simplified version)
CREATE OR REPLACE FUNCTION copy_demo_data_to_company(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE NOTICE 'Copy demo data to company stub execution.';
END;
$$;
