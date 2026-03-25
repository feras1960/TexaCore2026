-- ========================================
-- ✅ الخطوة 3: فحص المستخدم التجريبي
-- انسخ هذا السطر ← الصق في SQL Editor ← اضغط Run
-- ========================================

SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'test@texa.com';
