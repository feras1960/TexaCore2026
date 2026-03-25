-- Check for any table that might be related to payments
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('payments', 'payment_vouchers', 'receipts', 'receipt_vouchers', 'transactions', 'journal_entries', 'account_transactions');

-- Also check views
SELECT 
    schemaname, 
    viewname, 
    viewowner 
FROM 
    pg_views 
WHERE 
    schemaname = 'public' 
    AND viewname IN ('payments', 'parties');
