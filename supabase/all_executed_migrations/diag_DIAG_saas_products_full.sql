-- 🔍 فحص هيكل saas_products الكامل
SELECT 
    column_name as "العمود",
    data_type as "النوع",
    is_nullable as "nullable",
    column_default as "القيمة الافتراضية"
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'saas_products'
ORDER BY ordinal_position;

-- 2️⃣ حالة RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'saas_products';

-- 3️⃣ السياسات الموجودة
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies
WHERE tablename = 'saas_products';

-- 4️⃣ عرض البيانات الكاملة
SELECT * FROM saas_products;
