-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار STEP 41: نظام Business Type و Company Switcher
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من الحقول الجديدة في companies
-- ═══════════════════════════════════════════════════════════════

SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name IN ('business_type', 'company_type')
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من الدوال الجديدة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'register_new_subscriber',
    'get_user_companies',
    'switch_user_company',
    'create_default_company_for_tenant'
)
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════
-- 3. اختبار get_user_companies (لمستخدمك الحالي)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_user_id UUID;
    v_result RECORD;
BEGIN
    -- الحصول على user_id من البريد الإلكتروني
    SELECT id INTO v_user_id
    FROM user_profiles
    WHERE email = 'feras1960@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ المستخدم feras1960@gmail.com غير موجود';
        RETURN;
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 شركات المستخدم:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    FOR v_result IN 
        SELECT * FROM get_user_companies(v_user_id)
    LOOP
        RAISE NOTICE '  ✓ % | % | نوع العمل: % | نوع الشركة: % | نشطة: %',
            v_result.code,
            v_result.name,
            v_result.business_type,
            v_result.company_type,
            CASE WHEN v_result.is_current THEN '⭐ (الحالية)' ELSE '' END;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. إحصائيات الشركات حسب business_type
-- ═══════════════════════════════════════════════════════════════

SELECT 
    business_type,
    company_type,
    COUNT(*) as count
FROM companies
GROUP BY business_type, company_type
ORDER BY business_type, company_type;

-- ═══════════════════════════════════════════════════════════════
-- 5. إحصائيات نهائية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_total_companies INT;
    v_production_companies INT;
    v_testing_companies INT;
    v_fabric_companies INT;
BEGIN
    SELECT COUNT(*) INTO v_total_companies FROM companies;
    SELECT COUNT(*) INTO v_production_companies FROM companies WHERE company_type = 'production';
    SELECT COUNT(*) INTO v_testing_companies FROM companies WHERE company_type = 'testing';
    SELECT COUNT(*) INTO v_fabric_companies FROM companies WHERE business_type = 'fabric';
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 إحصائيات الشركات:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  • إجمالي الشركات: %', v_total_companies;
    RAISE NOTICE '  • شركات حقيقية (production): %', v_production_companies;
    RAISE NOTICE '  • شركات تجريبية (testing): %', v_testing_companies;
    RAISE NOTICE '  • شركات أقمشة (fabric): %', v_fabric_companies;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
