-- 🔍 البحث عن جداول البراندات بأي اسم
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (
    tablename LIKE '%brand%' 
    OR tablename LIKE '%white%label%'
    OR tablename LIKE '%tenant%'
    OR tablename LIKE '%platform%'
)
ORDER BY tablename;
