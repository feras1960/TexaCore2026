-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 اختبار Backend v2.0 - Supabase
-- التاريخ: 24 يناير 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: التحقق من وجود الجداول الجديدة (بديل عن فحص migrations)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1: التحقق من وجود جدول modules
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'modules'
) as modules_exists;
-- Expected: true

-- 1.2: التحقق من وجود جدول user_module_permissions
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_module_permissions'
) as user_module_permissions_exists;
-- Expected: true

-- 1.3: التحقق من وجود جدول user_roles
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
) as user_roles_exists;
-- Expected: true

-- 1.4: عرض جميع الجداول الجديدة
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('modules', 'user_module_permissions', 'user_feature_permissions', 'user_roles', 'user_role_assignments')
ORDER BY table_name;
-- Expected: 5 جداول


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: اختبار جدول modules
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1: عرض جميع الموديولات (يجب أن يكون 18)
SELECT module_code, name_ar, name_en, is_active, is_core, is_beta, category
FROM modules
ORDER BY display_order;

-- 2.2: التحقق من العدد
SELECT COUNT(*) as total_modules FROM modules;
-- Expected: 18

-- 2.3: التحقق من الموديولات الجديدة (fabric + component_lab)
SELECT module_code, name_ar, name_en, category, is_active
FROM modules
WHERE module_code IN ('fabric', 'component_lab');
-- Expected: 2 rows


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: اختبار جدول tenant_modules
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1: التحقق من ربط الموديولات مع الـ tenants
SELECT 
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules
FROM tenants t
LEFT JOIN tenant_modules tm ON t.id = tm.tenant_id AND tm.is_active = true
WHERE t.status = 'active'
GROUP BY t.id, t.code;
-- Expected: كل tenant لديه 18 موديول


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: اختبار جداول الصلاحيات
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1: التحقق من جدول user_module_permissions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_module_permissions'
ORDER BY ordinal_position;
-- Expected: user_id, tenant_id, company_id, module_code, can_view, can_create, etc.

-- 4.2: عرض الأدوار الافتراضية
SELECT 
    t.code as tenant_code,
    r.role_code,
    r.role_name_ar,
    r.role_name_en,
    r.is_system_role
FROM user_roles r
JOIN tenants t ON r.tenant_id = t.id
WHERE r.is_system_role = true
ORDER BY t.code, r.role_code;
-- Expected: 6 أدوار لكل tenant (full_admin, accountant, warehouse_keeper, etc.)

-- 4.3: عدد الأدوار لكل tenant
SELECT 
    t.code as tenant_code,
    COUNT(r.id) as roles_count
FROM tenants t
LEFT JOIN user_roles r ON t.id = r.tenant_id
WHERE t.status = 'active'
GROUP BY t.id, t.code;
-- Expected: 6 أدوار لكل tenant


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: اختبار الدوال (استبدل USER_ID بمستخدم حقيقي)
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1: عرض المستخدمين الموجودين (للحصول على user_id)
SELECT id, email, created_at
FROM auth.users
LIMIT 5;
-- انسخ أحد الـ user_id واستخدمه في الاستعلامات التالية

-- 5.2: اختبار get_user_allowed_modules
-- ⚠️ استبدل 'YOUR_USER_ID_HERE' بـ user_id حقيقي من الاستعلام السابق
/*
SELECT 
    module_code,
    name_ar,
    name_en,
    is_enabled,
    requires_upgrade,
    can_view,
    can_create,
    can_edit,
    can_delete
FROM get_user_allowed_modules('YOUR_USER_ID_HERE');
*/

-- 5.3: اختبار check_user_module_permission
-- ⚠️ استبدل 'YOUR_USER_ID_HERE' بـ user_id حقيقي
/*
SELECT check_user_module_permission(
    'YOUR_USER_ID_HERE'::UUID,
    'accounting',
    'view'
) as can_view_accounting;
*/


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: اختبار RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- 6.1: التحقق من تفعيل RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN (
    'modules',
    'user_module_permissions',
    'user_feature_permissions',
    'user_roles',
    'user_role_assignments'
)
ORDER BY tablename;
-- Expected: rowsecurity = true لجميع الجداول

-- 6.2: عرض جميع الـ Policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN (
    'modules',
    'user_module_permissions',
    'user_feature_permissions',
    'user_roles',
    'user_role_assignments'
)
ORDER BY tablename, policyname;
-- Expected: حوالي 12 policy


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: إحصائيات شاملة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    'Modules' as item,
    COUNT(*) as count
FROM modules
UNION ALL
SELECT 
    'Active Modules',
    COUNT(*)
FROM modules
WHERE is_active = true
UNION ALL
SELECT 
    'Tenant Modules Activations',
    COUNT(*)
FROM tenant_modules
WHERE is_active = true
UNION ALL
SELECT 
    'System Roles',
    COUNT(*)
FROM user_roles
WHERE is_system_role = true
UNION ALL
SELECT 
    'User Roles (Total)',
    COUNT(*)
FROM user_roles
UNION ALL
SELECT
    'Active Tenants',
    COUNT(*)
FROM tenants
WHERE status = 'active';

-- النتائج المتوقعة:
-- Modules: 18
-- Active Modules: 18
-- Tenant Modules Activations: 18 × عدد tenants
-- System Roles: 6 × عدد tenants
-- User Roles (Total): 6 × عدد tenants


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ انتهى الاختبار!
-- ═══════════════════════════════════════════════════════════════════════════

-- ملاحظات:
-- 1. نفذ الاستعلامات واحداً تلو الآخر
-- 2. استبدل 'YOUR_USER_ID_HERE' بـ user_id حقيقي من auth.users
-- 3. تحقق من النتائج مع المتوقع
-- 4. إذا كانت النتائج صحيحة، Backend v2.0 يعمل بشكل ممتاز! ✅
