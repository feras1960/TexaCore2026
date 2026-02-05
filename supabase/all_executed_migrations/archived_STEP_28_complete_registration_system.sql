-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 28: نظام التسجيل الكامل والصحيح
-- STEP 28: Complete and Correct Registration System
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ كل مشترك جديد يحصل على tenant خاص به
-- ✅ داخل الـ tenant يمكنه إنشاء عدة شركات
-- ✅ المشترك يظهر في لوحة SaaS
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. Function لربط مشترك جديد بـ Tenant جاهز
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_available_tenant(
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_tenant_code VARCHAR(50);
BEGIN
    -- البحث عن tenant متاح
    SELECT id, code INTO v_tenant_id, v_tenant_code
    FROM tenants
    WHERE status = 'available'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;  -- تجنب التعارض في التسجيل المتزامن
    
    -- إذا لم يوجد tenant متاح، ننشئ واحد جديد
    IF v_tenant_id IS NULL THEN
        v_tenant_code := 'tenant-' || LPAD(
            (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 8) AS INTEGER)), 0) + 1 FROM tenants WHERE code LIKE 'tenant-%')::TEXT,
            3, '0'
        );
        
        INSERT INTO tenants (code, name, email, phone, status, default_language)
        VALUES (v_tenant_code, p_user_name, p_user_email, p_phone, 'active', 'ar')
        RETURNING id INTO v_tenant_id;
        
        RAISE NOTICE '✅ تم إنشاء Tenant جديد: %', v_tenant_code;
        RETURN v_tenant_id;
    END IF;
    
    -- تحديث بيانات Tenant المتاح
    UPDATE tenants
    SET 
        name = p_user_name,
        email = p_user_email,
        phone = p_phone,
        status = 'active',
        updated_at = NOW()
    WHERE id = v_tenant_id;
    
    RAISE NOTICE '✅ تم ربط المشترك بـ Tenant: %', v_tenant_code;
    
    RETURN v_tenant_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Function لإنشاء Company افتراضية للـ Tenant
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_default_company_for_tenant(
    p_tenant_id UUID,
    p_company_name VARCHAR(255)
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
BEGIN
    -- توليد code فريد للشركة
    SELECT COUNT(*) INTO v_count FROM companies WHERE tenant_id = p_tenant_id;
    v_company_code := 'COMP-' || LPAD((v_count + 1)::TEXT, 3, '0');
    
    -- التأكد من عدم تكرار الكود
    WHILE EXISTS (SELECT 1 FROM companies WHERE code = v_company_code) LOOP
        v_company_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    END LOOP;
    
    -- إنشاء Company
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
        p_tenant_id,
        v_company_code,
        p_company_name,
        p_company_name,
        'SAR',
        1,
        'vat_sa',
        15.00,
        'weighted_average',
        'SA'
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ تم إنشاء Company: %', v_company_code;
    
    RETURN v_company_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Function كاملة لتسجيل مشترك جديد (الدالة الرئيسية)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_result JSONB;
BEGIN
    -- ═══════════════════════════════════════════════════════════
    -- 1. ربط بـ Tenant جاهز (أو إنشاء جديد)
    -- ═══════════════════════════════════════════════════════════
    v_tenant_id := assign_available_tenant(p_user_email, p_user_name, p_phone);
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في تخصيص Tenant للمشترك'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- 2. إنشاء Company افتراضية
    -- ═══════════════════════════════════════════════════════════
    v_company_id := create_default_company_for_tenant(
        v_tenant_id,
        COALESCE(p_company_name, p_user_name || ' Company')
    );
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في إنشاء الشركة'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- 3. إنشاء أو تحديث user_profile
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO user_profiles (
        id,
        email,
        full_name,
        phone,
        role,
        tenant_id,
        company_id
    )
    VALUES (
        p_user_id,
        p_user_email,
        p_user_name,
        p_phone,
        'admin',
        v_tenant_id,
        v_company_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = 'admin',
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        updated_at = NOW();
    
    -- ═══════════════════════════════════════════════════════════
    -- 4. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'message', 'تم التسجيل بنجاح'
    );
    
    RAISE NOTICE '✅ تم تسجيل المشترك بنجاح: user_id=%, tenant_id=%, company_id=%', 
                  p_user_id, v_tenant_id, v_company_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ في التسجيل: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. منح الصلاحيات
-- ═══════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION assign_available_tenant(VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_available_tenant(VARCHAR, VARCHAR, VARCHAR) TO anon;

GRANT EXECUTE ON FUNCTION create_default_company_for_tenant(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_company_for_tenant(UUID, VARCHAR) TO anon;

GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 5. Function للتحقق من Tenants المتاحة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_available_tenants_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM tenants
    WHERE status = 'available';
    
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_tenants_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_tenants_count() TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 6. Function لإعادة ملء Tenants المتاحة تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_refill_tenants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_count INT;
    v_needed_count INT;
    v_max_code INT;
    v_new_code VARCHAR(50);
BEGIN
    -- حساب عدد Tenants المتاحة
    SELECT COUNT(*) INTO v_available_count
    FROM tenants
    WHERE status = 'available';
    
    -- إذا قل العدد عن 5، أنشئ المزيد
    IF v_available_count < 5 THEN
        v_needed_count := 10 - v_available_count;
        
        -- الحصول على أعلى رقم tenant
        SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 8) AS INTEGER)), 0) INTO v_max_code
        FROM tenants WHERE code LIKE 'tenant-%';
        
        -- إنشاء Tenants جديدة
        FOR i IN 1..v_needed_count LOOP
            v_max_code := v_max_code + 1;
            v_new_code := 'tenant-' || LPAD(v_max_code::TEXT, 3, '0');
            
            INSERT INTO tenants (code, name, email, status, default_language)
            VALUES (
                v_new_code,
                'Tenant ' || v_max_code,
                v_new_code || '@erp.local',
                'available',
                'ar'
            )
            ON CONFLICT (code) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE '✅ تم إنشاء % tenants جديدة', v_needed_count;
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء/تحديث Trigger
DROP TRIGGER IF EXISTS trg_auto_refill_tenants ON tenants;
CREATE TRIGGER trg_auto_refill_tenants
    AFTER UPDATE OF status ON tenants
    FOR EACH ROW
    WHEN (OLD.status = 'available' AND NEW.status = 'active')
    EXECUTE FUNCTION auto_refill_tenants();

-- ═══════════════════════════════════════════════════════════════
-- 7. Function لإحصائيات Tenants
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_tenants_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', (SELECT COUNT(*) FROM tenants),
        'available', (SELECT COUNT(*) FROM tenants WHERE status = 'available'),
        'active', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
        'inactive', (SELECT COUNT(*) FROM tenants WHERE status = 'inactive'),
        'suspended', (SELECT COUNT(*) FROM tenants WHERE status = 'suspended')
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenants_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenants_statistics() TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 8. تحديث RLS Policies
-- ═══════════════════════════════════════════════════════════════

-- السماح للمستخدمين المصادق عليهم بقراءة tenants المتاحة (للتسجيل)
DROP POLICY IF EXISTS "Authenticated can view available tenants" ON tenants;
CREATE POLICY "Authenticated can view available tenants" ON tenants
    FOR SELECT USING (status = 'available' OR status = 'active');

-- السماح بإدراج user_profiles للمستخدمين الجدد
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- السماح بتحديث user_profiles
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- 9. حذف الدوال القديمة الخاطئة
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS register_new_user(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_or_create_default_tenant();

-- ═══════════════════════════════════════════════════════════════
-- ✅ تم! نظام التسجيل الكامل جاهز
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 28: نظام التسجيل الكامل - تم بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📌 الدوال المُنشأة:';
    RAISE NOTICE '   - assign_available_tenant()';
    RAISE NOTICE '   - create_default_company_for_tenant()';
    RAISE NOTICE '   - register_new_subscriber() ← الدالة الرئيسية';
    RAISE NOTICE '   - get_available_tenants_count()';
    RAISE NOTICE '   - get_tenants_statistics()';
    RAISE NOTICE '   - auto_refill_tenants() [Trigger]';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📝 للاختبار: SELECT register_new_subscriber(uuid, email, name, company, phone);';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
