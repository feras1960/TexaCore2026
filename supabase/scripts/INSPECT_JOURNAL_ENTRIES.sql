SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'journal_entries';

SELECT DISTINCT entry_type FROM journal_entries LIMIT 10;
