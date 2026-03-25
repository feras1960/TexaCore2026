-- ═══════════════════════════════════════════════════════════════
-- 📊 FULL SCHEMA EXPORT — CSV-friendly single query
-- Export results as CSV and send the file
-- ═══════════════════════════════════════════════════════════════

-- PART 1: Tables + Columns (run this first, export CSV)
SELECT 
    'COL' AS type,
    c.table_name,
    c.column_name,
    c.data_type || CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN '(' || c.character_maximum_length || ')' 
        ELSE '' 
    END AS full_type,
    c.is_nullable,
    COALESCE(c.column_default, '') AS col_default
FROM information_schema.columns c
JOIN information_schema.tables t 
    ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position;
