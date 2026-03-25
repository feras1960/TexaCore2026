-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 المسح الأمني الشامل النهائي
-- تاريخ: 2026-02-04 بعد الإصلاحات
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 الملخص التنفيذي
-- ═══════════════════════════════════════════════════════════════════════════
WITH stats AS (
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled,
        COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled
    FROM pg_tables WHERE schemaname = 'public'
),
policies_count AS (
    SELECT COUNT(DISTINCT tablename) as tables_with_policies
    FROM pg_policies WHERE schemaname = 'public'
),
blocked AS (
    SELECT COUNT(*) as blocked_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public' AND t.rowsecurity = true
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
)
SELECT 
    '📊 الملخص التنفيذي' as "التقرير",
    s.total as "إجمالي الجداول",
    s.rls_enabled as "✅ RLS مفعل",
    s.rls_disabled as "❌ RLS معطل",
    ROUND(100.0 * s.rls_enabled / s.total, 1) as "نسبة التأمين %",
    (SELECT COUNT(*) FROM blocked) as "⚠️ محجوب (بدون سياسات)",
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as "إجمالي السياسات"
FROM stats s;

-- ═══════════════════════════════════════════════════════════════════════════
-- ❌ الجداول المتبقية بدون RLS (تحتاج إصلاح)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '❌ بدون RLS' as "الحالة",
    tablename as "الجدول"
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ الجداول المحجوبة (RLS مفعل بدون سياسات)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '⚠️ محجوب' as "الحالة",
    t.tablename as "الجدول"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;
