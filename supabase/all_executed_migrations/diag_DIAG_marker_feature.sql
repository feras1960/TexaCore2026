-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 البحث عن جداول الماركر والتعليم
-- ═══════════════════════════════════════════════════════════════════════════

-- البحث عن جداول تحتوي على marker أو highlight أو color
SELECT 
    tablename as "الجدول"
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE '%marker%' 
    OR tablename LIKE '%highlight%'
    OR tablename LIKE '%color%'
    OR tablename LIKE '%match%'
    OR tablename LIKE '%reconcil%'
);

-- البحث في أعمدة الجداول
SELECT 
    table_name as "الجدول",
    column_name as "العمود",
    data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name LIKE '%marker%'
    OR column_name LIKE '%highlight%'
    OR column_name LIKE '%color%'
    OR column_name LIKE '%match%'
);

-- فحص جدول journal_entry_lines
SELECT 
    column_name as "العمود",
    data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'journal_entry_lines';

-- فحص أي جدول له علاقة بالمطابقات
SELECT 
    tablename as "الجدول"
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE '%ledger%'
    OR tablename LIKE '%reconcil%'
    OR tablename LIKE '%line%'
);
