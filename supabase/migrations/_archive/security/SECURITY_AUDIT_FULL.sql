-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 تقرير التدقيق الأمني الشامل
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ جميع الجداول وحالة RLS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '1️⃣ RLS STATUS' as section,
    COUNT(*) FILTER (WHERE c.relrowsecurity = true) as "جداول مع RLS",
    COUNT(*) FILTER (WHERE c.relrowsecurity = false) as "جداول بدون RLS",
    COUNT(*) as "إجمالي الجداول"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ الجداول بدون RLS (تفصيل)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '2️⃣ TABLES WITHOUT RLS' as section,
    t.tablename as "الجدول"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.schemaname = 'public' 
AND c.relrowsecurity = false
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ جداول مع RLS لكن بدون سياسات (Blocked)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '3️⃣ RLS WITHOUT POLICIES (BLOCKED)' as section,
    t.tablename as "الجدول"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.schemaname = 'public' 
AND c.relrowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
)
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ عدد السياسات لكل جدول (أعلى 30)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '4️⃣ POLICIES PER TABLE' as section,
    t.tablename as "الجدول",
    CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END as "RLS",
    COUNT(p.policyname) as "عدد السياسات"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY COUNT(p.policyname) DESC, t.tablename
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ سياسات user_profiles (مهم للحماية)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '5️⃣ USER_PROFILES POLICIES' as section,
    policyname as "السياسة",
    cmd as "العملية",
    LEFT(qual::TEXT, 100) as "شرط USING",
    LEFT(with_check::TEXT, 100) as "شرط WITH CHECK"
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ سياسات الاشتراكات
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '6️⃣ SUBSCRIPTIONS POLICIES' as section,
    tablename as "الجدول",
    policyname as "السياسة",
    cmd as "العملية"
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'subscription_invoices', 'tenant_subscriptions')
AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ Triggers الحماية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '7️⃣ PROTECTION TRIGGERS' as section,
    tgname as "اسم الـ Trigger",
    tgrelid::regclass as "الجدول"
FROM pg_trigger 
WHERE tgname LIKE '%sensitive%' 
   OR tgname LIKE '%protect%'
   OR tgname LIKE '%super_admin%'
   OR tgname LIKE '%role%';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ دوال SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '8️⃣ SECURITY DEFINER FUNCTIONS' as section,
    proname as "الدالة"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ سياسات UPDATE (حماية تغيير الصلاحيات)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '9️⃣ UPDATE POLICIES' as section,
    tablename as "الجدول",
    policyname as "السياسة",
    LEFT(with_check::TEXT, 120) as "شرط WITH CHECK"
FROM pg_policies 
WHERE cmd = 'UPDATE'
AND tablename IN ('user_profiles', 'users', 'user_role_assignments')
AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟 ملخص تنفيذي
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔟 EXECUTIVE SUMMARY' as section,
    (SELECT COUNT(*) FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
     JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
     WHERE t.schemaname = 'public' AND c.relrowsecurity = true) as "جداول مع RLS",
    (SELECT COUNT(*) FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
     JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
     WHERE t.schemaname = 'public' AND c.relrowsecurity = false) as "جداول بدون RLS",
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as "إجمالي السياسات",
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND prosecdef = true) as "دوال DEFINER",
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%sensitive%' OR tgname LIKE '%protect%') as "Triggers حماية";
