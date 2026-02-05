-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 42: إعداد Platform Owner Tenant
-- STEP 42: Setup Platform Owner Tenant
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. إنشاء Platform Owner Tenant (nexrev-platform)
-- 2. إنشاء Company الرئيسية (Next Revolution)
-- 3. تفعيل جميع الموديولات
-- 4. تطبيق شجرة محاسبية
-- 
-- ⚠️ ملاحظة: قبل تنفيذ هذا الملف، تأكد من حذف جميع Tenants القديمة
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. دالة بسيطة لإنشاء Tenant جديد (بدون Pre-provisioned)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_new_tenant(
    p_tenant_code VARCHAR(50),
    p_tenant_name VARCHAR(255),
    p_email VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- إنشاء Tenant جديد مباشرة
    INSERT INTO tenants (
        code,
        name,
        email,
        phone,
        status,
        default_language
    )
    VALUES (
        p_tenant_code,
        p_tenant_name,
        p_email,
        p_phone,
        'active',
        'ar'
    )
    RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE '✅ تم إنشاء Tenant: % (ID: %)', p_tenant_code, v_tenant_id;
    
    RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION create_new_tenant IS 'إنشاء Tenant جديد مباشرة بدون Pre-provisioned system';

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_new_tenant(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_tenant(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 2. إنشاء Platform Owner Tenant + Company
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_platform_owner_email VARCHAR(255) := 'feras1960@gmail.com';
    v_user_id UUID;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 بدء إعداد Platform Owner Tenant';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 1: البحث عن user_id من auth.users
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_platform_owner_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE WARNING '⚠️ لم يتم العثور على المستخدم في auth.users بالبريد: %', v_platform_owner_email;
        RAISE NOTICE '💡 الحل: سجل دخول مرة واحدة بهذا البريد أولاً، ثم أعد تنفيذ هذا الملف';
        RAISE NOTICE '💡 أو استبدل البريد في السطر 67 بالبريد الصحيح';
    ELSE
        RAISE NOTICE '✅ تم العثور على المستخدم: % (ID: %)', v_platform_owner_email, v_user_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 2: إنشاء Platform Owner Tenant
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود Tenant مسبقاً
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE code = 'nexrev-platform';
    
    IF v_tenant_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Platform Owner Tenant موجود مسبقاً (ID: %)', v_tenant_id;
        RAISE NOTICE '💡 سيتم تحديث البيانات...';
        
        UPDATE tenants
        SET 
            name = 'NexRev Platform',
            email = v_platform_owner_email,
            status = 'active',
            updated_at = NOW()
        WHERE id = v_tenant_id;
    ELSE
        -- إنشاء جديد
        v_tenant_id := create_new_tenant(
            'nexrev-platform',
            'NexRev Platform',
            v_platform_owner_email,
            NULL
        );
    END IF;
    
    RAISE NOTICE '✅ Platform Owner Tenant ID: %', v_tenant_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 3: إنشاء Company الرئيسية
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود Company مسبقاً
    SELECT id INTO v_company_id
    FROM companies
    WHERE tenant_id = v_tenant_id
      AND code = 'NEXREV-001';
    
    IF v_company_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Company موجودة مسبقاً (ID: %)', v_company_id;
    ELSE
        INSERT INTO companies (
            tenant_id,
            code,
            name,
            name_ar,
            name_en,
            default_currency,
            country_code,
            business_type,
            company_type,
            fiscal_year_start_month,
            tax_system,
            vat_rate,
            inventory_valuation_method
        )
        VALUES (
            v_tenant_id,
            'NEXREV-001',
            'Next Revolution',
            'نكست ريفوليوشن',
            'Next Revolution',
            'SAR',
            'SA',
            'general',
            'production',
            1,
            'vat_sa',
            15.00,
            'weighted_average'
        )
        RETURNING id INTO v_company_id;
        
        RAISE NOTICE '✅ تم إنشاء Company: NEXREV-001 (ID: %)', v_company_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 4: ربط المستخدم بالـ Tenant والـ Company
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_user_id IS NOT NULL THEN
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
            v_platform_owner_email,
            'Feras',
            'super_admin',
            v_tenant_id,
            v_company_id
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = 'super_admin',
            tenant_id = EXCLUDED.tenant_id,
            company_id = EXCLUDED.company_id,
            updated_at = NOW();
        
        RAISE NOTICE '✅ تم ربط المستخدم بـ Platform Owner Tenant';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 5: تفعيل جميع الموديولات
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود جدول modules أولاً
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
        BEGIN
            INSERT INTO tenant_modules (tenant_id, module_code, is_active)
            SELECT v_tenant_id, module_code, true
            FROM modules
            WHERE is_active = true
            ON CONFLICT (tenant_id, module_code) DO UPDATE 
            SET is_active = true;
            
            RAISE NOTICE '✅ تم تفعيل جميع الموديولات';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '⚠️ فشل تفعيل الموديولات: %', SQLERRM;
            RAISE NOTICE '💡 يمكن تفعيلها يدوياً من الواجهة لاحقاً';
        END;
    ELSE
        RAISE WARNING '⚠️ جدول modules غير موجود - تخطي تفعيل الموديولات';
        RAISE NOTICE '💡 تأكد من تنفيذ STEP_36 (نظام الموديولات) أولاً';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 6: تطبيق شجرة محاسبية (Extended)
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من عدم وجود شجرة مسبقاً
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id LIMIT 1) THEN
        -- التحقق من وجود دالة apply_chart_template_to_company
        IF EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'apply_chart_template_to_company'
        ) THEN
            BEGIN
                PERFORM apply_chart_template_to_company(v_company_id, 'extended');
                RAISE NOTICE '✅ تم تطبيق الشجرة المحاسبية الموسعة';
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '⚠️ فشل تطبيق الشجرة المحاسبية: %', SQLERRM;
                RAISE NOTICE '💡 يمكنك تطبيقها يدوياً لاحقاً من واجهة النظام';
            END;
        ELSE
            RAISE NOTICE '⚠️ دالة apply_chart_template_to_company غير موجودة';
            RAISE NOTICE '💡 تأكد من تنفيذ STEP_31 (نظام القوالب) أولاً';
            RAISE NOTICE '💡 أو يمكنك إنشاء الحسابات يدوياً من الواجهة';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ الشجرة المحاسبية موجودة مسبقاً - لن يتم استبدالها';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 7: إنشاء صلاحيات كاملة (إذا كان نظام الصلاحيات مفعل)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_user_id IS NOT NULL THEN
        -- التحقق من وجود دالة create_default_user_permissions
        IF EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'create_default_user_permissions'
        ) THEN
            BEGIN
                -- إنشاء صلاحيات كاملة لجميع الموديولات
                PERFORM create_default_user_permissions(v_user_id);
                RAISE NOTICE '✅ تم إنشاء الصلاحيات الكاملة';
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '⚠️ فشل إنشاء الصلاحيات: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE '⚠️ دالة create_default_user_permissions غير موجودة';
            RAISE NOTICE '💡 تأكد من تنفيذ STEP_38 (دوال الصلاحيات) أولاً';
            RAISE NOTICE '💡 أو يمكن تخطي هذه الخطوة - الصلاحيات ليست إلزامية الآن';
        END IF;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- النتيجة النهائية
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل إعداد Platform Owner بنجاح!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 النتائج:';
    RAISE NOTICE '   • Tenant ID: %', v_tenant_id;
    RAISE NOTICE '   • Tenant Code: nexrev-platform';
    RAISE NOTICE '   • Company ID: %', v_company_id;
    RAISE NOTICE '   • Company Code: NEXREV-001';
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '   • User ID: %', v_user_id;
        RAISE NOTICE '   • User Email: %', v_platform_owner_email;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الخطوة التالية: STEP_43 (إنشاء Demo Tenant)';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ✅ اكتمل STEP 42
-- ═══════════════════════════════════════════════════════════════
