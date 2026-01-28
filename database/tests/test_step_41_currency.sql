-- ═══════════════════════════════════════════════════════════════
-- 🧪 اختبار STEP_41: Business Type + Company Switcher + Currency
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ التحقق من الأعمدة الجديدة في companies
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_business_type_exists BOOLEAN;
    v_company_type_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'business_type'
    ) INTO v_business_type_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'company_type'
    ) INTO v_company_type_exists;
    
    IF v_business_type_exists AND v_company_type_exists THEN
        RAISE NOTICE '✅ الأعمدة موجودة: business_type, company_type';
    ELSE
        RAISE NOTICE '❌ الأعمدة غير موجودة!';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ التحقق من الدوال الجديدة/المحدثة
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_create_company_params INT;
    v_register_params INT;
    v_get_companies_exists BOOLEAN;
    v_switch_company_exists BOOLEAN;
BEGIN
    -- عدد parameters في create_default_company_for_tenant (يجب أن يكون 6)
    SELECT COUNT(*) INTO v_create_company_params
    FROM information_schema.parameters
    WHERE specific_schema = 'public' 
    AND specific_name LIKE 'create_default_company_for_tenant%';
    
    -- عدد parameters في register_new_subscriber (يجب أن يكون 8)
    SELECT COUNT(*) INTO v_register_params
    FROM information_schema.parameters
    WHERE specific_schema = 'public' 
    AND specific_name LIKE 'register_new_subscriber%';
    
    -- التحقق من get_user_companies
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'get_user_companies'
    ) INTO v_get_companies_exists;
    
    -- التحقق من switch_user_company
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'switch_user_company'
    ) INTO v_switch_company_exists;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ create_default_company_for_tenant: % parameters (المطلوب: 6)', v_create_company_params;
    RAISE NOTICE '✅ register_new_subscriber: % parameters (المطلوب: 8)', v_register_params;
    RAISE NOTICE '✅ get_user_companies: %', CASE WHEN v_get_companies_exists THEN 'موجود' ELSE 'غير موجود!' END;
    RAISE NOTICE '✅ switch_user_company: %', CASE WHEN v_switch_company_exists THEN 'موجود' ELSE 'غير موجود!' END;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ التحقق من الفهارس الجديدة
-- ═══════════════════════════════════════════════════════════════
SELECT 
    indexname,
    CASE 
        WHEN indexname = 'idx_companies_business_type' THEN '✅'
        WHEN indexname = 'idx_companies_company_type' THEN '✅'
        WHEN indexname = 'idx_companies_tenant_business' THEN '✅'
        ELSE '⚪'
    END AS status
FROM pg_indexes
WHERE tablename = 'companies' 
AND indexname IN (
    'idx_companies_business_type',
    'idx_companies_company_type',
    'idx_companies_tenant_business'
);

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ عرض الشركات الموجودة حالياً (إن وجدت)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    code,
    name,
    business_type,
    company_type,
    default_currency,
    country_code,
    is_active,
    created_at
FROM companies
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ إحصائيات الشركات حسب business_type و company_type
-- ═══════════════════════════════════════════════════════════════
SELECT 
    business_type,
    company_type,
    default_currency,
    COUNT(*) as total
FROM companies
GROUP BY business_type, company_type, default_currency
ORDER BY business_type, company_type;

-- ═══════════════════════════════════════════════════════════════
-- 📊 النتيجة المتوقعة:
-- ═══════════════════════════════════════════════════════════════
-- ✅ الأعمدة موجودة: business_type, company_type
-- ✅ create_default_company_for_tenant: 6 parameters (p_tenant_id, p_company_name, p_business_type, p_company_type, p_currency, p_country_code)
-- ✅ register_new_subscriber: 8 parameters (p_user_id, p_user_email, p_user_name, p_company_name, p_phone, p_business_type, p_currency, p_country_code)
-- ✅ get_user_companies: موجود
-- ✅ switch_user_company: موجود
-- ✅ 3 فهارس جديدة

-- ═══════════════════════════════════════════════════════════════
-- 🎯 الخطوة التالية: اختبار تسجيل مستخدم جديد من الواجهة
-- ═══════════════════════════════════════════════════════════════
