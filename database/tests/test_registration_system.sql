-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار نظام التسجيل الجديد
-- Test New Registration System
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Test 1: التحقق من الهيكلية الحالية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🔍 Tenants الموجودة حالياً:' as test_name,
    code,
    name,
    email,
    status,
    (SELECT COUNT(*) FROM companies WHERE tenant_id = t.id) as companies_count
FROM tenants t
ORDER BY 
    CASE 
        WHEN code = 'nexrev-platform' THEN 1
        WHEN code = 'demo-tenant' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- Test 2: التحقق من Companies
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🏢 Companies الموجودة حالياً:' as test_name,
    c.code,
    c.name,
    c.business_type,
    c.company_type,
    t.code as tenant_code
FROM companies c
JOIN tenants t ON t.id = c.tenant_id
ORDER BY 
    CASE 
        WHEN t.code = 'nexrev-platform' THEN 1
        WHEN t.code = 'demo-tenant' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- Test 3: التحقق من الدوال المتاحة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚙️ الدوال المتاحة:' as test_name,
    proname as function_name,
    CASE 
        WHEN proname = 'create_new_tenant' THEN '✅ جديدة'
        WHEN proname = 'register_new_subscriber' THEN '✅ محدثة'
        WHEN proname = 'create_default_company_for_tenant' THEN '✅ موجودة'
        ELSE '✅'
    END as status
FROM pg_proc 
WHERE proname IN (
    'create_new_tenant',
    'register_new_subscriber',
    'create_default_company_for_tenant',
    -- الدوال القديمة (يجب ألا تكون موجودة)
    'assign_available_tenant',
    'release_tenant',
    'get_available_tenants_count',
    'auto_refill_tenants'
)
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════
-- Test 4: اختبار register_new_subscriber (محاكاة)
-- ═══════════════════════════════════════════════════════════════

-- ملاحظة: لا تنفذ هذا إلا إذا أردت اختبار حقيقي
-- سيُنشئ tenant و company جديدين

/*
SELECT register_new_subscriber(
    'test-user-id-12345'::UUID,
    'test@example.com',
    'Test User',
    'Test Company',
    '+966-50-1234567',
    'general',
    'SAR',
    'SA'
);
*/

-- ═══════════════════════════════════════════════════════════════
-- Test 5: التحقق من user_profiles
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '👤 User Profiles:' as test_name,
    up.email,
    up.full_name,
    up.role,
    t.code as tenant_code,
    c.code as company_code
FROM user_profiles up
LEFT JOIN tenants t ON t.id = up.tenant_id
LEFT JOIN companies c ON c.id = up.company_id
ORDER BY up.created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════
-- Test 6: التحقق من الموديولات المفعلة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📦 الموديولات المفعلة:' as test_name,
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules_count
FROM tenants t
LEFT JOIN tenant_modules tm ON tm.tenant_id = t.id AND tm.is_active = true
WHERE t.code IN ('nexrev-platform', 'demo-tenant')
GROUP BY t.code
ORDER BY t.code;

-- ═══════════════════════════════════════════════════════════════
-- Test 7: الشجرة المحاسبية في Demo Company
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🌳 الشجرة المحاسبية في Demo:' as test_name,
    COUNT(*) as accounts_count,
    COUNT(DISTINCT account_type_id) as account_types_count
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.code = 'demo-tenant';

-- ═══════════════════════════════════════════════════════════════
-- ✅ النتيجة المتوقعة:
-- ═══════════════════════════════════════════════════════════════

-- 1. يجب أن ترى 2 tenants فقط (nexrev-platform + demo-tenant)
-- 2. يجب أن ترى 2 companies (Next Revolution + Fabric Demo)
-- 3. يجب أن ترى 3 دوال (الجديدة) فقط - بدون القديمة
-- 4. يجب أن ترى user profile واحد على الأقل (Platform Owner)
-- 5. يجب أن ترى موديولات مفعلة لكل tenant
-- 6. يجب أن ترى حسابات محاسبية في Demo Company

-- ═══════════════════════════════════════════════════════════════
-- 🎯 الخطوة التالية:
-- ═══════════════════════════════════════════════════════════════

-- بعد التأكد من نجاح الاختبارات:
-- 1. اذهب للـ Frontend
-- 2. سجل مستخدم جديد
-- 3. يجب أن يعمل بدون أخطاء
-- 4. تحقق من إنشاء tenant و company جديدين في Database

-- ═══════════════════════════════════════════════════════════════
