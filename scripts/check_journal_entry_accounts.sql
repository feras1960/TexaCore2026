-- Check journal entry lines to see if account_id is being saved correctly
SELECT 
    jel.id,
    jel.entry_id,
    jel.line_number,
    jel.account_id,
    jel.debit,
    jel.credit,
    jel.description,
    coa.account_code,
    coa.name_ar,
    coa.name_en
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
ORDER BY jel.created_at DESC
LIMIT 20;

-- Check if there are any lines with NULL account_id
SELECT COUNT(*) as null_account_count
FROM journal_entry_lines
WHERE account_id IS NULL;
