-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛠️ FIX ALL REGISTRATION LOGIC & CHART TEMPLATES (FINAL)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This script acts as a "Single Source of Truth" to fix the registration process.
-- It re-defines all necessary functions with the correct column names (account_code).

-- 1. ✅ Fix `create_simple_chart` (Standard Template)
CREATE OR REPLACE FUNCTION create_simple_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;

    -- Root Types
    -- Note: Using 'account_code' and 'account_type_id'
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    SELECT v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', id, NULL, false, true FROM account_types WHERE code = 'ASSET';
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    SELECT v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', id, NULL, false, true FROM account_types WHERE code = 'LIABILITY';
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    SELECT v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', id, NULL, false, true FROM account_types WHERE code = 'EQUITY';

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    SELECT v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', id, NULL, false, true FROM account_types WHERE code = 'REVENUE';
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    SELECT v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', id, NULL, false, true FROM account_types WHERE code = 'EXPENSE';

    -- Mark Chart Type
    UPDATE companies SET chart_type = 'simple' WHERE id = p_company_id;
END;
$$;

-- 2. ✅ Fix `create_fabric_extended_chart` (The one failing previously)
CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_asset_type UUID; v_current_asset_type UUID; v_fixed_asset_type UUID;
    v_liability_type UUID; v_current_liability_type UUID;
    v_equity_type UUID; v_revenue_type UUID; v_expense_type UUID; v_cogs_type UUID;
    
    v_assets_id UUID; v_current_assets_id UUID; 
    v_fabric_inventory_id UUID;
    v_liabilities_id UUID; v_current_liabilities_id UUID;
    v_equity_id UUID; v_revenue_id UUID; v_expenses_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    
    -- Verify no existing chart prevents duplicates (optional)
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RETURN;
    END IF;
    
    -- Get Types
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';

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
END;
$$;

-- 3. ✅ Fix `create_extended_chart` (Proxy to simple for now)
CREATE OR REPLACE FUNCTION create_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM create_simple_chart(p_company_id);
    UPDATE companies SET chart_type = 'extended' WHERE id = p_company_id;
END;
$$;

-- 4. ✅ Fix `register_new_subscriber` (The entry point)
CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter',
    p_chart_template VARCHAR(50) DEFAULT 'simple'
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_code VARCHAR(50);
    v_tenant_id UUID;
    v_company_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
    v_trial_days INT;
    v_included_modules text[];
    v_result JSONB;
BEGIN
    -- Plan Lookup
    SELECT id, trial_days, included_modules 
    INTO v_plan_id, v_trial_days, v_included_modules
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true
    LIMIT 1;

    IF v_plan_id IS NULL THEN
        SELECT id, trial_days, included_modules 
        INTO v_plan_id, v_trial_days, v_included_modules
        FROM subscription_plans
        WHERE code = 'starter' LIMIT 1;
    END IF;

    -- Create Tenant
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    v_tenant_id := create_new_tenant(v_tenant_code, COALESCE(p_company_name, p_user_name), p_user_email, p_phone, p_country_code, 'ar', p_business_type);
    
    -- Create Subscription
    INSERT INTO subscriptions (tenant_id, product_id, plan_id, status, trial_ends_at)
    SELECT v_tenant_id, sp.product_id, v_plan_id, 'trial', NOW() + (v_trial_days || ' days')::INTERVAL
    FROM subscription_plans sp WHERE sp.id = v_plan_id
    RETURNING id INTO v_subscription_id;

    -- Create Company
    v_company_id := create_default_company_for_tenant(v_tenant_id, COALESCE(p_company_name, p_user_name), p_business_type, 'production', p_currency, p_country_code);

    -- User Profile
    INSERT INTO user_profiles (id, email, full_name, tenant_id, company_id, role)
    VALUES (p_user_id, p_user_email, p_user_name, v_tenant_id, v_company_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, company_id = EXCLUDED.company_id;

    -- Activate Modules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)
        ON CONFLICT DO NOTHING;
    END IF;

    -- APPLY CHART TEMPLATE
    IF p_chart_template = 'fabric_extended' THEN
        PERFORM create_fabric_extended_chart(v_company_id);
    ELSIF p_chart_template = 'extended' THEN
        PERFORM create_extended_chart(v_company_id);
    ELSE
        PERFORM create_simple_chart(v_company_id);
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'message', 'Registration Successful'
    );
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
