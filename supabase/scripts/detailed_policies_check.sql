-- ═══════════════════════════════════════════════════════════════════════════
-- DETAILED POLICIES CHECK - فحص تفصيلي للسياسات
-- Run this to see all policies with their conditions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check policies on critical tables
SELECT 
    tablename,
    policyname,
    cmd,
    qual as using_condition,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('customers', 'suppliers', 'journal_entries', 'journal_entry_lines', 'chart_of_accounts', 'funds')
ORDER BY tablename, policyname;

-- 2. Check if there are duplicate policies causing issues
SELECT 
    tablename,
    policyname,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- 3. Check for conflicting policies (PERMISSIVE vs RESTRICTIVE)
SELECT 
    tablename,
    permissive,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename, permissive
ORDER BY tablename;
