-- ============================================
-- 🔍 بيانات feras1960@gmail.com فقط
-- ============================================

-- 1️⃣ من user_profiles
SELECT 'user_profiles' as source, *
FROM user_profiles
WHERE email = 'feras1960@gmail.com'
   OR id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com');

-- 2️⃣ من user_role_assignments
SELECT 'user_role_assignments' as source, *
FROM user_role_assignments
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com');

-- 3️⃣ أعمدة user_profiles
SELECT 'user_profiles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4️⃣ أعمدة roles
SELECT 'roles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'roles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5️⃣ أعمدة user_roles
SELECT 'user_roles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_roles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6️⃣ عينة من roles
SELECT 'roles sample' as info, * FROM roles LIMIT 5;

-- 7️⃣ عينة من user_roles
SELECT 'user_roles sample' as info, * FROM user_roles LIMIT 5;
