-- =====================================================
-- CHECK_new_user.sql - فحص بيانات المستخدم الجديد
-- =====================================================

-- 1. آخر مستخدم مسجّل
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'tenant_id' as tenant_id,
    u.raw_user_meta_data->>'company_id' as company_id,
    u.raw_user_meta_data->>'role' as role_in_metadata
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 3;

-- 2. user_profiles 
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.is_super_admin,
    up.is_tenant_admin,
    up.tenant_id,
    up.company_id
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 3;

-- 3. user_role_assignments
SELECT 
    ura.user_id,
    r.code as role_code,
    r.name_ar as role_name,
    r.visible_modules
FROM user_role_assignments ura
JOIN roles r ON r.id = ura.role_id
ORDER BY ura.created_at DESC
LIMIT 5;

-- 4. دور tenant_owner
SELECT 
    code, 
    name_ar,
    visible_modules,
    array_length(visible_modules, 1) as modules_count
FROM roles 
WHERE code = 'tenant_owner';
