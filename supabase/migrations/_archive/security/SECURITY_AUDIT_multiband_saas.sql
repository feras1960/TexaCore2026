-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 مسح أمني شامل لهيكلية SaaS متعددة العلامات التجارية
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ جداول الهيكلية الأساسية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '1️⃣ الجداول الأساسية في الهيكلية' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

-- عرض الجداول المتعلقة بالهيكلية
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'brands', 'tenants', 'companies', 'branches',
        'user_profiles', 'user_roles', 'user_role_assignments',
        'permissions', 'role_permissions',
        'subscriptions', 'subscription_plans', 'plans', 'products'
    )
ORDER BY 
    CASE 
        WHEN t.table_name = 'brands' THEN 1
        WHEN t.table_name = 'tenants' THEN 2
        WHEN t.table_name = 'companies' THEN 3
        WHEN t.table_name = 'branches' THEN 4
        WHEN t.table_name = 'user_profiles' THEN 5
        WHEN t.table_name = 'user_roles' THEN 6
        WHEN t.table_name = 'user_role_assignments' THEN 7
        ELSE 10
    END;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ أعمدة كل جدول
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '2️⃣ أعمدة الجداول الأساسية' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'brands', 'tenants', 'companies', 'branches',
        'user_profiles', 'user_roles', 'user_role_assignments'
    )
ORDER BY 
    table_name,
    ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ العلاقات (Foreign Keys)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '3️⃣ العلاقات بين الجداول (Foreign Keys)' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (
        tc.table_name IN ('brands', 'tenants', 'companies', 'branches', 'user_profiles', 'user_roles', 'user_role_assignments')
        OR ccu.table_name IN ('brands', 'tenants', 'companies', 'branches', 'user_profiles', 'user_roles', 'user_role_assignments')
    )
ORDER BY tc.table_name, kcu.column_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ حالة RLS على الجداول
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '4️⃣ حالة RLS على جميع الجداول' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ مفعل'
        ELSE '❌ معطل'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ جميع سياسات RLS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '5️⃣ سياسات RLS الموجودة' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ الجداول بدون سياسات (RLS مفعل لكن بدون سياسات)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '6️⃣ جداول بـ RLS مفعل لكن بدون سياسات (خطر!)' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    t.tablename,
    '⚠️ RLS مفعل بدون سياسات - يحجب كل الوصول!' as warning
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ دوال SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '7️⃣ دوال SECURITY DEFINER' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE p.prosecdef 
        WHEN true THEN '🔒 SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prosecdef = true
ORDER BY p.proname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ الجداول التي تنقصها أعمدة العزل
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '8️⃣ جداول تنقصها أعمدة العزل' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    t.table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'tenant_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as has_tenant_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'company_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as has_company_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'brand_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as has_brand_id
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('schema_migrations', 'spatial_ref_sys')
ORDER BY t.table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ فحص عزل user_profiles (هل المستخدم يستطيع تغيير بياناته الحساسة؟)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '9️⃣ سياسات user_profiles (فحص العزل الذاتي)' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    policyname,
    cmd,
    roles,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟 إحصائيات عامة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as section;
SELECT '🔟 إحصائيات عامة' as title;
SELECT '═══════════════════════════════════════════════════════════════' as section;

SELECT 
    'إجمالي الجداول' as metric,
    COUNT(*)::text as value
FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 
    'جداول بـ RLS مفعل',
    COUNT(*)::text
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
    'جداول بـ RLS معطل',
    COUNT(*)::text
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false
UNION ALL
SELECT 
    'إجمالي سياسات RLS',
    COUNT(*)::text
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 
    'دوال SECURITY DEFINER',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true;
