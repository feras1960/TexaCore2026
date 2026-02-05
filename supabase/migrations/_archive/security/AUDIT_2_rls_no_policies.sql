-- ═══════════════════════════════════════════════════════════════════════════
-- 🟡 استعلام 2: جداول بـ RLS مفعل لكن بدون سياسات
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    t.tablename as "الجدول",
    '⚠️ RLS مفعل بدون سياسات' as "التحذير"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;
