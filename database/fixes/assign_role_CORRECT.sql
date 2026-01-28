-- ═══════════════════════════════════════════════════════════════════════════
-- 👑 تعيين دور Full Admin (الإيميل الصحيح)
-- المستخدم: feras1960@gmail.com
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف الأدوار القديمة (إن وجدت)
DELETE FROM user_role_assignments ura
USING auth.users u
WHERE ura.user_id = u.id 
AND u.email = 'feras1960@gmail.com';

-- تعيين دور full_admin
WITH user_info AS (
    SELECT 
        u.id as user_id,
        up.tenant_id,
        up.company_id
    FROM auth.users u
    JOIN user_profiles up ON u.id = up.id
    WHERE u.email = 'feras1960@gmail.com'
)
INSERT INTO user_role_assignments (
    user_id,
    tenant_id,
    company_id,
    role_id
)
SELECT 
    ui.user_id,
    ui.tenant_id,
    ui.company_id,
    r.id
FROM user_info ui
JOIN user_roles r ON r.tenant_id = ui.tenant_id
WHERE r.role_code = 'full_admin';

-- التحقق
SELECT 
    u.email,
    r.role_code,
    r.role_name_ar,
    r.role_name_en
FROM user_role_assignments ura
JOIN auth.users u ON ura.user_id = u.id
JOIN user_roles r ON ura.role_id = r.id
WHERE u.email = 'feras1960@gmail.com';

-- المتوقع:
-- email: feras1960@gmail.com
-- role_code: full_admin
-- role_name_ar: مدير عام
-- role_name_en: Full Administrator
