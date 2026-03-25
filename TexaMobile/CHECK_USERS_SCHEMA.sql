-- ========================================
-- 🔍 فحص: ما هو schema جدول users؟
-- انسخ هذا ← الصق ← Run
-- ========================================

SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name = 'users';
