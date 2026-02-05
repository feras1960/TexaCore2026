-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSE: Why data is not showing in the frontend
-- تشخيص: لماذا لا تظهر البيانات في الواجهة
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check journal entries company_id
SELECT 'journal_entries company_id check' as check_type;
SELECT DISTINCT company_id, COUNT(*) as count
FROM journal_entries
GROUP BY company_id;

-- 2. Check which companies exist
SELECT 'Available companies' as check_type;
SELECT id, name_ar, code FROM companies LIMIT 10;

-- 3. Check customers company_id
SELECT 'customers company_id check' as check_type;
SELECT DISTINCT company_id, COUNT(*) as count
FROM customers
GROUP BY company_id;

-- 4. Check if there's a tenant_id mismatch
SELECT 'Tenant ID on tables' as check_type;
SELECT 
    'journal_entries' as table_name,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(*) as total_rows
FROM journal_entries
UNION ALL
SELECT 
    'customers',
    COUNT(DISTINCT tenant_id),
    COUNT(*)
FROM customers
UNION ALL
SELECT 
    'chart_of_accounts',
    COUNT(DISTINCT tenant_id),
    COUNT(*)
FROM chart_of_accounts;

-- 5. Check current user's company
SELECT 'Current user info' as check_type;
SELECT id, email, company_id, tenant_id FROM user_profiles WHERE email = 'feras1960@gmail.com';
