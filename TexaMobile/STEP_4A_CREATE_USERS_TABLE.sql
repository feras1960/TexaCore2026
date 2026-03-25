-- ========================================
-- ✅ الخطوة 4A: إنشاء جدول users وإدراج المستخدم
-- انسخ هذا فقط ← الصق ← Run
-- ========================================

-- إنشاء جدول users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج المستخدم
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

-- التحقق
SELECT * FROM users WHERE email = 'test@texa.com';
