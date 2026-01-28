-- استعلام بسيط جداً للتحقق
SELECT COUNT(*) as my_permissions
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
WHERE u.email = 'fera3186@gmail.com';

-- يجب أن يظهر 32
