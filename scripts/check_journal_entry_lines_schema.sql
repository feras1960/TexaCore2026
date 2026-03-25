-- Check the actual schema of journal_entry_lines table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entry_lines'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any triggers on journal_entry_lines
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'journal_entry_lines';
