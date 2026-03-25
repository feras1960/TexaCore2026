-- Fix Missing Accounts for User feras1960@gmail.com
-- This script will:
-- 1. Find the tenant associated with this email
-- 2. Ensure chart templates are initialized for this tenant
-- 3. Ensure a company exists (creates one if missing)
-- 4. Apply the 'simple' chart of accounts template if no accounts exist

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_count INT;
BEGIN
    -- 1. Get Tenant ID for user
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE email = 'feras1960@gmail.com'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ User feras1960@gmail.com not found or has no tenant_id';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found Tenant ID: %', v_tenant_id;

    -- 2. Setup Templates for this Tenant (Safe to re-run)
    -- This ensures the system templates are copied to this tenant
    PERFORM setup_chart_templates_for_tenant(v_tenant_id);
    RAISE NOTICE '✅ Templates setup completed (or verified).';

    -- 3. Get or Create Company
    SELECT id INTO v_company_id
    FROM companies
    WHERE tenant_id = v_tenant_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ No company found, creating Main Company...';
        INSERT INTO companies (
            tenant_id, 
            code, 
            name, 
            default_currency, 
            fiscal_year_start_month, 
            tax_system, 
            vat_rate, 
            inventory_valuation_method
        )
        VALUES (
            v_tenant_id, 
            'MAIN', 
            'Main Company', 
            'SAR', 
            1, 
            'VAT', 
            15, 
            'FIFO'
        )
        RETURNING id INTO v_company_id;
        RAISE NOTICE '✅ Created Company with ID: %', v_company_id;
    ELSE
        RAISE NOTICE '✅ Found Existing Company ID: %', v_company_id;
    END IF;

    -- 4. Apply Template if no accounts exist
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️ No accounts found (Count: 0). Applying "simple" template...';
        
        -- Try to apply 'simple' template. 
        -- If 'simple' doesn't exist, it might fall back or error, but setup_chart_templates_for_tenant should have created it.
        BEGIN
            PERFORM apply_chart_template_to_company(v_company_id, 'simple');
            RAISE NOTICE '✅ Successfully applied "simple" chart template.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error applying template: %', SQLERRM;
            RAISE NOTICE 'Trying fallback to "standard"...';
            BEGIN
                 PERFORM apply_chart_template_to_company(v_company_id, 'standard');
            EXCEPTION WHEN OTHERS THEN
                 RAISE NOTICE '❌ Failed to apply fallback template too.';
            END;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ Accounts already exist (% accounts). Skipping template application to prevent data loss.', v_count;
    END IF;

END $$;
