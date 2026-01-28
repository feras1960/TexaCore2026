-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء صلاحيات Full Admin
-- المستخدم: fera3186@gmail.com
-- ═══════════════════════════════════════════════════════════════════════════

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
    '65a5c73b-bb93-4c84-8ba8-155079b8736c1'::UUID,
    '6b1a9664-7692-4337-a3e8-2c12f786e573'::UUID,
    '13232324-0b03-4882-491c-d93065b93a93'::UUID,
    module_code,
    true, -- can_view
    true, -- can_create
    true, -- can_edit
    true, -- can_delete
    true, -- can_export
    true, -- can_import
    true, -- can_approve
    true  -- can_manage_settings
FROM modules
WHERE is_active = true
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
    'Permissions Created' as status,
    COUNT(*) as total_permissions
FROM user_module_permissions
WHERE user_id = '65a5c73b-bb93-4c84-8ba8-155079b8736c1'::UUID;
