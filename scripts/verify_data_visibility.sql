
-- Verify Data Visibility for feras1960@gmail.com
-- This script simulates the user being logged in and checks what they can see.

-- 1. Get User ID
DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_count INT;
BEGIN
    -- 1. Get User ID & Tenant ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'feras1960@gmail.com';
    
    SELECT tenant_id INTO v_tenant_id FROM user_profiles WHERE id = v_user_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Auth User not found in auth.users';
    ELSIF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ Tenant ID not found in user_profiles for user %', v_user_id;
    ELSE
        RAISE NOTICE '✅ Found User ID: %', v_user_id;
        RAISE NOTICE '✅ Linked Tenant ID: %', v_tenant_id;
    END IF;

    -- 2. Check Companies
    SELECT COUNT(*) INTO v_count FROM companies WHERE tenant_id = v_tenant_id;
    RAISE NOTICE '📊 Companies found for tenant: %', v_count;
    
    FOR v_count IN SELECT count(*) FROM companies WHERE tenant_id = v_tenant_id LOOP
        RAISE NOTICE '   - Company exists.';
    END LOOP;

    -- 3. Check Accounts linked to this tenant
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE tenant_id = v_tenant_id;
    RAISE NOTICE '📊 Accounts found in DB for tenant: %', v_count;

    -- 4. Check RLS Policies (Active Checks)
    -- We can't easily simulate RLS here without setting session role, 
    -- but we can check if policies exist.
    
    PERFORM 1 FROM pg_policies WHERE tablename = 'chart_of_accounts';
    IF FOUND THEN
        RAISE NOTICE '🔒 RLS Policies exist on chart_of_accounts.';
    ELSE
        RAISE NOTICE '⚠️ NO RLS Policies found on chart_of_accounts!';
    END IF;
    
END $$;

-- List the actual accounts to see if they look correct
SELECT 
    ca.code, 
    ca.name_ar, 
    ca.company_id,
    c.name as company_name
FROM chart_of_accounts ca
JOIN companies c ON ca.company_id = c.id
JOIN tenants t ON ca.tenant_id = t.id
JOIN user_profiles p ON t.id = p.tenant_id
WHERE p.email = 'feras1960@gmail.com'
LIMIT 10;
