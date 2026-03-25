-- =====================================================
-- AUDIT_quick.sql - مسح سريع ومدمج
-- =====================================================

-- 1. الملخص العام
SELECT 
    '📊 ملخص النظام' as report,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers;

-- 2. حالة RLS لكل جدول
SELECT 
    t.tablename as table_name,
    CASE WHEN c.relrowsecurity THEN '✓' ELSE '✗' END as rls,
    COALESCE(p.cnt, 0) as policies,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='tenant_id') THEN '✓' ELSE '-' END as tenant_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='company_id') THEN '✓' ELSE '-' END as company_id
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace
LEFT JOIN (SELECT tablename, COUNT(*) cnt FROM pg_policies WHERE schemaname='public' GROUP BY tablename) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
