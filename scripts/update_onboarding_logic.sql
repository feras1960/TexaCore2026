-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATE ONBOARDING LOGIC & CHART TEMPLATES (CORRECTED SCHEMA)
-- 1. Create Standard/Simple Chart Functions (using account_code, account_type_id)
-- 2. Update Registration Function to handle Chart Selection
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create SIMPLE Chart Template (Standard)
CREATE OR REPLACE FUNCTION create_simple_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;

    -- Root Types (Assumes types exist)
    -- Insert Main Groups (is_detail = false means it is a group)
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

-- 2. Create EXTENDED Chart Template (General Commercial)
CREATE OR REPLACE FUNCTION create_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;

    -- Reuse simple chart as base
    PERFORM create_simple_chart(p_company_id);
    
    UPDATE companies SET chart_type = 'extended' WHERE id = p_company_id;
END;
$$;

-- 3. Update Register Function
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
    p_chart_template VARCHAR(50) DEFAULT 'simple' -- 🆕 New Parameter
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
    -- 1. Plan Lookup
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

    -- 2. Create Tenant
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    v_tenant_id := create_new_tenant(v_tenant_code, COALESCE(p_company_name, p_user_name), p_user_email, p_phone, p_country_code, 'ar', p_business_type);
    
    -- 3. Create Subscription
    INSERT INTO subscriptions (tenant_id, product_id, plan_id, status, trial_ends_at)
    SELECT v_tenant_id, sp.product_id, v_plan_id, 'trial', NOW() + (v_trial_days || ' days')::INTERVAL
    FROM subscription_plans sp WHERE sp.id = v_plan_id
    RETURNING id INTO v_subscription_id;

    -- 4. Create Company
    v_company_id := create_default_company_for_tenant(v_tenant_id, COALESCE(p_company_name, p_user_name), p_business_type, 'production', p_currency, p_country_code);

    -- 5. User Profile
    INSERT INTO user_profiles (id, email, full_name, tenant_id, company_id, role)
    VALUES (p_user_id, p_user_email, p_user_name, v_tenant_id, v_company_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, company_id = EXCLUDED.company_id;

    -- 6. Activate Modules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)
        ON CONFLICT DO NOTHING;
    END IF;

    -- 7. 🆕 APPLY CHART TEMPLATE
    IF p_chart_template = 'fabric_extended' THEN -- Allow fabric_extended text to trigger it
        -- Try to call the specialized function if it exists, roughly checking by name
        -- Note: create_fabric_extended_chart must be created by fix_template_function.sql
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
