-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 التحقق من ميزة الماركر في قاعدة البيانات
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ التحقق من وجود حقول الماركر في الجداول
SELECT 
    '1️⃣ MARKER COLUMNS' as section,
    table_name as "الجدول",
    column_name as "العمود",
    data_type as "النوع"
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('marker_color', 'marked_at', 'marked_by')
ORDER BY table_name, column_name;

-- 2️⃣ التحقق من وجود الفهارس
SELECT 
    '2️⃣ MARKER INDEXES' as section,
    indexname as "الفهرس",
    tablename as "الجدول"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%marker%';

-- 3️⃣ التحقق من وجود Trigger
SELECT 
    '3️⃣ MARKER TRIGGER' as section,
    tgname as "Trigger",
    tgrelid::regclass as "الجدول"
FROM pg_trigger
WHERE tgname LIKE '%marker%';

-- 4️⃣ التحقق من وجود الدالة
SELECT 
    '4️⃣ MARKER FUNCTION' as section,
    proname as "الدالة"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname LIKE '%marker%';

-- 5️⃣ أعمدة journal_entry_lines
SELECT 
    '5️⃣ JOURNAL_ENTRY_LINES COLUMNS' as section,
    column_name as "العمود"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'journal_entry_lines'
ORDER BY ordinal_position;
