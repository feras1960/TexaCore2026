-- ========================================
-- 🔍 فحص بنية user_roles
-- انسخ هذا ← الصق ← Run
-- ========================================

SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;
