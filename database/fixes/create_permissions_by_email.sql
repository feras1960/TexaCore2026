-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء صلاحيات Full Admin (باستخدام البريد الإلكتروني)
-- ═══════════════════════════════════════════════════════════════════════════

-- نحصل على الـ IDs من البريد الإلكتروني مباشرة
WITH user_info AS (
    SELECT 
        u.id as user_id,
        up.tenant_id,
        up.company_id
    FROM auth.users u
    JOIN user_profiles up ON u.id = up.id
    WHERE u.email = 'fera3186@gmail.com'
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
    true, -- can_view
    true, -- can_create
    true, -- can_edit
    true, -- can_delete
    true, -- can_export
    true, -- can_import
    true, -- can_approve
    true  -- can_manage_settings
FROM user_info ui
CROSS JOIN modules m
WHERE m.is_active = true
ON CONFLICT (user_id, tenant_id, company_id, module_code) 
DO UPDATE SET
    can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    can_export = true,
    can_import = true,
    can_approve = true,
    can_manage_settings = true,
    updated_at = NOW();

-- التحقق من النتيجة
SELECT 
    u.email,
    COUNT(*) as total_permissions
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
WHERE u.email = 'fera3186@gmail.com'
GROUP BY u.email;
