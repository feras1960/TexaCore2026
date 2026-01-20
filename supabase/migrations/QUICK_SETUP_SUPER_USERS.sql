-- ═══════════════════════════════════════════════════════════════════════════
-- إعداد سريع لـ Super Users (بعد إنشاء المستخدمين في Auth)
-- Quick Setup for Super Users (after creating users in Auth)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ مهم: يجب إنشاء المستخدمين في Supabase Auth أولاً
-- ⚠️ Important: Users must be created in Supabase Auth first

-- ═══════════════════════════════════════════════════════════════
-- 1. إعداد Super Users
-- ═══════════════════════════════════════════════════════════════

-- Super User 1
SELECT setup_super_user_by_email('feras1960@gmail.com');

-- Super User 2
SELECT setup_super_user_by_email('nextrev360@gmail.com');

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من النتيجة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    u.email,
    r.code as role_code,
    r.name_ar as role_name,
    ur.is_active,
    ur.assigned_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.code = 'super_admin'
ORDER BY u.email;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من الصلاحيات
-- ═══════════════════════════════════════════════════════════════

-- للتحقق من صلاحيات مستخدم معين:
-- SELECT get_user_permissions((SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'));

-- ✅ تم! Super Users جاهزون
-- ✅ Done! Super Users are ready
