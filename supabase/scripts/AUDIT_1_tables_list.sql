-- =====================================================
-- AUDIT_1_tables_list.sql - قائمة الجداول الشاملة
-- =====================================================

SELECT 
    t.tablename as "الجدول",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename) as "أعمدة",
    CASE WHEN c.relrowsecurity THEN '✓' ELSE '✗' END as "RLS",
    COALESCE(pol.cnt, 0) as "سياسات",
    COALESCE(trg.cnt, 0) as "تريغرات",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='tenant_id') THEN '✓' ELSE '-' END as "tenant",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='company_id') THEN '✓' ELSE '-' END as "company",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='created_at') THEN '✓' ELSE '-' END as "created",
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='updated_at') THEN '✓' ELSE '-' END as "updated"
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace
LEFT JOIN (SELECT tablename, COUNT(*) cnt FROM pg_policies WHERE schemaname='public' GROUP BY tablename) pol ON t.tablename = pol.tablename
LEFT JOIN (SELECT event_object_table, COUNT(*) cnt FROM information_schema.triggers WHERE trigger_schema='public' GROUP BY event_object_table) trg ON t.tablename = trg.event_object_table
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
