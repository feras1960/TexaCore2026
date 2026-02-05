-- ═══════════════════════════════════════════════════════════════
-- STEP 72: Generate Comprehensive Test Data for Next Revolution
-- ═══════════════════════════════════════════════════════════════
-- Description: Populates the database with test data for accounting verification.
--              Includes Banks, Partners, and various Journal Entries.
-- Author: System
-- Date: 2026-01-31
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    -- Constants
    c_tenant_id UUID := '681aa0e4-7692-4337-a3e8-2c127f80e573';
    c_company_id UUID := '1313232a-6ad3-4002-891c-a9a9e8849a93';
    
    -- Variables
    v_user_id UUID;
    v_bank_uah_id UUID;
    v_bank_usd_id UUID;
    v_cash_account_id UUID;
    v_capital_account_id UUID;
    v_sales_account_id UUID;
    v_vat_account_id UUID;
    v_purchases_account_id UUID;
    v_electricity_expense_id UUID;
    v_salaries_expense_id UUID;
    v_salaries_payable_id UUID;
    v_customer_id UUID;
    v_supplier_id UUID;
    v_customer_account_id UUID;
    v_supplier_account_id UUID;
    v_fiscal_year_id UUID;
    v_entry_id UUID;
    
BEGIN
    -- 1. Get User ID (using the first available user or NULL if none)
    -- We need a user ID for 'posted_by'. If no user exists, this might fail if constraints enforce it.
    -- Assuming at least one user exists due to tenant creation.
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- 2. Get Fiscal Year
    SELECT id INTO v_fiscal_year_id 
    FROM fiscal_years 
    WHERE company_id = c_company_id AND is_current = true LIMIT 1;
    
    IF v_fiscal_year_id IS NULL THEN
        -- Create fiscal year if not exists
        INSERT INTO fiscal_years (tenant_id, company_id, name, code, start_date, end_date, is_current)
        VALUES (c_tenant_id, c_company_id, 'Fiscal Year 2026', 'FY-2026', '2026-01-01', '2026-12-31', true)
        RETURNING id INTO v_fiscal_year_id;
    END IF;

    -- 3. Create/Get Bank Accounts
    -- UAH Bank
    SELECT id INTO v_bank_uah_id FROM chart_of_accounts 
    WHERE company_id = c_company_id AND currency = 'UAH' AND is_bank_account = true LIMIT 1;
    
    IF v_bank_uah_id IS NULL THEN
        v_bank_uah_id := add_bank_account(c_company_id, 'بنك الاستثمار (UAH)', 'Investment Bank (UAH)', 'UAH', 'UA1234567890');
        
        -- Update with RU and UK names
        UPDATE chart_of_accounts 
        SET name_ru = 'Инвестиционный банк (UAH)',
            name_uk = 'Інвестиційний банк (UAH)'
        WHERE id = v_bank_uah_id;
    END IF;

    -- USD Bank
    SELECT id INTO v_bank_usd_id FROM chart_of_accounts 
    WHERE company_id = c_company_id AND currency = 'USD' AND is_bank_account = true LIMIT 1;
    
    IF v_bank_usd_id IS NULL THEN
        v_bank_usd_id := add_bank_account(c_company_id, 'بنك التسويات (USD)', 'Settlement Bank (USD)', 'USD', 'US9876543210');
        
        -- Update with RU and UK names
        UPDATE chart_of_accounts 
        SET name_ru = 'Расчетный банк (USD)',
            name_uk = 'Розрахунковий банк (USD)'
        WHERE id = v_bank_usd_id;
    END IF;

    -- 4. Get Common Accounts
    -- Cash (1010 or similar)
    SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '111%' AND is_detail = true LIMIT 1; -- Taking first cash account
    
    -- Capital (3000)
    SELECT id INTO v_capital_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '3%' AND is_detail = true LIMIT 1; -- Equity

    -- Sales (4100)
    SELECT id INTO v_sales_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '4%' AND is_detail = true LIMIT 1;
    
    -- VAT (2130)
    SELECT id INTO v_vat_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '2%' AND name_en ILIKE '%VAT%' AND is_detail = true LIMIT 1;
    
    -- Purchases/Expenses
    SELECT id INTO v_purchases_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '5%' AND is_detail = true LIMIT 1;

    -- Receivables (1130 or similar)
    SELECT id INTO v_customer_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '113%' AND is_detail = true LIMIT 1;
    IF v_customer_account_id IS NULL THEN
         SELECT id INTO v_customer_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_type_id IN (SELECT id FROM account_types WHERE code IN ('ASSET', 'CURRENT_ASSET')) AND is_detail = true LIMIT 1;
    END IF;

    -- Payables (2110 or similar)
    SELECT id INTO v_supplier_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '211%' AND is_detail = true LIMIT 1;
    IF v_supplier_account_id IS NULL THEN
        SELECT id INTO v_supplier_account_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_type_id IN (SELECT id FROM account_types WHERE code IN ('LIABILITY', 'CURRENT_LIABILITY')) AND is_detail = true LIMIT 1;
    END IF;

    -- Electricity Expense (Specific Expense)
    -- We might need to create it if it implies 'Expenses' generally 
    SELECT id INTO v_electricity_expense_id FROM chart_of_accounts WHERE company_id = c_company_id AND name_en ILIKE '%Electricity%' LIMIT 1;
    IF v_electricity_expense_id IS NULL THEN
         SELECT id INTO v_electricity_expense_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '5%' AND is_detail = true LIMIT 1; -- Fallback
    END IF;

    -- Salaries Expense
    SELECT id INTO v_salaries_expense_id FROM chart_of_accounts WHERE company_id = c_company_id AND name_en ILIKE '%Salaries%' AND account_code LIKE '5%' LIMIT 1;
    IF v_salaries_expense_id IS NULL THEN
        SELECT id INTO v_salaries_expense_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '5%' AND is_detail = true OFFSET 1 LIMIT 1; -- Fallback
    END IF;
    
    -- Salaries Payable
    SELECT id INTO v_salaries_payable_id FROM chart_of_accounts WHERE company_id = c_company_id AND name_en ILIKE '%Salaries Payable%' LIMIT 1;
    IF v_salaries_payable_id IS NULL THEN
        SELECT id INTO v_salaries_payable_id FROM chart_of_accounts WHERE company_id = c_company_id AND account_code LIKE '2%' AND is_detail = true LIMIT 1; -- Fallback
    END IF;

    -- 5. Create Partners (Customer & Supplier)
    -- International Client
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, email, currency, receivable_account_id)
    VALUES (c_tenant_id, c_company_id, 'CUST-001', 'عميل دولي', 'International Client Ltd', 'client@test.com', 'USD', v_customer_account_id)
    ON CONFLICT (tenant_id, code) DO UPDATE 
    SET receivable_account_id = EXCLUDED.receivable_account_id;
    
    SELECT id INTO v_customer_id
    FROM customers WHERE company_id = c_company_id AND code = 'CUST-001';

    -- Local Supplier
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, currency, payable_account_id)
    VALUES (c_tenant_id, c_company_id, 'SUPP-001', 'مؤسسة الخدمات المحلية', 'Local Services Org', 'UAH', v_supplier_account_id)
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET payable_account_id = EXCLUDED.payable_account_id;

    SELECT id INTO v_supplier_id
    FROM suppliers WHERE company_id = c_company_id AND code = 'SUPP-001';

    -- 6. Generate Journal Entries
    -- ==========================================
    -- A. Opening Balance
    -- Debit: Bank UAH (500,000), Bank USD (10,000)
    -- Credit: Capital
    -- ==========================================
    INSERT INTO journal_entries (tenant_id, company_id, entry_date, description, status, entry_type, fiscal_year_id, created_by, total_debit, total_credit)
    VALUES (c_tenant_id, c_company_id, '2026-01-01', 'Opening Balance', 'draft', 'manual', v_fiscal_year_id, v_user_id, 928110, 928110) -- 500k + (10k * 42.811)
    RETURNING id INTO v_entry_id;

    -- Lines
    INSERT INTO journal_entry_lines (tenant_id, entry_id, account_id, debit, credit, description) VALUES
    (c_tenant_id, v_entry_id, v_bank_uah_id, 500000, 0, 'Opening Balance UAH'),
    (c_tenant_id, v_entry_id, v_bank_usd_id, 428110, 0, 'Opening Balance USD (10,000 * 42.811)'),
    (c_tenant_id, v_entry_id, v_capital_account_id, 0, 928110, 'Opening Capital');

    -- Post
    PERFORM post_journal_entry(v_entry_id, v_user_id);


    -- ==========================================
    -- B. Sales Invoice (Manual Entry Simulation)
    -- Debit: Customer (USD)
    -- Credit: Sales, VAT
    -- ==========================================
    INSERT INTO journal_entries (tenant_id, company_id, entry_date, description, status, entry_type, fiscal_year_id, created_by, total_debit, total_credit)
    VALUES (c_tenant_id, c_company_id, '2026-01-10', 'Sales Invoice INV-001', 'draft', 'sales', v_fiscal_year_id, v_user_id, 42811, 42811)
    RETURNING id INTO v_entry_id;

    INSERT INTO journal_entry_lines (tenant_id, entry_id, account_id, debit, credit, description) VALUES
    (c_tenant_id, v_entry_id, v_customer_account_id, 42811, 0, 'Invoice INV-001 Receivable (1000 USD)'),
    (c_tenant_id, v_entry_id, v_sales_account_id, 0, 35675.83, 'Sales Revenue'),
    (c_tenant_id, v_entry_id, v_vat_account_id, 0, 7135.17, 'VAT Output');

    PERFORM post_journal_entry(v_entry_id, v_user_id);


    -- ==========================================
    -- C. Purchase Invoice (Manual Entry Simulation)
    -- Debit: Purchases
    -- Credit: Supplier (UAH)
    -- ==========================================
    INSERT INTO journal_entries (tenant_id, company_id, entry_date, description, status, entry_type, fiscal_year_id, created_by, total_debit, total_credit)
    VALUES (c_tenant_id, c_company_id, '2026-01-15', 'Purchase Invoice BILL-001', 'draft', 'purchase', v_fiscal_year_id, v_user_id, 50000, 50000)
    RETURNING id INTO v_entry_id;

    INSERT INTO journal_entry_lines (tenant_id, entry_id, account_id, debit, credit, description) VALUES
    (c_tenant_id, v_entry_id, v_purchases_account_id, 50000, 0, 'Purchase Goods'),
    (c_tenant_id, v_entry_id, v_supplier_account_id, 0, 50000, 'Payable to Supplier');

    PERFORM post_journal_entry(v_entry_id, v_user_id);


    -- ==========================================
    -- D. Operational Expense (Cash)
    -- Debit: Electricity Expense
    -- Credit: Cash
    -- ==========================================
    INSERT INTO journal_entries (tenant_id, company_id, entry_date, description, status, entry_type, fiscal_year_id, created_by, total_debit, total_credit)
    VALUES (c_tenant_id, c_company_id, '2026-01-20', 'Electricity Bill Payment', 'draft', 'expense', v_fiscal_year_id, v_user_id, 2000, 2000)
    RETURNING id INTO v_entry_id;

    INSERT INTO journal_entry_lines (tenant_id, entry_id, account_id, debit, credit, description) VALUES
    (c_tenant_id, v_entry_id, v_electricity_expense_id, 2000, 0, 'Electricity Bill January'),
    (c_tenant_id, v_entry_id, v_cash_account_id, 0, 2000, 'Cash Payment');

    PERFORM post_journal_entry(v_entry_id, v_user_id);


    -- ==========================================
    -- E. Salaries Accrual
    -- Debit: Salaries Expense
    -- Credit: Salaries Payable
    -- ==========================================
    INSERT INTO journal_entries (tenant_id, company_id, entry_date, description, status, entry_type, fiscal_year_id, created_by, total_debit, total_credit)
    VALUES (c_tenant_id, c_company_id, '2026-01-25', 'January Salaries Accrual', 'draft', 'payroll', v_fiscal_year_id, v_user_id, 100000, 100000)
    RETURNING id INTO v_entry_id;

    INSERT INTO journal_entry_lines (tenant_id, entry_id, account_id, debit, credit, description) VALUES
    (c_tenant_id, v_entry_id, v_salaries_expense_id, 100000, 0, 'Salaries Expense Jan'),
    (c_tenant_id, v_entry_id, v_salaries_payable_id, 0, 100000, 'Salaries Payable');

    PERFORM post_journal_entry(v_entry_id, v_user_id);
    
    
    RAISE NOTICE '✅ Test Data Generation Completed Successfully!';

END $$;
