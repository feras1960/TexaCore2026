-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 COMPREHENSIVE SCHEMA DUMP — TexaCore ERP
-- Generated: 2026-02-11
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ ALL TABLES with column count
SELECT '📋 TABLES' AS section;
SELECT t.table_name, 
       COUNT(c.column_name) AS col_count,
       obj_description((t.table_schema || '.' || t.table_name)::regclass) AS description
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, t.table_schema
ORDER BY t.table_name;

-- 2️⃣ ALL COLUMNS per table
SELECT '📝 COLUMNS' AS section;
SELECT table_name, column_name, data_type, 
       character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3️⃣ ALL FOREIGN KEY RELATIONSHIPS
SELECT '🔗 RELATIONSHIPS' AS section;
SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4️⃣ ALL CHECK CONSTRAINTS
SELECT '✅ CHECK CONSTRAINTS' AS section;
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- 5️⃣ ALL UNIQUE CONSTRAINTS
SELECT '🔑 UNIQUE CONSTRAINTS' AS section;
SELECT tc.table_name, tc.constraint_name, 
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 6️⃣ ALL INDEXES
SELECT '📑 INDEXES' AS section;
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7️⃣ ALL RLS POLICIES
SELECT '🔒 RLS POLICIES' AS section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8️⃣ ALL FUNCTIONS
SELECT '⚙️ FUNCTIONS' AS section;
SELECT routine_name, routine_type, data_type AS return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 9️⃣ ALL VIEWS
SELECT '👁️ VIEWS' AS section;
SELECT table_name AS view_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 🔟 ALL TRIGGERS
SELECT '⚡ TRIGGERS' AS section;
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
