-- PART 2: Foreign Keys + Constraints + Indexes
-- Run and export as CSV

-- Foreign Keys
SELECT 
    'FK' AS type,
    tc.table_name AS from_table,
    kcu.column_name AS from_col,
    ccu.table_name AS to_table,
    ccu.column_name AS to_col,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'

UNION ALL

-- Check Constraints
SELECT 
    'CHECK' AS type,
    conrelid::regclass::text AS from_table,
    conname AS from_col,
    pg_get_constraintdef(oid) AS to_table,
    '' AS to_col,
    '' AS constraint_name
FROM pg_constraint 
WHERE contype = 'c' AND connamespace = 'public'::regnamespace

UNION ALL

-- Unique Constraints
SELECT 
    'UNIQUE' AS type,
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position),
    tc.constraint_name,
    '',
    ''
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name

ORDER BY type, from_table;
