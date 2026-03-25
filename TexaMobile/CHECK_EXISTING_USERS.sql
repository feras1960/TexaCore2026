-- ============================================
-- 🔍 التحقق من المستخدمين الموجودين
-- ============================================

-- 1️⃣ جميع المستخدمين في auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2️⃣ المستخدمين مع Profiles والأدوار
SELECT 
  au.email,
  au.email_confirmed_at,
  up.full_name_ar,
  up.full_name_en,
  t.name_ar as tenant_name,
  c.name_ar as company_name,
  STRING_AGG(ur.role_code, ', ') as roles
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN tenants t ON t.id = up.tenant_id
LEFT JOIN companies c ON c.id = up.company_id
LEFT JOIN user_role_assignments ura ON ura.user_id = au.id AND ura.is_active = true
LEFT JOIN user_roles ur ON ur.id = ura.role_id
GROUP BY 
  au.id,
  au.email,
  au.email_confirmed_at,
  up.full_name_ar,
  up.full_name_en,
  t.name_ar,
  c.name_ar
ORDER BY au.created_at DESC;

-- 3️⃣ المستخدمين بدون Profiles (يحتاجون إعداد)
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.id IS NULL;
