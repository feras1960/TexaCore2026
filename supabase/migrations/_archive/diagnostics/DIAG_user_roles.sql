-- فحص هيكل جدول user_roles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;
