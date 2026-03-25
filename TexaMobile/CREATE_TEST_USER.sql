-- 🔐 إنشاء مستخدم تجريبي كامل لـ TexaMobile
-- نفذ هذا السكربت في Supabase SQL Editor

-- ==================================================
-- الخطوة 1: إنشاء المستخدم في auth.users
-- ==================================================
-- ملاحظة: هذا يجب أن يتم من Supabase Dashboard → Authentication → Users
-- Email: test@texa.com
-- Password: Test@123456
-- بعد إنشاء المستخدم، احصل على UUID من جدول auth.users

-- ==================================================
-- الخطوة 2: التحقق من UUID المستخدم
-- ==================================================
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test@texa.com';
-- احفظ الـ id (UUID) الذي يظهر

-- ==================================================
-- الخطوة 3: إنشاء Profile للمستخدم
-- ==================================================
-- استبدل 'USER_UUID_HERE' بالـ UUID الفعلي من الخطوة 2

INSERT INTO user_profiles (
  id,
  user_id,
  full_name,
  email,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_UUID_HERE', -- ضع UUID المستخدم هنا
  'مستخدم تجريبي',
  'test@texa.com',
  true,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  is_active = true,
  updated_at = now();

-- ==================================================
-- الخطوة 4: إنشاء/التحقق من وجود الأدوار
-- ==================================================

-- إنشاء دور Admin
INSERT INTO roles (
  id,
  name,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  'Admin',
  'مدير النظام - صلاحيات كاملة',
  now()
) ON CONFLICT (name) DO NOTHING;

-- إنشاء دور Driver
INSERT INTO roles (
  id,
  name,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  'Driver',
  'سائق - إدارة التوصيل',
  now()
) ON CONFLICT (name) DO NOTHING;

-- إنشاء دور Warehouse_Manager
INSERT INTO roles (
  id,
  name,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  'Warehouse_Manager',
  'مدير المستودع - إدارة المخزون',
  now()
) ON CONFLICT (name) DO NOTHING;

-- إنشاء دور Cashier
INSERT INTO roles (
  id,
  name,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  'Cashier',
  'كاشير - إدارة الصندوق',
  now()
) ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- الخطوة 5: ربط المستخدم بدور Admin
-- ==================================================

INSERT INTO user_role_assignments (
  id,
  user_id,
  role_id,
  is_active,
  assigned_at
)
SELECT 
  gen_random_uuid(),
  'USER_UUID_HERE', -- ضع UUID المستخدم هنا
  r.id,
  true,
  now()
FROM roles r
WHERE r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = now();

-- ==================================================
-- الخطوة 6: التحقق من البيانات
-- ==================================================

-- تحقق من Profile
SELECT 
  id,
  user_id,
  full_name,
  email,
  is_active
FROM user_profiles
WHERE email = 'test@texa.com';

-- تحقق من الأدوار
SELECT 
  ura.id,
  ura.user_id,
  r.name as role_name,
  ura.is_active
FROM user_role_assignments ura
JOIN roles r ON ura.role_id = r.id
JOIN user_profiles up ON ura.user_id = up.user_id
WHERE up.email = 'test@texa.com';

-- ==================================================
-- النتيجة المتوقعة:
-- ==================================================
-- 1. Profile موجود مع is_active = true
-- 2. Role assignment موجود مع role_name = 'Admin' و is_active = true
-- 3. إذا كانت النتيجة صحيحة، يمكنك تسجيل الدخول بـ:
--    Email: test@texa.com
--    Password: Test@123456
