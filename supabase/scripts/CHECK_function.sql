-- فحص وجود دالة get_user_visible_modules
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_user_visible_modules';
