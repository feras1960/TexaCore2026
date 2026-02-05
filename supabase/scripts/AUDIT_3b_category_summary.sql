-- =====================================================
-- AUDIT_3b_category_summary.sql - ملخص التصنيفات
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
             OR tablename LIKE '%shipment%' OR tablename LIKE '%landed%' OR tablename LIKE '%container%'
        THEN '🛒 مشتريات'
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%salary%'
             OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%department%'
        THEN '👥 موارد بشرية'
        WHEN tablename LIKE '%saas%' OR tablename LIKE '%subscription%' OR tablename LIKE '%plan%'
             OR tablename LIKE '%tenant%' OR tablename LIKE '%partner%' OR tablename LIKE '%agent%'
             OR tablename = 'super_admins' OR tablename LIKE '%incentive%' OR tablename LIKE '%referral%'
             OR tablename LIKE '%billing%' OR tablename LIKE '%commission%'
        THEN '☁️ SaaS'
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%role%'
             OR tablename LIKE '%permission%' OR tablename LIKE '%user%' OR tablename LIKE '%auth%'
             OR tablename LIKE '%log%' OR tablename LIKE '%audit%' OR tablename LIKE '%notification%'
             OR tablename LIKE '%mfa%' OR tablename LIKE '%module%' OR tablename LIKE '%ticket%'
        THEN '⚙️ نظام'
        WHEN tablename LIKE '%type%' OR tablename LIKE '%status%' OR tablename = 'countries'
             OR tablename = 'currencies' OR tablename = 'languages' OR tablename = 'uom'
             OR tablename LIKE '%tax%' OR tablename = 'business_industries'
        THEN '📚 Lookup'
        WHEN tablename = 'companies' OR tablename = 'branches'
        THEN '🏢 شركات'
        WHEN tablename LIKE '%invoice%' OR tablename LIKE '%order%' OR tablename LIKE '%delivery%'
             OR tablename LIKE '%payment%' OR tablename LIKE '%receipt%' OR tablename LIKE '%voucher%'
        THEN '📄 مستندات'
        WHEN tablename LIKE '%product%' OR tablename LIKE '%price%' OR tablename LIKE '%gold%'
        THEN '🏷️ منتجات'
        WHEN tablename LIKE '%white_label%' OR tablename LIKE '%webhook%'
        THEN '🔌 تكاملات'
        WHEN tablename LIKE '%shop%' OR tablename LIKE '%cart%' OR tablename LIKE '%coupon%'
             OR tablename LIKE '%review%' OR tablename LIKE '%promo%' OR tablename LIKE '%marketing%'
        THEN '🛍️ تجارة إلكترونية'
        WHEN tablename LIKE '%report%' OR tablename LIKE '%document%' OR tablename LIKE '%storage%'
        THEN '📋 تقارير/ملفات'
        ELSE '❓ أخرى'
    END as "التصنيف",
    COUNT(*) as "عدد الجداول"
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY 1
ORDER BY 2 DESC;
