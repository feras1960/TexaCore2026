-- فحص هيكل super_admins
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'super_admins'
ORDER BY ordinal_position;
