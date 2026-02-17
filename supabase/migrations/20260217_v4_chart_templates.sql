-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 V4 Chart Templates — الشجرات المحاسبية المعيارية النهائية
-- تاريخ: 2026-02-17 | الإصدار: V4 Final
-- ═══════════════════════════════════════════════════════════════════════════════
-- هذا السكربت يُعيد تعريف جميع دوال إنشاء الشجرات والحسابات الافتراضية
-- ليتوافق مع الشجرات V4 المعتمدة (52 + 79 + 82 حساب)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  1. الشجرة القياسية (Simple) — 52 حساب (16 مجموعة + 36 تفصيلي)     ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

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
    v_cash_grp UUID; v_banks_grp UUID; v_ar_grp UUID; v_inv_grp UUID;
    v_fixed_assets_id UUID;
    v_liabilities_id UUID; v_current_liab_id UUID; v_ap_grp UUID; v_long_liab_id UUID;
    v_equity_id UUID; v_partners_grp UUID;
    v_revenue_id UUID;
    v_expenses_id UUID; v_purchases_grp UUID;
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

    -- ═══ الأصول ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1000', 'الأصول', 'Assets', v_asset_type, NULL, false, true) RETURNING id INTO v_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1100', 'الأصول المتداولة', 'Current Assets', v_current_asset_type, v_assets_id, false, true) RETURNING id INTO v_current_assets_id;

    -- الصندوق
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1110', 'الصندوق', 'Cash', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_cash_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account)
    VALUES
        (v_tenant_id, p_company_id, '1111', 'الصندوق - عملة محلية', 'Cash - Local Currency', v_current_asset_type, v_cash_grp, true, true, true),
        (v_tenant_id, p_company_id, '1112', 'الصندوق - عملة أساسية', 'Cash - Base Currency', v_current_asset_type, v_cash_grp, true, true, true);

    -- البنوك
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1120', 'البنوك', 'Banks', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_banks_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES
        (v_tenant_id, p_company_id, '1121', 'بنك - عملة محلية', 'Bank - Local Currency', v_current_asset_type, v_banks_grp, true, true, true),
        (v_tenant_id, p_company_id, '1122', 'بنك - عملة أساسية', 'Bank - Base Currency', v_current_asset_type, v_banks_grp, true, true, true);

    -- العملاء
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES (v_tenant_id, p_company_id, '1130', 'العملاء', 'Accounts Receivable', v_current_asset_type, v_current_assets_id, false, true, true) RETURNING id INTO v_ar_grp;

    -- المخزون
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1140', 'المخزون', 'Inventory', v_current_asset_type, v_current_assets_id, false, true) RETURNING id INTO v_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', v_current_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', v_current_asset_type, v_inv_grp, true, true);

    -- مصاريف مقدمة + ض.ق.م
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1150', 'مصاريف مقدمة', 'Prepaid Expenses', v_current_asset_type, v_current_assets_id, true, true),
        (v_tenant_id, p_company_id, '1160', 'ض.ق.م - مدخلات', 'VAT Input', v_current_asset_type, v_current_assets_id, true, true);

    -- الأصول الثابتة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1200', 'الأصول الثابتة', 'Fixed Assets', v_fixed_asset_type, v_assets_id, false, true) RETURNING id INTO v_fixed_assets_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1210', 'أصول ثابتة', 'Fixed Assets', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '1220', 'مجمع الإهلاك', 'Accumulated Depreciation', v_fixed_asset_type, v_fixed_assets_id, true, true);

    -- ═══ الخصوم ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2000', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true) RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2100', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_current_liab_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '2110', 'الموردون', 'Accounts Payable', v_current_liability_type, v_current_liab_id, false, true, true) RETURNING id INTO v_ap_grp;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '2120', 'مستحقات الموظفين', 'Accrued Salaries', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '2130', 'ض.ق.م - مخرجات', 'VAT Output', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '2140', 'دائنون آخرون', 'Other Payables', v_current_liability_type, v_current_liab_id, true, true),
        (v_tenant_id, p_company_id, '2150', 'سلف العملاء', 'Customer Advances', v_current_liability_type, v_current_liab_id, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2200', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_long_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_long_liab_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2210', 'قروض طويلة الأجل', 'Long-term Loans', v_long_liability_type, v_long_liab_id, true, true);

    -- ═══ حقوق الملكية ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3000', 'حقوق الملكية', 'Equity', v_equity_type, NULL, false, true) RETURNING id INTO v_equity_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '3100', 'رأس المال', 'Capital', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '3200', 'الاحتياطيات', 'Reserves', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '3300', 'الأرباح المحتجزة', 'Retained Earnings', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '3400', 'أرباح/خسائر العام', 'Current Year P/L', v_equity_type, v_equity_id, true, true);
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3500', 'جاري الشركاء', 'Partners Current', v_equity_type, v_equity_id, false, true) RETURNING id INTO v_partners_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3600', 'أرصدة افتتاحية', 'Opening Balance Equity', v_equity_type, v_equity_id, true, true);

    -- ═══ الإيرادات ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4000', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true) RETURNING id INTO v_revenue_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '4100', 'المبيعات', 'Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '4200', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '4300', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '4500', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true);

    -- ═══ المصروفات ═══
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5000', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true) RETURNING id INTO v_expenses_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5100', 'تكلفة المبيعات', 'Cost of Sales', v_cogs_type, v_expenses_id, true, true);

    -- المشتريات (مجموعة)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5200', 'المشتريات', 'Purchases', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_purchases_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '5210', 'مشتريات عامة', 'General Purchases', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '5220', 'مردودات المشتريات', 'Purchase Returns', v_cogs_type, v_purchases_grp, true, true),
        (v_tenant_id, p_company_id, '5230', 'خصومات المشتريات', 'Purchase Discounts', v_cogs_type, v_purchases_grp, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '5300', 'الرواتب والأجور', 'Salaries & Wages', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5400', 'الإيجارات', 'Rent Expense', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5500', 'المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5600', 'مصاريف إدارية', 'Admin Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5700', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5800', 'مصاريف الشحن والنقل', 'Freight & Shipping', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5850', 'مصاريف الفوائد', 'Interest Expense', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '5900', 'مصاريف أخرى', 'Other Expenses', v_expense_type, v_expenses_id, true, true);

    UPDATE companies SET chart_type = 'simple' WHERE id = p_company_id;
    RAISE NOTICE '✅ تم إنشاء الشجرة القياسية V4 (52 حساب) للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_simple_chart(UUID) IS 'V4 — إنشاء الشجرة القياسية (52 حساب: 16 مجموعة + 36 تفصيلي)';
