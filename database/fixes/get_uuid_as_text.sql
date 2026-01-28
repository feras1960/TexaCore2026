-- عرض الـ UUIDs كنص للنسخ بسهولة
SELECT 
    id::TEXT as user_id_copy_this,
    email
FROM auth.users
ORDER BY created_at;

-- انسخ القيمة من عمود user_id_copy_this
