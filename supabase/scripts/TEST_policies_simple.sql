-- =====================================================
-- TEST_policies_simple.sql
-- اختبار مبسّط للسياسات والعزل
-- =====================================================

-- 1. اختبار وجود الجداول المطلوبة
SELECT 'جداول النظام' as category, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saas_products') THEN '✓' ELSE '✗' END as saas_products,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants') THEN '✓' ELSE '✗' END as tenants,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies') THEN '✓' ELSE '✗' END as companies,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_profiles') THEN '✓' ELSE '✗' END as user_profiles,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='partners') THEN '✓' ELSE '✗' END as partners,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='super_admins') THEN '✓' ELSE '✗' END as super_admins;

-- 2. اختبار وجود الدوال المساعدة
SELECT 'الدوال المساعدة' as category,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_platform_owner') THEN '✓' ELSE '✗' END as is_platform_owner,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_platform_admin') THEN '✓' ELSE '✗' END as is_platform_admin,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_user_tenant_id') THEN '✓' ELSE '✗' END as get_user_tenant_id,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_user_brand_id') THEN '✓' ELSE '✗' END as get_user_brand_id,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_same_brand') THEN '✓' ELSE '✗' END as is_same_brand,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='check_row_access') THEN '✓' ELSE '✗' END as check_row_access;

-- 3. اختبار تفعيل RLS
SELECT 'RLS مفعّل' as category,
       tablename,
       CASE WHEN rowsecurity THEN '✓ مفعّل' ELSE '✗ غير مفعّل' END as rls_status
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('saas_products', 'tenants', 'companies', 'user_profiles', 'partners', 'super_admins', 'roles')
ORDER BY tablename;

-- 4. عدد السياسات لكل جدول
SELECT 'سياسات RLS' as category,
       tablename,
       COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename
LIMIT 20;

-- 5. عدد التريغرات لكل جدول
SELECT 'التريغرات' as category,
       event_object_table as table_name,
       COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table
ORDER BY trigger_count DESC
LIMIT 20;

-- 6. اختبار الدوال بقيم NULL
SELECT 'اختبار الدوال' as category,
       'is_platform_owner(NULL)' as function_call,
       COALESCE(is_platform_owner(NULL)::TEXT, 'NULL') as result,
       CASE WHEN is_platform_owner(NULL) = false THEN '✓' ELSE '✗' END as passed;

SELECT 'اختبار الدوال' as category,
       'is_platform_admin(NULL)' as function_call,
       COALESCE(is_platform_admin(NULL)::TEXT, 'NULL') as result,
       CASE WHEN is_platform_admin(NULL) = false THEN '✓' ELSE '✗' END as passed;

SELECT 'اختبار الدوال' as category,
       'get_user_tenant_id(NULL)' as function_call,
       COALESCE(get_user_tenant_id(NULL)::TEXT, 'NULL') as result,
       CASE WHEN get_user_tenant_id(NULL) IS NULL THEN '✓' ELSE '✗' END as passed;

-- 7. ملخص البيانات
SELECT 'ملخص البيانات' as category,
       (SELECT COUNT(*) FROM public.saas_products) as brands,
       (SELECT COUNT(*) FROM public.tenants) as tenants,
       (SELECT COUNT(*) FROM public.companies) as companies,
       (SELECT COUNT(*) FROM public.user_profiles) as users;

-- 8. البراندات الموجودة
SELECT 'البراندات' as category,
       id,
       code,
       name,
       is_active
FROM public.saas_products
ORDER BY code;

-- 9. الملخص النهائي
SELECT '═══════════════════════════════════════════════════════════' as line
UNION ALL
SELECT '                    ✓ الاختبار مكتمل!'
UNION ALL
SELECT '═══════════════════════════════════════════════════════════';
