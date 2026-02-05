-- Find all triggers that might be causing the journal_entry_id error

-- 1. List all triggers on journal_entry_lines
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'journal_entry_lines'
ORDER BY trigger_name;

-- 2. List all functions that might reference journal_entry_id
SELECT 
    p.proname as function_name,
    n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname LIKE '%journal%'
ORDER BY p.proname;
