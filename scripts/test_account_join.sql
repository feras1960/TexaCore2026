-- Test the account join query directly
SELECT 
    jel.id,
    jel.entry_id,
    jel.line_number,
    jel.account_id,
    jel.debit,
    jel.credit,
    jel.description,
    coa.id as account_full_id,
    coa.account_code,
    coa.name_ar,
    coa.name_en
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE jel.entry_id = (
    SELECT id FROM journal_entries ORDER BY created_at DESC LIMIT 1
)
ORDER BY jel.line_number;
