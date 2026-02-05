-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 COMPREHENSIVE RLS POLICIES AUDIT
-- فحص شامل لجميع سياسات أمن الصفوف
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor to see all policies
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. All tables with RLS status
SELECT '═══════════════════════════════════════════════════════════════' as info;
SELECT '📊 TABLES WITH RLS STATUS' as section;
SELECT '═══════════════════════════════════════════════════════════════' as info;

SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COALESCE(p.policy_count, 0) as policies_count
FROM pg_tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- 2. All active policies
SELECT '═══════════════════════════════════════════════════════════════' as info;
SELECT '🔐 ALL ACTIVE RLS POLICIES' as section;
SELECT '═══════════════════════════════════════════════════════════════' as info;

SELECT 
    tablename,
    policyname,
    permissive,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tables without policies (potential issues)
SELECT '═══════════════════════════════════════════════════════════════' as info;
SELECT '⚠️ TABLES WITH RLS BUT NO POLICIES (BLOCKED!)' as section;
SELECT '═══════════════════════════════════════════════════════════════' as info;

SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.tablename IS NULL
ORDER BY t.tablename;

-- 4. Summary
SELECT '═══════════════════════════════════════════════════════════════' as info;
SELECT '📋 SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════════' as info;

SELECT 
    'Total tables' as metric,
    COUNT(*)::TEXT as value
FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tables with RLS enabled',
    COUNT(*)::TEXT
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
    'Total policies',
    COUNT(*)::TEXT
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tables with RLS but NO policies (BLOCKED)',
    COUNT(*)::TEXT
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.tablename IS NULL;
