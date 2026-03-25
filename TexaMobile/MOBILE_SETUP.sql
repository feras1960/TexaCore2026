-- ========================================
-- 🚀 Setup Script - Mobile App Login
-- نسخ والصق هذا بالكامل بعد إنشاء المستخدم
-- ========================================

-- ========================================
-- الخطوة 1: إنشاء الأدوار (Roles)
-- ========================================

INSERT INTO roles (code, name_ar, name_en, description, is_system, is_super_admin, permissions, created_at, updated_at) VALUES
  ('admin', 'مدير النظام', 'Admin', 'مدير النظام - صلاحيات كاملة', true, false, '{"all": true}'::jsonb, NOW(), NOW()),
  ('driver', 'سائق', 'Driver', 'سائق - إدارة التوصيل', true, false, '{"deliveries": true}'::jsonb, NOW(), NOW()),
  ('warehouse_manager', 'مدير المستودع', 'Warehouse Manager', 'مدير المستودع - إدارة المخزون', true, false, '{"warehouse": true, "inventory": true}'::jsonb, NOW(), NOW()),
  ('cashier', 'كاشير', 'Cashier', 'كاشير - إدارة الصندوق', true, false, '{"cash": true, "sales": true}'::jsonb, NOW(), NOW()),
  ('accountant', 'محاسب', 'Accountant', 'محاسب - إدارة المالية', true, false, '{"accounting": true, "reports": true}'::jsonb, NOW(), NOW()),
  ('sales', 'مندوب مبيعات', 'Sales', 'مندوب مبيعات', true, false, '{"sales": true}'::jsonb, NOW(), NOW()),
  ('hr_manager', 'مدير موارد بشرية', 'HR Manager', 'مدير موارد بشرية', true, false, '{"hr": true, "payroll": true}'::jsonb, NOW(), NOW())
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ========================================
-- الخطوة 2: إنشاء Profile للمستخدم التجريبي
-- ========================================

INSERT INTO user_profiles (
  id,
  tenant_id,
  company_id,
  full_name,
  email,
  phone,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  (SELECT id FROM tenants LIMIT 1), -- استخدام أول tenant
  (SELECT id FROM companies LIMIT 1), -- استخدام أول company
  'مستخدم تجريبي - Test User',
  au.email,
  '+963999999999',
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'test@texa.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  tenant_id = EXCLUDED.tenant_id,
  company_id = EXCLUDED.company_id,
  is_active = true,
  updated_at = NOW();

-- ========================================
-- الخطوة 3: ربط المستخدم بدور Admin
-- ========================================

INSERT INTO user_roles (
  user_id,
  role_id,
  tenant_id,
  assigned_at,
  is_active
)
SELECT 
  au.id,
  r.id,
  (SELECT id FROM tenants LIMIT 1),
  NOW(),
  true
FROM auth.users au
CROSS JOIN roles r
WHERE au.email = 'test@texa.com'
  AND r.code = 'admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET
  is_active = true,
  assigned_at = NOW();

-- ========================================
-- ✅ التحقق من النتيجة
-- ========================================

SELECT 
  au.id as user_id,
  au.email,
  au.email_confirmed_at,
  up.full_name,
  up.tenant_id,
  up.company_id,
  up.is_active as profile_active,
  r.code as role_code,
  r.name_ar as role_name_ar,
  r.name_en as role_name_en,
  ur.is_active as role_active
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE au.email = 'test@texa.com';

-- ========================================
-- 🎉 النتيجة المتوقعة:
-- ========================================
-- email: test@texa.com
-- email_confirmed_at: (تاريخ ووقت) ← يجب ألا يكون null
-- full_name: مستخدم تجريبي - Test User
-- tenant_id: (UUID) ← يجب ألا يكون null
-- company_id: (UUID) ← يجب ألا يكون null
-- profile_active: t (true)
-- role_code: admin
-- role_name_ar: مدير النظام
-- role_name_en: Admin
-- role_active: t (true)

-- ========================================
-- 📝 ملاحظات مهمة:
-- ========================================
-- 1. يجب أن يكون المستخدم موجوداً في auth.users أولاً
-- 2. يجب تفعيل "Auto Confirm User" عند إنشاء المستخدم
-- 3. إذا لم يكن لديك tenant أو company، أنشئ واحداً أولاً
-- 4. إذا ظهرت أخطاء FK، تحقق من وجود tenant و company
