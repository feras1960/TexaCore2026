-- ========================================
-- 🚀 Automatic Setup (No UUID needed!)
-- نسخ والصق هذا بالكامل بعد إنشاء المستخدم
-- ========================================

-- الخطوة 1: إنشاء الأدوار
INSERT INTO roles (id, name, description, created_at) VALUES
  (gen_random_uuid(), 'Admin', 'مدير النظام - صلاحيات كاملة', now()),
  (gen_random_uuid(), 'Driver', 'سائق - إدارة التوصيل', now()),
  (gen_random_uuid(), 'Warehouse_Manager', 'مدير المستودع - إدارة المخزون', now()),
  (gen_random_uuid(), 'Cashier', 'كاشير - إدارة الصندوق', now()),
  (gen_random_uuid(), 'Accountant', 'محاسب - إدارة المالية', now()),
  (gen_random_uuid(), 'Sales', 'مندوب مبيعات', now()),
  (gen_random_uuid(), 'HR_Manager', 'مدير موارد بشرية', now())
ON CONFLICT (name) DO NOTHING;

-- الخطوة 2: إنشاء Profile تلقائياً
INSERT INTO user_profiles (
  id,
  user_id,
  full_name,
  email,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  au.id,
  'مستخدم تجريبي',
  au.email,
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'test@texa.com'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = true,
  updated_at = now();

-- الخطوة 3: ربط المستخدم بدور Admin تلقائياً
INSERT INTO user_role_assignments (
  id,
  user_id,
  role_id,
  is_active,
  assigned_at
)
SELECT 
  gen_random_uuid(),
  au.id,
  r.id,
  true,
  now()
FROM auth.users au
CROSS JOIN roles r
WHERE au.email = 'test@texa.com'
  AND r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = now();

-- ========================================
-- ✅ التحقق من النتيجة
-- ========================================
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  up.full_name,
  up.is_active as profile_active,
  r.name as role_name,
  ura.is_active as role_active
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
LEFT JOIN user_role_assignments ura ON au.id = ura.user_id
LEFT JOIN roles r ON ura.role_id = r.id
WHERE au.email = 'test@texa.com';

-- ========================================
-- 🎉 إذا رأيت النتيجة التالية، كل شيء جاهز:
-- ========================================
-- email: test@texa.com
-- email_confirmed_at: (تاريخ ووقت)
-- full_name: مستخدم تجريبي
-- profile_active: t (true)
-- role_name: Admin
-- role_active: t (true)
