-- ═══════════════════════════════════════════════════════════════
-- Verification: Test Currency Conversion Logic
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_rate DECIMAL;
    v_converted_amount DECIMAL;
    v_company_id UUID := '1313232a-6ad3-4002-891c-a9a9e8849a93';
BEGIN
    -- 1. Check Rate
    RAISE NOTICE '--- Checking Exchange Rate (USD -> UAH) ---';
    SELECT get_exchange_rate(v_company_id, 'USD', 'UAH', NOW()) INTO v_rate;
    RAISE NOTICE 'Current Rate: %', v_rate;
    
    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'Exchange rate verification failed: Rate is NULL';
    END IF;

    -- 2. Test Function
    RAISE NOTICE '--- Testing Convert Function (100 USD -> UAH) ---';
    SELECT convert_currency(v_company_id, 100, 'USD', 'UAH', NOW()) INTO v_converted_amount;
    RAISE NOTICE '100 USD = % UAH', v_converted_amount;
    
    -- 3. Verify Journal Entry Values
    RAISE NOTICE '--- Verifying USD Invoice Entry ---';
    FOR v_converted_amount IN 
        SELECT total_amount 
        FROM journal_entries 
        WHERE description = 'Sales Invoice INV-001'
    LOOP
        RAISE NOTICE 'Invoice Amount in DB: %', v_converted_amount;
    END LOOP;

END $$;
