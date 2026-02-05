
-- Verify Tenant and Accounts for specific user email
SELECT 
    t.id as tenant_id, 
    t.name as tenant_name, 
    t.code as tenant_code,
    t.status as tenant_status,
    p.email as user_email
FROM tenants t
JOIN user_profiles p ON t.id = p.tenant_id
WHERE p.email = 'feras1960@gmail.com';

-- Check Companies for this tenant
SELECT id as company_id, name as company_name, tenant_id 
FROM companies 
WHERE tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN user_profiles p ON t.id = p.tenant_id
    WHERE p.email = 'feras1960@gmail.com'
);

-- Check Accounts count for this tenant/company
SELECT count(*) as accounts_count, company_id, tenant_id 
FROM accounts 
WHERE tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN user_profiles p ON t.id = p.tenant_id
    WHERE p.email = 'feras1960@gmail.com'
)
GROUP BY company_id, tenant_id;

-- Check actual accounts data (first 5)
SELECT id, code, name, type, company_id 
FROM accounts 
WHERE tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN user_profiles p ON t.id = p.tenant_id
    WHERE p.email = 'feras1960@gmail.com'
)
LIMIT 5;
