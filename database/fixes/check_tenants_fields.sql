-- التحقق من حقول جدول tenants
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
