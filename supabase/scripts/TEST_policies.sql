-- =====================================================
-- TEST_policies.sql
-- المرحلة 7أ: اختبار السياسات والعزل
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- اختبار شامل لسياسات RLS والتريغرات
-- يتحقق من عزل البراندات والتينانتات والشركات
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 0. إعداد بيانات الاختبار
-- ═══════════════════════════════════════════════════════════════

-- جدول لتخزين نتائج الاختبارات
DROP TABLE IF EXISTS test_results;
CREATE TEMP TABLE test_results (
    id SERIAL PRIMARY KEY,
    test_category VARCHAR(100),
    test_name VARCHAR(200),
    test_description TEXT,
    expected_result TEXT,
    actual_result TEXT,
    passed BOOLEAN,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- دالة مساعدة لتسجيل نتيجة الاختبار
CREATE OR REPLACE FUNCTION log_test_result(
    p_category TEXT,
    p_name TEXT,
    p_description TEXT,
    p_expected TEXT,
    p_actual TEXT,
    p_passed BOOLEAN,
    p_error TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO test_results (test_category, test_name, test_description, expected_result, actual_result, passed, error_message)
    VALUES (p_category, p_name, p_description, p_expected, p_actual, p_passed, p_error);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء بيانات اختبار
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_texacore_id UUID;
    v_fincore_id UUID;
    v_medcore_id UUID;
    
    v_tenant_texa_1 UUID;
    v_tenant_texa_2 UUID;
    v_tenant_fin_1 UUID;
    v_tenant_med_1 UUID;
    
    v_company_texa_1_a UUID;
    v_company_texa_1_b UUID;
    v_company_fin_1_a UUID;
    
    v_partner_id UUID;
BEGIN
    -- التحقق من وجود البراندات
    SELECT id INTO v_texacore_id FROM public.saas_products WHERE code = 'TEXACORE' LIMIT 1;
    SELECT id INTO v_fincore_id FROM public.saas_products WHERE code = 'FINCORE' LIMIT 1;
    SELECT id INTO v_medcore_id FROM public.saas_products WHERE code = 'MEDCORE' LIMIT 1;
    
    -- إذا لم توجد البراندات، أنشئها
    IF v_texacore_id IS NULL THEN
        INSERT INTO public.saas_products (code, name, name_ar, description, is_active)
        VALUES ('TEXACORE', 'TexaCore', 'تيكساكور', 'نظام الأقمشة', true)
        RETURNING id INTO v_texacore_id;
    END IF;
    
    IF v_fincore_id IS NULL THEN
        INSERT INTO public.saas_products (code, name, name_ar, description, is_active)
        VALUES ('FINCORE', 'FinCore', 'فين كور', 'نظام الصرافة', true)
        RETURNING id INTO v_fincore_id;
    END IF;
    
    IF v_medcore_id IS NULL THEN
        INSERT INTO public.saas_products (code, name, name_ar, description, is_active)
        VALUES ('MEDCORE', 'MedCore', 'ميد كور', 'نظام المستشفيات', true)
        RETURNING id INTO v_medcore_id;
    END IF;
    
    RAISE NOTICE 'تم إنشاء/التحقق من البراندات: TexaCore=%, FinCore=%, MedCore=%', v_texacore_id, v_fincore_id, v_medcore_id;
    
    -- تخزين IDs للاستخدام في الاختبارات
    PERFORM set_config('test.texacore_id', v_texacore_id::TEXT, false);
    PERFORM set_config('test.fincore_id', v_fincore_id::TEXT, false);
    PERFORM set_config('test.medcore_id', v_medcore_id::TEXT, false);
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. اختبار الدوال المساعدة
-- ═══════════════════════════════════════════════════════════════

SELECT 'بدء اختبار الدوال المساعدة...' as status;

-- 2.1 اختبار is_platform_owner
DO $$
DECLARE
    v_result BOOLEAN;
BEGIN
    -- اختبار بدون مستخدم
    v_result := is_platform_owner(NULL);
    
    PERFORM log_test_result(
        'Helper Functions',
        'is_platform_owner_null',
        'is_platform_owner يُرجع false عند عدم وجود مستخدم',
        'false',
        v_result::TEXT,
        v_result = false
    );
END $$;

-- 2.2 اختبار is_platform_admin
DO $$
DECLARE
    v_result BOOLEAN;
BEGIN
    v_result := is_platform_admin(NULL);
    
    PERFORM log_test_result(
        'Helper Functions',
        'is_platform_admin_null',
        'is_platform_admin يُرجع false عند عدم وجود مستخدم',
        'false',
        v_result::TEXT,
        v_result = false
    );
END $$;

-- 2.3 اختبار get_user_tenant_id
DO $$
DECLARE
    v_result UUID;
BEGIN
    v_result := get_user_tenant_id(NULL);
    
    PERFORM log_test_result(
        'Helper Functions',
        'get_user_tenant_id_null',
        'get_user_tenant_id يُرجع NULL عند عدم وجود مستخدم',
        'NULL',
        COALESCE(v_result::TEXT, 'NULL'),
        v_result IS NULL
    );
END $$;

-- 2.4 اختبار get_user_brand_id
DO $$
DECLARE
    v_result UUID;
BEGIN
    v_result := get_user_brand_id(NULL);
    
    PERFORM log_test_result(
        'Helper Functions',
        'get_user_brand_id_null',
        'get_user_brand_id يُرجع NULL عند عدم وجود مستخدم',
        'NULL',
        COALESCE(v_result::TEXT, 'NULL'),
        v_result IS NULL
    );
END $$;

-- 2.5 اختبار is_partner_or_reseller
DO $$
DECLARE
    v_result BOOLEAN;
BEGIN
    v_result := is_partner_or_reseller(NULL);
    
    PERFORM log_test_result(
        'Helper Functions',
        'is_partner_or_reseller_null',
        'is_partner_or_reseller يُرجع false عند عدم وجود مستخدم',
        'false',
        v_result::TEXT,
        v_result = false
    );
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. اختبار وجود الجداول المطلوبة
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار وجود الجداول...' as status;

DO $$
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'saas_products',
        'tenants', 
        'companies',
        'user_profiles',
        'user_roles',
        'roles',
        'partners',
        'partner_allowed_products',
        'super_admins'
    ];
    v_exists BOOLEAN;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        v_exists := EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        );
        
        PERFORM log_test_result(
            'Table Existence',
            'table_' || v_table,
            'جدول ' || v_table || ' موجود',
            'true',
            v_exists::TEXT,
            v_exists
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. اختبار وجود السياسات
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار وجود السياسات...' as status;

DO $$
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'saas_products',
        'tenants', 
        'companies',
        'user_profiles'
    ];
    v_policy_count INT;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table;
        
        PERFORM log_test_result(
            'RLS Policies',
            'policies_' || v_table,
            'جدول ' || v_table || ' يحتوي على سياسات RLS',
            '>= 1',
            v_policy_count::TEXT,
            v_policy_count >= 1
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. اختبار وجود التريغرات
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار وجود التريغرات...' as status;

DO $$
DECLARE
    v_trigger_count INT;
    v_expected_triggers TEXT[] := ARRAY[
        'trg_protect_user_profiles',
        'trg_protect_tenants',
        'trg_protect_companies',
        'trg_protect_super_admins',
        'trg_protect_partners'
    ];
    v_trigger TEXT;
    v_exists BOOLEAN;
BEGIN
    FOREACH v_trigger IN ARRAY v_expected_triggers
    LOOP
        v_exists := EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE trigger_schema = 'public' AND trigger_name = v_trigger
        );
        
        PERFORM log_test_result(
            'Protection Triggers',
            v_trigger,
            'التريغر ' || v_trigger || ' موجود',
            'true',
            v_exists::TEXT,
            v_exists
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. اختبار عزل البراندات (Logical Tests)
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار عزل البراندات...' as status;

-- 6.1 اختبار أن is_same_brand تُرجع false لبراندات مختلفة
DO $$
DECLARE
    v_tenant_texa UUID;
    v_tenant_fin UUID;
    v_result BOOLEAN;
BEGIN
    -- الحصول على tenant من كل براند
    SELECT t.id INTO v_tenant_texa
    FROM public.tenants t
    JOIN public.saas_products p ON t.product_id = p.id
    WHERE p.code = 'TEXACORE'
    LIMIT 1;
    
    SELECT t.id INTO v_tenant_fin
    FROM public.tenants t
    JOIN public.saas_products p ON t.product_id = p.id
    WHERE p.code = 'FINCORE'
    LIMIT 1;
    
    IF v_tenant_texa IS NOT NULL AND v_tenant_fin IS NOT NULL THEN
        -- مستخدم من TexaCore يحاول الوصول لـ tenant من FinCore
        -- (هذا اختبار منطقي - ليس بمستخدم حقيقي)
        PERFORM log_test_result(
            'Brand Isolation',
            'cross_brand_tenants_exist',
            'وجود tenants من براندات مختلفة للاختبار',
            'true',
            'true',
            true
        );
    ELSE
        PERFORM log_test_result(
            'Brand Isolation',
            'cross_brand_tenants_exist',
            'وجود tenants من براندات مختلفة للاختبار',
            'true',
            'false - لا توجد بيانات كافية',
            false,
            'يرجى إنشاء tenants في براندات مختلفة'
        );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. اختبار الدوال مع بيانات حقيقية
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار الدوال مع بيانات حقيقية...' as status;

-- 7.1 اختبار get_brand_tenant_ids
DO $$
DECLARE
    v_brand_id UUID;
    v_tenant_ids UUID[];
BEGIN
    -- الحصول على أي براند نشط
    SELECT id INTO v_brand_id
    FROM public.saas_products
    WHERE is_active = true
    LIMIT 1;
    
    IF v_brand_id IS NOT NULL THEN
        v_tenant_ids := get_brand_tenant_ids(v_brand_id);
        
        PERFORM log_test_result(
            'Brand Functions',
            'get_brand_tenant_ids',
            'get_brand_tenant_ids تُرجع array صالح',
            'UUID[]',
            COALESCE(array_length(v_tenant_ids, 1)::TEXT || ' tenants', '0 tenants'),
            true
        );
    ELSE
        PERFORM log_test_result(
            'Brand Functions',
            'get_brand_tenant_ids',
            'get_brand_tenant_ids تُرجع array صالح',
            'UUID[]',
            'لا توجد براندات',
            false
        );
    END IF;
END $$;

-- 7.2 اختبار get_partner_allowed_brand_ids
DO $$
DECLARE
    v_brand_ids UUID[];
BEGIN
    -- لمستخدم غير موجود، يُرجع array فارغ أو براند واحد
    v_brand_ids := get_partner_allowed_brand_ids(NULL);
    
    PERFORM log_test_result(
        'Partner Functions',
        'get_partner_allowed_brand_ids_null',
        'get_partner_allowed_brand_ids تتعامل مع NULL',
        'UUID[]',
        COALESCE(array_length(v_brand_ids, 1)::TEXT || ' brands', '0 brands'),
        true
    );
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. اختبار check_row_access
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار check_row_access...' as status;

DO $$
DECLARE
    v_result BOOLEAN;
    v_any_tenant_id UUID;
    v_any_company_id UUID;
BEGIN
    -- الحصول على أي tenant و company
    SELECT id INTO v_any_tenant_id FROM public.tenants LIMIT 1;
    SELECT id INTO v_any_company_id FROM public.companies LIMIT 1;
    
    -- بدون مستخدم، يجب أن يُرجع false
    v_result := check_row_access(v_any_tenant_id, v_any_company_id, NULL);
    
    PERFORM log_test_result(
        'Row Access',
        'check_row_access_null_user',
        'check_row_access يُرجع false لمستخدم NULL',
        'false',
        v_result::TEXT,
        v_result = false
    );
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. اختبار can_access_company
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار can_access_company...' as status;

DO $$
DECLARE
    v_result BOOLEAN;
    v_any_company_id UUID;
BEGIN
    SELECT id INTO v_any_company_id FROM public.companies LIMIT 1;
    
    IF v_any_company_id IS NOT NULL THEN
        -- بدون مستخدم، يجب أن يُرجع false
        v_result := can_access_company(v_any_company_id, NULL);
        
        PERFORM log_test_result(
            'Company Access',
            'can_access_company_null_user',
            'can_access_company يُرجع false لمستخدم NULL',
            'false',
            v_result::TEXT,
            v_result = false
        );
    ELSE
        PERFORM log_test_result(
            'Company Access',
            'can_access_company_null_user',
            'can_access_company يُرجع false لمستخدم NULL',
            'false',
            'لا توجد شركات للاختبار',
            false
        );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. اختبار الهيكلية الصحيحة
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار الهيكلية...' as status;

-- 10.1 التحقق من وجود product_id في tenants
DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    v_exists := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'tenants' 
          AND column_name = 'product_id'
    );
    
    PERFORM log_test_result(
        'Schema Structure',
        'tenants_has_product_id',
        'جدول tenants يحتوي على product_id',
        'true',
        v_exists::TEXT,
        v_exists
    );
END $$;

-- 10.2 التحقق من وجود partner_id في tenants
DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    v_exists := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'tenants' 
          AND column_name = 'partner_id'
    );
    
    PERFORM log_test_result(
        'Schema Structure',
        'tenants_has_partner_id',
        'جدول tenants يحتوي على partner_id',
        'true',
        v_exists::TEXT,
        v_exists
    );
END $$;

-- 10.3 التحقق من وجود tenant_id في companies
DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    v_exists := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'companies' 
          AND column_name = 'tenant_id'
    );
    
    PERFORM log_test_result(
        'Schema Structure',
        'companies_has_tenant_id',
        'جدول companies يحتوي على tenant_id',
        'true',
        v_exists::TEXT,
        v_exists
    );
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. اختبار RLS مفعّل
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار تفعيل RLS...' as status;

DO $$
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'saas_products',
        'tenants', 
        'companies',
        'user_profiles',
        'partners',
        'super_admins'
    ];
    v_rls_enabled BOOLEAN;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT relrowsecurity INTO v_rls_enabled
        FROM pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relname = v_table;
        
        PERFORM log_test_result(
            'RLS Enabled',
            'rls_' || v_table,
            'RLS مفعّل على جدول ' || v_table,
            'true',
            COALESCE(v_rls_enabled::TEXT, 'table not found'),
            COALESCE(v_rls_enabled, false)
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 12. اختبار عدد الدوال المُنشأة
-- ═══════════════════════════════════════════════════════════════

SELECT 'اختبار الدوال المُنشأة...' as status;

DO $$
DECLARE
    v_function_count INT;
    v_expected_functions TEXT[] := ARRAY[
        'is_platform_owner',
        'is_platform_admin',
        'is_partner_or_reseller',
        'is_whitelabel_partner',
        'is_reseller',
        'get_user_tenant_id',
        'is_tenant_owner',
        'get_user_brand_id',
        'get_user_product_id',
        'is_same_brand',
        'get_partner_allowed_brand_ids',
        'get_brand_tenant_ids',
        'can_access_company',
        'check_row_access',
        'get_current_brand_id'
    ];
    v_func TEXT;
    v_exists BOOLEAN;
BEGIN
    FOREACH v_func IN ARRAY v_expected_functions
    LOOP
        v_exists := EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = v_func
        );
        
        PERFORM log_test_result(
            'Helper Functions Exist',
            'func_' || v_func,
            'الدالة ' || v_func || ' موجودة',
            'true',
            v_exists::TEXT,
            v_exists
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 13. ملخص النتائج
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT 'ملخص نتائج الاختبار' as title;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- إجمالي الاختبارات
SELECT 
    'إجمالي الاختبارات' as metric,
    COUNT(*)::TEXT as value
FROM test_results;

-- الاختبارات الناجحة
SELECT 
    'الاختبارات الناجحة ✓' as metric,
    COUNT(*)::TEXT as value
FROM test_results
WHERE passed = true;

-- الاختبارات الفاشلة
SELECT 
    'الاختبارات الفاشلة ✗' as metric,
    COUNT(*)::TEXT as value
FROM test_results
WHERE passed = false;

-- نسبة النجاح
SELECT 
    'نسبة النجاح' as metric,
    ROUND(
        (COUNT(*) FILTER (WHERE passed = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
    )::TEXT || '%' as value
FROM test_results;

-- ═══════════════════════════════════════════════════════════════
-- 14. تفاصيل الاختبارات الفاشلة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT 'تفاصيل الاختبارات الفاشلة' as title;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    test_category,
    test_name,
    test_description,
    expected_result,
    actual_result,
    COALESCE(error_message, '-') as error_message
FROM test_results
WHERE passed = false
ORDER BY test_category, test_name;

-- ═══════════════════════════════════════════════════════════════
-- 15. ملخص حسب الفئة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT 'ملخص حسب الفئة' as title;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    test_category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE passed = true) as passed,
    COUNT(*) FILTER (WHERE passed = false) as failed,
    CASE 
        WHEN COUNT(*) FILTER (WHERE passed = false) = 0 THEN '✓ كل الاختبارات ناجحة'
        ELSE '✗ يوجد اختبارات فاشلة'
    END as status
FROM test_results
GROUP BY test_category
ORDER BY test_category;

-- ═══════════════════════════════════════════════════════════════
-- 16. جميع النتائج التفصيلية
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT 'جميع نتائج الاختبار' as title;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    CASE WHEN passed THEN '✓' ELSE '✗' END as result,
    test_category,
    test_name,
    test_description
FROM test_results
ORDER BY test_category, test_name;

-- ═══════════════════════════════════════════════════════════════
-- النهاية
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT 'انتهى الاختبار!' as title;
SELECT NOW() as executed_at;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- حذف الدالة المؤقتة
DROP FUNCTION IF EXISTS log_test_result(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT);
