-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 V5.1 Simple Chart — الشجرة القياسية بترقيم موحد مع Extended
-- تاريخ: 2026-02-26 | الإصدار: V5.1
-- ═══════════════════════════════════════════════════════════════════════════════
-- الهدف: توحيد نظام الترقيم ليكون متوافقاً مع Extended
-- الفائدة: عند الترقية من Simple→Extended، لا يتغير أي كود — تُضاف حسابات فقط
-- التغييرات V5.1: 217 أوراق دفع, 58 مصاريف مشتريات [G], 59 متنوعة [G]
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_simple_chart(UUID);

CREATE OR REPLACE FUNCTION create_simple_chart(p_company_id UUID)
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
    v_cash_grp UUID; v_banks_grp UUID; v_inv_grp UUID;
    v_fixed_assets_id UUID;
    v_liabilities_id UUID; v_current_liab_id UUID; v_long_liab_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID; v_cogs_grp UUID; v_purchases_grp UUID; v_freight_grp UUID; v_misc_grp UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Company not found: %', p_company_id; END IF;
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
    -- 1️⃣ الأصول (17 حساب)
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
        (v_tenant_id, p_company_id, '1112', 'صندوق - عملة أساسية', 'Cash - Base Currency', v_current_asset_type, v_cash_grp, true, true, true);

    -- البنوك (112)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_banks_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES
        (v_tenant_id, p_company_id, '1121', 'بنك - عملة محلية', 'Bank - Local Currency', v_current_asset_type, v_banks_grp, true, true, true),
        (v_tenant_id, p_company_id, '1122', 'بنك - عملة أساسية', 'Bank - Base Currency', v_current_asset_type, v_banks_grp, true, true, true);

    -- العملاء (113)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES (v_tenant_id, p_company_id, '113', 'العملاء', 'Accounts Receivable', v_current_asset_type, v_current_assets_id, false, true, true);

    -- المخزون (114)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '114', 'المخزون', 'Inventory', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', v_current_asset_type, v_inv_grp, true, true);

    -- باقي الأصول المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '116', 'مصاريف مقدمة', 'Prepaid Expenses', v_current_asset_type, v_current_assets_id, true, true),
        (v_tenant_id, p_company_id, '117', 'ض.ق.م - مدخلات', 'VAT Input', v_current_asset_type, v_current_assets_id, true, true),
        (v_tenant_id, p_company_id, '118', 'دفعات مقدمة للموردين', 'Supplier Deposits', v_current_asset_type, v_current_assets_id, true, true);

    -- الأصول الثابتة (12)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_fixed_asset_type, v_assets_id, false, true) RETURNING id INTO v_fixed_assets_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '121', 'أصول ثابتة', 'Fixed Assets', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '129', 'مجمع الإهلاك', 'Accumulated Depreciation', v_fixed_asset_type, v_fixed_assets_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 2️⃣ الخصوم (9 حسابات)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true) RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_current_liab_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '211', 'الموردون', 'Accounts Payable', v_current_liability_type, v_current_liab_id, false, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '213', 'مستحقات الموظفين', 'Accrued Salaries', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '214', 'ض.ق.م - مخرجات', 'VAT Output', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '215', 'سلف العملاء', 'Customer Advances', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '216', 'دائنون آخرون', 'Other Payables', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '217', 'أوراق الدفع', 'Notes Payable', v_current_liability_type, v_current_liab_id, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_long_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_long_liab_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '221', 'قروض طويلة الأجل', 'Long-term Loans', v_long_liability_type, v_long_liab_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 3️⃣ حقوق الملكية (6 حسابات)
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
    -- 4️⃣ الإيرادات (5 حسابات)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true) RETURNING id INTO v_revenue_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '41', 'المبيعات', 'Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 5️⃣ المصروفات (17 حساب)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true) RETURNING id INTO v_expenses_id;

    -- تكلفة المبيعات (51)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_cogs_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '511', 'تكلفة المبيعات', 'Cost of Sales', v_cogs_type, v_cogs_grp, true, true);

    -- المشتريات (52)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '52', 'المشتريات', 'Purchases', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_purchases_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '521', 'مشتريات عامة', 'General Purchases', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '522', 'مردودات المشتريات', 'Purchase Returns', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '523', 'خصومات المشتريات', 'Purchase Discounts', v_cogs_type, v_purchases_grp, true, true);

    -- مصروفات تشغيلية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '53', 'الرواتب والأجور', 'Salaries & Wages', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '54', 'الإيجارات', 'Rent Expense', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '55', 'المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصاريف إدارية', 'Administrative Expenses', v_expense_type, v_expenses_id, true, true);

    -- مصاريف المشتريات والشحن (58) — V5.1: كانت 5800
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '58', 'مصاريف المشتريات والشحن', 'Purchase & Shipping Expenses', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_freight_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '581', 'مصاريف الشحن', 'Shipping Expenses', v_expense_type, v_freight_grp, true, true);

    -- مصروفات متنوعة (59)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '59', 'مصروفات متنوعة', 'Miscellaneous Expenses', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_misc_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '591', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_misc_grp, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات الصيانة', 'Maintenance Expenses', v_expense_type, v_misc_grp, true, true),
        (v_tenant_id, p_company_id, '596', 'مصروفات أخرى', 'Other Expenses', v_expense_type, v_misc_grp, true, true);

    UPDATE companies SET chart_type = 'simple' WHERE id = p_company_id;
    RAISE NOTICE '✅ تم إنشاء الشجرة القياسية V5.1 للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_simple_chart(UUID) IS 'V5.1 — الشجرة القياسية بترقيم موحد: 217 أوراق دفع, 58 مشتريات/شحن, 59 متنوعة';
