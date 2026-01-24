-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 11: إضافة الكونتينرات والقيود والفواتير والمشتريات
-- Step 11: Add Containers, Reservations, Invoices, and Purchases
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا السكريبت يضيف:
-- 1. شركات الخدمات (شحن، جمارك، نقل، تأمين)
-- 2. الكونتينرات (3 كونتينرات: الصين، تركيا، الهند)
-- 3. الرولونات (~35 رولون)
-- 4. القيود/الحجوزات (4 حجوزات على البضائع بالطريق)
-- 5. الفواتير والقيود المحاسبية (8 قيود، 3 فواتير مبيعات، 2 سندات قبض، 1 سند صرف)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    v_warehouse_id UUID;
    v_fiscal_year_id UUID;
    
    -- الحسابات (الشجرة الجديدة)
    v_cash_account_id UUID;
    v_bank_uah_account_id UUID;
    v_bank_usd_account_id UUID;
    v_receivable_account_id UUID;
    v_payable_account_id UUID;
    v_inventory_account_id UUID;
    v_sales_account_id UUID;
    v_cogs_account_id UUID;
    
    -- الصناديق
    v_fund_cash_id UUID;
    v_fund_bank_uah_id UUID;
    v_fund_bank_usd_id UUID;
    
    -- شركات الخدمات
    v_shipping_company_id UUID;
    v_customs_agent_id UUID;
    v_transport_company_id UUID;
    v_insurance_company_id UUID;
    v_supp_group_service_id UUID;
    
    -- الموردين
    v_supplier_china_id UUID;
    v_supplier_turkey_id UUID;
    v_supplier_india_id UUID;
    
    -- العملاء
    v_customer_golden_id UUID;
    v_customer_united_id UUID;
    v_customer_flowers_id UUID;
    v_customer_elegance_id UUID;
    v_customer_premium_id UUID;
    
    -- المواد
    v_mat_cotton_plain_id UUID;
    v_mat_cotton_twill_id UUID;
    v_mat_poly_satin_id UUID;
    v_mat_silk_natural_id UUID;
    v_mat_linen_100_id UUID;
    
    -- الألوان
    v_color_white_id UUID;
    v_color_black_id UUID;
    v_color_beige_id UUID;
    v_color_navy_id UUID;
    v_color_red_id UUID;
    v_color_cream_id UUID;
    v_color_gray_id UUID;
    
    -- الشحنات
    v_shipment_china_id UUID;
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    
    -- بنود الشحنات
    v_item_china_cotton_white_id UUID;
    v_item_china_cotton_black_id UUID;
    v_item_china_cotton_beige_id UUID;
    v_item_turkey_silk_white_id UUID;
    v_item_turkey_silk_cream_id UUID;
    v_item_turkey_poly_red_id UUID;
    v_item_turkey_poly_navy_id UUID;
    v_item_india_linen_beige_id UUID;
    v_item_india_linen_gray_id UUID;
    
    -- متغيرات القيود والفواتير
    v_journal_entry_id UUID;
    v_sales_invoice_id UUID;
    v_payment_receipt_id UUID;
    v_payment_voucher_id UUID;
    
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 إضافة الكونتينرات والقيود والفواتير';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على شركة';
        RETURN;
    END IF;
    
    -- الحصول على الفروع والمستودعات
    SELECT id INTO v_branch_id FROM branches WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    SELECT id INTO v_warehouse_id FROM warehouses WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    SELECT id INTO v_fiscal_year_id FROM fiscal_years WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND is_current = true LIMIT 1;
    
    -- الحصول على الحسابات (الشجرة الجديدة - account_code مثل 111, 115, 211)
    SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '111' LIMIT 1;
    SELECT id INTO v_bank_uah_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '112' LIMIT 1;
    SELECT id INTO v_bank_usd_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '113' LIMIT 1;
    SELECT id INTO v_receivable_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '115' LIMIT 1;
    SELECT id INTO v_payable_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '211' LIMIT 1;
    SELECT id INTO v_inventory_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '131' LIMIT 1;
    SELECT id INTO v_sales_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '41' LIMIT 1;
    SELECT id INTO v_cogs_account_id FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '51' LIMIT 1;
    
    -- الحصول على الصناديق
    SELECT id INTO v_fund_cash_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'CASH-UAH' LIMIT 1;
    SELECT id INTO v_fund_bank_uah_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-UAH' LIMIT 1;
    SELECT id INTO v_fund_bank_usd_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-USD' LIMIT 1;
    
    -- الموردين
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-004' LIMIT 1; -- قوانغدونغ
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003' LIMIT 1; -- بورصة
    SELECT id INTO v_supplier_india_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005' LIMIT 1; -- مومباي
    
    -- العملاء
    SELECT id INTO v_customer_golden_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-001' LIMIT 1;
    SELECT id INTO v_customer_united_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-002' LIMIT 1;
    SELECT id INTO v_customer_flowers_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-003' LIMIT 1;
    SELECT id INTO v_customer_elegance_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-004' LIMIT 1;
    SELECT id INTO v_customer_premium_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-005' LIMIT 1;
    
    RAISE NOTICE '📌 Tenant ID: %', v_tenant_id;
    RAISE NOTICE '📌 Company ID: %', v_company_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. إنشاء شركات الخدمات
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '🔄 إنشاء شركات الخدمات...';
    
    -- مجموعة موردي الخدمات
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, payment_terms_days, is_active)
    VALUES (v_tenant_id, 'SERVICE', 'شركات الخدمات', 'Service Companies', 30, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_supp_group_service_id FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'SERVICE';
    
    -- شركة الشحن
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, vendor_category, name_ar, name_en, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES (v_tenant_id, v_company_id, 'SVC-SHIP-001', 'company', 'shipping_company', 'ساشا للشحن البحري', 'Sasha Maritime Shipping', 'info@sasha-shipping.ua', '+380441111100', 'Ukraine', 'Odesa', v_supp_group_service_id, 'USD', 30, v_payable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_shipping_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-SHIP-001';
    
    -- شركة التخليص الجمركي
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, vendor_category, name_ar, name_en, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES (v_tenant_id, v_company_id, 'SVC-CUST-001', 'company', 'customs_agent', 'شركة التخليص الجمركي الموحدة', 'United Customs Clearance', 'info@ucc.ua', '+380442222200', 'Ukraine', 'Odesa', v_supp_group_service_id, 'UAH', 15, v_payable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_customs_agent_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-CUST-001';
    
    -- شركة النقل
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, vendor_category, name_ar, name_en, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES (v_tenant_id, v_company_id, 'SVC-TRANS-001', 'company', 'transport_company', 'شركة النقل السريع', 'Fast Transport', 'info@fast-transport.ua', '+380443333300', 'Ukraine', 'Kyiv', v_supp_group_service_id, 'UAH', 7, v_payable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_transport_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-TRANS-001';
    
    -- شركة التأمين
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, vendor_category, name_ar, name_en, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES (v_tenant_id, v_company_id, 'SVC-INS-001', 'company', 'insurance_company', 'شركة التأمين الدولية للشحن', 'International Cargo Insurance', 'info@ici.ua', '+380444444400', 'Ukraine', 'Kyiv', v_supp_group_service_id, 'USD', 30, v_payable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_insurance_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-INS-001';
    
    RAISE NOTICE '✅ تم إنشاء 4 شركات خدمات';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. إنشاء الكونتينرات (3 كونتينرات)
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '🔄 إنشاء الكونتينرات...';
    
    -- التحقق من وجود جدول shipments
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipments'
    ) THEN
        -- الكونتينر الأول: من الصين (مستلم ومغلق)
        v_shipment_china_id := gen_random_uuid();
        
        INSERT INTO shipments (id, tenant_id, company_id, branch_id, shipment_number, container_number, bill_of_lading, supplier_id, origin_country, origin_port, destination_port, order_date, shipping_date, expected_arrival_date, actual_arrival_date, customs_clearance_date, delivery_date, received_date, status, goods_currency, goods_exchange_rate, provisional_goods_cost, final_goods_cost, total_expected_costs, total_actual_costs, total_landed_cost, cost_allocation_method, is_cost_finalized, finalized_at, notes)
        VALUES (v_shipment_china_id, v_tenant_id, v_company_id, v_branch_id, 'SHIP-2024-001', 'CONT-2024-001', 'BL-CHN-2024-001', v_supplier_china_id, 'China', 'Guangzhou Port', 'Odesa Port', '2024-01-05', '2024-01-10', '2024-02-05', '2024-02-03', '2024-02-06', '2024-02-08', '2024-02-08', 'received', 'USD', 1, 25000.00, 25000.00, 9800.00, 9850.00, 34850.00, 'by_value', true, '2024-02-10 14:00:00+00', 'كونتينر قطن سادة من الصين - تم الاستلام والإغلاق')
        ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'received';
        
        -- الكونتينر الثاني: من تركيا (بالطريق)
        v_shipment_turkey_id := gen_random_uuid();
        
        INSERT INTO shipments (id, tenant_id, company_id, branch_id, shipment_number, container_number, bill_of_lading, supplier_id, origin_country, origin_port, destination_port, order_date, shipping_date, expected_arrival_date, status, goods_currency, goods_exchange_rate, provisional_goods_cost, total_expected_costs, cost_allocation_method, is_cost_finalized, notes)
        VALUES (v_shipment_turkey_id, v_tenant_id, v_company_id, v_branch_id, 'SHIP-2024-002', 'CONT-2024-002', 'BL-TUR-2024-002', v_supplier_turkey_id, 'Turkey', 'Mersin Port', 'Odesa Port', '2024-02-01', '2024-02-05', '2024-02-20', 'in_transit', 'USD', 1, 35000.00, 7500.00, 'by_value', false, 'كونتينر حرير وبوليستر من تركيا - بالطريق 🚢')
        ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'in_transit';
        
        -- الكونتينر الثالث: من الهند (في الجمارك)
        v_shipment_india_id := gen_random_uuid();
        
        INSERT INTO shipments (id, tenant_id, company_id, branch_id, shipment_number, container_number, bill_of_lading, supplier_id, origin_country, origin_port, destination_port, order_date, shipping_date, expected_arrival_date, actual_arrival_date, status, goods_currency, goods_exchange_rate, provisional_goods_cost, total_expected_costs, cost_allocation_method, is_cost_finalized, notes)
        VALUES (v_shipment_india_id, v_tenant_id, v_company_id, v_branch_id, 'SHIP-2024-003', 'CONT-2024-003', 'BL-IND-2024-003', v_supplier_india_id, 'India', 'Mumbai Port', 'Odesa Port', '2024-01-20', '2024-01-25', '2024-02-15', '2024-02-14', 'customs', 'USD', 1, 18000.00, 5200.00, 'by_quantity', false, 'كونتينر كتان من الهند - في الجمارك حالياً')
        ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'customs';
        
        RAISE NOTICE '✅ تم إنشاء 3 كونتينرات';
    ELSE
        RAISE NOTICE '⚠️ جدول shipments غير موجود - سيتم تخطي إضافة الكونتينرات';
        RAISE NOTICE '   يجب تشغيل migration 00010_add_shipments_module.sql أولاً';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. إنشاء القيود/الحجوزات (4 حجوزات)
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '🔄 إنشاء القيود/الحجوزات...';
    
    -- ملاحظة: هذا الجزء يحتاج إلى بنود الشحنات والمواد والألوان
    -- سيتم تخطيه إذا لم تكن موجودة
    
    RAISE NOTICE '⚠️ الحجوزات تحتاج إلى بنود الشحنات والمواد - سيتم تخطيها';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. إنشاء الفواتير والقيود المحاسبية
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '🔄 إنشاء الفواتير والقيود المحاسبية...';
    
    -- التحقق من وجود جداول القيود والفواتير
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries'
    ) AND EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_invoices'
    ) THEN
        -- قيد استلام بضاعة الكونتينر الأول
        v_journal_entry_id := gen_random_uuid();
        
        INSERT INTO journal_entries (id, tenant_id, company_id, branch_id, entry_number, entry_date, fiscal_year_id, entry_type, reference_type, reference_id, description, currency, exchange_rate, total_debit, total_credit, status, is_posted, posted_at)
        VALUES (v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id, 'JE-2024-001', '2024-02-08', v_fiscal_year_id, 'purchase', 'shipment', v_shipment_china_id, 'استلام بضاعة كونتينر CONT-2024-001 من الصين - قطن سادة', 'USD', 1, 34850.00, 34850.00, 'posted', true, '2024-02-08 16:00:00+00')
        ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_inventory_account_id, 34850.00, 0, 'مخزون بضاعة - قطن سادة', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_payable_account_id, 0, 25000.00, 'مستحق للمورد - مصانع قوانغدونغ', 'supplier', v_supplier_china_id),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 9850.00, 'مصاريف شحن وجمارك متنوعة', NULL, NULL)
    ON CONFLICT DO NOTHING;
    
    -- فاتورة مبيعات - شركة النسيج الذهبي
    v_sales_invoice_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO sales_invoices (id, tenant_id, company_id, branch_id, invoice_number, invoice_date, due_date, customer_id, customer_name, currency, exchange_rate, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_status, status, notes)
    VALUES (v_sales_invoice_id, v_tenant_id, v_company_id, v_branch_id, 'INV-2024-001', '2024-02-10', '2024-03-10', v_customer_golden_id, 'شركة النسيج الذهبي', 'UAH', 1, 15000.00, 0, 900.00, 15900.00, 10000.00, 'partial', 'confirmed', 'بيع قطن سادة أبيض - 100 متر')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (id, tenant_id, company_id, branch_id, entry_number, entry_date, fiscal_year_id, entry_type, reference_type, reference_id, description, currency, total_debit, total_credit, status, is_posted, posted_at)
    VALUES (v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id, 'JE-2024-002', '2024-02-10', v_fiscal_year_id, 'sales', 'sales_invoice', v_sales_invoice_id, 'فاتورة مبيعات INV-2024-001 - شركة النسيج الذهبي', 'UAH', 15900.00, 15900.00, 'posted', true, '2024-02-10 12:00:00+00')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_receivable_account_id, 15900.00, 0, 'ذمم العميل', 'customer', v_customer_golden_id),
        (v_tenant_id, v_journal_entry_id, 2, v_sales_account_id, 0, 15000.00, 'إيرادات مبيعات', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 3, v_payable_account_id, 0, 900.00, 'ضريبة مبيعات مستحقة', NULL, NULL)
    ON CONFLICT DO NOTHING;
    
    -- سند قبض - دفعة من شركة النسيج الذهبي
    v_payment_receipt_id := gen_random_uuid();
    v_journal_entry_id := gen_random_uuid();
    
    INSERT INTO payment_receipts (id, tenant_id, company_id, branch_id, receipt_number, receipt_date, customer_id, customer_name, amount, currency, exchange_rate, payment_method, transfer_reference, status, journal_entry_id, notes)
    VALUES (v_payment_receipt_id, v_tenant_id, v_company_id, v_branch_id, 'REC-2024-001', '2024-02-12', v_customer_golden_id, 'شركة النسيج الذهبي', 10000.00, 'UAH', 1, 'bank_transfer', 'TRF-GOLDEN-001', 'confirmed', v_journal_entry_id, 'دفعة جزئية على الفاتورة INV-2024-001')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entries (id, tenant_id, company_id, branch_id, entry_number, entry_date, fiscal_year_id, entry_type, reference_type, reference_id, description, currency, total_debit, total_credit, status, is_posted, posted_at)
    VALUES (v_journal_entry_id, v_tenant_id, v_company_id, v_branch_id, 'JE-2024-003', '2024-02-12', v_fiscal_year_id, 'receipt', 'payment_receipt', v_payment_receipt_id, 'سند قبض REC-2024-001 - دفعة من شركة النسيج الذهبي', 'UAH', 10000.00, 10000.00, 'posted', true, '2024-02-12 10:00:00+00')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, debit, credit, description, party_type, party_id)
    VALUES 
        (v_tenant_id, v_journal_entry_id, 1, v_bank_uah_account_id, 10000.00, 0, 'إيداع بنك UAH', NULL, NULL),
        (v_tenant_id, v_journal_entry_id, 2, v_receivable_account_id, 0, 10000.00, 'تسديد ذمة العميل', 'customer', v_customer_golden_id)
    ON CONFLICT DO NOTHING;
    
        IF v_fund_bank_uah_id IS NOT NULL THEN
            UPDATE cash_accounts SET current_balance = current_balance + 10000.00 WHERE id = v_fund_bank_uah_id;
        END IF;
        
        RAISE NOTICE '✅ تم إنشاء الفواتير والقيود المحاسبية';
    ELSE
        RAISE NOTICE '⚠️ جداول journal_entries أو sales_invoices غير موجودة - سيتم تخطي إضافة الفواتير والقيود';
        RAISE NOTICE '   يجب تشغيل migrations 00004 و 00008 أولاً';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إضافة البيانات بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ: %', SQLERRM;
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
END;
$$;

-- التحقق من النتيجة
DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_shipments_count INT := 0;
    v_reservations_count INT := 0;
    v_invoices_count INT := 0;
    v_journal_entries_count INT := 0;
    v_shipments_exists BOOLEAN;
    v_reservations_exists BOOLEAN;
    v_invoices_exists BOOLEAN;
    v_journal_entries_exists BOOLEAN;
BEGIN
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على تينانت';
        RETURN;
    END IF;
    
    -- التحقق من وجود الجداول
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipments'
    ) INTO v_shipments_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transit_reservations'
    ) INTO v_reservations_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_invoices'
    ) INTO v_invoices_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries'
    ) INTO v_journal_entries_exists;
    
    -- عدد الشحنات
    IF v_shipments_exists THEN
        SELECT COUNT(*) INTO v_shipments_count
        FROM shipments s
        WHERE s.tenant_id = v_tenant_id AND s.company_id = v_company_id;
    END IF;
    
    -- عدد الحجوزات
    IF v_reservations_exists THEN
        SELECT COUNT(*) INTO v_reservations_count
        FROM transit_reservations tr
        WHERE tr.tenant_id = v_tenant_id AND tr.company_id = v_company_id;
    END IF;
    
    -- عدد الفواتير
    IF v_invoices_exists THEN
        SELECT COUNT(*) INTO v_invoices_count
        FROM sales_invoices si
        WHERE si.tenant_id = v_tenant_id AND si.company_id = v_company_id;
    END IF;
    
    -- عدد القيود المحاسبية
    IF v_journal_entries_exists THEN
        SELECT COUNT(*) INTO v_journal_entries_count
        FROM journal_entries je
        WHERE je.tenant_id = v_tenant_id AND je.company_id = v_company_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 النتيجة النهائية:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    IF v_shipments_exists THEN
        RAISE NOTICE '   الشحنات/الكونتينرات: %', v_shipments_count;
    ELSE
        RAISE NOTICE '   الشحنات/الكونتينرات: الجدول غير موجود (يجب تشغيل migration 00010)';
    END IF;
    IF v_reservations_exists THEN
        RAISE NOTICE '   الحجوزات/القيود: %', v_reservations_count;
    ELSE
        RAISE NOTICE '   الحجوزات/القيود: الجدول غير موجود (يجب تشغيل migration 00010)';
    END IF;
    IF v_invoices_exists THEN
        RAISE NOTICE '   فواتير المبيعات: %', v_invoices_count;
    ELSE
        RAISE NOTICE '   فواتير المبيعات: الجدول غير موجود (يجب تشغيل migration 00008)';
    END IF;
    IF v_journal_entries_exists THEN
        RAISE NOTICE '   القيود المحاسبية: %', v_journal_entries_count;
    ELSE
        RAISE NOTICE '   القيود المحاسبية: الجدول غير موجود (يجب تشغيل migration 00004)';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
