-- ========================================
-- 🔍 فحص بنية user_role_assignments
-- انسخ هذا ← الصق ← Run
-- ========================================

SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'user_role_assignments'
ORDER BY ordinal_position;
