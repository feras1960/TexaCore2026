
DO $$
DECLARE
    v_customers_col boolean;
    v_qr_codes_table boolean;
    v_qr_scans_table boolean;
    v_policy_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'telegram_username') INTO v_customers_col;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_codes') INTO v_qr_codes_table;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_scans') INTO v_qr_scans_table;
    SELECT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view QR codes') INTO v_policy_exists;

    RAISE NOTICE 'State Check:';
    RAISE NOTICE 'customers.telegram_username exists: %', v_customers_col;
    RAISE NOTICE 'qr_codes table exists: %', v_qr_codes_table;
    RAISE NOTICE 'qr_scans table exists: %', v_qr_scans_table;
    RAISE NOTICE 'Policy exists: %', v_policy_exists;
END $$;
