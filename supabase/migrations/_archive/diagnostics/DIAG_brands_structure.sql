-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 فحص هيكلية البراندات الحالية
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ هل يوجد جدول brands؟
SELECT 
    '1️⃣ جدول brands' as "الفحص",
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brands')
        THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as "الحالة";

-- 2️⃣ هيكل جدول brands إن وجد
SELECT 
    column_name as "العمود",
    data_type as "النوع",
    is_nullable as "nullable"
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'brands'
ORDER BY ordinal_position;

-- 3️⃣ البراندات الموجودة حالياً
SELECT * FROM brands LIMIT 10;

-- 4️⃣ هل جدول tenants لديه brand_id؟
SELECT 
    column_name as "العمود",
    data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'tenants'
    AND column_name IN ('brand_id', 'brand_slug', 'brand');

-- 5️⃣ عرض بيانات tenants مع أعمدة البراند
SELECT id, name, brand_slug, status FROM tenants LIMIT 5;
