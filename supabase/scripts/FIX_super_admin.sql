-- =====================================================
-- FIX_super_admin.sql
-- التحقق من وإصلاح حساب Super Admin
-- تاريخ: 2026-02-05
-- =====================================================

-- 1. أولاً: التحقق من جدول super_admins
SELECT '📋 محتوى جدول super_admins:' as step;
SELECT * FROM super_admins;

-- 2. البحث عن المستخدم في auth.users
SELECT '📋 البحث عن feras1960@gmail.com:' as step;
SELECT 
    id,
    email,
    raw_user_meta_data->>'tenant_id' as tenant_id,
    raw_user_meta_data->>'company_id' as company_id,
    raw_user_meta_data->>'is_super_admin' as is_super_admin,
    created_at
FROM auth.users 
WHERE email = 'feras1960@gmail.com';

-- 3. التحقق من وجوده في super_admins
SELECT '📋 هل مسجل كـ Super Admin؟:' as step;
SELECT 
    sa.*,
    u.email
FROM super_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id;

-- ═══════════════════════════════════════════════════════════════
-- إذا لم يكن موجوداً، أضفه:
-- ═══════════════════════════════════════════════════════════════

-- 4. إضافة المستخدم كـ Super Admin (إذا لم يكن موجوداً)
INSERT INTO super_admins (user_id, email, name, is_active, permissions, created_at)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Platform Owner') as name,
    true as is_active,
    '{"all": true}'::jsonb as permissions,
    NOW() as created_at
FROM auth.users 
WHERE email = 'feras1960@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    is_active = true,
    permissions = '{"all": true}'::jsonb,
    updated_at = NOW();

-- 5. تحديث metadata في auth.users
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_super_admin": true}'::jsonb
WHERE email = 'feras1960@gmail.com';

-- 6. التأكد من التحديث
SELECT '✅ النتيجة النهائية:' as step;
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'is_super_admin' as is_super_admin,
    sa.is_active as super_admin_active,
    sa.permissions
FROM auth.users u
LEFT JOIN super_admins sa ON sa.user_id = u.id
WHERE u.email = 'feras1960@gmail.com';
