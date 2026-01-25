-- ═══════════════════════════════════════════════════════════════════════════
-- فحص شامل للهيكلية قبل التسجيل
-- Complete Structure Check Before Registration
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. الـ Tenants الموجودة حالياً
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🏢 Tenants:' as section,
    code,
    name,
    email,
    status,
    created_at::date as created_date
FROM tenants
ORDER BY 
    CASE 
        WHEN code = 'nexrev-platform' THEN 1
        WHEN code = 'demo-tenant' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- 2. الـ Companies مع تفاصيلها
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🏭 Companies:' as section,
    c.code as company_code,
    c.name as company_name,
    c.business_type,
    c.company_type,
    c.default_currency,
    t.code as tenant_code,
    (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = c.id) as accounts_count
FROM companies c
JOIN tenants t ON t.id = c.tenant_id
ORDER BY 
    CASE 
        WHEN t.code = 'nexrev-platform' THEN 1
        WHEN t.code = 'demo-tenant' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- 3. المستخدمون الموجودون
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '👤 Users:' as section,
    up.email,
    up.full_name,
    up.role,
    t.code as tenant_code,
    c.code as company_code,
    up.created_at::date as created_date
FROM user_profiles up
LEFT JOIN tenants t ON t.id = up.tenant_id
LEFT JOIN companies c ON c.id = up.company_id
ORDER BY up.created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- 4. الموديولات المفعلة لكل Tenant
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📦 Modules per Tenant:' as section,
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules,
    STRING_AGG(tm.module_code, ', ' ORDER BY tm.module_code) as module_codes
FROM tenants t
LEFT JOIN tenant_modules tm ON tm.tenant_id = t.id AND tm.is_active = true
GROUP BY t.code
ORDER BY t.code;

-- ═══════════════════════════════════════════════════════════════
-- 5. الشجرة المحاسبية - ملخص
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🌳 Chart of Accounts Summary:' as section,
    t.code as tenant_code,
    c.code as company_code,
    COUNT(coa.id) as total_accounts,
    COUNT(DISTINCT coa.account_type_id) as account_types,
    MIN(coa.account_code) as first_account_code,
    MAX(coa.account_code) as last_account_code
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
GROUP BY t.code, c.code
ORDER BY 
    CASE 
        WHEN t.code = 'nexrev-platform' THEN 1
        WHEN t.code = 'demo-tenant' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- 6. التحقق من الدوال الأساسية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚙️ Essential Functions:' as section,
    proname as function_name,
    CASE 
        WHEN proname = 'create_new_tenant' THEN '✅ جديدة - لإنشاء tenant مباشرة'
        WHEN proname = 'register_new_subscriber' THEN '✅ محدثة - لتسجيل مشتركين جدد'
        WHEN proname = 'create_default_company_for_tenant' THEN '✅ أساسية - لإنشاء شركات'
        WHEN proname = 'apply_chart_template_to_company' THEN '✅ قوالب - لتطبيق شجرة محاسبية'
        ELSE '✅'
    END as description
FROM pg_proc 
WHERE proname IN (
    'create_new_tenant',
    'register_new_subscriber',
    'create_default_company_for_tenant',
    'apply_chart_template_to_company'
)
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════
-- 7. التحقق من عدم وجود الدوال القديمة (Pre-provisioned)
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🗑️ Old Functions (should be empty):' as section,
    proname as old_function_name,
    '❌ يجب حذفها' as status
FROM pg_proc 
WHERE proname IN (
    'assign_available_tenant',
    'release_tenant',
    'get_available_tenants_count',
    'auto_refill_tenants',
    'get_tenants_statistics'
)
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════
-- 8. الإحصائيات العامة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📊 Database Statistics:' as section,
    'Total Tenants' as metric,
    COUNT(*)::text as value
FROM tenants

UNION ALL

SELECT 
    '📊 Database Statistics:' as section,
    'Total Companies' as metric,
    COUNT(*)::text as value
FROM companies

UNION ALL

SELECT 
    '📊 Database Statistics:' as section,
    'Total Users' as metric,
    COUNT(*)::text as value
FROM user_profiles

UNION ALL

SELECT 
    '📊 Database Statistics:' as section,
    'Total Chart Accounts' as metric,
    COUNT(*)::text as value
FROM chart_of_accounts

UNION ALL

SELECT 
    '📊 Database Statistics:' as section,
    'Active Modules (All Tenants)' as metric,
    COUNT(*)::text as value
FROM tenant_modules
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════
-- 9. التحقق من أن Tenant Codes صحيحة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '✅ Tenant Codes Check:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM tenants WHERE code = 'nexrev-platform') 
        THEN '✅ nexrev-platform موجود'
        ELSE '❌ nexrev-platform مفقود'
    END as nexrev_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM tenants WHERE code = 'demo-tenant') 
        THEN '✅ demo-tenant موجود'
        ELSE '❌ demo-tenant مفقود'
    END as demo_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM tenants) = 2 
        THEN '✅ عدد Tenants صحيح (2)'
        ELSE '⚠️ عدد Tenants: ' || (SELECT COUNT(*) FROM tenants)::text
    END as count_check;

-- ═══════════════════════════════════════════════════════════════
-- 10. التحقق من الجهوزية للتسجيل
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🎯 Registration Readiness:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_new_subscriber')
        THEN '✅ register_new_subscriber() موجودة'
        ELSE '❌ register_new_subscriber() مفقودة'
    END as function_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_new_tenant')
        THEN '✅ create_new_tenant() موجودة'
        ELSE '❌ create_new_tenant() مفقودة'
    END as tenant_creation_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM tenants WHERE code LIKE 'tenant-%') = 0
        THEN '✅ لا توجد tenants تجريبية قديمة'
        ELSE '⚠️ يوجد ' || (SELECT COUNT(*) FROM tenants WHERE code LIKE 'tenant-%')::text || ' tenants قديمة'
    END as cleanup_check;

-- ═══════════════════════════════════════════════════════════════
-- ✅ ملخص النتائج المتوقعة:
-- ═══════════════════════════════════════════════════════════════

/*
النتائج المتوقعة:

1. Tenants: 2 (nexrev-platform + demo-tenant)
2. Companies: 2 (Next Revolution + Fabric Demo)
3. Users: 1 (feras1960@gmail.com)
4. Modules: موديولات مفعلة لكل tenant
5. Chart Accounts: حسابات في كلا الشركتين
6. Functions: 4 دوال أساسية موجودة
7. Old Functions: فارغ (تم حذفها)
8. Registration Readiness: جميع الـ checks ✅

إذا كانت جميع النتائج صحيحة → النظام جاهز للتسجيل! 🚀
*/
