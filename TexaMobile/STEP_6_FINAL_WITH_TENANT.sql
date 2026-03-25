-- ========================================
-- ✅ السكربت النهائي (مع tenant_id إلزامي)
-- انسخ كل هذا ← الصق ← Run
-- ========================================

-- حذف جدول public.users الذي أنشأناه بالخطأ
DROP TABLE IF EXISTS public.users CASCADE;


-- الجزء 1: إنشاء الأدوار في جدول user_roles مع tenant_id
INSERT INTO user_roles (id, tenant_id, role_code, role_name_ar, role_name_en, description_ar, description_en, is_system_role, is_active, created_at, updated_at) 
SELECT gen_random_uuid(), 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47', 'admin', 'مدير النظام', 'Admin', 'مدير النظام - صلاحيات كاملة', 'System Administrator', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE role_code = 'admin' AND tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');

INSERT INTO user_roles (id, tenant_id, role_code, role_name_ar, role_name_en, description_ar, description_en, is_system_role, is_active, created_at, updated_at) 
SELECT gen_random_uuid(), 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47', 'driver', 'سائق', 'Driver', 'سائق - إدارة التوصيل', 'Driver - Delivery Management', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE role_code = 'driver' AND tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');

INSERT INTO user_roles (id, tenant_id, role_code, role_name_ar, role_name_en, description_ar, description_en, is_system_role, is_active, created_at, updated_at) 
SELECT gen_random_uuid(), 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47', 'warehouse_manager', 'مدير المستودع', 'Warehouse Manager', 'مدير المستودع - إدارة المخزون', 'Warehouse Manager', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE role_code = 'warehouse_manager' AND tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');

INSERT INTO user_roles (id, tenant_id, role_code, role_name_ar, role_name_en, description_ar, description_en, is_system_role, is_active, created_at, updated_at) 
SELECT gen_random_uuid(), 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47', 'cashier', 'كاشير', 'Cashier', 'كاشير - إدارة الصندوق', 'Cashier', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE role_code = 'cashier' AND tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');


-- الجزء 2: إنشاء Profile (باستخدام auth.users)
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  tenant_id,
  company_id,
  phone,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'مستخدم تجريبي - Test User',
  'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',
  '1726ac37-58d8-4261-96a5-85ccfe8e83cd',
  '+963999999999',
  'admin',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'test@texa.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  tenant_id = EXCLUDED.tenant_id,
  company_id = EXCLUDED.company_id,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();


-- الجزء 3: ربط المستخدم بدور Admin في user_role_assignments
INSERT INTO user_role_assignments (
  id,
  user_id,
  role_id,
  tenant_id,
  company_id,
  assigned_at,
  is_active
)
SELECT 
  gen_random_uuid(),
  au.id,
  ur.id,
  'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',
  '1726ac37-58d8-4261-96a5-85ccfe8e83cd',
  NOW(),
  true
FROM auth.users au
CROSS JOIN user_roles ur
WHERE au.email = 'test@texa.com'
  AND ur.role_code = 'admin'
  AND ur.tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47'
LIMIT 1
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = NOW();


-- الجزء 4: التحقق من النتيجة النهائية
SELECT 
  up.id as user_id,
  up.email,
  up.full_name,
  up.role as profile_role,
  up.tenant_id,
  up.company_id,
  ur.role_code,
  ur.role_name_ar,
  ura.is_active as role_active
FROM user_profiles up
LEFT JOIN user_role_assignments ura ON up.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE up.email = 'test@texa.com';
