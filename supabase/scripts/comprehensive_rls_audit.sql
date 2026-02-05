-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 COMPREHENSIVE RLS POLICIES AUDIT
-- فحص شامل لسياسات الأمان على مستوى البراندات والشركات والصلاحيات
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2026-02-05
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: RLS Status Overview
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '📊 SECTION 1: RLS STATUS OVERVIEW' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Tables with RLS enabled
SELECT 
    '1.1 Tables with RLS ENABLED' as info,
    COUNT(*) as total_tables
FROM pg_tables t
WHERE t.schemaname = 'public' AND t.rowsecurity = true;

-- Tables without RLS
SELECT 
    '1.2 Tables with RLS DISABLED' as info,
    COUNT(*) as total_tables
FROM pg_tables t
WHERE t.schemaname = 'public' AND t.rowsecurity = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: Policy Roles Analysis
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '📊 SECTION 2: POLICY ROLES ANALYSIS' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Policies by role type
SELECT 
    CASE 
        WHEN roles::text LIKE '%authenticated%' THEN '✅ authenticated'
        WHEN roles::text LIKE '%anon%' THEN '⚠️ anon'
        WHEN roles::text LIKE '%public%' THEN '⚠️ public'
        WHEN roles::text LIKE '%service_role%' THEN '🔧 service_role'
        ELSE '❓ other: ' || roles::text
    END as role_type,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY role_type
ORDER BY policy_count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: Tables with BLOCKED Access (RLS on, no policies)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '🚫 SECTION 3: BLOCKED TABLES (RLS enabled but NO policies)' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    t.tablename as blocked_table,
    '❌ NO POLICIES - BLOCKED!' as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND p.tablename IS NULL
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: Tenant Isolation Analysis
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '🏢 SECTION 4: TENANT ISOLATION ANALYSIS' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Check if tenant tables have tenant-based policies
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual::text LIKE '%tenant_id%' THEN '✅ Has tenant_id filter'
        WHEN qual::text = 'true' THEN '⚠️ Open access (no tenant filter)'
        ELSE '❓ Other: ' || LEFT(qual::text, 50)
    END as tenant_isolation_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tenant_subscriptions', 'companies', 'user_profiles')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: Company-Level Isolation
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '🏭 SECTION 5: COMPANY-LEVEL ISOLATION' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Check if operational tables have company-based policies
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%company_id%' THEN '✅ Has company_id filter'
        WHEN qual::text LIKE '%tenant_id%' THEN '🔶 Has tenant_id filter (no company)'
        WHEN qual::text = 'true' THEN '⚠️ Open access (no company filter)'
        ELSE '❓ Other'
    END as company_isolation_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'journal_entries', 'journal_entry_lines', 'chart_of_accounts',
    'customers', 'suppliers', 'products', 'warehouses',
    'sales_invoices', 'purchase_invoices', 'funds'
)
AND cmd = 'SELECT'
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: RBAC/Permissions Tables
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '🔐 SECTION 6: RBAC/PERMISSIONS TABLES' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    tablename,
    policyname,
    cmd,
    roles::text as roles,
    LEFT(qual::text, 60) as condition_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'roles', 'user_roles', 'permissions', 'role_permissions',
    'user_resource_access', 'visibility_rules'
)
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: Critical Tables Policy Summary
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '📋 SECTION 7: CRITICAL TABLES POLICY SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    -- Core
    'companies', 'branches', 'user_profiles', 'tenants',
    -- Accounting
    'chart_of_accounts', 'journal_entries', 'journal_entry_lines', 'fiscal_years',
    -- Customers/Suppliers
    'customers', 'suppliers', 'customer_groups',
    -- Inventory
    'products', 'warehouses', 'inventory_movements',
    -- Sales/Purchase
    'sales_invoices', 'purchase_invoices',
    -- RBAC
    'roles', 'user_roles', 'permissions'
)
GROUP BY tablename
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: Potential Issues Detection
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '⚠️ SECTION 8: POTENTIAL ISSUES DETECTION' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Issue 1: Policies using 'public' role with auth.uid() condition
SELECT 
    '🔴 Issue: public role with auth.uid() condition' as issue,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND roles::text LIKE '%public%'
AND qual::text LIKE '%auth.uid%';

-- Issue 2: Tables that SHOULD have company_id isolation but don't
SELECT 
    '🔶 Issue: Table should have company_id isolation' as issue,
    t.tablename
FROM pg_tables t
JOIN information_schema.columns c 
    ON c.table_name = t.tablename AND c.column_name = 'company_id'
LEFT JOIN pg_policies p 
    ON p.tablename = t.tablename AND p.schemaname = 'public' AND p.qual::text LIKE '%company_id%'
WHERE t.schemaname = 'public'
AND c.table_schema = 'public'
AND p.tablename IS NULL
AND t.rowsecurity = true
ORDER BY t.tablename;

-- Issue 3: Duplicate policies (same table, same command, same role)
SELECT 
    '🟡 Issue: Potential duplicate policies' as issue,
    tablename,
    cmd,
    roles::text,
    COUNT(*) as duplicate_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd, roles
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: Data Isolation Test
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '🧪 SECTION 9: DATA ISOLATION TEST' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

-- Check how many distinct tenants/companies have data
SELECT 'Tenants with data' as metric, COUNT(DISTINCT id) as count FROM tenants
UNION ALL
SELECT 'Companies total', COUNT(DISTINCT id) FROM companies
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'Journal Entries', COUNT(*) FROM journal_entries
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Chart of Accounts', COUNT(*) FROM chart_of_accounts;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: Final Summary
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '📊 SECTION 10: FINAL SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
    (SELECT COUNT(*) FROM pg_tables t 
     LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
     WHERE t.schemaname = 'public' AND t.rowsecurity = true AND p.tablename IS NULL) as blocked_tables;

SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
SELECT '✅ AUDIT COMPLETE' as status;
SELECT '═══════════════════════════════════════════════════════════════════════════' as separator;
