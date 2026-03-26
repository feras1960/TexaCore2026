-- =====================================================
-- FIX_sync_role_tables.sql
-- مزامنة جدولي الأدوار: user_roles ↔ user_role_assignments
-- تاريخ: 2026-03-27
-- =====================================================
-- المشكلة:
--   - register_new_subscriber يكتب في user_role_assignments
--   - الفرونتند (rbacService, useRBAC, UsersManagementTab) يقرأ من user_roles
--   - النتيجة: المشتركون الجدد لا يظهر لهم دور tenant_owner في الواجهة
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. إصلاح المشتركين الحاليين: نسخ الأدوار من user_role_assignments إلى user_roles
-- ═══════════════════════════════════════════════════════════════

INSERT INTO user_roles (user_id, role_id, tenant_id, company_id, is_active, assigned_by, assigned_at)
SELECT 
    ura.user_id, 
    ura.role_id, 
    ura.tenant_id, 
    ura.company_id, 
    ura.is_active, 
    ura.assigned_by, 
    ura.assigned_at
FROM user_role_assignments ura
-- Only sync records that have valid user_profiles (skip orphans)
JOIN user_profiles up ON up.id = ura.user_id
WHERE ura.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = ura.user_id 
        AND ur.role_id = ura.role_id
  )
ON CONFLICT DO NOTHING;

SELECT '✅ تم مزامنة الأدوار الموجودة من user_role_assignments إلى user_roles' as result;

-- عرض النتيجة
SELECT 
    up.full_name, 
    up.email, 
    r.code as role_code, 
    r.name_ar as role_name,
    'user_roles' as source_table
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = true
ORDER BY up.full_name;

-- ═══════════════════════════════════════════════════════════════
-- 2. تحديث register_new_subscriber لتكتب في BOTH الجدولين
-- ═══════════════════════════════════════════════════════════════

-- حذف النسخ القديمة (جميع التوقيعات)
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID DEFAULT NULL,
    p_user_email VARCHAR(255) DEFAULT NULL,
    p_user_name VARCHAR(255) DEFAULT NULL,
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter',
    p_chart_template VARCHAR(50) DEFAULT 'fabric_extended',
    p_local_currency VARCHAR(3) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_code VARCHAR(50);
    v_tenant_id UUID;
    v_company_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
    v_trial_days INT := 30;
    v_included_modules text[];
    v_result JSONB;
    v_currencies TEXT[];
    v_tenant_owner_role_id UUID;
    v_actual_user_id UUID;
BEGIN
    -- تحديد user_id: إذا لم يُعطَ، ابحث عنه بالبريد
    v_actual_user_id := p_user_id;
    IF v_actual_user_id IS NULL AND p_user_email IS NOT NULL THEN
        SELECT id INTO v_actual_user_id 
        FROM auth.users 
        WHERE email = p_user_email 
        LIMIT 1;
    END IF;
    
    IF v_actual_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب توفير user_id أو email صالح';
    END IF;

    -- إنشاء رمز فريد للـ Tenant
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    
    -- تحضير قائمة العملات
    v_currencies := ARRAY[p_currency];
    IF p_local_currency IS NOT NULL AND p_local_currency != p_currency THEN
        v_currencies := array_append(v_currencies, p_local_currency);
    END IF;
    
    -- الحصول على الباقة
    SELECT id, COALESCE(trial_days, 30), included_modules 
    INTO v_plan_id, v_trial_days, v_included_modules
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true
    LIMIT 1;
    
    -- إذا لم توجد الباقة المطلوبة، استخدم starter
    IF v_plan_id IS NULL THEN
        SELECT id, COALESCE(trial_days, 30), included_modules 
        INTO v_plan_id, v_trial_days, v_included_modules
        FROM subscription_plans
        WHERE code = 'starter' AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد باقات نشطة';
    END IF;
    
    -- 🔐 الحصول على role_id لـ tenant_owner
    SELECT id INTO v_tenant_owner_role_id
    FROM roles WHERE code = 'tenant_owner'
    LIMIT 1;
    
    IF v_tenant_owner_role_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على دور tenant_owner';
    END IF;
    
    -- إنشاء Tenant
    v_tenant_id := create_new_tenant(
        v_tenant_code,
        COALESCE(p_company_name, p_user_name),
        COALESCE(p_user_email, ''),
        p_phone,
        p_country_code,
        'ar',
        p_business_type
    );
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'فشل إنشاء Tenant';
    END IF;
    
    -- إنشاء Subscription
    INSERT INTO subscriptions (
        tenant_id, product_id, plan_id, status,
        trial_ends_at, current_period_start, current_period_end
    )
    SELECT
        v_tenant_id, sp.product_id, v_plan_id, 'trial',
        NOW() + (v_trial_days || ' days')::INTERVAL, NOW(),
        NOW() + (v_trial_days || ' days')::INTERVAL
    FROM subscription_plans sp
    WHERE sp.id = v_plan_id
    RETURNING id INTO v_subscription_id;
    
    -- إنشاء الشركة الافتراضية
    v_company_id := create_default_company_for_tenant(
        v_tenant_id,
        COALESCE(p_company_name, p_user_name),
        p_business_type,
        'production',
        p_currency,
        p_country_code
    );
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'فشل إنشاء الشركة';
    END IF;
    
    -- إنشاء company_accounting_settings
    INSERT INTO company_accounting_settings (
        company_id, base_currency, supported_currencies,
        fiscal_year_start_month, fiscal_year_end_month, enable_vat, decimal_places
    )
    VALUES (v_company_id, p_currency, v_currencies, 1, 12, true, 2)
    ON CONFLICT (company_id) DO UPDATE SET
        base_currency = EXCLUDED.base_currency,
        supported_currencies = EXCLUDED.supported_currencies,
        updated_at = NOW();
    
    -- إضافة بيانات المستخدم في user_profiles
    INSERT INTO user_profiles (id, email, full_name, tenant_id, company_id, role)
    VALUES (v_actual_user_id, p_user_email, p_user_name, v_tenant_id, v_company_id, 'tenant_owner')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role;
    
    -- ⭐ الجدول الأساسي: user_roles (يقرأه الفرونتند + RBAC + AI Agent)
    INSERT INTO user_roles (
        user_id, role_id, tenant_id, company_id, 
        assigned_by, is_active, created_at
    )
    VALUES (
        v_actual_user_id, v_tenant_owner_role_id, v_tenant_id, v_company_id,
        v_actual_user_id, true, NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- ⭐ الجدول الثانوي: user_role_assignments (للتوافق الخلفي)
    INSERT INTO user_role_assignments (
        user_id, role_id, tenant_id, company_id, 
        assigned_by, is_active, created_at
    )
    VALUES (
        v_actual_user_id, v_tenant_owner_role_id, v_tenant_id, v_company_id,
        v_actual_user_id, true, NOW()
    )
    ON CONFLICT (user_id, role_id, tenant_id, company_id) DO UPDATE SET
        is_active = true,
        updated_at = NOW();
    
    -- تحديث user_metadata في auth.users
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'full_name', p_user_name,
        'registration_complete', true,
        'role', 'tenant_owner'
    )
    WHERE id = v_actual_user_id;
    
    -- تفعيل الموديولات المضمنة في الباقة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)
        AND sm.is_active = true
        ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_active = true;
    END IF;
    
    -- تطبيق قالب الشجرة المحاسبية
    IF p_chart_template IS NOT NULL THEN
        BEGIN
            PERFORM apply_chart_template_to_company(v_company_id, p_chart_template);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'تحذير: لم يتم تطبيق قالب الشجرة: %', SQLERRM;
        END;
    END IF;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', v_tenant_code,
        'company_id', v_company_id,
        'subscription_id', v_subscription_id,
        'plan_code', p_plan_code,
        'trial_days', v_trial_days,
        'trial_ends_at', NOW() + (v_trial_days || ' days')::INTERVAL,
        'currencies', v_currencies,
        'role', 'tenant_owner',
        'message', 'تم التسجيل بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في التسجيل: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_new_subscriber TO authenticated, anon;

SELECT '✅ تم تحديث register_new_subscriber — يكتب الآن في كلا الجدولين' as result;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 المستخدمون وأدوارهم في user_roles:' as info;
SELECT 
    up.full_name, 
    up.email, 
    r.code, 
    r.name_ar
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = true
ORDER BY up.full_name;

SELECT '🎉 اكتمل! الآن register_new_subscriber يكتب في user_roles + user_role_assignments' as result;
