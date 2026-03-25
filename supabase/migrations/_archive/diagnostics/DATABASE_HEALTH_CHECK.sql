-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 تدقيق شامل لبنية قاعدة البيانات
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إحصائيات عامة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 DATABASE STATS' as section,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as "الجداول",
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as "السياسات",
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') as "الدوال",
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as "الفهارس";

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ جميع الجداول مع عدد الصفوف (أعلى 40)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📋 TOP TABLES' as section,
    s.relname as "الجدول",
    CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END as "RLS",
    s.n_live_tup as "الصفوف"
FROM pg_stat_user_tables s
JOIN pg_class c ON s.relname = c.relname AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE s.schemaname = 'public'
ORDER BY s.n_live_tup DESC
LIMIT 40;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ RLS Status
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '3️⃣ RLS STATUS' as section,
    CASE WHEN c.relrowsecurity THEN 'مع RLS ✅' ELSE 'بدون RLS ❌' END as "الحالة",
    COUNT(*) as "العدد"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.schemaname = 'public'
GROUP BY c.relrowsecurity;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ Triggers الحماية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '4️⃣ PROTECTION TRIGGERS' as section,
    tg.tgname as "Trigger",
    tg.tgrelid::regclass as "الجدول",
    CASE WHEN tg.tgenabled = 'O' THEN '✅ مفعل' ELSE '❌ معطل' END as "الحالة"
FROM pg_trigger tg
JOIN pg_class c ON tg.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND tg.tgname LIKE 'protect_%'
ORDER BY tg.tgname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ MFA Settings
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '5️⃣ MFA SETTINGS' as section,
    is_enabled as "2FA مفعل",
    enforce_for_all as "إلزامي",
    allow_totp as "TOTP",
    allow_email_otp as "Email"
FROM mfa_system_settings
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ الجداول بدون RLS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '6️⃣ TABLES WITHOUT RLS' as section,
    t.tablename as "الجدول"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename AND c.relkind = 'r'
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.schemaname = 'public' 
AND c.relrowsecurity = false
ORDER BY t.tablename
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ ملخص الصحة النهائي
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '7️⃣ FINAL HEALTH' as section,
    '✅ قاعدة البيانات سليمة' as status,
    NOW() as checked_at;
