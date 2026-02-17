-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  2. الشجرة الموسعة (Extended) — 79 حساب (18 مجموعة + 61 تفصيلي)   ║
-- ║  V4 Final — 2026-02-17                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION create_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_asset_type UUID; v_current_asset_type UUID; v_fixed_asset_type UUID;
    v_liability_type UUID; v_current_liability_type UUID; v_long_liability_type UUID;
    v_equity_type UUID; v_revenue_type UUID; v_expense_type UUID; v_cogs_type UUID;
    -- Parent IDs
    v_assets_id UUID; v_current_assets_id UUID;
    v_cash_grp UUID; v_banks_grp UUID; v_ar_grp UUID; v_inv_grp UUID;
    v_fixed_assets_id UUID;
    v_liabilities_id UUID; v_current_liab_id UUID; v_ap_grp UUID; v_logistics_grp UUID; v_long_liab_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID; v_cogs_grp UUID; v_purchases_grp UUID; v_purch_exp_grp UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN RETURN; END IF;

    -- Get account types
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_liability_type FROM account_types WHERE code IN ('LONG_TERM_LIABILITY','NON_CURRENT_LIABILITY','LIABILITY');
    IF v_long_liability_type IS NULL THEN v_long_liability_type := v_liability_type; END IF;
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';
    IF v_cogs_type IS NULL THEN v_cogs_type := v_expense_type; END IF;

    -- ═══════════════════════════════════════════════════════
    -- الأصول
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', v_asset_type, NULL, false, true) RETURNING id INTO v_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_current_asset_type, v_assets_id, false, true) RETURNING id INTO v_current_assets_id;

    -- الصندوق (111)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '111', 'الصندوق', 'Cash', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_cash_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account)
    VALUES
        (v_tenant_id, p_company_id, '1111', 'صندوق - عملة محلية', 'Cash - Local Currency', v_current_asset_type, v_cash_grp, true, true, true),
        (v_tenant_id, p_company_id, '1112', 'صندوق - عملة أساسية', 'Cash - Base Currency', v_current_asset_type, v_cash_grp, true, true, true),
        (v_tenant_id, p_company_id, '1113', 'صندوق فرع', 'Branch Cash', v_current_asset_type, v_cash_grp, true, true, true);

    -- البنوك (112)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_banks_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES
        (v_tenant_id, p_company_id, '1121', 'بنك - عملة محلية', 'Bank - Local Currency', v_current_asset_type, v_banks_grp, true, true, true),
        (v_tenant_id, p_company_id, '1122', 'بنك - عملة أساسية', 'Bank - Base Currency', v_current_asset_type, v_banks_grp, true, true, true);

    -- ذمم العملاء (113)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES (v_tenant_id, p_company_id, '113', 'ذمم العملاء', 'Accounts Receivable', v_current_asset_type, v_current_assets_id, false, true, false) RETURNING id INTO v_ar_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES
        (v_tenant_id, p_company_id, '1131', 'ذمم الجملة', 'Wholesale Receivables', v_current_asset_type, v_ar_grp, true, true, true),
        (v_tenant_id, p_company_id, '1132', 'ذمم التجزئة', 'Retail Receivables', v_current_asset_type, v_ar_grp, true, true, true),
        (v_tenant_id, p_company_id, '1133', 'أوراق القبض', 'Notes Receivable', v_current_asset_type, v_ar_grp, true, true, false);

    -- المخزون (114) مع بضاعة بالطريق
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '114', 'المخزون', 'Inventory', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1143', 'بضاعة في الطريق', 'Goods in Transit', v_current_asset_type, v_inv_grp, false, true);

    -- باقي الأصول المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '116', 'مصاريف مقدمة', 'Prepaid Expenses', v_current_asset_type, v_current_assets_id, true, true),
        (v_tenant_id, p_company_id, '117', 'ض.ق.م - مدخلات', 'VAT Input', v_current_asset_type, v_current_assets_id, true, true),
        (v_tenant_id, p_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Deposits', v_current_asset_type, v_current_assets_id, true, true);

    -- الأصول الثابتة (12)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_fixed_asset_type, v_assets_id, false, true) RETURNING id INTO v_fixed_assets_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '121', 'المباني والمستودعات', 'Buildings & Warehouses', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث والتجهيزات', 'Furniture & Fixtures', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Systems', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', v_fixed_asset_type, v_fixed_assets_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- الخصوم
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true) RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_current_liab_id;

    -- الموردين (211)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '211', 'دين الموردين', 'Accounts Payable', v_current_liability_type, v_current_liab_id, false, true, false) RETURNING id INTO v_ap_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES
        (v_tenant_id, p_company_id, '2111', 'موردين - أقمشة', 'Fabric Suppliers Payable', v_current_liability_type, v_ap_grp, true, true, true),
        (v_tenant_id, p_company_id, '2112', 'موردين - أخرى', 'Other Suppliers Payable', v_current_liability_type, v_ap_grp, true, true, true);

    -- مقدمو خدمات الشحن (2113) مع مجموعات فرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '2113', 'مقدمو خدمات الشحن والتوريد', 'Logistics Service Providers', v_current_liability_type, v_ap_grp, false, true, false)
    RETURNING id INTO v_logistics_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES
        (v_tenant_id, p_company_id, '21131', 'شركات الشحن البحري', 'Ocean Freight Companies', v_current_liability_type, v_logistics_grp, true, true, true),
        (v_tenant_id, p_company_id, '21132', 'مكاتب التخليص الجمركي', 'Customs Clearance Offices', v_current_liability_type, v_logistics_grp, true, true, true),
        (v_tenant_id, p_company_id, '21133', 'شركات النقل الداخلي', 'Inland Transport Companies', v_current_liability_type, v_logistics_grp, true, true, true),
        (v_tenant_id, p_company_id, '21134', 'شركات التأمين', 'Insurance Companies', v_current_liability_type, v_logistics_grp, true, true, true),
        (v_tenant_id, p_company_id, '21135', 'خدمات لوجستية أخرى', 'Other Logistics Services', v_current_liability_type, v_logistics_grp, true, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '212', 'أوراق الدفع', 'Notes Payable', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '213', 'الرواتب المستحقة', 'Accrued Salaries', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '214', 'ض.ق.م - مخرجات', 'VAT Output', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '215', 'سلف العملاء', 'Customer Advances', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '216', 'الضرائب المستحقة', 'Taxes Payable', v_current_liability_type, v_current_liab_id, true, true);

    -- خصوم طويلة الأجل (22)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_long_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_long_liab_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', v_long_liability_type, v_long_liab_id, true, true),
        (v_tenant_id, p_company_id, '222', 'التزامات الإيجار', 'Lease Obligations', v_long_liability_type, v_long_liab_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- حقوق الملكية
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_equity_type, NULL, false, true) RETURNING id INTO v_equity_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '34', 'احتياطيات', 'Reserves', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '35', 'أرصدة افتتاحية', 'Opening Balance Equity', v_equity_type, v_equity_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- الإيرادات
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true) RETURNING id INTO v_revenue_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '41', 'مبيعات عامة', 'General Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '42', 'مبيعات خدمات', 'Service Revenue', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '43', 'خصومات المبيعات', 'Sales Discounts', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '47', 'إيرادات الفوائد', 'Interest Income', v_revenue_type, v_revenue_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- المصروفات
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true) RETURNING id INTO v_expenses_id;

    -- تكلفة المبيعات (51)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_cogs_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '511', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', v_cogs_type, v_cogs_grp, true, true),
        (v_tenant_id, p_company_id, '512', 'تكلفة المبيعات العامة', 'General COGS', v_cogs_type, v_cogs_grp, true, true),
        (v_tenant_id, p_company_id, '513', 'تكلفة الخدمات المباعة', 'Cost of Services', v_cogs_type, v_cogs_grp, true, true);

    -- المشتريات (52)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '52', 'المشتريات', 'Purchases', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_purchases_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '521', 'مشتريات عامة', 'General Purchases', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '522', 'مردودات المشتريات', 'Purchase Returns', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '523', 'خصومات المشتريات', 'Purchase Discounts', v_cogs_type, v_purchases_grp, true, true);

    -- باقي المصروفات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '53', 'مصروفات الرواتب', 'Salary Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '54', 'مصروفات الإيجار', 'Rent Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '55', 'مصروفات المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '56', 'مصروفات التسويق', 'Marketing Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات إدارية', 'Administrative Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '58', 'مصروفات الإهلاك', 'Depreciation Expense', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '59', 'مصروفات البنوك', 'Bank Charges', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '591', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '592', 'فروق المخزون', 'Inventory Variances', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '593', 'مصاريف الفوائد', 'Interest Expense', v_expense_type, v_expenses_id, true, true);

    -- مصاريف المشتريات (5800)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5800', 'مصاريف المشتريات', 'Purchase Expenses', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_purch_exp_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '5810', 'مصاريف الشحن', 'Shipping Expenses', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '5820', 'مصاريف الجمركة', 'Customs Expenses', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '5830', 'تأمين بحري وشحن', 'Marine & Cargo Insurance', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '5840', 'مصاريف مشتريات أخرى', 'Other Purchase Expenses', v_expense_type, v_purch_exp_grp, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '596', 'مصروفات أخرى', 'Other Expenses', v_expense_type, v_expenses_id, true, true);

    UPDATE companies SET chart_type = 'extended' WHERE id = p_company_id;
    RAISE NOTICE '✅ تم إنشاء الشجرة الموسعة V4 (79 حساب) للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_extended_chart(UUID) IS 'V4 — إنشاء الشجرة الموسعة (79 حساب: 18 مجموعة + 61 تفصيلي) مع دعم الكونتينرات';
