-- 1. List all defined Templates
SELECT 
    id, 
    template_code, 
    template_name_ar, 
    chart_type, 
    description 
FROM chart_templates;

-- 2. Count accounts in each template (if stored in a template table)
-- Note: Often templates are just functions, but if there is a 'chart_template_accounts' table, we check it.
SELECT 
    template_id, 
    COUNT(*) as account_count 
FROM chart_template_accounts 
GROUP BY template_id;

-- 3. Check the current company's actual account count
SELECT 
    c.name as company_name, 
    c.chart_type,
    COUNT(coa.id) as actual_account_count
FROM companies c
LEFT JOIN chart_of_accounts coa ON c.id = coa.company_id
WHERE c.id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()) -- This might fail if run as postgres without auth context
OR c.name LIKE '%nexrev%' -- Fallback lookup
GROUP BY c.id, c.name, c.chart_type;
