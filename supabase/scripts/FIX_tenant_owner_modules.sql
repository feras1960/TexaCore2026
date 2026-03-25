-- =====================================================
-- FIX_tenant_owner_modules.sql
-- تحديث الموديولات لتتوافق مع أكواد الـ frontend
-- =====================================================

-- تحديث visible_modules لدور tenant_owner ليتوافق مع modules.ts
UPDATE roles 
SET visible_modules = ARRAY[
    'dashboard',
    'accounting',
    'inventory',
    'fabric',
    'sales',
    'purchases',
    'crm',          -- بدل customers
    'pos',
    'hr',
    'shipments',
    'activity_log',
    'system_config'
]::TEXT[]
WHERE code = 'tenant_owner';

-- التحقق
SELECT code, visible_modules, array_length(visible_modules, 1) as count
FROM roles WHERE code = 'tenant_owner';

SELECT '✅ تم تحديث موديولات tenant_owner' as result;
