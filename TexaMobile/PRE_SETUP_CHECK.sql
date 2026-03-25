-- ========================================
-- 📋 Pre-Setup Check
-- نفذ هذا أولاً للتحقق من البيانات الأساسية
-- ========================================

-- 1. التحقق من وجود المستخدم
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'test@texa.com';

-- يجب أن ترى:
-- ✅ المستخدم موجود
-- ✅ email_confirmed_at ≠ null (إذا كان null، فعّل Auto Confirm)

-- ========================================

-- 2. التحقق من وجود Tenant
SELECT 
  id,
  name_ar,
  name_en,
  status
FROM tenants
WHERE status = 'active'
LIMIT 5;

-- يجب أن ترى على الأقل tenant واحد
-- إذا كان فارغاً، نفذ:

INSERT INTO tenants (id, name_ar, name_en, status, created_at)
VALUES (
  gen_random_uuid(),
  'شركة تجريبية',
  'Demo Company',
  'active',
  NOW()
)
RETURNING id, name_ar, name_en;

-- ========================================

-- 3. التحقق من وجود Company
SELECT 
  id,
  name_ar,
  name_en,
  tenant_id
FROM companies
LIMIT 5;

-- يجب أن ترى على الأقل company واحدة
-- إذا كان فارغاً، نفذ (استبدل YOUR_TENANT_ID):

INSERT INTO companies (id, tenant_id, name_ar, name_en, created_at)
VALUES (
  gen_random_uuid(),
  'YOUR_TENANT_ID', -- ضع UUID من الخطوة 2
  'الشركة الرئيسية',
  'Main Company',
  NOW()
)
RETURNING id, name_ar, name_en;

-- ========================================

-- 4. التحقق من بنية جدول roles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'roles'
ORDER BY ordinal_position;

-- يجب أن ترى:
-- ✅ code (varchar)
-- ✅ name_ar (varchar)
-- ✅ name_en (varchar)

-- ========================================

-- 5. التحقق من بنية جدول user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- يجب أن ترى:
-- ✅ id (uuid)
-- ✅ tenant_id (uuid)
-- ✅ company_id (uuid)
-- ✅ full_name
-- ✅ email

-- ========================================
-- ✅ إذا كانت جميع الفحوصات ناجحة:
-- نفذ الآن: MOBILE_SETUP.sql
-- ========================================
