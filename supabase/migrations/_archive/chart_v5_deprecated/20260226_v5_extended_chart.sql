-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔵 V5 الشجرة الموسعة — Extended Chart of Accounts
-- تاريخ: 2026-02-26
-- ═══════════════════════════════════════════════════════════════════════════════
-- التغييرات عن V4:
-- • 212 أوراق الدفع → 217
-- • 2113 مقدمو الخدمات → 212 (مستوى أعلى مع 2121-2125)
-- • 1143 بضاعة في الطريق → 115 (مستوى أعلى تحت 11)
-- • 58 إهلاك [D] → مصاريف المشتريات والشحن [G] مع 581-584
-- • 5800/5810-5840 → محذوفة (مُدمجة في 58/581-584)
-- • 59 بنوك [D] → مصروفات متنوعة [G] مع 591-598
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_extended_chart(UUID);

CREATE OR REPLACE FUNCTION create_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    -- Account type IDs
    v_asset_type UUID;
    v_liability_type UUID;
    v_equity_type UUID;
    v_revenue_type UUID;
    v_expense_type UUID;
    v_cogs_type UUID;
    -- Group IDs
    v_assets_id UUID;
    v_current_assets UUID;
    v_cash_grp UUID;
    v_banks_grp UUID;
    v_recv_grp UUID;
    v_inv_grp UUID;
    v_fixed_assets UUID;
    v_git_grp UUID;
    v_liabilities_id UUID;
    v_current_liab UUID;
    v_payable_grp UUID;
    v_logistics_grp UUID;
    v_longterm_liab UUID;
    v_emp_payable_grp UUID;
    v_equity_id UUID;
    v_capital_grp UUID;
    v_partner_current_grp UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
    v_cogs_grp UUID;
    v_purchases_grp UUID;
    v_purch_exp_grp UUID;
    v_misc_exp_grp UUID;
    v_exchange_grp UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'الشركة % غير موجودة', p_company_id; END IF;

    -- Get account types
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';
    IF v_cogs_type IS NULL THEN v_cogs_type := v_expense_type; END IF;

    -- ═══════════════════════════════════════════════════════
    -- 1️⃣ الأصول (1)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', v_asset_type, false, true) RETURNING id INTO v_assets_id;

    -- الأصول المتداولة (11)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_asset_type, v_assets_id, false, true) RETURNING id INTO v_current_assets;

    -- الصندوق (111)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account)
    VALUES (v_tenant_id, p_company_id, '111', 'الصندوق', 'Cash', v_asset_type, v_current_assets, false, true, true) RETURNING id INTO v_cash_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account)
    VALUES
        (v_tenant_id, p_company_id, '1111', 'صندوق - عملة محلية', 'Cash - Local Currency', v_asset_type, v_cash_grp, true, true, true),
        (v_tenant_id, p_company_id, '1112', 'صندوق - عملة أساسية', 'Cash - Base Currency', v_asset_type, v_cash_grp, true, true, true),
        (v_tenant_id, p_company_id, '1113', 'صندوق النثرية', 'Petty Cash', v_asset_type, v_cash_grp, true, true, true);

    -- البنوك (112)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_asset_type, v_current_assets, false, true, true) RETURNING id INTO v_banks_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_bank_account)
    VALUES
        (v_tenant_id, p_company_id, '1121', 'بنك - عملة محلية', 'Bank - Local Currency', v_asset_type, v_banks_grp, true, true, true),
        (v_tenant_id, p_company_id, '1122', 'بنك - عملة أساسية', 'Bank - Base Currency', v_asset_type, v_banks_grp, true, true, true);

    -- ذمم العملاء (113)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES (v_tenant_id, p_company_id, '113', 'ذمم العملاء', 'Accounts Receivable', v_asset_type, v_current_assets, false, true, true) RETURNING id INTO v_recv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_receivable)
    VALUES
        (v_tenant_id, p_company_id, '1131', 'ذمم الجملة', 'Wholesale Receivables', v_asset_type, v_recv_grp, true, true, true),
        (v_tenant_id, p_company_id, '1132', 'ذمم التجزئة', 'Retail Receivables', v_asset_type, v_recv_grp, true, true, true),
        (v_tenant_id, p_company_id, '1133', 'أوراق القبض', 'Notes Receivable', v_asset_type, v_recv_grp, true, true, true);
    -- 📊 حساب ملخص العملاء (ظاهر في الشجرة → يفتح شيت قائمة العملاء)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_summary_account, summary_party_type, is_system)
    VALUES (v_tenant_id, p_company_id, '1131-SUM', 'إجمالي ذمم العملاء', 'Total Customer Receivables', v_asset_type, v_recv_grp, true, true, true, 'customer', true);

    -- المخزون (114)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '114', 'المخزون', 'Inventory', v_asset_type, v_current_assets, false, true) RETURNING id INTO v_inv_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', v_asset_type, v_inv_grp, true, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', v_asset_type, v_inv_grp, true, true);

    -- بضاعة في الطريق (115) — V5.1: كانت 1143 تحت المخزون
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '115', 'بضاعة في الطريق', 'Goods in Transit', v_asset_type, v_current_assets, false, true) RETURNING id INTO v_git_grp;

    -- أصول متداولة أخرى
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '116', 'مصاريف مقدمة', 'Prepaid Expenses', v_asset_type, v_current_assets, true, true),
        (v_tenant_id, p_company_id, '117', 'ضريبة القيمة المضافة - مدخلات', 'VAT Input', v_asset_type, v_current_assets, true, true),
        (v_tenant_id, p_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Advances', v_asset_type, v_current_assets, true, true);

    -- الأصول الثابتة (12)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_asset_type, v_assets_id, false, true) RETURNING id INTO v_fixed_assets;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '121', 'المباني والمستودعات', 'Buildings & Warehouses', v_asset_type, v_fixed_assets, true, true),
        (v_tenant_id, p_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', v_asset_type, v_fixed_assets, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث والتجهيزات', 'Furniture & Fixtures', v_asset_type, v_fixed_assets, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', v_asset_type, v_fixed_assets, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Systems', v_asset_type, v_fixed_assets, true, true),
        (v_tenant_id, p_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', v_asset_type, v_fixed_assets, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 2️⃣ الخصوم (2)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, false, true) RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_current_liab;

    -- الموردون (211)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '211', 'دين الموردين', 'Accounts Payable', v_liability_type, v_current_liab, false, true, true) RETURNING id INTO v_payable_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES
        (v_tenant_id, p_company_id, '2111', 'دين الموردين - رئيسي', 'Main Suppliers Payable', v_liability_type, v_payable_grp, true, true, true),
        (v_tenant_id, p_company_id, '2112', 'دين الموردين - أخرى', 'Other Suppliers Payable', v_liability_type, v_payable_grp, true, true, true);
    -- 📊 حساب ملخص الموردين
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_summary_account, summary_party_type, is_system)
    VALUES (v_tenant_id, p_company_id, '2111-SUM', 'إجمالي ذمم الموردين', 'Total Supplier Payables', v_liability_type, v_payable_grp, true, true, true, 'supplier', true);

    -- مقدمو خدمات الشحن والتوريد (212) ← V5 NEW POSITION
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '212', 'مقدمو خدمات الشحن والتوريد', 'Logistics Service Providers', v_liability_type, v_current_liab, false, true) RETURNING id INTO v_logistics_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '2121', 'شركات الشحن البحري', 'Ocean Freight Companies', v_liability_type, v_logistics_grp, true, true),
        (v_tenant_id, p_company_id, '2122', 'مكاتب التخليص الجمركي', 'Customs Clearance', v_liability_type, v_logistics_grp, true, true),
        (v_tenant_id, p_company_id, '2123', 'شركات النقل الداخلي', 'Inland Transport', v_liability_type, v_logistics_grp, true, true),
        (v_tenant_id, p_company_id, '2124', 'شركات التأمين', 'Insurance Companies', v_liability_type, v_logistics_grp, true, true),
        (v_tenant_id, p_company_id, '2125', 'خدمات لوجستية أخرى', 'Other Logistics', v_liability_type, v_logistics_grp, true, true);

    -- شركات الصرافة والحوالات (2126) ← V5.2
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2126', 'شركات الصرافة والحوالات', 'Exchange & Remittance Companies', v_liability_type, v_logistics_grp, true, false, true) RETURNING id INTO v_exchange_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21261', 'شركة صرافة - عام', 'General Exchange Company', v_liability_type, v_exchange_grp, false, true, true);

    -- مستحقات الموظفين (213) — V5.3: محوّل لمجموعة مع حساب ملخص
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_group)
    VALUES (v_tenant_id, p_company_id, '213', 'مستحقات الموظفين', 'Employee Payables', v_liability_type, v_current_liab, false, true, true) RETURNING id INTO v_emp_payable_grp;
    -- 📊 حساب ملخص الموظفين
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_summary_account, summary_party_type, is_system)
    VALUES (v_tenant_id, p_company_id, '213-SUM', 'مستحقات الموظفين', 'Employee Payables Summary', v_liability_type, v_emp_payable_grp, true, true, true, 'employee', true);

    -- باقي الخصوم المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '214', 'ضريبة القيمة المضافة - مخرجات', 'VAT Output', v_liability_type, v_current_liab, true, true),
        (v_tenant_id, p_company_id, '215', 'الدفعات المقدمة من العملاء', 'Customer Advances', v_liability_type, v_current_liab, true, true),
        (v_tenant_id, p_company_id, '216', 'الضرائب المستحقة', 'Taxes Payable', v_liability_type, v_current_liab, true, true),
        (v_tenant_id, p_company_id, '217', 'أوراق الدفع', 'Notes Payable', v_liability_type, v_current_liab, true, true);

    -- خصوم طويلة الأجل (22)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_liability_type, v_liabilities_id, false, true) RETURNING id INTO v_longterm_liab;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', v_liability_type, v_longterm_liab, true, true),
        (v_tenant_id, p_company_id, '222', 'التزامات الإيجار', 'Lease Obligations', v_liability_type, v_longterm_liab, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 3️⃣ حقوق الملكية (3)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_equity_type, false, true) RETURNING id INTO v_equity_id;

    -- 31 رأس المال (GROUP → 311 حصص الشركاء + SUM)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_equity_type, v_equity_id, false, true) RETURNING id INTO v_capital_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '311', 'حصص الشركاء', 'Partners Capital', v_equity_type, v_capital_grp, false, true) RETURNING id INTO v_capital_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '311-SUM', 'إجمالي حصص الشركاء', 'Total Partners Capital', v_equity_type, v_capital_grp, true, true);

    -- 32-33 حسابات مستقلة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', v_equity_type, v_equity_id, true, true);

    -- 34 جاري الشركاء (GROUP → 341 + SUM)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '34', 'جاري الشركاء', 'Partners Current Accounts', v_equity_type, v_equity_id, false, true) RETURNING id INTO v_partner_current_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '341', 'حسابات جارية للشركاء', 'Partners Running Accounts', v_equity_type, v_partner_current_grp, false, true) RETURNING id INTO v_partner_current_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '341-SUM', 'إجمالي جاري الشركاء', 'Total Partners Current', v_equity_type, v_partner_current_grp, true, true);

    -- 35 أرصدة افتتاحية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '35', 'أرصدة افتتاحية', 'Opening Balance Equity', v_equity_type, v_equity_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 4️⃣ الإيرادات (4)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, false, true) RETURNING id INTO v_revenue_id;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '41', 'المبيعات', 'Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '42', 'مبيعات خدمات', 'Service Revenue', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '43', 'خصومات المبيعات', 'Sales Discounts', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '47', 'إيرادات الفوائد', 'Interest Income', v_revenue_type, v_revenue_id, true, true);

    -- ═══════════════════════════════════════════════════════
    -- 5️⃣ المصروفات (5)
    -- ═══════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, false, true) RETURNING id INTO v_expenses_id;

    -- تكلفة المبيعات (51)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', v_cogs_type, v_expenses_id, false, true) RETURNING id INTO v_cogs_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '511', 'تكلفة المبيعات الأساسية', 'Primary COGS', v_cogs_type, v_cogs_grp, true, true),
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

    -- مصروفات تشغيلية (53-57)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '53', 'مصروفات الرواتب', 'Salary Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '54', 'مصروفات الإيجار', 'Rent Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '55', 'مصروفات المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '56', 'مصروفات التسويق', 'Marketing Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات إدارية', 'Administrative Expenses', v_expense_type, v_expenses_id, true, true);

    -- مصاريف المشتريات والشحن (58) ← V5: كانت 5800
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '58', 'مصاريف المشتريات والشحن', 'Purchase & Shipping Expenses', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_purch_exp_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '581', 'مصاريف الشحن', 'Shipping Expenses', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '582', 'مصاريف الجمركة', 'Customs Expenses', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '583', 'تأمين بحري وشحن', 'Marine & Cargo Insurance', v_expense_type, v_purch_exp_grp, true, true),
        (v_tenant_id, p_company_id, '584', 'مصاريف مشتريات أخرى', 'Other Purchase Expenses', v_expense_type, v_purch_exp_grp, true, true);

    -- مصروفات متنوعة (59) ← V5: كانت بنوك فقط
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '59', 'مصروفات متنوعة', 'Miscellaneous Expenses', v_expense_type, v_expenses_id, false, true) RETURNING id INTO v_misc_exp_grp;
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES
        (v_tenant_id, p_company_id, '591', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '592', 'فروق المخزون', 'Inventory Variances', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات الصيانة', 'Maintenance Expenses', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '594', 'مصروفات التأمين', 'Insurance Expenses', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '595', 'مصروفات قانونية ومهنية', 'Legal & Professional', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '596', 'مصروفات أخرى', 'Other Expenses', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '597', 'مصروفات الإهلاك', 'Depreciation Expense', v_expense_type, v_misc_exp_grp, true, true),
        (v_tenant_id, p_company_id, '598', 'مصروفات البنوك', 'Bank Charges', v_expense_type, v_misc_exp_grp, true, true);

    UPDATE companies SET chart_type = 'extended' WHERE id = p_company_id;
    RAISE NOTICE '✅ تم إنشاء الشجرة الموسعة V5.2 (84 حساب) للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_extended_chart(UUID) IS 'V5.2 — الشجرة الموسعة (84 حساب): 115=GIT, 212=لوجستيك, 2126=صرافة, 217=أوراق دفع, 58=مشتريات/شحن, 59=متنوعة';
