-- ═══════════════════════════════════════════════════════════════════════════
-- 👑 الخطوة 3: تعيين دور Full Admin
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ استبدل القيم التالية بالقيم الحقيقية من الخطوة 1:
--
-- YOUR_USER_ID = (user_id من الخطوة 1)
-- YOUR_TENANT_ID = (tenant_id من الخطوة 1)
-- YOUR_COMPANY_ID = (company_id من الخطوة 1)
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1: عرض الأدوار المتاحة
SELECT 
    id as role_id,
    role_code,
    role_name_ar,
    role_name_en,
    is_system_role,
    tenant_id
FROM user_roles
WHERE tenant_id = 'YOUR_TENANT_ID'::UUID  -- ← ضع tenant_id هنا
ORDER BY role_code;

-- ═══════════════════════════════════════════════════════════════════════════

-- 3.2: تعيين دور full_admin
-- ⚠️ نفذ هذا بعد رؤية النتائج من 3.1
/*
INSERT INTO user_role_assignments (
    user_id,
    tenant_id,
    company_id,
    role_id
)
SELECT 
    'YOUR_USER_ID'::UUID,  -- ← ضع user_id هنا
    'YOUR_TENANT_ID'::UUID,  -- ← ضع tenant_id هنا
    'YOUR_COMPANY_ID'::UUID,  -- ← ضع company_id هنا
    id
FROM user_roles
WHERE tenant_id = 'YOUR_TENANT_ID'::UUID  -- ← ضع tenant_id هنا
AND role_code = 'full_admin'
ON CONFLICT (user_id, tenant_id, company_id, role_id) 
DO NOTHING;
*/

-- ═══════════════════════════════════════════════════════════════════════════

-- 3.3: التحقق من الدور المُعيّن
-- نفذ هذا بعد الخطوة 3.2
/*
SELECT 
    u.email,
    r.role_code,
    r.role_name_ar,
    r.role_name_en,
    r.is_system_role,
    ura.created_at
FROM user_role_assignments ura
JOIN auth.users u ON ura.user_id = u.id
JOIN user_roles r ON ura.role_id = r.id
WHERE ura.user_id = 'YOUR_USER_ID'::UUID  -- ← ضع user_id هنا
ORDER BY ura.created_at DESC;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 📝 بعد تنفيذ هذا الملف:
-- ═══════════════════════════════════════════════════════════════════════════
--
-- سترى:
-- ✅ دور full_admin معيّن
-- ✅ is_system_role = true
-- ✅ جاهز للانتقال للخطوة 4 (الاختبار النهائي)
--
-- ═══════════════════════════════════════════════════════════════════════════
