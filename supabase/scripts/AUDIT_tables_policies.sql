-- =====================================================
-- AUDIT_tables_policies.sql
-- مسح شامل للجداول والسياسات
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- يُستخدم هذا السكربت للتحقق من حالة الجداول والسياسات
-- يُنصح بتشغيله بعد كل تحديث أو إضافة جداول جديدة
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. ملخص عام
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '📊 ملخص عام للنظام' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as "إجمالي الجداول",
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as "جداول لها سياسات",
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as "إجمالي السياسات",
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as "إجمالي التريغرات",
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') as "إجمالي الدوال";

-- ═══════════════════════════════════════════════════════════════
-- 2. قائمة الجداول مع حالة RLS
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '📋 جميع الجداول وحالة RLS' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    t.tablename as "الجدول",
    CASE WHEN c.relrowsecurity THEN '✓ مفعّل' ELSE '✗ غير مفعّل' END as "RLS",
    COALESCE(p.policy_count, 0) as "عدد السياسات",
    COALESCE(tr.trigger_count, 0) as "عدد التريغرات",
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'tenant_id') THEN '✓'
        ELSE '−'
    END as "tenant_id",
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'company_id') THEN '✓'
        ELSE '−'
    END as "company_id",
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'product_id') THEN '✓'
        ELSE '−'
    END as "product_id"
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
LEFT JOIN (
    SELECT event_object_table, COUNT(*) as trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    GROUP BY event_object_table
) tr ON t.tablename = tr.event_object_table
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 3. الجداول بدون RLS (تحتاج مراجعة)
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '⚠️ جداول بدون RLS' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    t.tablename as "الجدول",
    '✗ يحتاج تفعيل RLS' as "الحالة"
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace
WHERE t.schemaname = 'public'
  AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 4. الجداول بدون سياسات (تحتاج مراجعة)
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '⚠️ جداول بدون سياسات RLS' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    t.tablename as "الجدول",
    '✗ يحتاج سياسات' as "الحالة"
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT IN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public')
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 5. تفاصيل السياسات لكل جدول
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '📜 تفاصيل السياسات' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    tablename as "الجدول",
    policyname as "اسم السياسة",
    cmd as "العملية",
    CASE 
        WHEN qual LIKE '%is_platform_admin%' THEN 'Platform Admin'
        WHEN qual LIKE '%is_platform_owner%' THEN 'Platform Owner'
        WHEN qual LIKE '%check_row_access%' THEN 'Row Access Check'
        WHEN qual LIKE '%can_access_company%' THEN 'Company Access'
        WHEN qual LIKE '%get_user_tenant_id%' THEN 'Tenant Check'
        WHEN qual LIKE '%true%' THEN 'Public'
        ELSE 'Custom'
    END as "نوع السياسة"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ═══════════════════════════════════════════════════════════════
-- 6. تصنيف الجداول حسب الأعمدة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '📊 تصنيف الجداول' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

-- جداول المنصة (بدون tenant_id)
SELECT 'المجموعة أ: جداول المنصة (بدون tenant_id)' as "التصنيف", COUNT(*) as "العدد"
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'tenant_id')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'company_id')
UNION ALL
-- جداول التينانت (tenant_id فقط)
SELECT 'المجموعة ج: جداول التينانت (tenant_id فقط)', COUNT(*)
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'tenant_id')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'company_id')
UNION ALL
-- جداول الشركة (tenant_id + company_id)
SELECT 'المجموعة د: جداول الشركة (tenant_id + company_id)', COUNT(*)
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'company_id')
UNION ALL
-- جداول أخرى (company_id فقط)
SELECT 'المجموعة و: جداول (company_id فقط)', COUNT(*)
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename AND column_name = 'company_id');

-- ═══════════════════════════════════════════════════════════════
-- 7. قائمة الدوال المساعدة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '🔧 الدوال المساعدة' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    p.proname as "اسم الدالة",
    pg_get_function_arguments(p.oid) as "المُدخلات",
    pg_get_function_result(p.oid) as "المُخرجات",
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as "نوع الأمان"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_platform_owner',
    'is_platform_admin',
    'is_whitelabel_partner',
    'is_reseller',
    'is_partner_or_reseller',
    'get_partner_tenant_ids',
    'get_user_brand_id',
    'get_user_product_id',
    'is_same_brand',
    'get_brand_tenant_ids',
    'get_partner_allowed_brand_ids',
    'get_user_tenant_id',
    'is_tenant_owner',
    'is_tenant_admin',
    'get_tenant_company_ids',
    'get_user_company_id',
    'is_company_admin',
    'can_access_company',
    'get_user_accessible_company_ids',
    'check_row_access',
    'get_current_brand_id'
  )
ORDER BY p.proname;

-- ═══════════════════════════════════════════════════════════════
-- 8. التريغرات حسب النوع
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '⚡ التريغرات حسب النوع' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    CASE 
        WHEN trigger_name LIKE 'trg_protect_%' THEN '🛡️ حماية'
        WHEN trigger_name LIKE 'trg_auto_tenant_%' THEN '🔄 تعيين tenant_id'
        WHEN trigger_name LIKE 'trg_auto_company_%' THEN '🔄 تعيين company_id'
        WHEN trigger_name LIKE 'trg_brand_isolation_%' THEN '🔒 عزل البراند'
        WHEN trigger_name LIKE 'trg_update_timestamp_%' THEN '⏰ تحديث الوقت'
        WHEN trigger_name LIKE 'trg_audit_%' THEN '📝 تدقيق'
        ELSE '⚙️ أخرى'
    END as "النوع",
    COUNT(*) as "العدد"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY 
    CASE 
        WHEN trigger_name LIKE 'trg_protect_%' THEN '🛡️ حماية'
        WHEN trigger_name LIKE 'trg_auto_tenant_%' THEN '🔄 تعيين tenant_id'
        WHEN trigger_name LIKE 'trg_auto_company_%' THEN '🔄 تعيين company_id'
        WHEN trigger_name LIKE 'trg_brand_isolation_%' THEN '🔒 عزل البراند'
        WHEN trigger_name LIKE 'trg_update_timestamp_%' THEN '⏰ تحديث الوقت'
        WHEN trigger_name LIKE 'trg_audit_%' THEN '📝 تدقيق'
        ELSE '⚙️ أخرى'
    END
ORDER BY "العدد" DESC;

-- ═══════════════════════════════════════════════════════════════
-- 9. البراندات الموجودة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '🏷️ البراندات' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    code as "الكود",
    name as "الاسم EN",
    COALESCE(name_ar, name) as "الاسم AR",
    CASE WHEN is_active THEN '✓ نشط' ELSE '✗ غير نشط' END as "الحالة",
    (SELECT COUNT(*) FROM tenants WHERE product_id = saas_products.id) as "عدد التينانتات"
FROM saas_products
ORDER BY code;

-- ═══════════════════════════════════════════════════════════════
-- 10. ملخص التينانتات والشركات
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '🏢 ملخص البيانات' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    'التينانتات' as "النوع",
    (SELECT COUNT(*) FROM tenants) as "الإجمالي",
    (SELECT COUNT(*) FROM tenants) as "النشط"
UNION ALL
SELECT 
    'الشركات',
    (SELECT COUNT(*) FROM companies),
    (SELECT COUNT(*) FROM companies)
UNION ALL
SELECT 
    'المستخدمون',
    (SELECT COUNT(*) FROM user_profiles),
    COALESCE((SELECT COUNT(*) FROM user_profiles WHERE is_active = true), (SELECT COUNT(*) FROM user_profiles))
UNION ALL
SELECT 
    'الوكلاء',
    COALESCE((SELECT COUNT(*) FROM partners), 0),
    COALESCE((SELECT COUNT(*) FROM partners WHERE is_active = true), 0)
UNION ALL
SELECT 
    'مديرو المنصة',
    COALESCE((SELECT COUNT(*) FROM super_admins), 0),
    COALESCE((SELECT COUNT(*) FROM super_admins WHERE is_active = true), 0);

-- ═══════════════════════════════════════════════════════════════
-- 11. فحص السياسات الخطرة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '⚠️ سياسات تحتاج مراجعة (USING true على جداول حساسة)' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    tablename as "الجدول",
    policyname as "السياسة",
    cmd as "العملية",
    '⚠️ USING(true) - مفتوحة للجميع' as "التحذير"
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
  AND tablename NOT IN ('countries', 'currencies', 'account_types', 'uom', 'languages', 'timezones')
  AND cmd != 'SELECT';

-- ═══════════════════════════════════════════════════════════════
-- 12. تقرير الصحة
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '🏥 تقرير صحة النظام' as title;
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";

SELECT 
    'الجداول الإجمالية' as "الفحص",
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::TEXT as "القيمة",
    '✓' as "الحالة"
UNION ALL
SELECT 
    'الجداول بـ RLS',
    (SELECT COUNT(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true)::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true) > 50 THEN '✓' ELSE '⚠️' END
UNION ALL
SELECT 
    'الجداول بدون RLS',
    (SELECT COUNT(*) FROM pg_tables t LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace WHERE t.schemaname = 'public' AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false))::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM pg_tables t LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace WHERE t.schemaname = 'public' AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)) < 10 THEN '✓' ELSE '⚠️' END
UNION ALL
SELECT 
    'إجمالي السياسات',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') > 100 THEN '✓' ELSE '⚠️' END
UNION ALL
SELECT 
    'إجمالي التريغرات',
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public')::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') > 100 THEN '✓' ELSE '⚠️' END
UNION ALL
SELECT 
    'الدوال المساعدة',
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname LIKE 'is_%' OR p.proname LIKE 'get_%' OR p.proname LIKE 'can_%' OR p.proname LIKE 'check_%')::TEXT,
    '✓';

-- ═══════════════════════════════════════════════════════════════
-- النهاية
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
SELECT '✅ اكتمل المسح الشامل - ' || NOW()::TEXT as "النتيجة";
SELECT '═══════════════════════════════════════════════════════════════' as "═══════════════════";
