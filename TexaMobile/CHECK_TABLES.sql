-- ========================================
-- 🔍 فحص بنية الجداول
-- نسخ والصق هذا للتحقق من الأعمدة الموجودة
-- ========================================

-- 1. فحص جدول roles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'roles'
ORDER BY ordinal_position;

-- 2. فحص جدول user_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. فحص جدول user_role_assignments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_role_assignments'
ORDER BY ordinal_position;

-- 4. عرض جميع الجداول الموجودة
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
