-- =====================================================
-- CHECK_roles_modules.sql
-- فحص الأدوار و visible_modules
-- =====================================================

-- 1. عرض جميع الأدوار
SELECT 
    id, code, name_ar, name_en, is_super_admin, is_system,
    visible_modules
FROM roles
ORDER BY code;

-- 2. عرض ربطات المستخدمين بالأدوار
SELECT 
    u.email,
    r.code as role_code,
    r.visible_modules
FROM auth.users u
LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
LEFT JOIN roles r ON r.id = ura.role_id
ORDER BY u.email;

-- 3. هل يوجد دور tenant_owner؟
SELECT EXISTS (SELECT 1 FROM roles WHERE code = 'tenant_owner') as has_tenant_owner;
