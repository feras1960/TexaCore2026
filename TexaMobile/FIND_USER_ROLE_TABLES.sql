-- ========================================
-- 🔍 البحث عن جداول ربط الأدوار بالمستخدمين
-- انسخ هذا ← الصق ← Run
-- ========================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%user%role%' 
    OR table_name LIKE '%role%user%'
    OR table_name LIKE '%assignment%'
  )
ORDER BY table_name;
