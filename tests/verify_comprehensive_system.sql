-- ═══════════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE SYSTEM VERIFICATION
-- Tests: Accounting, Warehouses, Sales, Purchases, Employee Assignments
-- Multilingual Support: Arabic, English
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
    -- Context
    v_tenant_id uuid;
    v_company_id uuid;
    v_branch_id uuid;
    v_fiscal_year_id uuid;
    
    -- Master Data
    v_customer_id uuid;
    v_supplier_id uuid;
    v_product_id uuid;
    v_warehouse_regular_id uuid;
    v_warehouse_market_id uuid;
    v_unit_id uuid;
    v_user_id uuid;
    
    -- Accounts
    v_sales_account_id uuid;
    v_receivable_account_id uuid;
    v_purchases_account_id uuid;
    v_payable_account_id uuid;
    v_cash_account_id uuid;
    v_inventory_account_id uuid;
    v_cogs_account_id uuid;
    
    -- Transactions
    v_si_id uuid;
    v_pi_id uuid;
    v_je_id uuid;
    
    -- Counters
    v_je_count int;
    v_inv_move_count int;
    v_assignment_count int;
    
    -- Test Results
    v_tests_passed int := 0;
    v_tests_failed int := 0;
    v_test_name text;
    
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 COMPREHENSIVE SYSTEM VERIFICATION';
    RAISE NOTICE '   اختبار شامل للنظام';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 1: SETUP & CONTEXT
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '📋 Section 1: Setup & Context';
    RAISE NOTICE '   القسم 1: الإعداد والسياق';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Get tenant and company
    SELECT tenant_id INTO v_tenant_id FROM companies LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION '❌ No company found / لا توجد شركة';
    END IF;
    
    RAISE NOTICE '✅ Company found: %', v_company_id;
    
    -- Get or create branch
    SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id LIMIT 1;
    IF v_branch_id IS NULL THEN
        INSERT INTO branches (tenant_id, company_id, code, name, name_en, name_ar, city, country)
        VALUES (v_tenant_id, v_company_id, 'MAIN', 'Main Branch', 'Main Branch', 'الفرع الرئيسي', 'Riyadh', 'Saudi Arabia')
        RETURNING id INTO v_branch_id;
        RAISE NOTICE '✅ Branch created: %', v_branch_id;
    ELSE
        RAISE NOTICE '✅ Branch found: %', v_branch_id;
    END IF;
    
    -- Get or create fiscal year
    SELECT id INTO v_fiscal_year_id FROM fiscal_years WHERE company_id = v_company_id AND is_current = true LIMIT 1;
    IF v_fiscal_year_id IS NULL THEN
        INSERT INTO fiscal_years (tenant_id, company_id, name, start_date, end_date, is_current)
        VALUES (v_tenant_id, v_company_id, '2026', '2026-01-01', '2026-12-31', true)
        RETURNING id INTO v_fiscal_year_id;
        RAISE NOTICE '✅ Fiscal year created: %', v_fiscal_year_id;
    ELSE
        RAISE NOTICE '✅ Fiscal year found: %', v_fiscal_year_id;
    END IF;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 2: WAREHOUSE TESTS
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '🏪 Section 2: Warehouse Tests';
    RAISE NOTICE '   القسم 2: اختبارات المستودعات';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Test 2.1: Create Regular Warehouse
    v_test_name := 'Create Regular Warehouse';
    BEGIN
        INSERT INTO warehouses (tenant_id, company_id, branch_id, code, name, name_en, name_ar, warehouse_type)
        VALUES (v_tenant_id, v_company_id, v_branch_id, 'WH-MAIN', 'Main Warehouse', 'Main Warehouse', 'المستودع الرئيسي', 'regular')
        RETURNING id INTO v_warehouse_regular_id;
        
        v_tests_passed := v_tests_passed + 1;
        RAISE NOTICE '✅ Test 2.1 PASSED: % (ID: %)', v_test_name, v_warehouse_regular_id;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 2.1 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    -- Test 2.2: Create Offline Market
    v_test_name := 'Create Offline Market';
    BEGIN
        INSERT INTO warehouses (tenant_id, company_id, branch_id, code, name, name_en, name_ar, warehouse_type)
        VALUES (v_tenant_id, v_company_id, v_branch_id, 'MKT-01', 'Downtown Market', 'Downtown Market', 'متجر وسط المدينة', 'offline_market')
        RETURNING id INTO v_warehouse_market_id;
        
        v_tests_passed := v_tests_passed + 1;
        RAISE NOTICE '✅ Test 2.2 PASSED: % (ID: %)', v_test_name, v_warehouse_market_id;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 2.2 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    -- Test 2.3: Verify Branch-City Linkage
    v_test_name := 'Warehouse-Branch-City Linkage';
    BEGIN
        PERFORM w.id
        FROM warehouses w
        JOIN branches b ON w.branch_id = b.id
        WHERE w.id = v_warehouse_market_id
          AND b.city IS NOT NULL;
        
        IF FOUND THEN
            v_tests_passed := v_tests_passed + 1;
            RAISE NOTICE '✅ Test 2.3 PASSED: %', v_test_name;
        ELSE
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 2.3 FAILED: %', v_test_name;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 2.3 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    -- Test 2.4: Invalid Warehouse Type (should fail)
    v_test_name := 'Reject Invalid Warehouse Type';
    BEGIN
        INSERT INTO warehouses (tenant_id, company_id, branch_id, code, name, warehouse_type)
        VALUES (v_tenant_id, v_company_id, v_branch_id, 'INVALID', 'Invalid', 'invalid_type');
        
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 2.4 FAILED: % (should have been rejected)', v_test_name;
    EXCEPTION WHEN check_violation THEN
        v_tests_passed := v_tests_passed + 1;
        RAISE NOTICE '✅ Test 2.4 PASSED: % (correctly rejected)', v_test_name;
    WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 2.4 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 3: EMPLOYEE ASSIGNMENT TESTS
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '👥 Section 3: Employee Assignment Tests';
    RAISE NOTICE '   القسم 3: اختبارات تعيين الموظفين';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Get a user
    SELECT id INTO v_user_id FROM user_profiles WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Test 3.1: Assign Employee to Warehouse
        v_test_name := 'Assign Employee to Warehouse';
        BEGIN
            INSERT INTO warehouse_assignments (tenant_id, warehouse_id, user_id, role)
            VALUES (v_tenant_id, v_warehouse_market_id, v_user_id, 'manager');
            
            v_tests_passed := v_tests_passed + 1;
            RAISE NOTICE '✅ Test 3.1 PASSED: %', v_test_name;
        EXCEPTION WHEN OTHERS THEN
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 3.1 FAILED: % - %', v_test_name, SQLERRM;
        END;
        
        -- Test 3.2: Verify Assignment View
        v_test_name := 'User Warehouses View';
        BEGIN
            SELECT COUNT(*) INTO v_assignment_count
            FROM user_warehouses
            WHERE user_id = v_user_id;
            
            IF v_assignment_count > 0 THEN
                v_tests_passed := v_tests_passed + 1;
                RAISE NOTICE '✅ Test 3.2 PASSED: % (% assignments)', v_test_name, v_assignment_count;
            ELSE
                v_tests_failed := v_tests_failed + 1;
                RAISE NOTICE '❌ Test 3.2 FAILED: %', v_test_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 3.2 FAILED: % - %', v_test_name, SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️  Skipping employee tests (no users found)';
    END IF;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 4: MASTER DATA SETUP
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '📦 Section 4: Master Data Setup';
    RAISE NOTICE '   القسم 4: إعداد البيانات الأساسية';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Unit of Measure
    SELECT id INTO v_unit_id FROM uom WHERE code = 'PCS' LIMIT 1;
    IF v_unit_id IS NULL THEN
        INSERT INTO uom (code, name, name_ar)
        VALUES ('PCS', 'Pieces', 'قطعة')
        RETURNING id INTO v_unit_id;
    END IF;
    RAISE NOTICE '✅ Unit: %', v_unit_id;
    
    -- Accounts
    SELECT id INTO v_sales_account_id FROM accounts WHERE company_id = v_company_id AND account_type = 'revenue' LIMIT 1;
    SELECT id INTO v_receivable_account_id FROM accounts WHERE company_id = v_company_id AND account_type = 'asset' LIMIT 1;
    SELECT id INTO v_purchases_account_id FROM accounts WHERE company_id = v_company_id AND account_type = 'expense' LIMIT 1;
    SELECT id INTO v_payable_account_id FROM accounts WHERE company_id = v_company_id AND account_type = 'liability' LIMIT 1;
    
    IF v_sales_account_id IS NULL OR v_receivable_account_id IS NULL THEN
        RAISE NOTICE '⚠️  Creating dummy accounts for testing';
        
        IF v_sales_account_id IS NULL THEN
            INSERT INTO accounts (tenant_id, company_id, code, name, name_en, account_type, is_active)
            VALUES (v_tenant_id, v_company_id, '4100', 'Sales', 'Sales', 'revenue', true)
            RETURNING id INTO v_sales_account_id;
        END IF;
        
        IF v_receivable_account_id IS NULL THEN
            INSERT INTO accounts (tenant_id, company_id, code, name, name_en, account_type, is_active)
            VALUES (v_tenant_id, v_company_id, '1130', 'Accounts Receivable', 'Accounts Receivable', 'asset', true)
            RETURNING id INTO v_receivable_account_id;
        END IF;
        
        IF v_purchases_account_id IS NULL THEN
            INSERT INTO accounts (tenant_id, company_id, code, name, name_en, account_type, is_active)
            VALUES (v_tenant_id, v_company_id, '5200', 'Purchases', 'Purchases', 'expense', true)
            RETURNING id INTO v_purchases_account_id;
        END IF;
        
        IF v_payable_account_id IS NULL THEN
            INSERT INTO accounts (tenant_id, company_id, code, name, name_en, account_type, is_active)
            VALUES (v_tenant_id, v_company_id, '2110', 'Accounts Payable', 'Accounts Payable', 'liability', true)
            RETURNING id INTO v_payable_account_id;
        END IF;
    END IF;
    
    -- Customer (always without account reference to avoid FK issues)
    INSERT INTO customers (tenant_id, company_id, code, name_en, name_ar)
    VALUES (v_tenant_id, v_company_id, 'CUST-' || gen_random_uuid(), 'Test Customer', 'عميل تجريبي')
    RETURNING id INTO v_customer_id;
    
    -- Supplier (always without account reference to avoid FK issues)
    INSERT INTO suppliers (tenant_id, company_id, code, name_en, name_ar)
    VALUES (v_tenant_id, v_company_id, 'SUPP-' || gen_random_uuid(), 'Test Supplier', 'مورد تجريبي')
    RETURNING id INTO v_supplier_id;
    
    -- Product
    INSERT INTO products (tenant_id, company_id, sku, name, name_ar, name_en, selling_price, base_uom)
    VALUES (v_tenant_id, v_company_id, 'PROD-' || gen_random_uuid(), 'Test Product', 'منتج تجريبي', 'Test Product', 100.00, 'PCS')
    RETURNING id INTO v_product_id;
    
    RAISE NOTICE '✅ Customer: %, Supplier: %, Product: %', v_customer_id, v_supplier_id, v_product_id;
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 5: SALES INVOICE TESTS
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '💰 Section 5: Sales Invoice Tests';
    RAISE NOTICE '   القسم 5: اختبارات فواتير المبيعات';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Test 5.1: Create Sales Invoice from Offline Market
    v_test_name := 'Create Sales Invoice from Offline Market';
    BEGIN
        INSERT INTO sales_invoices (
            tenant_id, company_id, branch_id, customer_id,
            invoice_number, invoice_date, status, total_amount, subtotal
        )
        VALUES (
            v_tenant_id, v_company_id, v_branch_id, v_customer_id,
            'SI-' || gen_random_uuid(), CURRENT_DATE, 'draft', 200.00, 200.00
        )
        RETURNING id INTO v_si_id;
        
        -- Add item with warehouse
        INSERT INTO sales_invoice_items (
            tenant_id, invoice_id, product_id, description,
            quantity, unit_price, subtotal, total, unit_id, warehouse_id
        )
        VALUES (
            v_tenant_id, v_si_id, v_product_id, 'Test Sale from Market',
            2, 100.00, 200.00, 200.00, v_unit_id, v_warehouse_market_id
        );
        
        v_tests_passed := v_tests_passed + 1;
        RAISE NOTICE '✅ Test 5.1 PASSED: %', v_test_name;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 5.1 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    -- Test 5.2: Post Sales Invoice (Trigger Test)
    v_test_name := 'Post Sales Invoice & Create Inventory Movement';
    BEGIN
        UPDATE sales_invoices SET status = 'posted', is_posted = true WHERE id = v_si_id;
        
        -- Check inventory movement created
        SELECT COUNT(*) INTO v_inv_move_count
        FROM inventory_movements
        WHERE reference_id = v_si_id AND reference_type = 'sales_invoice';
        
        IF v_inv_move_count > 0 THEN
            v_tests_passed := v_tests_passed + 1;
            RAISE NOTICE '✅ Test 5.2 PASSED: % (% movements)', v_test_name, v_inv_move_count;
        ELSE
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 5.2 FAILED: % (no inventory movement)', v_test_name;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 5.2 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 6: PURCHASE INVOICE TESTS
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '🛒 Section 6: Purchase Invoice Tests';
    RAISE NOTICE '   القسم 6: اختبارات فواتير المشتريات';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Test 6.1: Create Purchase Invoice
    v_test_name := 'Create Purchase Invoice';
    BEGIN
        INSERT INTO purchase_invoices (
            tenant_id, company_id, branch_id, supplier_id,
            invoice_number, invoice_date, status, total_amount, subtotal
        )
        VALUES (
            v_tenant_id, v_company_id, v_branch_id, v_supplier_id,
            'PI-' || gen_random_uuid(), CURRENT_DATE, 'draft', 500.00, 500.00
        )
        RETURNING id INTO v_pi_id;
        
        -- Add item
        INSERT INTO purchase_invoice_items (
            tenant_id, invoice_id, product_id, description,
            quantity, unit_price, subtotal, total, unit_id, warehouse_id
        )
        VALUES (
            v_tenant_id, v_pi_id, v_product_id, 'Test Purchase',
            10, 50.00, 500.00, 500.00, v_unit_id, v_warehouse_regular_id
        );
        
        v_tests_passed := v_tests_passed + 1;
        RAISE NOTICE '✅ Test 6.1 PASSED: %', v_test_name;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 6.1 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    -- Test 6.2: Post Purchase Invoice (Trigger Test)
    v_test_name := 'Post Purchase Invoice & Create Journal Entry';
    BEGIN
        UPDATE purchase_invoices SET status = 'posted', is_posted = true WHERE id = v_pi_id;
        
        -- Check journal entry created
        SELECT COUNT(*) INTO v_je_count
        FROM journal_entries
        WHERE reference_id = v_pi_id AND reference_type = 'purchase_invoice';
        
        IF v_je_count > 0 THEN
            v_tests_passed := v_tests_passed + 1;
            RAISE NOTICE '✅ Test 6.2 PASSED: % (% entries)', v_test_name, v_je_count;
        ELSE
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 6.2 FAILED: % (no journal entry)', v_test_name;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 6.2 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SECTION 7: ACCOUNTING INTEGRITY TESTS
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '📊 Section 7: Accounting Integrity Tests';
    RAISE NOTICE '   القسم 7: اختبارات سلامة المحاسبة';
    RAISE NOTICE '───────────────────────────────────────────────────────────────';
    
    -- Test 7.1: Verify Journal Entry Balance
    v_test_name := 'Journal Entry Balance Check';
    BEGIN
        PERFORM je.id
        FROM journal_entries je
        WHERE je.company_id = v_company_id
          AND je.status = 'POSTED'
          AND ABS((
              SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
              FROM journal_entry_lines
              WHERE entry_id = je.id
          )) > 0.01;
        
        IF NOT FOUND THEN
            v_tests_passed := v_tests_passed + 1;
            RAISE NOTICE '✅ Test 7.1 PASSED: % (all entries balanced)', v_test_name;
        ELSE
            v_tests_failed := v_tests_failed + 1;
            RAISE NOTICE '❌ Test 7.1 FAILED: % (unbalanced entries found)', v_test_name;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tests_failed := v_tests_failed + 1;
        RAISE NOTICE '❌ Test 7.1 FAILED: % - %', v_test_name, SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- FINAL SUMMARY
    -- ═══════════════════════════════════════════════════════════════════════
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📈 VERIFICATION SUMMARY / ملخص التحقق';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Tests Passed: % / اختبارات ناجحة', v_tests_passed;
    RAISE NOTICE '❌ Tests Failed: % / اختبارات فاشلة', v_tests_failed;
    RAISE NOTICE '📊 Total Tests: % / إجمالي الاختبارات', v_tests_passed + v_tests_failed;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    IF v_tests_failed = 0 THEN
        RAISE NOTICE '🎉 ALL TESTS PASSED! / جميع الاختبارات نجحت!';
    ELSE
        RAISE NOTICE '⚠️  SOME TESTS FAILED / بعض الاختبارات فشلت';
    END IF;
    
    RAISE NOTICE '';
    
    -- Rollback to clean up test data
    RAISE EXCEPTION 'Test Complete - Rolling back changes / الاختبار مكتمل - التراجع عن التغييرات';
    
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Test Complete - Rolling back changes / الاختبار مكتمل - التراجع عن التغييرات' THEN
        RAISE NOTICE '%', SQLERRM;
    ELSE
        RAISE EXCEPTION 'Verification Failed: %', SQLERRM;
    END IF;
END $$;

ROLLBACK;
