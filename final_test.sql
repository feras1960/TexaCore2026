-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 الاختبار النهائي - هل كل شيء يعمل؟
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. اختبار دالة get_user_allowed_modules (التي يستخدمها Frontend)
SELECT 
    module_code,
    name_ar,
    name_en,
    is_enabled,
    can_view,
    can_create,
    can_edit,
    can_delete
FROM get_user_allowed_modules(
    (SELECT id FROM auth.users WHERE email = 'fera3186@gmail.com')
)
ORDER BY display_order;

-- المتوقع: ~32 موديول مع جميع الصلاحيات = true

-- ═══════════════════════════════════════════════════════════════════════════

-- 2. إحصائيات شاملة
SELECT 
    'Total Active Modules' as metric,
    COUNT(*) as count
FROM modules
WHERE is_active = true

UNION ALL

SELECT 
    'Your Permissions',
    COUNT(*)
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
WHERE u.email = 'fera3186@gmail.com'

UNION ALL

SELECT 
    'Full Access Permissions',
    COUNT(*)
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
WHERE u.email = 'fera3186@gmail.com'
AND can_view = true
AND can_create = true
AND can_edit = true
AND can_delete = true

UNION ALL

SELECT 
    'Your Roles',
    COUNT(*)
FROM user_role_assignments ura
JOIN auth.users u ON ura.user_id = u.id
WHERE u.email = 'fera3186@gmail.com';

-- المتوقع:
-- Total Active Modules: 32
-- Your Permissions: 32
-- Full Access Permissions: 32
-- Your Roles: 1
