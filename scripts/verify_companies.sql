-- Check if companies table has data
SELECT count(*) as companies_count FROM companies;

-- List top 5 companies with tenant info to verify JOIN
SELECT 
    c.id, 
    c.name, 
    c.tenant_id, 
    t.name as tenant_name,
    t.status as tenant_status
FROM companies c
LEFT JOIN tenants t ON c.tenant_id = t.id
LIMIT 5;

-- Check if RLS is enabled on companies
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'companies';
