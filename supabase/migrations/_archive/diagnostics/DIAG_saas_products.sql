-- 🔍 فحص جدول المنتجات SaaS

-- 1️⃣ البحث عن الجدول الذي يحتوي البراندات
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%product%'
ORDER BY tablename;

-- 2️⃣ فحص saas_products إذا موجود
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'saas_products'
ORDER BY ordinal_position;

-- 3️⃣ عرض محتوى saas_products
SELECT * FROM saas_products;

-- 4️⃣ العلاقة: البحث عن المنتج المرتبط
SELECT id, name, code, product_id, status,
       (SELECT name FROM saas_products sp WHERE sp.id = t.product_id) as product_name
FROM tenants t
LIMIT 10;
