-- ═══════════════════════════════════════════════════════════════════════════
-- إصلاح كامل لدالة register_new_subscriber
-- Complete Fix for register_new_subscriber Function
-- ═══════════════════════════════════════════════════════════════════════════
--
-- هذا الملف يحل مشكلة PGRST202 (Function not found in schema cache)
-- بحذف الدالة القديمة وإعادة إنشائها بـ signature صحيح
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. حذف الدالة القديمة
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.register_new_subscriber(UUID, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.register_new_subscriber CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 2. إعادة إنشاء الدالة بـ signature صحيح
-- ═══════════════════════════════════════════════════════════════

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
        v_company_id
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        updated_at = NOW();
    
    -- ═══════════════════════════════════════════════════════════
    -- 5. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'testing_company_id', v_testing_company_id,
        'business_type', p_business_type,
        'message', CASE 
            WHEN p_business_type = 'fabric' 
            THEN 'تم إنشاء شركتين: حقيقية وتجريبية'
            ELSE 'تم إنشاء الشركة بنجاح'
        END
    );
    
    RAISE NOTICE '✅ تم تسجيل المشترك بنجاح: %', v_result;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في register_new_subscriber: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. منح الصلاحيات
-- ═══════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.register_new_subscriber TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_subscriber TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من نجاح العملية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل إصلاح الدالة بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 التحقق من الدالة:';
    
    -- عرض signature الدالة
    FOR rec IN (
        SELECT 
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS parameters,
            pg_get_function_result(p.oid) AS return_type
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'register_new_subscriber'
    ) LOOP
        RAISE NOTICE '  ✅ Function: %', rec.function_name;
        RAISE NOTICE '  ✅ Parameters: %', rec.parameters;
        RAISE NOTICE '  ✅ Returns: %', rec.return_type;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 التحقق من الصلاحيات:';
    
    -- عرض الصلاحيات
    FOR rec IN (
        SELECT grantee, privilege_type
        FROM information_schema.routine_privileges
        WHERE routine_name = 'register_new_subscriber'
          AND routine_schema = 'public'
    ) LOOP
        RAISE NOTICE '  ✅ %: %', rec.grantee, rec.privilege_type;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 يمكنك الآن اختبار التسجيل من Frontend!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
