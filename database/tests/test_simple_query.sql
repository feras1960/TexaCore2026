-- اختبار سريع - هل يمكن جلب البيانات؟
SELECT 
    t.id,
    t.name,
    t.code,
    t.email,
    t.phone,
    t.status,
    t.product_id,
    sp.name as product_name
FROM tenants t
LEFT JOIN saas_products sp ON t.product_id = sp.id
WHERE t.status IN ('active', 'trial', 'pending', 'suspended')
ORDER BY t.name;
