-- ============================================
-- 🔍 تشخيص حساب feras1960@gmail.com
-- ============================================

-- 1️⃣ معلومات المستخدم الأساسية
SELECT 
  'معلومات Auth User' as "القسم",
  id as "User ID",
  email as "البريد",
  email_confirmed_at as "البريد مؤكد؟",
  created_at as "تاريخ الإنشاء",
  last_sign_in_at as "آخر تسجيل دخول"
FROM auth.users
WHERE email = 'feras1960@gmail.com';

-- 2️⃣ التحقق من وجود Profile
SELECT 
  'User Profile' as "القسم",
  id,
  tenant_id,
  company_id,
  email,
  full_name_ar,
  full_name_en,
  phone,
  created_at
FROM user_profiles
WHERE email = 'feras1960@gmail.com';

-- 3️⃣ التحقق من الأدوار المرتبطة
SELECT 
  'الأدوار (Roles)' as "القسم",
  ura.id as "Assignment ID",
  ura.user_id,
  ura.role_id,
  ur.role_code as "كود الدور",
  ur.role_name_ar as "اسم الدور بالعربي",
  ur.role_name_en as "اسم الدور بالإنجليزي",
  ura.is_active as "نشط؟",
  ura.assigned_at as "تاريخ الربط"
FROM user_role_assignments ura
JOIN user_roles ur ON ur.id = ura.role_id
WHERE ura.user_id = (
  SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
);

-- 4️⃣ الصورة الكاملة (كما يقرأها التطبيق)
SELECT 
  au.id as "User ID",
  au.email as "البريد",
  up.id as "Profile ID",
  up.full_name_ar as "الاسم",
  t.name_ar as "المستأجر",
  c.name_ar as "الشركة",
  STRING_AGG(ur.role_code, ', ') as "الأدوار"
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN tenants t ON t.id = up.tenant_id
LEFT JOIN companies c ON c.id = up.company_id
LEFT JOIN user_role_assignments ura ON ura.user_id = au.id AND ura.is_active = true
LEFT JOIN user_roles ur ON ur.id = ura.role_id
WHERE au.email = 'feras1960@gmail.com'
GROUP BY au.id, au.email, up.id, up.full_name_ar, t.name_ar, c.name_ar;

-- 5️⃣ التحقق من structure الجداول (للتأكد من التطابق)
SELECT 
  'جدول user_profiles' as "الجدول",
  column_name as "اسم العمود",
  data_type as "نوع البيانات",
  is_nullable as "يقبل NULL؟"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 6️⃣ التحقق من الـ Foreign Keys
SELECT 
  'Foreign Keys' as "النوع",
  tc.constraint_name as "اسم القيد",
  tc.table_name as "الجدول",
  kcu.column_name as "العمود",
  ccu.table_name as "جدول المرجع",
  ccu.column_name as "عمود المرجع"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_profiles';
