-- ═══════════════════════════════════════════════════════════════════════════
-- فحص سريع جداً - ما هو موجود؟
-- Quick Check - What exists?
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. إجمالي الجداول
SELECT COUNT(*) as "إجمالي الجداول"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 2. هل الجداول الحرجة موجودة؟
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "tenants",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "companies",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "chart_of_accounts",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "journal_entries",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoices') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "sales_invoices",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_invoices') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "purchase_invoices",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "customers",
    
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') 
        THEN '✅ موجود' ELSE '❌ مفقود' END as "suppliers";

-- 3. قائمة جميع الجداول (أول 50 جدول)
SELECT 
    table_name as "اسم الجدول"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name
LIMIT 50;
