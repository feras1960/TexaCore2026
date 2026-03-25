-- 🔍 فحص هيكل جدول tenants
SELECT 
    column_name as "العمود",
    data_type as "النوع",
    is_nullable as "nullable"
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tenants'
ORDER BY ordinal_position;
