-- ═══════════════════════════════════════════════════════════════════════════
-- 🔵 استعلام 3: جداول تنقصها أعمدة العزل
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    t.table_name as "الجدول",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'tenant_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as "tenant_id",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'company_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as "company_id",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'brand_id' AND c.table_schema = 'public') 
         THEN '✅' ELSE '❌' END as "brand_id"
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
