-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 41: نظام نوع العمل والتنقل بين الشركات
-- STEP 41: Business Type and Company Switcher System
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. إضافة حقول business_type و company_type لجدول companies
-- 2. تعديل register_new_subscriber() لدعم إنشاء شركتين للأقمشة
-- 3. دالة switch_user_company() - تبديل الشركة النشطة
-- 4. دالة get_user_companies() - الحصول على قائمة شركات المستخدم
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة حقول نوع العمل ونوع الشركة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- إضافة business_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'business_type'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN business_type VARCHAR(50) DEFAULT 'general';
        
        RAISE NOTICE '✅ تم إضافة business_type لجدول companies';
    END IF;
    
    -- إضافة company_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'company_type'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN company_type VARCHAR(20) DEFAULT 'production';
        
        RAISE NOTICE '✅ تم إضافة company_type لجدول companies';
    END IF;
END $$;

-- تعليقات توضيحية
COMMENT ON COLUMN companies.business_type IS 'نوع العمل: general, fabric, exchange, healthcare, ecommerce';
COMMENT ON COLUMN companies.company_type IS 'نوع الشركة: production (حقيقية), testing (تجريبية)';

-- ═══════════════════════════════════════════════════════════════
-- 2. تعديل دالة create_default_company_for_tenant لدعم business_type
-- ═══════════════════════════════════════════════════════════════

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
    v_final_currency VARCHAR(3);
BEGIN
    -- توليد code فريد للشركة
    SELECT COUNT(*) INTO v_count FROM companies WHERE tenant_id = p_tenant_id;
    v_company_code := 'COMP-' || LPAD((v_count + 1)::TEXT, 3, '0');
    
    -- التأكد من عدم تكرار الكود
    WHILE EXISTS (SELECT 1 FROM companies WHERE code = v_company_code AND tenant_id = p_tenant_id) LOOP
        v_company_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    END LOOP;
    
    -- إضافة لاحقة للاسم حسب نوع الشركة
    IF p_company_type = 'testing' THEN
        v_full_name := p_company_name || ' - تجريبية';
        v_final_currency := 'USD'; -- الشركة التجريبية دائماً بالدولار
    ELSE
        v_full_name := p_company_name;
        v_final_currency := p_currency; -- الشركة الحقيقية حسب الدولة
    END IF;
    
    -- إنشاء Company
    INSERT INTO companies (
        tenant_id,
        code,
        name,
        name_ar,
        name_en,
        default_currency,
        fiscal_year_start_month,
        tax_system,
        vat_rate,
        inventory_valuation_method,
        country_code,
        business_type,
        company_type
    )
    VALUES (
        p_tenant_id,
        v_company_code,
        v_full_name,
        v_full_name,
        p_company_name,
        v_final_currency,
        1,
        'vat_sa',
        15.00,
        'weighted_average',
        p_country_code,
        p_business_type,
        p_company_type
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ تم إنشاء Company: % (نوع: %, عملة: %)', v_company_code, p_company_type, v_final_currency;
    
    RETURN v_company_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. تعديل register_new_subscriber لدعم business_type
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_testing_company_id UUID;
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
    -- 2. إنشاء Company حقيقية (production) - بالعملة حسب الدولة
    -- ═══════════════════════════════════════════════════════════
    v_company_id := create_default_company_for_tenant(
        v_tenant_id,
        COALESCE(p_company_name, p_user_name || ' Company'),
        p_business_type,
        'production',
        p_currency,
        p_country_code
    );
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في إنشاء الشركة'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- 3. إذا كان نوع العمل "Fabric" → إنشاء شركة تجريبية (بالدولار دائماً)
    -- ═══════════════════════════════════════════════════════════
    IF p_business_type = 'fabric' THEN
        v_testing_company_id := create_default_company_for_tenant(
            v_tenant_id,
            COALESCE(p_company_name, p_user_name || ' Company'),
            p_business_type,
            'testing',
            'USD', -- الشركة التجريبية دائماً بالدولار
            p_country_code
        );
        
        RAISE NOTICE '✅ تم إنشاء شركة تجريبية للأقمشة: % (عملة: USD)', v_testing_company_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- 4. إنشاء أو تحديث user_profile (الشركة الحقيقية هي الافتراضية)
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
        v_company_id  -- الشركة الحقيقية هي الافتراضية
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
    -- 5. تفعيل الموديولات للشركة الحقيقية
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO tenant_modules (tenant_id, module_id, is_active)
    SELECT v_tenant_id, id, true
    FROM modules
    WHERE is_active = true
    ON CONFLICT (tenant_id, module_id) DO UPDATE SET is_active = true;
    
    -- تفعيل للشركة التجريبية أيضاً (إن وجدت)
    IF v_testing_company_id IS NOT NULL THEN
        INSERT INTO tenant_modules (tenant_id, module_id, is_active)
        SELECT v_tenant_id, id, true
        FROM modules
        WHERE is_active = true
        ON CONFLICT (tenant_id, module_id) DO UPDATE SET is_active = true;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- 6. إنشاء صلاحيات كاملة للمستخدم
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO user_module_permissions (
        user_id,
        tenant_id,
        company_id,
        module_id,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_export,
        can_import,
        can_approve,
        can_manage_settings
    )
    SELECT 
        p_user_id,
        v_tenant_id,
        v_company_id,
        id,
        true, true, true, true, true, true, true, true
    FROM modules
    WHERE is_active = true
    ON CONFLICT (user_id, tenant_id, module_id) DO NOTHING;
    
    -- ═══════════════════════════════════════════════════════════
    -- 7. تعيين دور full_admin
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO user_role_assignments (user_id, tenant_id, company_id, role_id)
    SELECT p_user_id, v_tenant_id, v_company_id, id
    FROM user_roles
    WHERE role_code = 'full_admin' AND tenant_id = v_tenant_id
    ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
    
    -- ═══════════════════════════════════════════════════════════
    -- 8. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'testing_company_id', v_testing_company_id,
        'business_type', p_business_type,
        'message', 'تم التسجيل بنجاح'
    );
    
    RAISE NOTICE '✅ تم تسجيل المشترك بنجاح: user_id=%, tenant_id=%, company_id=%, testing_company_id=%', 
                  p_user_id, v_tenant_id, v_company_id, v_testing_company_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ في التسجيل: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة الحصول على شركات المستخدم
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    business_type VARCHAR,
    company_type VARCHAR,
    is_active BOOLEAN,
    is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_current_company_id UUID;
BEGIN
    -- تحديد المستخدم
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- الحصول على tenant_id و company_id الحالي
    SELECT up.tenant_id, up.company_id
    INTO v_tenant_id, v_current_company_id
    FROM user_profiles up
    WHERE up.id = v_user_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User not found or not assigned to a tenant';
    END IF;
    
    -- إرجاع جميع الشركات التابعة لنفس الـ tenant
    RETURN QUERY
    SELECT 
        c.id,
        c.code,
        c.name,
        c.name_ar,
        c.name_en,
        c.business_type,
        c.company_type,
        c.is_active,
        (c.id = v_current_company_id) AS is_current
    FROM companies c
    WHERE c.tenant_id = v_tenant_id
    ORDER BY 
        c.company_type DESC,  -- production أولاً
        c.created_at ASC;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_user_companies(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 5. دالة تبديل الشركة النشطة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION switch_user_company(
    p_user_id UUID,
    p_new_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_tenant_id UUID;
    v_company_name VARCHAR;
BEGIN
    -- التحقق من المستخدم
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'غير مصرح'
        );
    END IF;
    
    -- الحصول على tenant_id للمستخدم
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = p_user_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- التحقق من أن الشركة الجديدة تابعة لنفس الـ tenant
    SELECT tenant_id, name INTO v_company_tenant_id, v_company_name
    FROM companies
    WHERE id = p_new_company_id;
    
    IF v_company_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الشركة غير موجودة'
        );
    END IF;
    
    IF v_company_tenant_id != v_tenant_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الشركة غير تابعة لحسابك'
        );
    END IF;
    
    -- تحديث company_id في user_profiles
    UPDATE user_profiles
    SET 
        company_id = p_new_company_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RAISE NOTICE '✅ تم تبديل الشركة للمستخدم % إلى %', p_user_id, v_company_name;
    
    RETURN jsonb_build_object(
        'success', true,
        'company_id', p_new_company_id,
        'company_name', v_company_name,
        'message', 'تم تبديل الشركة بنجاح'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION switch_user_company(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 6. إنشاء فهارس لتحسين الأداء
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_companies_business_type ON companies(business_type);
CREATE INDEX IF NOT EXISTS idx_companies_company_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_business ON companies(tenant_id, business_type);

-- ═══════════════════════════════════════════════════════════════
-- ✅ تم! نظام Business Type و Company Switcher جاهز
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 41: نظام نوع العمل والتنقل بين الشركات - تم بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📌 الميزات الجديدة:';
    RAISE NOTICE '   - business_type: general, fabric, exchange, healthcare, ecommerce';
    RAISE NOTICE '   - company_type: production, testing';
    RAISE NOTICE '   - عند اختيار "fabric" → إنشاء شركتين (حقيقية + تجريبية)';
    RAISE NOTICE '   - get_user_companies() - عرض شركات المستخدم';
    RAISE NOTICE '   - switch_user_company() - تبديل الشركة النشطة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📝 للاختبار:';
    RAISE NOTICE '   SELECT * FROM get_user_companies();';
    RAISE NOTICE '   SELECT switch_user_company(user_id, company_id);';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
