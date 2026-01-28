-- ============================================
-- 🔍 التحقق من البنية الفعلية للجداول
-- ============================================

-- 1️⃣ أعمدة user_profiles
SELECT 
  column_name as "اسم العمود",
  data_type as "النوع",
  is_nullable as "يقبل NULL؟"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2️⃣ أعمدة user_roles  
SELECT 
  column_name as "اسم العمود",
  data_type as "النوع",
  is_nullable as "يقبل NULL؟"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 3️⃣ أعمدة user_role_assignments
SELECT 
  column_name as "اسم العمود",
  data_type as "النوع",
  is_nullable as "يقبل NULL؟"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_role_assignments'
ORDER BY ordinal_position;

-- 4️⃣ معلومات feras1960@gmail.com (بالأعمدة الصحيحة)
SELECT 
  au.id as "User ID",
  au.email as "البريد",
  up.full_name as "الاسم الكامل",
  up.tenant_id as "Tenant ID",
  up.company_id as "Company ID"
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'feras1960@gmail.com';

-- 5️⃣ جميع الجداول الموجودة (للتأكد من الأسماء)
SELECT 
  table_name as "اسم الجدول"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%role%' 
    OR table_name LIKE '%user%'
  )
ORDER BY table_name;
