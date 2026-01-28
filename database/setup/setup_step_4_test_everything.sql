-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 الخطوة 4: الاختبار النهائي
-- ═══════════════════════════════════════════════════════════════════════════
-- نفذ هذه الاستعلامات للتحقق من أن كل شيء يعمل
-- ⚠️ استبدل YOUR_USER_ID بالقيمة الحقيقية من الخطوة 1
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1: اختبار دالة get_user_allowed_modules
-- هذه الدالة التي يستخدمها Frontend
SELECT 
    module_code,
    name_ar,
    name_en,
    is_enabled,
    requires_upgrade,
    can_view,
    can_create,
    can_edit,
    can_delete,
    can_export
FROM get_user_allowed_modules('YOUR_USER_ID'::UUID)  -- ← ضع user_id هنا
ORDER BY display_order;

-- المتوقع: ~32 موديول مع جميع الصلاحيات = true

-- ═══════════════════════════════════════════════════════════════════════════

-- 4.2: اختبار صلاحية معينة
SELECT 
    'accounting' as module,
    'create' as permission,
    check_user_module_permission(
        'YOUR_USER_ID'::UUID,  -- ← ضع user_id هنا
        'accounting',
        'create'
    ) as has_permission;

-- المتوقع: true

-- ═══════════════════════════════════════════════════════════════════════════

-- 4.3: عرض كل صلاحيات موديول معين
SELECT * FROM get_user_module_permissions(
    'YOUR_USER_ID'::UUID,  -- ← ضع user_id هنا
    'accounting'
);

-- المتوقع: جميع الصلاحيات = true

-- ═══════════════════════════════════════════════════════════════════════════

-- 4.4: إحصائيات شاملة
SELECT 
    'Total Modules' as metric,
    COUNT(*) as count
FROM modules
WHERE is_active = true

UNION ALL

SELECT 
    'User Permissions',
    COUNT(*)
FROM user_module_permissions
WHERE user_id = 'YOUR_USER_ID'::UUID  -- ← ضع user_id هنا

UNION ALL

SELECT 
    'User Roles',
    COUNT(*)
FROM user_role_assignments
WHERE user_id = 'YOUR_USER_ID'::UUID  -- ← ضع user_id هنا

UNION ALL

SELECT 
    'Permissions with full access',
    COUNT(*)
FROM user_module_permissions
WHERE user_id = 'YOUR_USER_ID'::UUID  -- ← ضع user_id هنا
AND can_view = true
AND can_create = true
AND can_edit = true
AND can_delete = true;

-- المتوقع:
-- Total Modules: ~32
-- User Permissions: ~32
-- User Roles: 1
-- Permissions with full access: ~32

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ النتيجة المتوقعة:
-- ═══════════════════════════════════════════════════════════════════════════
--
-- إذا كانت النتائج صحيحة:
-- ✅ افتح Frontend (npm run dev)
-- ✅ سجّل الدخول
-- ✅ يجب أن ترى جميع الموديولات في Sidebar
-- ✅ جميع الأزرار والميزات متاحة
--
-- إذا لم تظهر الموديولات:
-- ❌ تحقق من أن useModules يستخدم user.id
-- ❌ افتح Console وشاهد الأخطاء
-- ❌ تحقق من أن modulesService محدث
--
-- ═══════════════════════════════════════════════════════════════════════════
