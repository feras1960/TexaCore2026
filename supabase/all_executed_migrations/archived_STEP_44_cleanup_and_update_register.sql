-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 44: تنظيف وحذف Pre-provisioned Tenants System
-- STEP 44: Cleanup and Remove Pre-provisioned Tenants System
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. حذف جميع Tenants القديمة (ما عدا Platform Owner و Demo)
-- 2. حذف Pre-provisioned System (الدوال والـ Triggers)
-- 3. تحديث register_new_subscriber() - إنشاء Tenant مباشرة
-- 
-- ⚠️ تحذير: هذا الملف سيحذف جميع Tenants التجريبية!
-- ✅ سيتم الاحتفاظ بـ: nexrev-platform و demo-tenant فقط
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: حذف جميع Tenants القديمة (ما عدا المهمة)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_deleted_count INT;
    v_tenant_id UUID;
    v_total_deleted INT := 0;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🧹 بدء تنظيف Tenants القديمة';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- حذف البيانات المرتبطة بالـ Tenants القديمة أولاً
    -- لتجنب مشاكل Foreign Key Constraints
    
    FOR v_tenant_id IN 
        SELECT id FROM tenants 
        WHERE code NOT IN ('nexrev-platform', 'demo-tenant')
    LOOP
        BEGIN
            -- حذف العملات المرتبطة بهذا الـ Tenant
            DELETE FROM currencies WHERE tenant_id = v_tenant_id;
            
            -- حذف البيانات الأخرى (CASCADE سيتكفل بها)
            -- لكن نحذف العملات يدوياً لتجنب NULL constraint
            
            -- حذف الـ Tenant نفسه
            DELETE FROM tenants WHERE id = v_tenant_id;
            
            v_total_deleted := v_total_deleted + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '⚠️ فشل حذف Tenant (ID: %): %', v_tenant_id, SQLERRM;
        END;
    END LOOP;
    
    IF v_total_deleted > 0 THEN
        RAISE NOTICE '✅ تم حذف % tenant قديمة', v_total_deleted;
    ELSE
        RAISE NOTICE '✅ لا توجد tenants قديمة للحذف';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: حذف Pre-provisioned System (الدوال والـ Triggers)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🗑️ بدء حذف Pre-provisioned System';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- 1. حذف Trigger
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_auto_refill_tenants'
    ) THEN
        DROP TRIGGER IF EXISTS trg_auto_refill_tenants ON tenants;
        RAISE NOTICE '✅ تم حذف Trigger: trg_auto_refill_tenants';
    END IF;
    
    -- 2. حذف الدوال القديمة
    DROP FUNCTION IF EXISTS auto_refill_tenants();
    RAISE NOTICE '✅ تم حذف Function: auto_refill_tenants()';
    
    DROP FUNCTION IF EXISTS release_tenant(UUID);
    RAISE NOTICE '✅ تم حذف Function: release_tenant()';
    
    DROP FUNCTION IF EXISTS get_available_tenants_count();
    RAISE NOTICE '✅ تم حذف Function: get_available_tenants_count()';
    
    DROP FUNCTION IF EXISTS get_tenants_statistics();
    RAISE NOTICE '✅ تم حذف Function: get_tenants_statistics()';
    
    -- 3. حذف assign_available_tenant() القديمة
    -- (لكن احتفظ بـ create_new_tenant الجديدة)
    DROP FUNCTION IF EXISTS assign_available_tenant(VARCHAR, VARCHAR, VARCHAR);
    RAISE NOTICE '✅ تم حذف Function: assign_available_tenant()';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل حذف Pre-provisioned System';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 3: تحديث register_new_subscriber()
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🔄 بدء تحديث register_new_subscriber()';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- حذف النسخ القديمة
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

-- إنشاء النسخة الجديدة والصحيحة
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
    v_tenant_code VARCHAR(50);
    v_company_id UUID;
    v_testing_company_id UUID;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '📝 بدء تسجيل مشترك جديد: %', p_user_email;
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 1: إنشاء tenant_code فريد
    -- ═══════════════════════════════════════════════════════════════
    v_tenant_code := 'tenant-' || LPAD(
        (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 8) AS INTEGER)), 0) + 1 
         FROM tenants WHERE code LIKE 'tenant-%')::TEXT,
        3, '0'
    );
    
    RAISE NOTICE '📌 Tenant Code: %', v_tenant_code;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 2: إنشاء Tenant جديد مباشرة (بدون pre-provisioned)
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        v_tenant_id := create_new_tenant(
            v_tenant_code,
            p_user_name,
            p_user_email,
            p_phone
        );
        
        RAISE NOTICE '✅ تم إنشاء Tenant: % (ID: %)', v_tenant_code, v_tenant_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في إنشاء Tenant: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في إنشاء Tenant: ' || SQLERRM
        );
    END;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في إنشاء Tenant للمشترك'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 3: إنشاء Company حقيقية (production)
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        v_company_id := create_default_company_for_tenant(
            v_tenant_id,
            COALESCE(p_company_name, p_user_name || ' Company'),
            p_business_type,
            'production',
            p_currency,
            p_country_code
        );
        
        RAISE NOTICE '✅ تم إنشاء Company: % (ID: %)', 
                     COALESCE(p_company_name, p_user_name || ' Company'), 
                     v_company_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في إنشاء Company: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في إنشاء الشركة: ' || SQLERRM
        );
    END;
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في إنشاء الشركة'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 4: إذا كان fabric → لا نُنشئ شركة تجريبية!
    -- المستخدم سيستخدم Demo Tenant للتجريب
    -- ═══════════════════════════════════════════════════════════════
    
    -- ملاحظة: تم إلغاء إنشاء testing company
    -- المستخدمون يمكنهم استخدام Demo Tenant للتجريب
    
    IF p_business_type = 'fabric' THEN
        RAISE NOTICE '💡 نوع العمل: Fabric - يمكن للمستخدم استخدام Demo Tenant للتجريب';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 5: ربط المستخدم بالـ Tenant والـ Company
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
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
        
        RAISE NOTICE '✅ تم ربط المستخدم بالـ Tenant والـ Company';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في ربط المستخدم: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في ربط المستخدم: ' || SQLERRM
        );
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 6: تفعيل الموديولات للـ Tenant
    -- ═══════════════════════════════════════════════════════════════
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
        BEGIN
            INSERT INTO tenant_modules (tenant_id, module_code, is_active)
            SELECT v_tenant_id, module_code, true
            FROM modules
            WHERE is_active = true
            ON CONFLICT (tenant_id, module_code) DO UPDATE 
            SET is_active = true;
            
            RAISE NOTICE '✅ تم تفعيل الموديولات';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '⚠️ فشل تفعيل الموديولات: %', SQLERRM;
        END;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 7: إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════════
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل تسجيل المشترك بنجاح!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 النتائج:';
    RAISE NOTICE '   • User ID: %', p_user_id;
    RAISE NOTICE '   • Tenant ID: %', v_tenant_id;
    RAISE NOTICE '   • Tenant Code: %', v_tenant_code;
    RAISE NOTICE '   • Company ID: %', v_company_id;
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', v_tenant_code,
        'company_id', v_company_id,
        'message', 'تم التسجيل بنجاح'
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ عام في التسجيل: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;

COMMENT ON FUNCTION register_new_subscriber IS 'تسجيل مشترك جديد - النسخة الجديدة (بدون pre-provisioned system)';

-- ═══════════════════════════════════════════════════════════════
-- الجزء 4: التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenants_count INT;
    v_platform_exists BOOLEAN;
    v_demo_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 التحقق النهائي';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- عد Tenants المتبقية
    SELECT COUNT(*) INTO v_tenants_count FROM tenants;
    RAISE NOTICE '• عدد Tenants الإجمالي: %', v_tenants_count;
    
    -- التحقق من Platform Owner
    SELECT EXISTS(SELECT 1 FROM tenants WHERE code = 'nexrev-platform') 
    INTO v_platform_exists;
    RAISE NOTICE '• Platform Owner: %', 
                 CASE WHEN v_platform_exists THEN '✅ موجود' ELSE '❌ مفقود' END;
    
    -- التحقق من Demo Tenant
    SELECT EXISTS(SELECT 1 FROM tenants WHERE code = 'demo-tenant') 
    INTO v_demo_exists;
    RAISE NOTICE '• Demo Tenant: %', 
                 CASE WHEN v_demo_exists THEN '✅ موجود' ELSE '❌ مفقود' END;
    
    RAISE NOTICE '';
    
    IF v_tenants_count = 2 AND v_platform_exists AND v_demo_exists THEN
        RAISE NOTICE '✅ التنظيف مكتمل بنجاح!';
        RAISE NOTICE '✅ Database نظيف ومنظم';
    ELSIF v_platform_exists AND v_demo_exists THEN
        RAISE NOTICE '⚠️ يوجد % tenants إضافية', v_tenants_count - 2;
        RAISE NOTICE '💡 يمكنك حذفها يدوياً إذا أردت';
    ELSE
        RAISE WARNING '⚠️ بعض Tenants الأساسية مفقودة!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الخطوة التالية: اختبار التسجيل من Frontend';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ✅ اكتمل STEP 44
-- ═══════════════════════════════════════════════════════════════
