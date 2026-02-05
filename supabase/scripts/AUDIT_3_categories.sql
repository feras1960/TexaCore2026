-- =====================================================
-- AUDIT_3_categories.sql - تصنيف الجداول
-- =====================================================

SELECT 
    CASE 
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' 
             OR tablename LIKE '%fiscal%' OR tablename LIKE '%budget%' OR tablename LIKE '%cost_center%'
             OR tablename LIKE '%chart_of%' OR tablename = 'funds' OR tablename LIKE '%fund_%'
        THEN '📊 محاسبة'
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%stock%' OR tablename LIKE '%inventory%'
             OR tablename LIKE '%bin_%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%'
             OR tablename LIKE '%fabric%' OR tablename LIKE '%material%'
        THEN '📦 مخزون'
        WHEN tablename LIKE '%sales%' OR tablename LIKE '%customer%' OR tablename LIKE '%quotation%'
        THEN '💰 مبيعات'
        WHEN tablename LIKE '%purchase%' OR tablename LIKE '%supplier%' OR tablename LIKE '%vendor%'
             OR tablename LIKE '%shipment%' OR tablename LIKE '%landed%'
        THEN '🛒 مشتريات'
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%salary%'
             OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%department%'
        THEN '👥 موارد بشرية'
        WHEN tablename LIKE '%saas%' OR tablename LIKE '%subscription%' OR tablename LIKE '%plan%'
             OR tablename LIKE '%tenant%' OR tablename LIKE '%partner%' OR tablename LIKE '%agent%'
             OR tablename = 'super_admins'
        THEN '☁️ SaaS'
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%role%'
             OR tablename LIKE '%permission%' OR tablename LIKE '%user%' OR tablename LIKE '%auth%'
             OR tablename LIKE '%log%' OR tablename LIKE '%audit%' OR tablename LIKE '%notification%'
        THEN '⚙️ نظام'
        WHEN tablename LIKE '%type%' OR tablename LIKE '%status%' OR tablename = 'countries'
             OR tablename = 'currencies' OR tablename = 'languages' OR tablename = 'uom'
        THEN '📚 Lookup'
        WHEN tablename = 'companies' OR tablename = 'branches'
        THEN '🏢 شركات'
        WHEN tablename LIKE '%invoice%' OR tablename LIKE '%order%'
        THEN '📄 مستندات'
        ELSE '❓ أخرى'
    END as "التصنيف",
    tablename as "الجدول"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY 1, 2;
