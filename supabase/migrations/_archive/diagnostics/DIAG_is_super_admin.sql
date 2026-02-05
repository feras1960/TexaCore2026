-- 🔍 تشخيص: عرض كل نسخ دالة is_super_admin
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    n.nspname as schema
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'is_super_admin'
ORDER BY n.nspname, p.proname;
