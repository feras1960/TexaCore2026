-- 🔍 عرض كل البراندات/المنتجات في saas_products

-- 1️⃣ هيكل الجدول
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'saas_products'
ORDER BY ordinal_position;

-- 2️⃣ كل المنتجات
SELECT * FROM saas_products ORDER BY name;

-- 3️⃣ إحصائيات: كم tenant لكل منتج
SELECT 
    sp.id,
    sp.name,
    COUNT(t.id) as tenant_count
FROM saas_products sp
LEFT JOIN tenants t ON t.product_id = sp.id
GROUP BY sp.id, sp.name
ORDER BY tenant_count DESC;
