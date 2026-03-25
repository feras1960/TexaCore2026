-- 🔍 تشخيص: فحص أعمدة الجداول المستخدمة في الإصلاح
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'funds', 
        'currency_exchanges', 
        'customer_groups', 
        'supplier_groups', 
        'bin_locations',
        'account_invoices',
        'account_invoice_items',
        'billing_payments',
        'recurring_entry_templates',
        'recurring_entry_executions',
        'reservations',
        'reservation_items'
    )
    AND column_name IN ('tenant_id', 'company_id', 'branch_id')
ORDER BY table_name, column_name;
