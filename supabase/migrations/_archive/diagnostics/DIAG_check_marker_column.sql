-- ============================================
-- DIAGNOSTIC: Check Marker Color Column
-- ============================================

-- 1. Check if marker_color column exists in journal_entries
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('journal_entries', 'journal_entry_lines')
  AND column_name LIKE 'marker%'
ORDER BY table_name, column_name;

-- 2. Check for any entries with marker colors already set
SELECT 
    id,
    entry_number,
    marker_color,
    created_at
FROM journal_entries
WHERE marker_color IS NOT NULL
LIMIT 10;

-- 3. Check journal_entry_lines marker column
SELECT 
    jel.id,
    jel.journal_entry_id,
    jel.marker_color,
    jel.marked_at,
    jel.marked_by
FROM journal_entry_lines jel
WHERE jel.marker_color IS NOT NULL
LIMIT 10;
