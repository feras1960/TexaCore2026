-- فحص إعدادات العملات للمستخدم الجديد
SELECT 
    c.name as company_name,
    cas.base_currency,
    cas.supported_currencies,
    cas.default_sales_currency,
    cas.default_purchase_currency
FROM companies c
JOIN company_accounting_settings cas ON cas.company_id = c.id
WHERE c.tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE email = 'testaco@test.com'
);
