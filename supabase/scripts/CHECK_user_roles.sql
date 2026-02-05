-- فحص ربط المستخدمين بالأدوار
SELECT 
    u.email,
    r.code as role_code,
    r.visible_modules
FROM auth.users u
LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
LEFT JOIN roles r ON r.id = ura.role_id
ORDER BY u.created_at DESC
LIMIT 5;
