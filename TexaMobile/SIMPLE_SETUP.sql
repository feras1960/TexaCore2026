-- ========================================
-- Setup Script 1: Create Roles
-- نسخ والصق هذا أولاً
-- ========================================

INSERT INTO roles (id, name, description, created_at) VALUES
  (gen_random_uuid(), 'Admin', 'مدير النظام - صلاحيات كاملة', now()),
  (gen_random_uuid(), 'Driver', 'سائق - إدارة التوصيل', now()),
  (gen_random_uuid(), 'Warehouse_Manager', 'مدير المستودع - إدارة المخزون', now()),
  (gen_random_uuid(), 'Cashier', 'كاشير - إدارة الصندوق', now()),
  (gen_random_uuid(), 'Accountant', 'محاسب - إدارة المالية', now()),
  (gen_random_uuid(), 'Sales', 'مندوب مبيعات', now()),
  (gen_random_uuid(), 'HR_Manager', 'مدير موارد بشرية', now())
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- Setup Script 2: Get User UUID
-- بعد إنشاء المستخدم من Dashboard
-- نسخ والصق هذا ثانياً
-- ========================================

SELECT 
  id as user_uuid,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'test@texa.com';

-- احفظ الـ user_uuid الذي يظهر


-- ========================================
-- Setup Script 3: Create Profile & Assign Role
-- استبدل YOUR_USER_UUID بالقيمة من Script 2
-- نسخ والصق هذا ثالثاً
-- ========================================

-- إنشاء Profile
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
  'YOUR_USER_UUID', -- ضع UUID هنا من Script 2
  'مستخدم تجريبي',
  'test@texa.com',
  true,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = true,
  updated_at = now();

-- ربط المستخدم بدور Admin
INSERT INTO user_role_assignments (
  id,
  user_id,
  role_id,
  is_active,
  assigned_at
)
SELECT 
  gen_random_uuid(),
  'YOUR_USER_UUID', -- ضع UUID هنا من Script 2
  r.id,
  true,
  now()
FROM roles r
WHERE r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = now();


-- ========================================
-- Verification Script
-- للتحقق من أن كل شيء تم بنجاح
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

-- يجب أن ترى:
-- email: test@texa.com
-- email_confirmed_at: ≠ null
-- full_name: مستخدم تجريبي
-- profile_active: true
-- role_name: Admin
-- role_active: true
