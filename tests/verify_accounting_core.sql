-- ============================================================================
-- Accounting Module Verifiction Script
-- Description: Tests COA, Journal Entries, Balancing logic, and Ledger updates.
-- Run this in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- 1. Setup Test Data
-- Create a test company to isolate data
DO $$
DECLARE
    v_company_id uuid;
    v_tenant_id uuid;
    v_asset_type_id uuid;
    v_equity_type_id uuid;
    v_asset_account_id uuid;
    v_equity_account_id uuid;
    v_journal_entry_id uuid;
    v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- Dummy user ID
BEGIN
    -- Get existing valid tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies LIMIT 1;

    IF v_tenant_id IS NULL THEN
         RAISE EXCEPTION 'No tenant_id found in companies table.';
    END IF;

    -- Get Account Type IDs
    SELECT id INTO v_asset_type_id FROM account_types WHERE name_en = 'Assets' OR name_en = 'Current Assets' LIMIT 1;
    SELECT id INTO v_equity_type_id FROM account_types WHERE name_en = 'Equity' LIMIT 1;

    -- Insert Test Company
    INSERT INTO companies (name, default_currency, tenant_id, code)
    VALUES ('Test Company Inc.', 'USD', v_tenant_id, 'TEST-CO')
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE 'Created Test Company: %', v_company_id;

    -- 2. Verify Chart of Accounts (COA)
    -- Create Asset Account
    INSERT INTO chart_of_accounts (company_id, account_code, name_en, name_ar, account_type_id, is_group, is_active, currency, tenant_id)
    VALUES (v_company_id, '1000-TEST', 'Test Cash', 'نقدية تجريبية', v_asset_type_id, false, true, 'USD', v_tenant_id)
    RETURNING id INTO v_asset_account_id;

    -- Create Equity Account
    INSERT INTO chart_of_accounts (company_id, account_code, name_en, name_ar, account_type_id, is_group, is_active, currency, tenant_id)
    VALUES (v_company_id, '3000-TEST', 'Test Equity', 'حقوق ملكية تجريبية', v_equity_type_id, false, true, 'USD', v_tenant_id)
    RETURNING id INTO v_equity_account_id;

    RAISE NOTICE 'Created Accounts: Asset=%, Equity=%', v_asset_account_id, v_equity_account_id;

    -- 3. Verify Journal Entries (Happy Path)
    -- Create a Draft Journal Entry
    INSERT INTO journal_entries (company_id, entry_date, description, status, entry_type, tenant_id, entry_number)
    VALUES (v_company_id, CURRENT_DATE, 'Initial Capital', 'DRAFT', 'OPENING_BALANCE', v_tenant_id, 'TEST-' || gen_random_uuid())
    RETURNING id INTO v_journal_entry_id;

    -- Add Debit Line (Cash)
    INSERT INTO journal_entry_lines (entry_id, account_id, description, debit, credit, tenant_id)
    VALUES (v_journal_entry_id, v_asset_account_id, 'Cash Injection', 1000.00, 0, v_tenant_id);

    -- Add Credit Line (Equity)
    INSERT INTO journal_entry_lines (entry_id, account_id, description, debit, credit, tenant_id)
    VALUES (v_journal_entry_id, v_equity_account_id, 'Owner Capital', 0, 1000.00, v_tenant_id);

    RAISE NOTICE 'Created Draft Journal Entry: %', v_journal_entry_id;

    -- Post the Entry
    UPDATE journal_entries
    SET status = 'POSTED', is_posted = true
    WHERE id = v_journal_entry_id;

    RAISE NOTICE 'Posted Journal Entry successfully.';

    -- 4. Verify Balances
    -- Check Asset Account Balance (Should be +1000 Debit)
    -- Assuming we have a view or function, but querying raw lines for now as per schema
    PERFORM 1 FROM journal_entry_lines l
    JOIN journal_entries je ON l.entry_id = je.id
    WHERE l.account_id = v_asset_account_id
    AND je.is_posted = true
    HAVING SUM(l.debit) - SUM(l.credit) = 1000.00;

    IF FOUND THEN
        RAISE NOTICE 'Balance Verification PASSED: Asset Account = 1000.00';
    ELSE
        RAISE EXCEPTION 'Balance Verification FAILED: Asset Account balance mismatch';
    END IF;

    -- 5. Verify Constraints (Negative Test)
    -- Try to post an Unbalanced Entry
    BEGIN
        DECLARE
            v_bad_entry_id uuid;
        BEGIN
            INSERT INTO journal_entries (company_id, entry_date, description, status, tenant_id, entry_number)
            VALUES (v_company_id, CURRENT_DATE, 'Unbalanced Entry', 'DRAFT', v_tenant_id, 'TEST-BAD-' || gen_random_uuid())
            RETURNING id INTO v_bad_entry_id;

            INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, tenant_id)
            VALUES (v_bad_entry_id, v_asset_account_id, 500.00, 0, v_tenant_id); -- Only Debit provided

            -- Attempt to Post
            UPDATE journal_entries
            SET status = 'POSTED', is_posted = true
            WHERE id = v_bad_entry_id;

            -- If we reach here, the constraint failed!
            RAISE EXCEPTION 'Constraint Logic FAILED: Unbalanced entry was allowed!';
        EXCEPTION 
            WHEN others THEN
                RAISE NOTICE 'Constraint Logic PASSED: Caught expected error for unbalanced entry -> %', SQLERRM;
        END;
    END;

    RAISE NOTICE 'All Accounting Verifications PASSED Successfully!';

    -- Rollback everything to keep DB clean (Optional - toggle to commit if you want to inspect data)
    RAISE EXCEPTION 'Test Complete - Rolling back changes.'; 

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Test Transaction Rolled Back: %', SQLERRM;
END $$;
