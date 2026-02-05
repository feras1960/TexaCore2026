-- =====================================================
-- AUDIT_4_summary.sql - الملخص الشامل
-- =====================================================

SELECT 
    'إجمالي الجداول' as "المقياس",
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::TEXT as "القيمة"
UNION ALL SELECT 'جداول بـ RLS مفعّل', (SELECT COUNT(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true)::TEXT
UNION ALL SELECT 'إجمالي السياسات', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')::TEXT
UNION ALL SELECT 'إجمالي التريغرات', (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public')::TEXT
UNION ALL SELECT 'جداول بـ tenant_id', (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id')::TEXT
UNION ALL SELECT 'جداول بـ company_id', (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id')::TEXT
UNION ALL SELECT '⚠️ بدون Primary Key', (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc WHERE tc.table_schema = 'public' AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'))::TEXT
UNION ALL SELECT '⚠️ بدون created_at', (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'created_at'))::TEXT
UNION ALL SELECT '⚠️ بدون فهارس', (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = t.tablename))::TEXT;
