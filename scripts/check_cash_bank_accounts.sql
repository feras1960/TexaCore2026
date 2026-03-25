-- Check Account Types for Cash/Bank
SELECT * FROM account_types WHERE code IN ('CASH', 'BANK', 'ASSET');

-- Check Chart of Accounts for Cash/Bank accounts
SELECT 
    ca.id, 
    ca.account_code, 
    ca.name_ar, 
    ca.current_balance, 
    at.code as type_code 
FROM chart_of_accounts ca
JOIN account_types at ON ca.account_type_id = at.id
WHERE at.code IN ('CASH', 'BANK') OR ca.is_cash_account = true OR ca.is_bank_account = true;
