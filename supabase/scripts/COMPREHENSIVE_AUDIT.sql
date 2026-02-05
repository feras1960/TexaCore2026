-- =====================================================
-- COMPREHENSIVE_AUDIT.sql
-- مسح شامل للجداول والتناقضات
-- تاريخ: 2026-02-05
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. قائمة كاملة بالجداول مع كل التفاصيل
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📋 قائمة الجداول الشاملة' as report_section,
    t.tablename as table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename) as columns_count,
    CASE WHEN c.relrowsecurity THEN '✓' ELSE '✗' END as rls_enabled,
    COALESCE(pol.cnt, 0) as policies_count,
    COALESCE(trg.cnt, 0) as triggers_count,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='tenant_id') THEN '✓' ELSE '-' END as has_tenant_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='company_id') THEN '✓' ELSE '-' END as has_company_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='product_id') THEN '✓' ELSE '-' END as has_product_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='created_at') THEN '✓' ELSE '-' END as has_created_at,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='updated_at') THEN '✓' ELSE '-' END as has_updated_at
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname AND c.relnamespace = 'public'::regnamespace
LEFT JOIN (SELECT tablename, COUNT(*) cnt FROM pg_policies WHERE schemaname='public' GROUP BY tablename) pol ON t.tablename = pol.tablename
LEFT JOIN (SELECT event_object_table, COUNT(*) cnt FROM information_schema.triggers WHERE trigger_schema='public' GROUP BY event_object_table) trg ON t.tablename = trg.event_object_table
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 2. التناقضات: جداول بدون Primary Key
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بدون Primary Key' as issue,
    t.tablename as table_name
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = t.tablename 
      AND tc.constraint_type = 'PRIMARY KEY'
  )
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 3. التناقضات: جداول بدون created_at
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بدون created_at' as issue,
    t.tablename as table_name
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'created_at'
  )
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 4. التناقضات: جداول بدون updated_at
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بدون updated_at' as issue,
    t.tablename as table_name
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'updated_at'
  )
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 5. التناقضات: أعمدة tenant_id بدون فهارس
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بـ tenant_id بدون فهرس' as issue,
    c.table_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'tenant_id'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = c.table_name
      AND i.indexdef LIKE '%tenant_id%'
  )
ORDER BY c.table_name;

-- ═══════════════════════════════════════════════════════════════
-- 6. التناقضات: أعمدة company_id بدون فهارس
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بـ company_id بدون فهرس' as issue,
    c.table_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'company_id'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = c.table_name
      AND i.indexdef LIKE '%company_id%'
  )
ORDER BY c.table_name;

-- ═══════════════════════════════════════════════════════════════
-- 7. الفهارس الموجودة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📊 عدد الفهارس لكل جدول' as report,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════
-- 8. جداول بدون فهارس
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بدون أي فهارس' as issue,
    t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = t.tablename
  )
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 9. تصنيف الجداول حسب الوظيفة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📦 تصنيف الجداول' as report,
    CASE 
        -- المحاسبة
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' 
             OR tablename LIKE '%fiscal%' OR tablename LIKE '%budget%' OR tablename LIKE '%cost_center%'
             OR tablename LIKE '%chart_of%' OR tablename = 'funds' OR tablename LIKE '%fund_%'
        THEN '📊 محاسبة'
        
        -- المخزون
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%stock%' OR tablename LIKE '%inventory%'
             OR tablename LIKE '%bin_%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%'
             OR tablename LIKE '%fabric%' OR tablename LIKE '%material%'
        THEN '📦 مخزون'
        
        -- المبيعات
        WHEN tablename LIKE '%sales%' OR tablename LIKE '%invoice%' OR tablename LIKE '%quotation%'
             OR tablename LIKE '%customer%' OR tablename LIKE '%order%' AND tablename NOT LIKE '%purchase%'
        THEN '💰 مبيعات'
        
        -- المشتريات
        WHEN tablename LIKE '%purchase%' OR tablename LIKE '%supplier%' OR tablename LIKE '%vendor%'
             OR tablename LIKE '%shipment%' OR tablename LIKE '%landed%'
        THEN '🛒 مشتريات'
        
        -- الموارد البشرية
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%salary%'
             OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%department%'
        THEN '👥 موارد بشرية'
        
        -- SaaS والاشتراكات
        WHEN tablename LIKE '%saas%' OR tablename LIKE '%subscription%' OR tablename LIKE '%plan%'
             OR tablename LIKE '%tenant%' OR tablename LIKE '%partner%' OR tablename LIKE '%agent%'
             OR tablename = 'super_admins'
        THEN '☁️ SaaS'
        
        -- النظام والإعدادات
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%role%'
             OR tablename LIKE '%permission%' OR tablename LIKE '%user%' OR tablename LIKE '%auth%'
             OR tablename LIKE '%log%' OR tablename LIKE '%audit%' OR tablename LIKE '%notification%'
        THEN '⚙️ نظام'
        
        -- Lookup
        WHEN tablename LIKE '%type%' OR tablename LIKE '%status%' OR tablename = 'countries'
             OR tablename = 'currencies' OR tablename = 'languages' OR tablename = 'uom'
        THEN '📚 Lookup'
        
        -- الشركات والفروع
        WHEN tablename = 'companies' OR tablename = 'branches'
        THEN '🏢 شركات'
        
        ELSE '❓ أخرى'
    END as category,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY 
    CASE 
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' 
             OR tablename LIKE '%fiscal%' OR tablename LIKE '%budget%' OR tablename LIKE '%cost_center%'
             OR tablename LIKE '%chart_of%' OR tablename = 'funds' OR tablename LIKE '%fund_%'
        THEN '📊 محاسبة'
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%stock%' OR tablename LIKE '%inventory%'
             OR tablename LIKE '%bin_%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%'
             OR tablename LIKE '%fabric%' OR tablename LIKE '%material%'
        THEN '📦 مخزون'
        WHEN tablename LIKE '%sales%' OR tablename LIKE '%invoice%' OR tablename LIKE '%quotation%'
             OR tablename LIKE '%customer%' OR tablename LIKE '%order%' AND tablename NOT LIKE '%purchase%'
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
        ELSE '❓ أخرى'
    END
ORDER BY table_count DESC;

-- ═══════════════════════════════════════════════════════════════
-- 10. العلاقات (Foreign Keys)
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '🔗 العلاقات بين الجداول' as report,
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════
-- 11. جداول بدون Foreign Keys (يتيمة)
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '⚠️ جداول بدون علاقات' as issue,
    t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = t.tablename
      AND tc.constraint_type = 'FOREIGN KEY'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public'
      AND ccu.table_name = t.tablename
      AND tc.constraint_type = 'FOREIGN KEY'
  )
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════
-- 12. ملخص التناقضات
-- ═══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT '📊 ملخص المسح الشامل' as title;
SELECT '═══════════════════════════════════════════════════════════' as separator;

SELECT 
    'إجمالي الجداول' as metric,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::TEXT as value
UNION ALL
SELECT 
    'جداول بـ RLS مفعّل',
    (SELECT COUNT(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true)::TEXT
UNION ALL
SELECT 
    'إجمالي السياسات',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')::TEXT
UNION ALL
SELECT 
    'إجمالي التريغرات',
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public')::TEXT
UNION ALL
SELECT 
    'جداول بـ tenant_id',
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id')::TEXT
UNION ALL
SELECT 
    'جداول بـ company_id',
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id')::TEXT
UNION ALL
SELECT 
    'جداول بدون Primary Key',
    (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc WHERE tc.table_schema = 'public' AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'))::TEXT
UNION ALL
SELECT 
    'جداول بدون فهارس',
    (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = t.tablename))::TEXT;

SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT '✅ اكتمل المسح الشامل' as title;
SELECT '═══════════════════════════════════════════════════════════' as separator;
