-- ============================================
-- 🔍 فحص شامل لحساب feras1960@gmail.com
-- ============================================

-- 1️⃣ معلومات User Profile
SELECT 
  '1️⃣ User Profile' as "القسم",
  up.*
FROM user_profiles up
WHERE up.email = 'feras1960@gmail.com'
   OR up.id = (SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com');

-- 2️⃣ جدول roles (تعريف الأدوار)
SELECT 
  '2️⃣ Roles Table' as "القسم",
  r.*
FROM roles r
LIMIT 10;

-- 3️⃣ جدول user_roles (ربط المستخدم بالدور)
SELECT 
  '3️⃣ User Roles (Assignment)' as "القسم",
  ur.*
FROM user_roles ur
WHERE ur.user_id = (
  SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
);

-- 4️⃣ جدول user_role_assignments (إذا كان مختلف)
SELECT 
  '4️⃣ User Role Assignments' as "القسم",
  ura.*
FROM user_role_assignments ura
WHERE ura.user_id = (
  SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
)
LIMIT 5;

-- 5️⃣ الصورة الكاملة (JOIN كل شيء) - مبسطة
SELECT 
  '5️⃣ الصورة الكاملة' as "القسم",
  au.id,
  au.email,
  up.full_name,
  ur.role_id
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE au.email = 'feras1960@gmail.com';

-- 6️⃣ أعمدة user_profiles
SELECT 
  '6️⃣ أعمدة user_profiles' as "الجدول",
  column_name as "اسم العمود",
  data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 7️⃣ أعمدة user_roles
SELECT 
  '7️⃣ أعمدة user_roles' as "الجدول",
  column_name as "اسم العمود",
  data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 8️⃣ أعمدة roles
SELECT 
  '8️⃣ أعمدة roles' as "الجدول",
  column_name as "اسم العمود",
  data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'roles'
ORDER BY ordinal_position;
