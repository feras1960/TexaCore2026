-- ═══════════════════════════════════════════════════════════════════════════════
-- SQL Verification: Check Created Accounts
-- ═══════════════════════════════════════════════════════════════════════════════

-- Run this script in Supabase SQL Editor to see if accounts exist for your company
-- and to check why they might not be visible (Tenant ID mismatch?)

SELECT 
    c.name as company_name,
    c.chart_type,
    coa.account_code, 
    coa.name_ar, 
    coa.account_type_id,
    coa.tenant_id as account_tenant,
    c.tenant_id as company_tenant
FROM chart_of_accounts coa
JOIN companies c ON coa.company_id = c.id
LIMIT 20;

-- If this returns rows, then the accounts EXIST.
-- If the 'account_tenant' column matches your user's tenant, RLS should allow you to see them.
