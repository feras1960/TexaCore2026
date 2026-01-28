-- ========================================
-- 🔍 فحص: ما هو الـ foreign key constraint على user_profiles.id؟
-- انسخ هذا ← الصق ← Run
-- ========================================

SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'user_profiles_id_fkey';
