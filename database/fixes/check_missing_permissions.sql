-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 فحص المشكلة - لماذا 8 permissions فقط؟
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. عرض الصلاحيات الموجودة حالياً
SELECT 
    ump.module_code,
    m.name_ar,
    ump.can_view,
    ump.can_create,
    ump.can_edit,
    ump.can_delete
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
JOIN modules m ON ump.module_code = m.module_code
WHERE u.email = 'fera3186@gmail.com'
ORDER BY m.display_order;

-- يجب أن ترى الـ 8 موديولات الموجودة فقط

-- ═══════════════════════════════════════════════════════════════════════════

-- 2. عرض الموديولات المفقودة (الـ 24 المتبقية)
SELECT 
    m.module_code,
    m.name_ar,
    m.name_en,
    'Missing Permission' as status
FROM modules m
WHERE m.is_active = true
AND NOT EXISTS (
    SELECT 1 
    FROM user_module_permissions ump
    JOIN auth.users u ON ump.user_id = u.id
    WHERE u.email = 'fera3186@gmail.com'
    AND ump.module_code = m.module_code
)
ORDER BY m.display_order;

-- يجب أن ترى ~24 موديول بدون صلاحيات
