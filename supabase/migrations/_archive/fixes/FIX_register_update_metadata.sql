-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: تحديث register_new_subscriber لتحديث user_metadata
-- تاريخ: 2026-02-03
-- الهدف: بعد إنشاء Tenant، يجب تحديث raw_user_meta_data في auth.users
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف جميع النسخ القديمة
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

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
    p_chart_template VARCHAR(50) DEFAULT 'fabric_extended'
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
    -- إنشاء رمز فريد للـ Tenant
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    
    -- الحصول على الباقة
    SELECT id, trial_days, included_modules 
    INTO v_plan_id, v_trial_days, v_included_modules
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true
    LIMIT 1;
    
    -- إذا لم توجد الباقة المطلوبة، استخدم starter
    IF v_plan_id IS NULL THEN
        SELECT id, trial_days, included_modules 
        INTO v_plan_id, v_trial_days, v_included_modules
        FROM subscription_plans
        WHERE code = 'starter' AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد باقات نشطة';
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
    
    -- ✅ إضافة بيانات المستخدم في user_profiles
    INSERT INTO user_profiles (id, email, full_name, tenant_id, company_id, role)
    VALUES (
        p_user_id,
        p_user_email,
        p_user_name,
        v_tenant_id,
        v_company_id,
        'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role;
    
    -- 🔐 تحديث user_metadata في auth.users لكي يعمل الـ Session
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'full_name', p_user_name,
        'registration_complete', true
    )
    WHERE id = p_user_id;
    
    -- ✅ تفعيل الموديولات المضمنة في الباقة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)
        AND sm.is_active = true
        ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_active = true;
    END IF;
    
    -- ✅ تطبيق قالب الشجرة المحاسبية إذا كان موجوداً
    IF p_chart_template IS NOT NULL THEN
        BEGIN
            PERFORM apply_chart_template_to_company(v_company_id, p_chart_template);
        EXCEPTION WHEN OTHERS THEN
            -- تجاهل الخطأ إذا لم تكن الدالة موجودة
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
        'message', 'تم التسجيل بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في التسجيل: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_new_subscriber TO authenticated, anon;

-- التحقق
SELECT 
    proname as function_name,
    '✅ تم التحديث' as status
FROM pg_proc 
WHERE proname = 'register_new_subscriber';
