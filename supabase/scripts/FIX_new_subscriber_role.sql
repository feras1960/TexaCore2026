-- =====================================================
-- FIX_new_subscriber_role.sql
-- إصلاح نظام تسجيل المشتركين الجدد
-- تاريخ: 2026-02-05
-- =====================================================
-- المتطلبات:
--   ✅ المستخدم الجديد = tenant_owner بصلاحيات كاملة
--   ✅ فترة تجريبية افتراضية = 1 شهر (30 يوم)
--   ✅ بعدها يختار من 3-4 باقات
-- =====================================================

SET session_replication_role = 'replica';

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء/تحديث دور tenant_owner مع كل الموديولات
-- ═══════════════════════════════════════════════════════════════

-- تحديث إذا موجود
UPDATE roles SET
    name_ar = 'مالك الحساب',
    name_en = 'Account Owner',
    description = 'صاحب الاشتراك - له كامل الصلاحيات على حسابه',
    is_super_admin = false,
    is_system = true,
    permissions = '{"all": true}'::jsonb,
    visible_modules = ARRAY[
        'dashboard', 'accounting', 'inventory', 'sales', 'purchases',
        'fabric', 'treasury', 'warehouse', 'hr', 'reports',
        'customers', 'suppliers', 'products', 'system_config'
    ],
    level = 'tenant',
    can_be_deleted = false,
    updated_at = NOW()
WHERE code = 'tenant_owner';

-- إنشاء إذا غير موجود
INSERT INTO roles (
    code, name_ar, name_en, description, 
    is_super_admin, is_system, permissions, 
    visible_modules, level, can_be_deleted
)
SELECT 
    'tenant_owner',
    'مالك الحساب',
    'Account Owner',
    'صاحب الاشتراك - له كامل الصلاحيات على حسابه',
    false,
    true,
    '{"all": true}'::jsonb,
    ARRAY[
        'dashboard', 'accounting', 'inventory', 'sales', 'purchases',
        'fabric', 'treasury', 'warehouse', 'hr', 'reports',
        'customers', 'suppliers', 'products', 'system_config'
    ],
    'tenant',
    false
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'tenant_owner');

SELECT '✅ دور tenant_owner جاهز' as result;

-- ═══════════════════════════════════════════════════════════════
-- 2. تحديث الفترة التجريبية الافتراضية للباقات
-- ═══════════════════════════════════════════════════════════════

UPDATE subscription_plans
SET trial_days = 30
WHERE trial_days IS NULL OR trial_days < 30;

SELECT '✅ تم تحديث الفترة التجريبية (30 يوم)' as result;

-- ═══════════════════════════════════════════════════════════════
-- 3. تحديث دالة register_new_subscriber لربط الدور
-- ═══════════════════════════════════════════════════════════════

-- حذف النسخ القديمة
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
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
    v_trial_days INT := 30; -- افتراضي 30 يوم
    v_included_modules text[];
    v_result JSONB;
    v_currencies TEXT[];
    v_tenant_owner_role_id UUID;
BEGIN
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
        p_user_email,
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
    VALUES (p_user_id, p_user_email, p_user_name, v_tenant_id, v_company_id, 'tenant_owner')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role;
    
    -- ⭐ ربط المستخدم بدور tenant_owner في user_role_assignments
    INSERT INTO user_role_assignments (
        user_id, role_id, tenant_id, company_id, 
        assigned_by, is_active, created_at
    )
    VALUES (
        p_user_id, v_tenant_owner_role_id, v_tenant_id, v_company_id,
        p_user_id, true, NOW()
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
    WHERE id = p_user_id;
    
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

SELECT '✅ تم تحديث register_new_subscriber' as result;

-- ═══════════════════════════════════════════════════════════════
-- 4. إصلاح المستخدمين الحاليين الذين ليس لهم دور
-- ═══════════════════════════════════════════════════════════════

-- ربط كل مستخدم ليس له دور بـ tenant_owner (إذا عنده tenant_id)
INSERT INTO user_role_assignments (user_id, role_id, tenant_id, company_id, assigned_by, is_active)
SELECT 
    u.id,
    r.id,
    (u.raw_user_meta_data->>'tenant_id')::uuid,
    (u.raw_user_meta_data->>'company_id')::uuid,
    u.id,
    true
FROM auth.users u
CROSS JOIN roles r
WHERE r.code = 'tenant_owner'
  AND u.raw_user_meta_data->>'tenant_id' IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_role_assignments ura 
      WHERE ura.user_id = u.id
  )
  -- استثناء Super Admins
  AND u.id NOT IN (SELECT user_id FROM super_admins)
ON CONFLICT (user_id, role_id, tenant_id, company_id) DO NOTHING;

SELECT '✅ تم إصلاح المستخدمين بدون أدوار' as result;

SET session_replication_role = 'origin';

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 الأدوار المتاحة:' as info;
SELECT code, name_ar, visible_modules FROM roles WHERE code IN ('super_admin', 'tenant_owner');

SELECT '📋 الباقات والفترة التجريبية:' as info;
SELECT code, name_ar, trial_days, is_active FROM subscription_plans;

SELECT '🎉 اكتمل! المستخدمون الجدد سيحصلون على tenant_owner مع 30 يوم تجريبي' as result;
