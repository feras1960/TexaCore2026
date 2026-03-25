-- ============================================
-- 🔍 فحص بسيط وشامل
-- ============================================

-- 1️⃣ معلومات User من auth.users
SELECT 
  'auth.users' as "الجدول",
  *
FROM auth.users
WHERE email = 'feras1960@gmail.com';

-- 2️⃣ معلومات User Profile
SELECT 
  'user_profiles' as "الجدول",
  *
FROM user_profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com')
   OR email = 'feras1960@gmail.com';

-- 3️⃣ جميع الأدوار (roles)
SELECT 
  'roles' as "الجدول",
  *
FROM roles
LIMIT 10;

-- 4️⃣ جميع user_roles
SELECT 
  'user_roles' as "الجدول",
  *
FROM user_roles
LIMIT 10;

-- 5️⃣ جميع user_role_assignments
SELECT 
  'user_role_assignments' as "الجدول",
  *
FROM user_role_assignments
LIMIT 10;

-- ═══════════════════════════════════════════
-- 📊 أعمدة الجداول
-- ═══════════════════════════════════════════

-- 6️⃣ أعمدة user_profiles
SELECT 
  'user_profiles columns' as "الجدول",
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 7️⃣ أعمدة user_roles
SELECT 
  'user_roles columns' as "الجدول",
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 8️⃣ أعمدة roles
SELECT 
  'roles columns' as "الجدول",
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'roles'
ORDER BY ordinal_position;

-- 9️⃣ أعمدة user_role_assignments
SELECT 
  'user_role_assignments columns' as "الجدول",
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_role_assignments'
ORDER BY ordinal_position;
