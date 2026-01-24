-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: الفواتير والقيود المحاسبية
-- Seed: Invoices and Journal Entries
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    v_fiscal_year_id UUID;
    
    -- الحسابات
    v_cash_account_id UUID;
    v_bank_uah_account_id UUID;
    v_bank_usd_account_id UUID;
    v_receivable_account_id UUID;
    v_payable_account_id UUID;
    v_inventory_account_id UUID;
    v_sales_account_id UUID;
    v_cogs_account_id UUID;
    v_advance_received_account_id UUID;
    
    -- الصناديق
    v_fund_cash_id UUID;
    v_fund_bank_uah_id UUID;
    v_fund_bank_usd_id UUID;
    
    -- العملاء
    v_customer_golden_id UUID;
    v_customer_united_id UUID;
    v_customer_flowers_id UUID;
    
    -- الموردين
    v_supplier_china_id UUID;
    v_supplier_turkey_id UUID;
    
    -- الشحنات
    v_shipment_china_id UUID;
    
    -- متغيرات القيود والفواتير
    v_journal_entry_id UUID;
    v_sales_invoice_id UUID;
    v_purchase_invoice_id UUID;
    v_payment_receipt_id UUID;
    v_payment_voucher_id UUID;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على المعرفات الأساسية
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_branch_id FROM branches WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    SELECT id INTO v_fiscal_year_id FROM fiscal_years WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND is_current = true LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant أو company. قم بتشغيل البيانات الأساسية أولاً';
    END IF;
    
    -- الحسابات
    SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1101' LIMIT 1;
    SELECT id INTO v_bank_uah_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1102' LIMIT 1;
    SELECT id INTO v_bank_usd_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1103' LIMIT 1;
    SELECT id INTO v_receivable_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1201' LIMIT 1;
    SELECT id INTO v_payable_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '2101' LIMIT 1;
    SELECT id INTO v_inventory_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1301' LIMIT 1;
    SELECT id INTO v_sales_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '4101' LIMIT 1;
    SELECT id INTO v_cogs_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '5101' LIMIT 1;
    
    -- الصناديق
    SELECT id INTO v_fund_cash_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'CASH-UAH' LIMIT 1;
    SELECT id INTO v_fund_bank_uah_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-UAH' LIMIT 1;
    SELECT id INTO v_fund_bank_usd_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-USD' LIMIT 1;
    
    -- العملاء
    SELECT id INTO v_customer_golden_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-001';
    SELECT id INTO v_customer_united_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-002';
    SELECT id INTO v_customer_flowers_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-004';
    
    -- الموردين
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005';
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003';
    
    -- الشحنات
    SELECT id INTO v_shipment_china_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-001';
    
    RAISE NOTICE 'Using tenant_id: %, company_id: %', v_tenant_id, v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. قيد استلام بضاعة الكونتينر الأول (الصين)
    -- ═══════════════════════════════════════════════════════════════
    
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, exchange_rate,
        total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-001', '2024-02-08', v_fiscal_year_id,
        'purchase', 'shipment', v_shipment_china_id,
        'استلام بضاعة كونتينر CONT-2024-001 من الصين - قطن سادة',
        'USD', 1,
        34850.00, 34850.00, 'posted', true, '2024-02-08 16:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    -- سطور القيد
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_inventory_account_id, 34850.00, 0, 'مخزون بضاعة - قطن سادة', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_payable_account_id, 0, 25000.00, 'مستحق للمورد - مصانع قوانغدونغ', 'supplier', v_supplier_china_id),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 9850.00, 'مصاريف شحن وجمارك متنوعة', NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. فاتورة مبيعات - شركة النسيج الذهبي
    -- ═══════════════════════════════════════════════════════════════
    
    v_sales_invoice_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO sales_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        customer_id, customer_name,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_status, status,
        notes
    )
    VALUES (
        v_sales_invoice_id, v_tenant_id, v_company_id, v_branch_id,
        'INV-2024-001', '2024-02-10', '2024-03-10',
        v_customer_golden_id, 'شركة النسيج الذهبي',
        'UAH', 1,
        15000.00, 0, 900.00, 15900.00,
        10000.00, 'partial', 'confirmed',
        'بيع قطن سادة أبيض - 100 متر'
    )
    ON CONFLICT DO NOTHING;
    
    -- قيد فاتورة المبيعات
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-002', '2024-02-10', v_fiscal_year_id,
        'sales', 'sales_invoice', v_sales_invoice_id,
        'فاتورة مبيعات INV-2024-001 - شركة النسيج الذهبي',
        'UAH', 15900.00, 15900.00, 'posted', true, '2024-02-10 12:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_receivable_account_id, 15900.00, 0, 'ذمم العميل', 'customer', v_customer_golden_id),
        (v_tenant_id, v_journal_entry_id, 2, v_sales_account_id, 0, 15000.00, 'إيرادات مبيعات', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 900.00, 'ضريبة مبيعات مستحقة', NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. سند قبض - دفعة من شركة النسيج الذهبي
    -- ═══════════════════════════════════════════════════════════════
    
    v_payment_receipt_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO payment_receipts (
        id, tenant_id, company_id, branch_id,
        receipt_number, receipt_date,
        customer_id, customer_name,
        amount, currency, exchange_rate,
        payment_method, transfer_reference,
        status, journal_entry_id, notes
    )
    VALUES (
        v_payment_receipt_id, v_tenant_id, v_company_id, v_branch_id,
        'REC-2024-001', '2024-02-12',
        v_customer_golden_id, 'شركة النسيج الذهبي',
        10000.00, 'UAH', 1,
        'bank_transfer', 'TRF-GOLDEN-001',
        'confirmed', v_journal_entry_id, 'دفعة جزئية على الفاتورة INV-2024-001'
    )
    ON CONFLICT DO NOTHING;
    
    -- قيد سند القبض
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-003', '2024-02-12', v_fiscal_year_id,
        'receipt', 'payment_receipt', v_payment_receipt_id,
        'سند قبض REC-2024-001 - دفعة من شركة النسيج الذهبي',
        'UAH', 10000.00, 10000.00, 'posted', true, '2024-02-12 10:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_bank_uah_account_id, 10000.00, 0, 'إيداع بنك UAH', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_receivable_account_id, 0, 10000.00, 'تسديد ذمة العميل', 'customer', v_customer_golden_id)
    ON CONFLICT DO NOTHING;
    
    -- تحديث رصيد البنك
    UPDATE cash_accounts SET current_balance = current_balance + 10000.00 WHERE id = v_fund_bank_uah_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. فاتورة مبيعات - مصنع الأقمشة المتحدة
    -- ═══════════════════════════════════════════════════════════════
    
    v_sales_invoice_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO sales_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        customer_id, customer_name,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_status, status,
        notes
    )
    VALUES (
        v_sales_invoice_id, v_tenant_id, v_company_id, v_branch_id,
        'INV-2024-002', '2024-02-11', '2024-03-26',
        v_customer_united_id, 'مصنع الأقمشة المتحدة',
        'UAH', 1,
        22000.00, 2200.00, 1188.00, 20988.00,
        20988.00, 'paid', 'confirmed',
        'بيع قطن سادة أسود - 150 متر (خصم 10%)'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-004', '2024-02-11', v_fiscal_year_id,
        'sales', 'sales_invoice', v_sales_invoice_id,
        'فاتورة مبيعات INV-2024-002 - مصنع الأقمشة المتحدة',
        'UAH', 20988.00, 20988.00, 'posted', true, '2024-02-11 14:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_receivable_account_id, 20988.00, 0, 'ذمم العميل', 'customer', v_customer_united_id),
        (v_tenant_id, v_journal_entry_id, 2, v_sales_account_id, 0, 19800.00, 'إيرادات مبيعات (بعد الخصم)', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 1188.00, 'ضريبة مبيعات مستحقة', NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- سند قبض كامل
    v_payment_receipt_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO payment_receipts (
        id, tenant_id, company_id, branch_id,
        receipt_number, receipt_date,
        customer_id, customer_name,
        amount, currency, exchange_rate,
        payment_method, transfer_reference,
        status, journal_entry_id, notes
    )
    VALUES (
        v_payment_receipt_id, v_tenant_id, v_company_id, v_branch_id,
        'REC-2024-002', '2024-02-13',
        v_customer_united_id, 'مصنع الأقمشة المتحدة',
        20988.00, 'UAH', 1,
        'bank_transfer', 'TRF-UNITED-001',
        'confirmed', v_journal_entry_id, 'سداد كامل الفاتورة INV-2024-002'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-005', '2024-02-13', v_fiscal_year_id,
        'receipt', 'payment_receipt', v_payment_receipt_id,
        'سند قبض REC-2024-002 - سداد كامل مصنع الأقمشة المتحدة',
        'UAH', 20988.00, 20988.00, 'posted', true, '2024-02-13 11:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_bank_uah_account_id, 20988.00, 0, 'إيداع بنك UAH', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_receivable_account_id, 0, 20988.00, 'تسديد ذمة العميل', 'customer', v_customer_united_id)
    ON CONFLICT DO NOTHING;
    
    UPDATE cash_accounts SET current_balance = current_balance + 20988.00 WHERE id = v_fund_bank_uah_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. فاتورة مبيعات نقدية - محل أقمشة الزهور
    -- ═══════════════════════════════════════════════════════════════
    
    v_sales_invoice_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO sales_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        customer_id, customer_name,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_status, status,
        notes
    )
    VALUES (
        v_sales_invoice_id, v_tenant_id, v_company_id, v_branch_id,
        'INV-2024-003', '2024-02-14', '2024-02-14',
        v_customer_flowers_id, 'محل أقمشة الزهور',
        'UAH', 1,
        3500.00, 0, 210.00, 3710.00,
        3710.00, 'paid', 'confirmed',
        'بيع نقدي - قطن بيج 25 متر'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-006', '2024-02-14', v_fiscal_year_id,
        'sales', 'sales_invoice', v_sales_invoice_id,
        'فاتورة مبيعات نقدية INV-2024-003 - محل أقمشة الزهور',
        'UAH', 3710.00, 3710.00, 'posted', true, '2024-02-14 15:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_cash_account_id, 3710.00, 0, 'نقدي - صندوق', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_sales_account_id, 0, 3500.00, 'إيرادات مبيعات', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 210.00, 'ضريبة مبيعات', NULL, NULL)
    ON CONFLICT DO NOTHING;
    
    UPDATE cash_accounts SET current_balance = current_balance + 3710.00 WHERE id = v_fund_cash_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 6. سند صرف - دفعة للمورد الصيني
    -- ═══════════════════════════════════════════════════════════════
    
    v_payment_voucher_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO payment_vouchers (
        id, tenant_id, company_id, branch_id,
        voucher_number, voucher_date,
        supplier_id, supplier_name,
        amount, currency, exchange_rate,
        payment_method, transfer_reference,
        status, journal_entry_id,
        shipment_id, notes
    )
    VALUES (
        v_payment_voucher_id, v_tenant_id, v_company_id, v_branch_id,
        'PV-2024-001', '2024-02-15',
        v_supplier_china_id, 'مصانع قوانغدونغ للنسيج',
        15000.00, 'USD', 1,
        'bank_transfer', 'SWIFT-CHN-001',
        'confirmed', v_journal_entry_id,
        v_shipment_china_id, 'دفعة جزئية على الكونتينر CONT-2024-001'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type, reference_id,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-007', '2024-02-15', v_fiscal_year_id,
        'payment', 'payment_voucher', v_payment_voucher_id,
        'سند صرف PV-2024-001 - دفعة لمصانع قوانغدونغ',
        'USD', 15000.00, 15000.00, 'posted', true, '2024-02-15 09:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_payable_account_id, 15000.00, 0, 'تسديد ذمة المورد', 'supplier', v_supplier_china_id),
        (v_tenant_id, v_journal_entry_id, 2, v_bank_usd_account_id, 0, 15000.00, 'حوالة بنكية USD', NULL, NULL)
    ON CONFLICT DO NOTHING;
    
    UPDATE cash_accounts SET current_balance = current_balance - 15000.00 WHERE id = v_fund_bank_usd_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 7. قيد استلام دفعات مقدمة من الحجوزات
    -- ═══════════════════════════════════════════════════════════════
    
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO journal_entries (
        id, tenant_id, company_id, branch_id,
        entry_number, entry_date, fiscal_year_id,
        entry_type, reference_type,
        description, currency, total_debit, total_credit, status, is_posted, posted_at
    )
    VALUES (
        v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id,
        'JE-2024-008', '2024-02-14', v_fiscal_year_id,
        'advance', 'transit_reservation',
        'استلام دفعات مقدمة على حجوزات البضائع بالطريق',
        'USD', 4500.00, 4500.00, 'posted', true, '2024-02-14 16:00:00+00'
    )
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_bank_usd_account_id, 4500.00, 0, 'دفعات مقدمة - بنك USD', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_payable_account_id, 0, 2000.00, 'دفعة مقدمة - شركة النسيج الذهبي (حرير)', 'customer', v_customer_golden_id),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 1000.00, 'دفعة مقدمة - بوتيك الأناقة (حرير)', 'customer', v_customer_elegance_id),
        (v_tenant_id, v_journal_entry_id, 4, v_payable_account_id, 0, 1500.00, 'دفعة مقدمة - شركة النسيج الذهبي (كتان)', 'customer', v_customer_golden_id)
    ON CONFLICT DO NOTHING;
    
    UPDATE cash_accounts SET current_balance = current_balance + 4500.00 WHERE id = v_fund_bank_usd_id;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Invoices and journal entries created successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Journal Entries: 8';
    RAISE NOTICE '   - Sales Invoices: 3 (15,900 + 20,988 + 3,710 UAH)';
    RAISE NOTICE '   - Payment Receipts: 2 (10,000 + 20,988 UAH)';
    RAISE NOTICE '   - Payment Vouchers: 1 (15,000 USD)';
    RAISE NOTICE '   - Advance Payments: 4,500 USD';
    
END $$;
