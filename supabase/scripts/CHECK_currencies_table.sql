-- فحص جدول العملات
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'currencies'
ORDER BY ordinal_position;

-- فحص العملات الموجودة
SELECT * FROM currencies LIMIT 20;
