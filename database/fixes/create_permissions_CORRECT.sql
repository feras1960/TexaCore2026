-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء صلاحيات Full Admin (الإيميل الصحيح)
-- المستخدم: feras1960@gmail.com
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف الصلاحيات القديمة (إن وجدت)
DELETE FROM user_module_permissions ump
USING auth.users u
WHERE ump.user_id = u.id 
AND u.email = 'feras1960@gmail.com';

-- إنشاء صلاحيات جديدة كاملة
WITH user_info AS (
    SELECT 
        u.id as user_id,
        up.tenant_id,
        up.company_id
    FROM auth.users u
    JOIN user_profiles up ON u.id = up.id
    WHERE u.email = 'feras1960@gmail.com'
)
INSERT INTO user_module_permissions (
    user_id,
    tenant_id,
    company_id,
    module_code,
    can_view,
    can_create,
    can_edit,
    can_delete,
    can_export,
    can_import,
    can_approve,
    can_manage_settings
)
SELECT 
    ui.user_id,
    ui.tenant_id,
    ui.company_id,
    m.module_code,
    true, true, true, true, true, true, true, true
FROM user_info ui
CROSS JOIN modules m
WHERE m.is_active = true;

-- التحقق
SELECT 
    u.email,
    COUNT(*) as total_permissions
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
WHERE u.email = 'feras1960@gmail.com'
GROUP BY u.email;

-- المتوقع: 32
