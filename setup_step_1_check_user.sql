-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 الخطوة 1: فحص بيانات المستخدم
-- ═══════════════════════════════════════════════════════════════════════════
-- نفذ هذا الاستعلام لمعرفة معلوماتك (user_id, tenant_id, company_id)

-- 1.1: عرض جميع المستخدمين
SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    'User Info' as type
FROM auth.users u
ORDER BY u.created_at
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════

-- 1.2: عرض معلومات المستخدم مع الـ tenant والـ company
SELECT 
    u.id as user_id,
    u.email,
    up.tenant_id,
    up.company_id,
    t.code as tenant_code,
    t.name as tenant_name,
    c.name as company_name,
    'Full User Profile' as type
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN tenants t ON up.tenant_id = t.id
LEFT JOIN companies c ON up.company_id = c.id
ORDER BY u.created_at;

-- ═══════════════════════════════════════════════════════════════════════════

-- 1.3: التحقق من الصلاحيات الموجودة حالياً
SELECT 
    ump.user_id,
    u.email,
    ump.module_code,
    ump.can_view,
    ump.can_create,
    ump.can_edit,
    ump.can_delete,
    'Current Permissions' as type
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
ORDER BY u.email, ump.module_code;

-- ═══════════════════════════════════════════════════════════════════════════

-- 1.4: التحقق من الأدوار المعينة حالياً
SELECT 
    u.email,
    r.role_code,
    r.role_name_ar,
    r.role_name_en,
    'Current Roles' as type
FROM user_role_assignments ura
JOIN auth.users u ON ura.user_id = u.id
JOIN user_roles r ON ura.role_id = r.id
ORDER BY u.email;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📝 بعد تنفيذ هذا الملف:
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- سترى:
-- 1. جميع المستخدمين مع user_id
-- 2. معلومات كاملة عن كل مستخدم (tenant, company)
-- 3. الصلاحيات الموجودة حالياً (غالباً فارغة)
-- 4. الأدوار المعينة حالياً (غالباً فارغة)
--
-- ⚠️ انسخ الـ user_id و tenant_id و company_id
-- ⚠️ ستحتاجها في الخطوة 2
--
-- ═══════════════════════════════════════════════════════════════════════════
