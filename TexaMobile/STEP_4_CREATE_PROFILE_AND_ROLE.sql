-- ========================================
-- ✅ الخطوة 4: إنشاء جدول users والبيانات (النهائي)
-- انسخ كل هذا ← الصق ← Run
-- ========================================

-- الجزء 1: إنشاء جدول users إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- الجزء 2: إدراج المستخدم في جدول users
INSERT INTO users (
  id,
  email,
  created_at,
  updated_at
) VALUES (
  'a0bddbe7-eac5-449d-8ab9-8c2e92859043',
  'test@texa.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();


-- الجزء 3: إنشاء الأدوار (Roles)
INSERT INTO roles (code, name_ar, name_en, description, is_system, permissions, created_at, updated_at) 
SELECT 'admin', 'مدير النظام', 'Admin', 'مدير النظام - صلاحيات كاملة', true, '{"all": true}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'admin' AND tenant_id IS NULL);

INSERT INTO roles (code, name_ar, name_en, description, is_system, permissions, created_at, updated_at) 
SELECT 'driver', 'سائق', 'Driver', 'سائق - إدارة التوصيل', true, '{"deliveries": true}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'driver' AND tenant_id IS NULL);

INSERT INTO roles (code, name_ar, name_en, description, is_system, permissions, created_at, updated_at) 
SELECT 'warehouse_manager', 'مدير المستودع', 'Warehouse Manager', 'مدير المستودع - إدارة المخزون', true, '{"warehouse": true}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'warehouse_manager' AND tenant_id IS NULL);

INSERT INTO roles (code, name_ar, name_en, description, is_system, permissions, created_at, updated_at) 
SELECT 'cashier', 'كاشير', 'Cashier', 'كاشير - إدارة الصندوق', true, '{"cash": true}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'cashier' AND tenant_id IS NULL);


-- الجزء 4: إنشاء Profile للمستخدم
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
) VALUES (
  'a0bddbe7-eac5-449d-8ab9-8c2e92859043',
  'test@texa.com',
  'مستخدم تجريبي - Test User',
  'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',
  '1726ac37-58d8-4261-96a5-85ccfe8e83cd',
  '+963999999999',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  tenant_id = EXCLUDED.tenant_id,
  company_id = EXCLUDED.company_id,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();


-- الجزء 5: ربط المستخدم بدور Admin في user_roles
INSERT INTO user_roles (
  user_id,
  role_id,
  tenant_id,
  assigned_at,
  is_active
)
SELECT 
  'a0bddbe7-eac5-449d-8ab9-8c2e92859043',
  r.id,
  'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',
  NOW(),
  true
FROM roles r
WHERE r.code = 'admin'
  AND (r.tenant_id IS NULL OR r.tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47')
LIMIT 1
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = NOW();


-- الجزء 6: التحقق من النتيجة
SELECT 
  up.id as user_id,
  up.email,
  up.full_name,
  up.role as profile_role,
  up.tenant_id,
  up.company_id,
  r.code as role_code,
  r.name_ar as role_name_ar,
  ur.is_active as role_active
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE up.email = 'test@texa.com';
