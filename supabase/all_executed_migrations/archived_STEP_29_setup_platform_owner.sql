-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 29: إعداد Tenant مالك المنصة (Platform Owner)
-- STEP 29: Setup Platform Owner Tenant
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء Tenant خاص بمالك المنصة
-- ✅ إنشاء شركة Next Revolution
-- ✅ ربط حساب Super Admin بها
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_user_id UUID;
    v_user_email VARCHAR(255) := 'feras1960@gmail.com';
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- 1. إنشاء Tenant: NexRev Platform
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO tenants (
        code,
        name,
        email,
        status,
        default_language,
        settings
    )
    VALUES (
        'nexrev-platform',
        'NexRev Platform',
        v_user_email,
        'active',
        'ar',
        jsonb_build_object(
            'is_platform_owner', true,
            'tier', 'enterprise',
            'features', jsonb_build_object(
                'unlimited_companies', true,
                'unlimited_users', true,
                'all_modules', true,
                'white_label', true,
                'api_access', true
            )
        )
    )
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        status = 'active',
        settings = EXCLUDED.settings,
        updated_at = NOW()
    RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE '✅ Tenant created/updated: NexRev Platform (ID: %)', v_tenant_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. إنشاء شركة: Next Revolution
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO companies (
        tenant_id,
        code,
        name,
        name_en,
        default_currency,
        fiscal_year_start_month,
        tax_system,
        vat_rate,
        inventory_valuation_method,
        country_code
    )
    VALUES (
        v_tenant_id,
        'NEXREV-001',
        'نيكست ريفوليوشن',
        'Next Revolution',
        'SAR',
        1,
        'vat_sa',
        15.00,
        'weighted_average',
        'SA'
    )
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        name_en = EXCLUDED.name_en,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = NOW()
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ Company created/updated: Next Revolution (ID: %)', v_company_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. الحصول على user_id من auth.users
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️ User not found: %. Will be linked when user logs in.', v_user_email;
    ELSE
        RAISE NOTICE '✅ User found: % (ID: %)', v_user_email, v_user_id;
        
        -- ═══════════════════════════════════════════════════════════════
        -- 4. تحديث/إنشاء user_profile
        -- ═══════════════════════════════════════════════════════════════
        
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            role,
            tenant_id,
            company_id
        )
        VALUES (
            v_user_id,
            v_user_email,
            'Feras - Platform Owner',
            'admin',
            v_tenant_id,
            v_company_id
        )
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            company_id = EXCLUDED.company_id,
            role = 'admin',
            updated_at = NOW();
        
        RAISE NOTICE '✅ User profile updated with tenant and company';
        
        -- ═══════════════════════════════════════════════════════════════
        -- 5. التأكد من صلاحيات Super Admin
        -- ═══════════════════════════════════════════════════════════════
        
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'is_super_admin', true,
            'tenant_id', v_tenant_id,
            'company_id', v_company_id
        )
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Super Admin privileges confirmed';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. إنشاء مراكز تكلفة للمشاريع
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود جدول cost_centers
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_centers'
    ) THEN
        INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, is_active)
        VALUES 
            (v_tenant_id, v_company_id, 'TEXACORE', 'تيكسا كور', 'TexaCore', true),
            (v_tenant_id, v_company_id, 'FINCORE', 'فين كور', 'FinCore', true),
            (v_tenant_id, v_company_id, 'GENERAL', 'عام', 'General', true)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Cost centers created: TexaCore, FinCore, General';
    ELSE
        RAISE NOTICE '⚠️ Cost centers table not found - skipping';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 7. ملخص النتائج
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 29: Platform Owner Setup - COMPLETED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📌 Tenant: NexRev Platform';
    RAISE NOTICE '📌 Company: Next Revolution / نيكست ريفوليوشن';
    RAISE NOTICE '📌 User: %', v_user_email;
    RAISE NOTICE '📌 Super Admin: YES';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 الآن يمكنك:';
    RAISE NOTICE '   • الدخول إلى /saas للتحكم بالمشتركين';
    RAISE NOTICE '   • الدخول إلى /dashboard لإدارة شركتك';
    RAISE NOTICE '   • استخدام جميع الميزات المحاسبية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق من النتائج
-- ═══════════════════════════════════════════════════════════════════════════

-- عرض الـ Tenant الجديد
SELECT 
    '✅ Tenant' as type,
    code,
    name,
    email,
    status,
    settings->>'is_platform_owner' as is_platform_owner
FROM tenants 
WHERE code = 'nexrev-platform';

-- عرض الشركة
SELECT 
    '✅ Company' as type,
    code,
    name,
    name_en,
    default_currency
FROM companies 
WHERE code = 'NEXREV-001';

-- عرض ربط المستخدم
SELECT 
    '✅ User Profile' as type,
    up.email,
    up.full_name,
    up.role,
    t.name as tenant_name,
    c.name_en as company_name
FROM user_profiles up
LEFT JOIN tenants t ON up.tenant_id = t.id
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.email = 'feras1960@gmail.com';
