-- ═══════════════════════════════════════════════════════════════
-- STEP 46: إصلاح شامل لنظام التسجيل (v4 - FINAL)
-- ═══════════════════════════════════════════════════════════════
-- التاريخ: 2026-01-24
-- الهدف: إصلاح جميع مشاكل التسجيل وإكمال نظام الباقات
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. إصلاح دالة create_new_tenant
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_new_tenant(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS create_new_tenant(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION create_new_tenant(
    p_tenant_code VARCHAR(50),
    p_tenant_name VARCHAR(255),
    p_email VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL,
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_default_language VARCHAR(5) DEFAULT 'ar',
    p_business_type VARCHAR(50) DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    INSERT INTO tenants (
        code, name, email, phone, status, default_language
    )
    VALUES (
        p_tenant_code, p_tenant_name, p_email, p_phone, 'active', p_default_language
    )
    RETURNING id INTO v_tenant_id;
    
    RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_new_tenant TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════
-- 2. إصلاح دالة create_default_company_for_tenant
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_default_company_for_tenant(UUID, VARCHAR);
DROP FUNCTION IF EXISTS create_default_company_for_tenant(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION create_default_company_for_tenant(
    p_tenant_id UUID,
    p_company_name VARCHAR(255),
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_company_type VARCHAR(20) DEFAULT 'production',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_company_code VARCHAR(50);
    v_count INT;
    v_full_name VARCHAR(255);
BEGIN
    -- توليد رمز فريد للشركة
    SELECT COUNT(*) INTO v_count FROM companies WHERE tenant_id = p_tenant_id;
    v_company_code := 'COMP-' || LPAD((v_count + 1)::TEXT, 3, '0');
    
    -- التأكد من عدم تكرار الرمز
    WHILE EXISTS (SELECT 1 FROM companies WHERE code = v_company_code AND tenant_id = p_tenant_id) LOOP
        v_company_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    END LOOP;
    
    -- إضافة ملاحظة لنوع الشركة
    v_full_name := CASE p_company_type
        WHEN 'training' THEN p_company_name || ' (تدريبية)'
        WHEN 'test' THEN p_company_name || ' (تجريبية)'
        ELSE p_company_name
    END;
    
    -- إنشاء الشركة
    INSERT INTO companies (
        tenant_id, code, name, name_en, business_type, company_type,
        default_currency, country_code, fiscal_year_start_month,
        tax_system, vat_rate, inventory_valuation_method
    )
    VALUES (
        p_tenant_id, v_company_code, v_full_name, p_company_name,
        p_business_type, p_company_type, COALESCE(p_currency, 'SAR'), p_country_code, 1,
        CASE WHEN p_country_code IN ('SA', 'AE', 'BH', 'KW', 'OM', 'QA') THEN 'vat_gcc'
             WHEN p_country_code IN ('EG', 'JO', 'LB') THEN 'vat_standard'
             ELSE 'none' END,
        CASE WHEN p_country_code IN ('SA', 'AE', 'BH', 'OM', 'QA') THEN 15.00
             WHEN p_country_code = 'EG' THEN 14.00
             WHEN p_country_code = 'JO' THEN 16.00
             ELSE 0.00 END,
        'weighted_average'
    )
    RETURNING id INTO v_company_id;
    
    RETURN v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_default_company_for_tenant TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════
-- 3. إصلاح دالة register_new_subscriber (النسخة النهائية)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter'
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
    
    -- ✅ إضافة بيانات المستخدم في user_profiles (مع email و full_name)
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
    
    -- ✅ تفعيل الموديولات المضمنة في الباقة (استخدام system_modules و text[])
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)  -- ✅ استخدام المصفوفة مباشرة
        AND sm.is_active = true
        ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_active = true;
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

-- ═══════════════════════════════════════════════════════════════
-- ملخص الإصلاحات
-- ═══════════════════════════════════════════════════════════════

/*
✅ المشاكل التي تم حلها:

1. مشكلة email و full_name في user_profiles:
   - أضفنا email و full_name عند إنشاء user_profiles
   - هذه الحقول مطلوبة (NOT NULL) في الجدول

2. مشكلة system_modules vs modules:
   - الجدول الصحيح هو system_modules وليس modules
   - تم تحديث الاستعلام للاستخدام الصحيح

3. مشكلة jsonb_array_elements_text مع text[]:
   - included_modules في subscription_plans هو text[] وليس jsonb
   - استخدمنا ANY(v_included_modules) بدلاً من jsonb_array_elements_text()
   - هذا يعمل مباشرة مع المصفوفات النصية

4. مشكلة ترتيب البارامترات:
   - تأكدنا من ترتيب البارامترات الصحيح في جميع استدعاءات الدوال
   - create_default_company_for_tenant يستقبل: tenant_id, name, business_type, company_type, currency, country_code

5. مشكلة role_id vs role:
   - user_profiles يستخدم عمود role (VARCHAR) وليس role_id (UUID)
   - نُدخل 'admin' مباشرة كنص

✅ النتيجة:
- نظام تسجيل يعمل بالكامل مع اختيار الباقات
- تفعيل تلقائي للموديولات حسب الباقة
- فترة تجريبية تلقائية
- بيانات كاملة في user_profiles
*/
