-- ═══════════════════════════════════════════════════════════════════════════════════════
-- DEMO DATA - بيانات تجريبية شاملة للنظام
-- Complete Demo Data for ERP System
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 
-- العملات: الغريفنا الأوكراني (UAH)، الدولار (USD)، اليورو (EUR)
-- Currencies: Ukrainian Hryvnia (UAH), US Dollar (USD), Euro (EUR)
--
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- استخدام tenant_id و company_id افتراضيين
-- سيتم استبدالهم بالقيم الفعلية عند التنفيذ
DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    v_user_id UUID;
    v_warehouse_id UUID;
    -- Account IDs
    v_cash_account_id UUID;
    v_bank_uah_account_id UUID;
    v_bank_usd_account_id UUID;
    v_bank_eur_account_id UUID;
    v_receivable_account_id UUID;
    v_payable_account_id UUID;
    v_sales_account_id UUID;
    v_purchase_account_id UUID;
    v_inventory_account_id UUID;
    -- Fund IDs
    v_fund_cash_id UUID;
    v_fund_bank_uah_id UUID;
    v_fund_bank_usd_id UUID;
    v_fund_bank_eur_id UUID;
    -- Category IDs
    v_category_fabric_id UUID;
    v_category_accessories_id UUID;
    v_category_general_id UUID;
    -- Unit IDs
    v_unit_meter_id UUID;
    v_unit_roll_id UUID;
    v_unit_piece_id UUID;
    v_unit_kg_id UUID;
    -- Fabric Group IDs
    v_fabric_group_cotton_id UUID;
    v_fabric_group_polyester_id UUID;
    v_fabric_group_silk_id UUID;
    v_fabric_group_linen_id UUID;
    -- Color IDs
    v_color_white_id UUID;
    v_color_black_id UUID;
    v_color_red_id UUID;
    v_color_blue_id UUID;
    v_color_green_id UUID;
    v_color_beige_id UUID;
    v_color_navy_id UUID;
    v_color_gray_id UUID;
    v_color_brown_id UUID;
    v_color_burgundy_id UUID;
    -- Customer Group IDs
    v_cust_group_wholesale_id UUID;
    v_cust_group_retail_id UUID;
    v_cust_group_vip_id UUID;
    -- Supplier Group IDs
    v_supp_group_local_id UUID;
    v_supp_group_import_id UUID;
    -- Fiscal Year
    v_fiscal_year_id UUID;
    -- Account Type IDs
    v_account_type_asset_id UUID;
    v_account_type_liability_id UUID;
    v_account_type_equity_id UUID;
    v_account_type_revenue_id UUID;
    v_account_type_expense_id UUID;
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على tenant_id و company_id الموجودين
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants WHERE is_active = true LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No active tenant found. Please create a tenant first.';
    END IF;
    
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id AND is_active = true LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No active company found. Please create a company first.';
    END IF;
    
    SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id LIMIT 1;
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    -- Get account type IDs
    SELECT id INTO v_account_type_asset_id FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_account_type_liability_id FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_account_type_equity_id FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_account_type_revenue_id FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_account_type_expense_id FROM account_types WHERE code = 'EXPENSE';
    
    RAISE NOTICE 'Using tenant_id: %, company_id: %', v_tenant_id, v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. وحدات القياس
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO units_of_measure (id, tenant_id, code, name_ar, name_en, symbol, category, is_base_unit)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'MTR', 'متر', 'Meter', 'm', 'length', true),
        (gen_random_uuid(), v_tenant_id, 'ROLL', 'رولون', 'Roll', 'roll', 'length', false),
        (gen_random_uuid(), v_tenant_id, 'PCS', 'قطعة', 'Piece', 'pcs', 'quantity', true),
        (gen_random_uuid(), v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'kg', 'weight', true),
        (gen_random_uuid(), v_tenant_id, 'GM', 'غرام', 'Gram', 'g', 'weight', false),
        (gen_random_uuid(), v_tenant_id, 'BOX', 'صندوق', 'Box', 'box', 'quantity', false),
        (gen_random_uuid(), v_tenant_id, 'SET', 'طقم', 'Set', 'set', 'quantity', false)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Get unit IDs
    SELECT id INTO v_unit_meter_id FROM units_of_measure WHERE tenant_id = v_tenant_id AND code = 'MTR';
    SELECT id INTO v_unit_roll_id FROM units_of_measure WHERE tenant_id = v_tenant_id AND code = 'ROLL';
    SELECT id INTO v_unit_piece_id FROM units_of_measure WHERE tenant_id = v_tenant_id AND code = 'PCS';
    SELECT id INTO v_unit_kg_id FROM units_of_measure WHERE tenant_id = v_tenant_id AND code = 'KG';

    -- ═══════════════════════════════════════════════════════════════
    -- 2. الحسابات الرئيسية (دليل الحسابات)
    -- ═══════════════════════════════════════════════════════════════
    
    -- حساب النقدية - الصندوق
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_cash_account, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1101', 'الصندوق الرئيسي', 'Main Cash', v_account_type_asset_id, true, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_cash_account_id;
    IF v_cash_account_id IS NULL THEN
        SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1101';
    END IF;
    
    -- حساب البنك - غريفنا
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_bank_account, bank_name, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1102', 'البنك - غريفنا', 'Bank - UAH', v_account_type_asset_id, true, 'PrivatBank', 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_bank_uah_account_id;
    IF v_bank_uah_account_id IS NULL THEN
        SELECT id INTO v_bank_uah_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1102';
    END IF;
    
    -- حساب البنك - دولار
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_bank_account, bank_name, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1103', 'البنك - دولار', 'Bank - USD', v_account_type_asset_id, true, 'PrivatBank', 'USD', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_bank_usd_account_id;
    IF v_bank_usd_account_id IS NULL THEN
        SELECT id INTO v_bank_usd_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1103';
    END IF;
    
    -- حساب البنك - يورو
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_bank_account, bank_name, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1104', 'البنك - يورو', 'Bank - EUR', v_account_type_asset_id, true, 'Raiffeisen Bank', 'EUR', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_bank_eur_account_id;
    IF v_bank_eur_account_id IS NULL THEN
        SELECT id INTO v_bank_eur_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1104';
    END IF;
    
    -- الذمم المدينة
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_receivable, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1201', 'الذمم المدينة', 'Accounts Receivable', v_account_type_asset_id, true, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_receivable_account_id;
    IF v_receivable_account_id IS NULL THEN
        SELECT id INTO v_receivable_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1201';
    END IF;
    
    -- الذمم الدائنة
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_payable, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '2101', 'الذمم الدائنة', 'Accounts Payable', v_account_type_liability_id, true, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_payable_account_id;
    IF v_payable_account_id IS NULL THEN
        SELECT id INTO v_payable_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '2101';
    END IF;
    
    -- إيرادات المبيعات
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '4101', 'إيرادات المبيعات', 'Sales Revenue', v_account_type_revenue_id, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_sales_account_id;
    IF v_sales_account_id IS NULL THEN
        SELECT id INTO v_sales_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '4101';
    END IF;
    
    -- المشتريات
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '5101', 'المشتريات', 'Purchases', v_account_type_expense_id, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_purchase_account_id;
    IF v_purchase_account_id IS NULL THEN
        SELECT id INTO v_purchase_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '5101';
    END IF;
    
    -- المخزون
    INSERT INTO chart_of_accounts (id, tenant_id, company_id, account_code, name_ar, name_en, account_type_id, currency, is_detail)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, '1301', 'المخزون', 'Inventory', v_account_type_asset_id, 'UAH', true)
    ON CONFLICT (tenant_id, company_id, account_code) DO NOTHING
    RETURNING id INTO v_inventory_account_id;
    IF v_inventory_account_id IS NULL THEN
        SELECT id INTO v_inventory_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND account_code = '1301';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. الصناديق والبنوك (Cash Accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    -- الصندوق الرئيسي - غريفنا
    INSERT INTO cash_accounts (id, tenant_id, company_id, branch_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, v_branch_id, 'CASH-UAH', 'الصندوق الرئيسي', 'Main Cash Box', 'cash', v_cash_account_id, 'UAH', 50000)
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_fund_cash_id;
    IF v_fund_cash_id IS NULL THEN
        SELECT id INTO v_fund_cash_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'CASH-UAH';
    END IF;
    
    -- حساب بنكي - غريفنا
    INSERT INTO cash_accounts (id, tenant_id, company_id, branch_id, code, name_ar, name_en, account_type, gl_account_id, bank_name, bank_branch, account_number, iban, currency, current_balance)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, v_branch_id, 'BANK-UAH', 'PrivatBank - غريفنا', 'PrivatBank - UAH', 'bank', v_bank_uah_account_id, 'PrivatBank', 'Kyiv Main Branch', 'UA123456789012345678901234567', 'UA12 3456 7890 1234 5678 9012 3456 7', 'UAH', 250000)
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_fund_bank_uah_id;
    IF v_fund_bank_uah_id IS NULL THEN
        SELECT id INTO v_fund_bank_uah_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-UAH';
    END IF;
    
    -- حساب بنكي - دولار
    INSERT INTO cash_accounts (id, tenant_id, company_id, branch_id, code, name_ar, name_en, account_type, gl_account_id, bank_name, bank_branch, account_number, iban, swift_code, currency, current_balance)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, v_branch_id, 'BANK-USD', 'PrivatBank - دولار', 'PrivatBank - USD', 'bank', v_bank_usd_account_id, 'PrivatBank', 'Kyiv Main Branch', 'UA987654321098765432109876543', 'UA98 7654 3210 9876 5432 1098 7654 3', 'PABORXXX', 'USD', 15000)
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_fund_bank_usd_id;
    IF v_fund_bank_usd_id IS NULL THEN
        SELECT id INTO v_fund_bank_usd_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-USD';
    END IF;
    
    -- حساب بنكي - يورو
    INSERT INTO cash_accounts (id, tenant_id, company_id, branch_id, code, name_ar, name_en, account_type, gl_account_id, bank_name, bank_branch, account_number, iban, swift_code, currency, current_balance)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, v_branch_id, 'BANK-EUR', 'Raiffeisen - يورو', 'Raiffeisen Bank - EUR', 'bank', v_bank_eur_account_id, 'Raiffeisen Bank', 'Kyiv Central', 'UA111222333444555666777888999', 'UA11 1222 3334 4455 5666 7778 8899 9', 'RZBRXXXX', 'EUR', 8000)
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_fund_bank_eur_id;
    IF v_fund_bank_eur_id IS NULL THEN
        SELECT id INTO v_fund_bank_eur_id FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'BANK-EUR';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. المستودعات
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO warehouses (id, tenant_id, company_id, branch_id, code, name_ar, name_en, warehouse_type, city, address)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, v_branch_id, 'WH-MAIN', 'المستودع الرئيسي', 'Main Warehouse', 'main', 'Kyiv', 'Kyiv, Ukraine')
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_warehouse_id;
    IF v_warehouse_id IS NULL THEN
        SELECT id INTO v_warehouse_id FROM warehouses WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'WH-MAIN';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customer_groups (id, tenant_id, code, name_ar, name_en, discount_percent, credit_limit, payment_terms_days)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 10, 100000, 30),
        (gen_random_uuid(), v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 5, 20000, 15),
        (gen_random_uuid(), v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 15, 200000, 45)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_cust_group_wholesale_id FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_group_retail_id FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_group_vip_id FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';

    -- ═══════════════════════════════════════════════════════════════
    -- 6. العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (tenant_id, company_id, code, customer_type, name_ar, name_en, company_name, email, phone, mobile, country, city, address, group_id, currency, credit_limit, payment_terms_days, receivable_account_id, status)
    VALUES 
        -- تجار الجملة
        (v_tenant_id, v_company_id, 'CUST-001', 'company', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'Golden Textile LLC', 'info@goldentextile.ua', '+380441234567', '+380501234567', 'Ukraine', 'Kyiv', '123 Textile Street, Kyiv', v_cust_group_wholesale_id, 'UAH', 150000, 30, v_receivable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'company', 'مصنع الأقمشة المتحدة', 'United Fabrics Factory', 'United Fabrics Corp', 'sales@unitedfabrics.ua', '+380442345678', '+380502345678', 'Ukraine', 'Kharkiv', '456 Industry Ave, Kharkiv', v_cust_group_wholesale_id, 'UAH', 200000, 45, v_receivable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'company', 'تجارة الأقمشة الدولية', 'International Fabric Trade', 'IFT Trading', 'contact@iftrade.com', '+380443456789', '+380503456789', 'Ukraine', 'Odesa', '789 Port Road, Odesa', v_cust_group_wholesale_id, 'USD', 50000, 30, v_receivable_account_id, 'active'),
        -- تجار التجزئة
        (v_tenant_id, v_company_id, 'CUST-004', 'company', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'Flowers Shop', 'flowers@shop.ua', '+380444567890', '+380504567890', 'Ukraine', 'Kyiv', '321 Main Street, Kyiv', v_cust_group_retail_id, 'UAH', 30000, 15, v_receivable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'company', 'بوتيك الأناقة', 'Elegance Boutique', 'Elegance Fashion', 'info@elegance.ua', '+380445678901', '+380505678901', 'Ukraine', 'Lviv', '654 Fashion Ave, Lviv', v_cust_group_retail_id, 'UAH', 25000, 15, v_receivable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'CUST-006', 'individual', 'أحمد خياط', 'Ahmed Tailor', NULL, 'ahmed@email.com', '+380446789012', '+380506789012', 'Ukraine', 'Kyiv', '987 Tailoring Street', v_cust_group_retail_id, 'UAH', 10000, 7, v_receivable_account_id, 'active'),
        -- عملاء VIP
        (v_tenant_id, v_company_id, 'CUST-007', 'company', 'مجموعة الأزياء الراقية', 'Premium Fashion Group', 'Premium Fashion Holding', 'vip@premiumfashion.ua', '+380447890123', '+380507890123', 'Ukraine', 'Kyiv', '111 Luxury Blvd, Kyiv', v_cust_group_vip_id, 'EUR', 100000, 60, v_receivable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'CUST-008', 'company', 'دار الأزياء الأوروبية', 'European Fashion House', 'Euro Fashion GmbH', 'info@eurofashion.eu', '+380448901234', '+380508901234', 'Germany', 'Berlin', '222 Fashion Strasse, Berlin', v_cust_group_vip_id, 'EUR', 80000, 45, v_receivable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 7. مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO supplier_groups (id, tenant_id, code, name_ar, name_en, payment_terms_days)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 30),
        (gen_random_uuid(), v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 60)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_supp_group_local_id FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_group_import_id FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';

    -- ═══════════════════════════════════════════════════════════════
    -- 8. الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, name_ar, name_en, company_name, email, phone, mobile, country, city, address, group_id, currency, payment_terms_days, payable_account_id, bank_name, bank_account, status)
    VALUES 
        -- موردين محليين
        (v_tenant_id, v_company_id, 'SUPP-001', 'company', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'UTM Factory LLC', 'sales@utm.ua', '+380441111111', '+380501111111', 'Ukraine', 'Kharkiv', '100 Factory Road, Kharkiv', v_supp_group_local_id, 'UAH', 30, v_payable_account_id, 'PrivatBank', 'UA11111111111111111111111111', 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'company', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'AFC Industries', 'info@afc.ua', '+380442222222', '+380502222222', 'Ukraine', 'Dnipro', '200 Industrial Park, Dnipro', v_supp_group_local_id, 'UAH', 45, v_payable_account_id, 'Monobank', 'UA22222222222222222222222222', 'active'),
        -- موردين استيراد - تركيا
        (v_tenant_id, v_company_id, 'SUPP-003', 'company', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'BTM Trading', 'export@btm.com.tr', '+902241234567', '+905321234567', 'Turkey', 'Bursa', 'Organized Industrial Zone, Bursa', v_supp_group_import_id, 'USD', 60, v_payable_account_id, 'Garanti Bank', 'TR111111111111111111111111', 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'company', 'أقمشة إسطنبول الفاخرة', 'Istanbul Premium Fabrics', 'IPF Export', 'sales@ipf.com.tr', '+902121234567', '+905421234567', 'Turkey', 'Istanbul', 'Merter Textile Center, Istanbul', v_supp_group_import_id, 'USD', 45, v_payable_account_id, 'Isbank', 'TR222222222222222222222222', 'active'),
        -- موردين استيراد - الصين
        (v_tenant_id, v_company_id, 'SUPP-005', 'company', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'GTF Export Co.', 'export@gtf.cn', '+8675512345678', '+8613912345678', 'China', 'Guangzhou', 'Textile District, Guangzhou', v_supp_group_import_id, 'USD', 90, v_payable_account_id, 'Bank of China', 'CN111111111111111111111111', 'active'),
        -- موردين استيراد - الهند
        (v_tenant_id, v_company_id, 'SUPP-006', 'company', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'MCM Exports', 'export@mcm.in', '+912212345678', '+919812345678', 'India', 'Mumbai', 'Cotton Exchange, Mumbai', v_supp_group_import_id, 'USD', 60, v_payable_account_id, 'State Bank of India', 'IN111111111111111111111111', 'active'),
        -- موردين إكسسوارات
        (v_tenant_id, v_company_id, 'SUPP-007', 'company', 'شركة الأزرار والإكسسوارات', 'Buttons & Accessories Co.', 'BAC Trading', 'info@bac.ua', '+380443333333', '+380503333333', 'Ukraine', 'Kyiv', '300 Accessories Street, Kyiv', v_supp_group_local_id, 'UAH', 15, v_payable_account_id, 'PrivatBank', 'UA33333333333333333333333333', 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 9. تصنيفات المنتجات
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO product_categories (id, tenant_id, company_id, code, name_ar, name_en, description, display_order)
    VALUES 
        (gen_random_uuid(), v_tenant_id, v_company_id, 'FABRIC', 'الأقمشة', 'Fabrics', 'جميع أنواع الأقمشة', 1),
        (gen_random_uuid(), v_tenant_id, v_company_id, 'ACCESSORIES', 'الإكسسوارات', 'Accessories', 'إكسسوارات الخياطة', 2),
        (gen_random_uuid(), v_tenant_id, v_company_id, 'GENERAL', 'منتجات عامة', 'General Products', 'منتجات متنوعة', 3)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_category_fabric_id FROM product_categories WHERE tenant_id = v_tenant_id AND code = 'FABRIC';
    SELECT id INTO v_category_accessories_id FROM product_categories WHERE tenant_id = v_tenant_id AND code = 'ACCESSORIES';
    SELECT id INTO v_category_general_id FROM product_categories WHERE tenant_id = v_tenant_id AND code = 'GENERAL';

    -- ═══════════════════════════════════════════════════════════════
    -- 10. ألوان الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_colors (id, tenant_id, code, name_ar, name_en, hex_color, color_family)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'WHITE', 'أبيض', 'White', '#FFFFFF', 'neutral'),
        (gen_random_uuid(), v_tenant_id, 'BLACK', 'أسود', 'Black', '#000000', 'neutral'),
        (gen_random_uuid(), v_tenant_id, 'RED', 'أحمر', 'Red', '#FF0000', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'BLUE', 'أزرق', 'Blue', '#0000FF', 'cool'),
        (gen_random_uuid(), v_tenant_id, 'GREEN', 'أخضر', 'Green', '#00FF00', 'cool'),
        (gen_random_uuid(), v_tenant_id, 'BEIGE', 'بيج', 'Beige', '#F5F5DC', 'neutral'),
        (gen_random_uuid(), v_tenant_id, 'NAVY', 'كحلي', 'Navy Blue', '#000080', 'cool'),
        (gen_random_uuid(), v_tenant_id, 'GRAY', 'رمادي', 'Gray', '#808080', 'neutral'),
        (gen_random_uuid(), v_tenant_id, 'BROWN', 'بني', 'Brown', '#8B4513', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'BURGUNDY', 'خمري', 'Burgundy', '#800020', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'PINK', 'وردي', 'Pink', '#FFC0CB', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'YELLOW', 'أصفر', 'Yellow', '#FFFF00', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'ORANGE', 'برتقالي', 'Orange', '#FFA500', 'warm'),
        (gen_random_uuid(), v_tenant_id, 'PURPLE', 'بنفسجي', 'Purple', '#800080', 'cool'),
        (gen_random_uuid(), v_tenant_id, 'CREAM', 'كريمي', 'Cream', '#FFFDD0', 'neutral')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Get color IDs
    SELECT id INTO v_color_white_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'WHITE';
    SELECT id INTO v_color_black_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLACK';
    SELECT id INTO v_color_red_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'RED';
    SELECT id INTO v_color_blue_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLUE';
    SELECT id INTO v_color_green_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'GREEN';
    SELECT id INTO v_color_beige_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BEIGE';
    SELECT id INTO v_color_navy_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'NAVY';
    SELECT id INTO v_color_gray_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'GRAY';
    SELECT id INTO v_color_brown_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BROWN';
    SELECT id INTO v_color_burgundy_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BURGUNDY';

    -- ═══════════════════════════════════════════════════════════════
    -- 11. مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_groups (id, tenant_id, code, name_ar, name_en, icon, description, display_order)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'COTTON', 'قطن', 'Cotton', '🧵', 'أقمشة قطنية طبيعية', 1),
        (gen_random_uuid(), v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', '✨', 'أقمشة بوليستر صناعية', 2),
        (gen_random_uuid(), v_tenant_id, 'SILK', 'حرير', 'Silk', '🦋', 'أقمشة حريرية فاخرة', 3),
        (gen_random_uuid(), v_tenant_id, 'LINEN', 'كتان', 'Linen', '🌿', 'أقمشة كتانية طبيعية', 4),
        (gen_random_uuid(), v_tenant_id, 'WOOL', 'صوف', 'Wool', '🐑', 'أقمشة صوفية', 5),
        (gen_random_uuid(), v_tenant_id, 'MIXED', 'مخلوط', 'Mixed', '🔀', 'أقمشة مخلوطة', 6)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_fabric_group_cotton_id FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'COTTON';
    SELECT id INTO v_fabric_group_polyester_id FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'POLYESTER';
    SELECT id INTO v_fabric_group_silk_id FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'SILK';
    SELECT id INTO v_fabric_group_linen_id FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'LINEN';

    -- ═══════════════════════════════════════════════════════════════
    -- 12. المنتجات الأساسية
    -- ═══════════════════════════════════════════════════════════════
    
    -- First, insert base products for fabrics
    INSERT INTO products (tenant_id, company_id, sku, name_ar, name_en, description, category_id, product_type, tracking_type, base_unit_id, has_variants, default_cost, default_price, status)
    VALUES 
        (v_tenant_id, v_company_id, 'FAB-COT-100', 'قطن 100%', '100% Cotton', 'قماش قطن طبيعي 100%', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 50, 80, 'active'),
        (v_tenant_id, v_company_id, 'FAB-COT-MIX', 'قطن مخلوط', 'Cotton Blend', 'قماش قطن مخلوط 60/40', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 35, 55, 'active'),
        (v_tenant_id, v_company_id, 'FAB-POLY-SAT', 'بوليستر ساتان', 'Polyester Satin', 'قماش بوليستر ساتان لامع', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 40, 65, 'active'),
        (v_tenant_id, v_company_id, 'FAB-POLY-CRP', 'بوليستر كريب', 'Polyester Crepe', 'قماش بوليستر كريب', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 45, 70, 'active'),
        (v_tenant_id, v_company_id, 'FAB-SILK-NAT', 'حرير طبيعي', 'Natural Silk', 'قماش حرير طبيعي فاخر', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 200, 350, 'active'),
        (v_tenant_id, v_company_id, 'FAB-LINEN-100', 'كتان 100%', '100% Linen', 'قماش كتان طبيعي', v_category_fabric_id, 'stockable', 'batch', v_unit_meter_id, true, 80, 130, 'active')
    ON CONFLICT (tenant_id, sku) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 13. مواد الأقمشة مع الألوان
    -- ═══════════════════════════════════════════════════════════════
    
    -- Insert fabric materials
    INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, group_id, composition, category, default_width, weight_per_meter, unit, purchase_price, selling_price, currency, origin_country, status)
    VALUES 
        -- قطن
        (v_tenant_id, v_company_id, 'COT-100-PLAIN', 'قطن سادة 100%', 'Plain Cotton 100%', v_fabric_group_cotton_id, '100% Cotton', 'woven', 150, 0.18, 'meter', 45, 75, 'UAH', 'Turkey', 'active'),
        (v_tenant_id, v_company_id, 'COT-100-TWILL', 'قطن تويل 100%', 'Cotton Twill 100%', v_fabric_group_cotton_id, '100% Cotton', 'woven', 150, 0.22, 'meter', 55, 90, 'UAH', 'India', 'active'),
        (v_tenant_id, v_company_id, 'COT-MIX-6040', 'قطن مخلوط 60/40', 'Cotton Blend 60/40', v_fabric_group_cotton_id, '60% Cotton, 40% Polyester', 'woven', 150, 0.16, 'meter', 35, 55, 'UAH', 'China', 'active'),
        -- بوليستر
        (v_tenant_id, v_company_id, 'POLY-SATIN', 'بوليستر ساتان', 'Polyester Satin', v_fabric_group_polyester_id, '100% Polyester', 'woven', 150, 0.12, 'meter', 38, 62, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'POLY-CREPE', 'بوليستر كريب', 'Polyester Crepe', v_fabric_group_polyester_id, '100% Polyester', 'woven', 145, 0.14, 'meter', 42, 68, 'UAH', 'Turkey', 'active'),
        (v_tenant_id, v_company_id, 'POLY-CHIFFON', 'شيفون بوليستر', 'Polyester Chiffon', v_fabric_group_polyester_id, '100% Polyester', 'woven', 150, 0.08, 'meter', 30, 50, 'UAH', 'China', 'active'),
        -- حرير
        (v_tenant_id, v_company_id, 'SILK-NATURAL', 'حرير طبيعي', 'Natural Silk', v_fabric_group_silk_id, '100% Silk', 'woven', 140, 0.10, 'meter', 180, 320, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'SILK-SATIN', 'حرير ساتان', 'Silk Satin', v_fabric_group_silk_id, '100% Silk', 'woven', 140, 0.12, 'meter', 220, 380, 'UAH', 'India', 'active'),
        -- كتان
        (v_tenant_id, v_company_id, 'LINEN-100', 'كتان طبيعي 100%', '100% Natural Linen', v_fabric_group_linen_id, '100% Linen', 'woven', 150, 0.20, 'meter', 75, 125, 'UAH', 'Ukraine', 'active'),
        (v_tenant_id, v_company_id, 'LINEN-MIX', 'كتان مخلوط', 'Linen Blend', v_fabric_group_linen_id, '55% Linen, 45% Cotton', 'woven', 150, 0.18, 'meter', 55, 90, 'UAH', 'Ukraine', 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 14. ربط الأقمشة بالألوان (Material-Color Relations)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Insert fabric_material_colors for each fabric with multiple colors
    INSERT INTO fabric_material_colors (tenant_id, material_id, color_id, is_available)
    SELECT 
        v_tenant_id,
        m.id,
        c.id,
        true
    FROM fabric_materials m
    CROSS JOIN fabric_colors c
    WHERE m.tenant_id = v_tenant_id
    AND c.tenant_id = v_tenant_id
    AND m.code IN ('COT-100-PLAIN', 'COT-100-TWILL', 'POLY-SATIN', 'POLY-CREPE')
    AND c.code IN ('WHITE', 'BLACK', 'BEIGE', 'NAVY', 'GRAY', 'RED', 'BLUE')
    ON CONFLICT (material_id, color_id) DO NOTHING;

    -- Add more colors for some specific fabrics
    INSERT INTO fabric_material_colors (tenant_id, material_id, color_id, is_available)
    SELECT 
        v_tenant_id,
        m.id,
        c.id,
        true
    FROM fabric_materials m
    CROSS JOIN fabric_colors c
    WHERE m.tenant_id = v_tenant_id
    AND c.tenant_id = v_tenant_id
    AND m.code IN ('SILK-NATURAL', 'SILK-SATIN')
    AND c.code IN ('WHITE', 'BLACK', 'RED', 'BURGUNDY', 'NAVY', 'CREAM')
    ON CONFLICT (material_id, color_id) DO NOTHING;

    -- Linen colors
    INSERT INTO fabric_material_colors (tenant_id, material_id, color_id, is_available)
    SELECT 
        v_tenant_id,
        m.id,
        c.id,
        true
    FROM fabric_materials m
    CROSS JOIN fabric_colors c
    WHERE m.tenant_id = v_tenant_id
    AND c.tenant_id = v_tenant_id
    AND m.code IN ('LINEN-100', 'LINEN-MIX')
    AND c.code IN ('WHITE', 'BEIGE', 'GRAY', 'BROWN', 'CREAM')
    ON CONFLICT (material_id, color_id) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 15. السنة المالية
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fiscal_years (id, tenant_id, company_id, name, code, start_date, end_date, is_current)
    VALUES (gen_random_uuid(), v_tenant_id, v_company_id, 'السنة المالية 2024', 'FY2024', '2024-01-01', '2024-12-31', true)
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_fiscal_year_id;
    IF v_fiscal_year_id IS NULL THEN
        SELECT id INTO v_fiscal_year_id FROM fiscal_years WHERE tenant_id = v_tenant_id AND company_id = v_company_id AND code = 'FY2024';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Demo data inserted successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Units of Measure: 7';
    RAISE NOTICE '   - Chart of Accounts: 8';
    RAISE NOTICE '   - Cash Accounts (Funds): 4 (UAH, USD, EUR)';
    RAISE NOTICE '   - Warehouses: 1';
    RAISE NOTICE '   - Customer Groups: 3';
    RAISE NOTICE '   - Customers: 8';
    RAISE NOTICE '   - Supplier Groups: 2';
    RAISE NOTICE '   - Suppliers: 7';
    RAISE NOTICE '   - Product Categories: 3';
    RAISE NOTICE '   - Fabric Colors: 15';
    RAISE NOTICE '   - Fabric Groups: 6';
    RAISE NOTICE '   - Fabric Materials: 10';
    RAISE NOTICE '   - Material-Color combinations: 50+';
    RAISE NOTICE '   - Fiscal Year: 1';
    
END $$;
