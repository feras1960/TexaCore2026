-- =====================================================
-- FIX_platform_owner_NOTRIGGER.sql
-- إصلاح صلاحيات مالك المنصة (بدون تريغرات)
-- تاريخ: 2026-02-05
-- =====================================================

-- تعطيل التريغرات مؤقتاً
SET session_replication_role = 'replica';

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء/تحديث دور super_admin
-- ═══════════════════════════════════════════════════════════════

UPDATE roles SET
    name_ar = 'مدير المنصة',
    name_en = 'Platform Admin',
    description = 'مالك المنصة - له كل الصلاحيات',
    is_super_admin = true,
    is_system = true,
    permissions = '{"all": true}'::jsonb,
    visible_modules = ARRAY['all'],
    can_be_deleted = false,
    updated_at = NOW()
WHERE code = 'super_admin';

INSERT INTO roles (
    code, name_ar, name_en, description, 
    is_super_admin, is_system, permissions, 
    visible_modules, level, can_be_deleted
)
SELECT 
    'super_admin', 'مدير المنصة', 'Platform Admin',
    'مالك المنصة - له كل الصلاحيات',
    true, true, '{"all": true}'::jsonb,
    ARRAY['all'], 'platform', false
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'super_admin');

-- ═══════════════════════════════════════════════════════════════
-- 2. إضافة المستخدم لجدول super_admins
-- ═══════════════════════════════════════════════════════════════

DELETE FROM super_admins 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com');

INSERT INTO super_admins (user_id, email, full_name, is_active, permissions, created_at)
SELECT 
    id, email,
    COALESCE(raw_user_meta_data->>'full_name', 'مالك المنصة'),
    true, '{"all": true}'::jsonb, NOW()
FROM auth.users 
WHERE email = 'feras1960@gmail.com';

-- ═══════════════════════════════════════════════════════════════
-- 3. ربط المستخدم بدور super_admin
-- ═══════════════════════════════════════════════════════════════

DELETE FROM user_role_assignments 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com');

INSERT INTO user_role_assignments (
    user_id, role_id, tenant_id, company_id, 
    assigned_by, is_active, created_at
)
SELECT 
    u.id, r.id,
    (u.raw_user_meta_data->>'tenant_id')::uuid,
    (u.raw_user_meta_data->>'company_id')::uuid,
    u.id, true, NOW()
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'feras1960@gmail.com'
  AND r.code = 'super_admin';

-- ═══════════════════════════════════════════════════════════════
-- 4. تحديث metadata
-- ═══════════════════════════════════════════════════════════════

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_super_admin": true}'::jsonb
WHERE email = 'feras1960@gmail.com';

-- إعادة تفعيل التريغرات
SET session_replication_role = 'origin';

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    u.email,
    u.raw_user_meta_data->>'is_super_admin' as is_super_admin,
    sa.is_active as in_super_admins,
    r.code as role_code
FROM auth.users u
LEFT JOIN super_admins sa ON sa.user_id = u.id
LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
LEFT JOIN roles r ON r.id = ura.role_id
WHERE u.email = 'feras1960@gmail.com';
