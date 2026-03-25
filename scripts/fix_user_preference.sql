
-- Link User Profile to Company for feras1960@gmail.com
-- This ensures the frontend loads the correct company by default.

DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'feras1960@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User not found';
        RETURN;
    END IF;

    -- 2. Get Tenant ID from Profile
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = v_user_id;

    -- 2. Get the Company (created/verified in previous step)
    SELECT id INTO v_company_id
    FROM companies
    WHERE tenant_id = v_tenant_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ No company found for this tenant! Run fix_missing_accounts.sql first.';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found Company ID: %', v_company_id;

    -- 3. Update User Profile
    UPDATE user_profiles
    SET company_id = v_company_id,
        updated_at = NOW()
    WHERE id = v_user_id;  -- Using 'id' based on confirmed schema

    RAISE NOTICE '✅ Updated user_profiles.company_id to point to this company.';
    
END $$;
