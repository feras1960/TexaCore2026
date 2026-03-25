-- Debug: Check if account join is working
SELECT 
    jel.id,
    jel.entry_id,
    jel.account_id,
    jel.debit,
    jel.credit,
    jel.description,
    -- Check if account exists
    coa.id as account_exists,
    coa.account_code,
    coa.name_ar,
    coa.name_en,
    -- Check the join result
    jsonb_build_object(
        'id', coa.id,
        'account_code', coa.account_code,
        'name_ar', coa.name_ar,
        'name_en', coa.name_en
    ) as account_object
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE jel.entry_id = (
    SELECT id FROM journal_entries ORDER BY created_at DESC LIMIT 1
)
ORDER BY jel.line_number;
