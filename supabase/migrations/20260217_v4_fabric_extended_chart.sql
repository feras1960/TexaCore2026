-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  3. الموسعة أقمشة (Fabric Extended) — 82 حساب (19 مجموعة + 63)    ║
-- ║  V4 Final — 2026-02-17                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_asset_type UUID; v_current_asset_type UUID; v_fixed_asset_type UUID;
    v_liability_type UUID; v_current_liability_type UUID; v_long_liability_type UUID;
    v_equity_type UUID; v_revenue_type UUID; v_expense_type UUID; v_cogs_type UUID;
    v_assets_id UUID; v_current_assets_id UUID;
    v_cash_grp UUID; v_banks_grp UUID; v_ar_grp UUID;
    v_inv_grp UUID; v_fabric_inv_grp UUID;
    v_fixed_assets_id UUID;
    v_liabilities_id UUID; v_current_liab_id UUID; v_ap_grp UUID; v_long_liab_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID; v_cogs_grp UUID; v_purchases_grp UUID; v_shipping_grp UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN RETURN; END IF;

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

    -- ═══ الأصول ═══
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
        (v_tenant_id, p_company_id, '1112', 'صندوق - عملة أساسية', 'Cash - Base Currency', v_current_asset_type, v_cash_grp, true, true, true);

    -- البنوك (112)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_banks_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES
        (v_tenant_id, p_company_id, '1121', 'بنك - عملة محلية', 'Bank - Local Currency', v_current_asset_type, v_banks_grp, true, true, true),
        (v_tenant_id, p_company_id, '1122', 'بنك - عملة أساسية', 'Bank - Base Currency', v_current_asset_type, v_banks_grp, true, true, true);

    -- ذمم العملاء (113)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '113', 'ذمم العملاء', 'Accounts Receivable', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_ar_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES
        (v_tenant_id, p_company_id, '1131', 'ذمم الجملة', 'Wholesale Receivables', v_current_asset_type, v_ar_grp, true, true, true),
        (v_tenant_id, p_company_id, '1132', 'ذمم التجزئة', 'Retail Receivables', v_current_asset_type, v_ar_grp, true, true, true),
        (v_tenant_id, p_company_id, '1133', 'أوراق القبض', 'Notes Receivable', v_current_asset_type, v_ar_grp, true, true, false);

    -- المخزون العام (114) مع بضاعة بالطريق
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '114', 'المخزون العام', 'General Inventory', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1143', 'بضاعة في الطريق', 'Goods in Transit', v_current_asset_type, v_inv_grp, false, true);

    -- مخزون الأقمشة (115) 🧵
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '115', 'مخزون الأقمشة', 'Fabric Inventory', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_fabric_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1151', 'مخزون رولونات', 'Fabric Stock - Rolls', v_current_asset_type, v_fabric_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1152', 'مخزون أمتار', 'Fabric Stock - Meters', v_current_asset_type, v_fabric_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1153', 'مخزون قيد التحويل', 'Inventory in Transit', v_current_asset_type, v_fabric_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1154', 'مخزون معيب', 'Defective Inventory', v_current_asset_type, v_fabric_inv_grp, true, true);

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
        (v_tenant_id, p_company_id, '122', 'معدات المستودع', 'Warehouse Equipment', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث والتجهيزات', 'Furniture & Fixtures', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Barcode Systems', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '129', 'مجمع الإهلاك', 'Accumulated Depreciation', v_fixed_asset_type, v_fixed_assets_id, true, true);

    -- ═══ الخصوم ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true) RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_current_liab_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '211', 'ذمم الموردين', 'Accounts Payable', v_current_liability_type, v_current_liab_id, false, true) RETURNING id INTO v_ap_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES
        (v_tenant_id, p_company_id, '2111', 'موردين - أقمشة', 'Fabric Suppliers Payable', v_current_liability_type, v_ap_grp, true, true, true),
        (v_tenant_id, p_company_id, '2112', 'موردين - أخرى', 'Other Suppliers Payable', v_current_liability_type, v_ap_grp, true, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '212', 'أوراق الدفع', 'Notes Payable', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '213', 'الرواتب المستحقة', 'Accrued Salaries', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '214', 'ض.ق.م - مخرجات', 'VAT Output', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '215', 'سلف العملاء', 'Customer Advances', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '216', 'دفعات العملاء المقدمة', 'Customer Deposits', v_current_liability_type, v_current_liab_id, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_long_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_long_liab_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', v_long_liability_type, v_long_liab_id, true, true);

    -- ═══ حقوق الملكية ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_equity_type, NULL, false, true) RETURNING id INTO v_equity_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر السنة', 'Current Year P/L', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '35', 'أرصدة افتتاحية', 'Opening Balance Equity', v_equity_type, v_equity_id, true, true);

    -- ═══ الإيرادات ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true) RETURNING id INTO v_revenue_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '41', 'مبيعات الأقمشة - جملة', 'Fabric Sales - Wholesale', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '42', 'مبيعات الأقمشة - تجزئة', 'Fabric Sales - Retail', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '43', 'مبيعات الرولونات', 'Roll Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'خصومات المبيعات', 'Sales Discounts', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '47', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true);

    -- ═══ المصروفات ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true) RETURNING id INTO v_expenses_id;

    -- تكلفة الأقمشة المباعة (51)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '51', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_cogs_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '511', 'تكلفة أقمشة - جملة', 'Fabric COGS - Wholesale', v_cogs_type, v_cogs_grp, true, true),
        (v_tenant_id, p_company_id, '512', 'تكلفة أقمشة - تجزئة', 'Fabric COGS - Retail', v_cogs_type, v_cogs_grp, true, true);

    -- المشتريات (52)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '52', 'المشتريات', 'Purchases', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_purchases_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '521', 'مشتريات أقمشة', 'Fabric Purchases', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '522', 'مردودات المشتريات', 'Purchase Returns', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '523', 'خصومات المشتريات', 'Purchase Discounts', v_cogs_type, v_purchases_grp, true, true);

    -- مصاريف القص + الشحن والجمارك
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '53', 'مصاريف القص والتالف', 'Cutting & Waste', v_expense_type, v_expenses_id, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '54', 'مصاريف الشحن والجمارك', 'Shipping & Customs', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_shipping_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '541', 'مصاريف الشحن', 'Shipping Expenses', v_expense_type, v_shipping_grp, true, true),
        (v_tenant_id, p_company_id, '542', 'مصاريف الجمركة', 'Customs Expenses', v_expense_type, v_shipping_grp, true, true),
        (v_tenant_id, p_company_id, '543', 'تأمين بحري', 'Marine Insurance', v_expense_type, v_shipping_grp, true, true),
        (v_tenant_id, p_company_id, '544', 'مصاريف مشتريات أخرى', 'Other Purchase Expenses', v_expense_type, v_shipping_grp, true, true);

    -- باقي المصروفات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '55', 'مصاريف التخزين', 'Storage Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '56', 'مصاريف العينات', 'Sample Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات الرواتب', 'Salary Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '58', 'مصروفات الإيجار', 'Rent Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '59', 'مصروفات المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '591', 'مصروفات التسويق', 'Marketing', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '592', 'مصروفات إدارية', 'Administrative', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات الإهلاك', 'Depreciation', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '594', 'مصروفات البنوك', 'Bank Charges', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '595', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '596', 'فروقات الجرد', 'Inventory Variances', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '597', 'مصاريف الفوائد', 'Interest Expense', v_expense_type, v_expenses_id, true, true);

    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;
    RAISE NOTICE '✅ تم إنشاء شجرة الأقمشة الموسعة V4 (82 حساب) للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_fabric_extended_chart(UUID) IS 'V4 — إنشاء شجرة الأقمشة الموسعة (82 حساب: 19 مجموعة + 63 تفصيلي) مع مخزون أقمشة وكونتينرات';
