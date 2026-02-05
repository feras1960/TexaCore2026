-- ═══════════════════════════════════════════════════════════════
-- STEP 65: Create Unified Extended Chart Function (72 accounts)
-- ═══════════════════════════════════════════════════════════════
-- Description: Creates the unified extended chart with dynamic banks/cash
-- Accounts: 72 total (Extended) or 80 (Fabric Extended)
-- Author: System
-- Date: 2026-01-30
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_unified_extended_chart(
    p_company_id UUID,
    p_include_fabric_accounts BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_account_type_id UUID;
    
    -- Level 1 IDs
    v_assets_id UUID;
    v_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
    
    -- Level 2 IDs
    v_current_assets_id UUID;
    v_fixed_assets_id UUID;
    v_current_liabilities_id UUID;
    v_long_term_liabilities_id UUID;
    
    -- Level 3 IDs (Groups)
    v_cash_group_id UUID;
    v_bank_group_id UUID;
    v_receivables_group_id UUID;
    v_fabric_inventory_id UUID;
    v_payables_group_id UUID;
    v_fabric_sales_id UUID;
    v_cogs_group_id UUID;
    v_fabric_expenses_id UUID;
BEGIN
    -- Get tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Company not found';
    END IF;
    
    -- Check if chart already exists
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RAISE NOTICE 'Chart of accounts already exists for this company';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating unified extended chart for company %...', p_company_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1️⃣ ASSETS (30 accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    -- 1 - Assets (Group)
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'ASSET';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', v_account_type_id, NULL, true, false, true)
    RETURNING id INTO v_assets_id;
    
    -- 11 - Current Assets (Group)
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'CURRENT_ASSET';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_account_type_id, v_assets_id, true, false, true)
    RETURNING id INTO v_current_assets_id;
    
    -- 111 - Cash (Group) - Dynamic
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_cash_account, is_system)
    VALUES (v_tenant_id, p_company_id, '111', 'الصندوق', 'Cash', v_account_type_id, v_current_assets_id, true, false, true, true)
    RETURNING id INTO v_cash_group_id;
    
    -- Cash sub-accounts
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_cash_account, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '1111', 'الصندوق الرئيسي', 'Main Cash', v_account_type_id, v_cash_group_id, false, true, true, true),
        (v_tenant_id, p_company_id, '1112', 'صندوق فرع 1', 'Branch 1 Cash', v_account_type_id, v_cash_group_id, false, true, true, false),
        (v_tenant_id, p_company_id, '1113', 'صندوق فرع 2', 'Branch 2 Cash', v_account_type_id, v_cash_group_id, false, true, true, false);
    
    -- 112 - Banks (Group) - Dynamic
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_bank_account, is_system)
    VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_account_type_id, v_current_assets_id, true, false, true, true)
    RETURNING id INTO v_bank_group_id;
    
    -- Default bank accounts
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_bank_account, currency, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '1121', 'بنك PrivatBank - UAH', 'PrivatBank - UAH', v_account_type_id, v_bank_group_id, false, true, true, 'UAH', false),
        (v_tenant_id, p_company_id, '1122', 'بنك Monobank - UAH', 'Monobank - UAH', v_account_type_id, v_bank_group_id, false, true, true, 'UAH', false),
        (v_tenant_id, p_company_id, '1123', 'بنك PUMB - UAH', 'PUMB - UAH', v_account_type_id, v_bank_group_id, false, true, true, 'UAH', false),
        (v_tenant_id, p_company_id, '1124', 'بنك PrivatBank - USD', 'PrivatBank - USD', v_account_type_id, v_bank_group_id, false, true, true, 'USD', false),
        (v_tenant_id, p_company_id, '1125', 'بنك Monobank - USD', 'Monobank - USD', v_account_type_id, v_bank_group_id, false, true, true, 'USD', false);
    
    -- 113 - Accounts Receivable (Group) - Dynamic
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_receivable, is_system)
    VALUES (v_tenant_id, p_company_id, '113', 'ذمم العملاء', 'Accounts Receivable', v_account_type_id, v_current_assets_id, true, false, true, true)
    RETURNING id INTO v_receivables_group_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_receivable, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '1131', 'ذمم الجملة', 'Wholesale Receivables', v_account_type_id, v_receivables_group_id, false, true, true, true),
        (v_tenant_id, p_company_id, '1132', 'ذمم التجزئة', 'Retail Receivables', v_account_type_id, v_receivables_group_id, false, true, true, true),
        (v_tenant_id, p_company_id, '1133', 'أوراق القبض', 'Notes Receivable', v_account_type_id, v_receivables_group_id, false, true, true, true);
    
    -- 114 - General Inventory
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '114', 'المخزون', 'Inventory', v_account_type_id, v_current_assets_id, false, true, true);
    
    -- 115 - Fabric Inventory (if fabric chart)
    IF p_include_fabric_accounts THEN
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES (v_tenant_id, p_company_id, '115', 'مخزون الأقمشة', 'Fabric Inventory', v_account_type_id, v_current_assets_id, true, false, true)
        RETURNING id INTO v_fabric_inventory_id;
        
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES 
            (v_tenant_id, p_company_id, '1151', 'مخزون الأقمشة - رولونات', 'Fabric Stock - Rolls', v_account_type_id, v_fabric_inventory_id, false, true, true),
            (v_tenant_id, p_company_id, '1152', 'مخزون الأقمشة - أمتار', 'Fabric Stock - Meters', v_account_type_id, v_fabric_inventory_id, false, true, true),
            (v_tenant_id, p_company_id, '1153', 'مخزون قيد التحويل', 'Inventory in Transit', v_account_type_id, v_fabric_inventory_id, false, true, true),
            (v_tenant_id, p_company_id, '1154', 'مخزون معيب', 'Defective Inventory', v_account_type_id, v_fabric_inventory_id, false, true, true);
    END IF;
    
    -- Other current assets
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '116', 'مصاريف مقدمة', 'Prepaid Expenses', v_account_type_id, v_current_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '117', 'ضريبة القيمة المضافة - مدخلات', 'VAT Input', v_account_type_id, v_current_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Advances', v_account_type_id, v_current_assets_id, false, true, true);
    
    -- 12 - Fixed Assets (Group)
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'FIXED_ASSET';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_account_type_id, v_assets_id, true, false, true)
    RETURNING id INTO v_fixed_assets_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '121', 'المباني و المستودعات', 'Buildings & Warehouses', v_account_type_id, v_fixed_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', v_account_type_id, v_fixed_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث و التجهيزات', 'Furniture & Fixtures', v_account_type_id, v_fixed_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', v_account_type_id, v_fixed_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Systems', v_account_type_id, v_fixed_assets_id, false, true, true),
        (v_tenant_id, p_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', v_account_type_id, v_fixed_assets_id, false, true, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ LIABILITIES (10 accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    -- 2 - Liabilities (Group)
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'LIABILITY';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_account_type_id, NULL, true, false, true)
    RETURNING id INTO v_liabilities_id;
    
    -- 21 - Current Liabilities (Group)
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'CURRENT_LIABILITY';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_account_type_id, v_liabilities_id, true, false, true)
    RETURNING id INTO v_current_liabilities_id;
    
    -- 211 - Accounts Payable (Group)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_payable, is_system)
    VALUES (v_tenant_id, p_company_id, '211', 'دين الموردين', 'Accounts Payable', v_account_type_id, v_current_liabilities_id, true, false, true, true)
    RETURNING id INTO v_payables_group_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_payable, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '2111', 'دين الموردين - الأقمشة', 'Fabric Suppliers Payable', v_account_type_id, v_payables_group_id, false, true, true, true),
        (v_tenant_id, p_company_id, '2112', 'دين الموردين - أخرى', 'Other Suppliers Payable', v_account_type_id, v_payables_group_id, false, true, true, true);
    
    -- Other current liabilities
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '212', 'أوراق الدفع', 'Notes Payable', v_account_type_id, v_current_liabilities_id, false, true, true),
        (v_tenant_id, p_company_id, '213', 'الرواتب المستحقة', 'Accrued Salaries', v_account_type_id, v_current_liabilities_id, false, true, true),
        (v_tenant_id, p_company_id, '214', 'ضريبة القيمة المضافة - مخرجات', 'VAT Output', v_account_type_id, v_current_liabilities_id, false, true, true),
        (v_tenant_id, p_company_id, '215', 'الدفعات المقدمة من العملاء', 'Customer Advances', v_account_type_id, v_current_liabilities_id, false, true, true),
        (v_tenant_id, p_company_id, '216', 'الضرائب المستحقة', 'Taxes Payable', v_account_type_id, v_current_liabilities_id, false, true, true);
    
    -- 22 - Long-term Liabilities (Group)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_account_type_id, v_liabilities_id, true, false, true)
    RETURNING id INTO v_long_term_liabilities_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', v_account_type_id, v_long_term_liabilities_id, false, true, true),
        (v_tenant_id, p_company_id, '222', 'التزامات الإيجار', 'Lease Obligations', v_account_type_id, v_long_term_liabilities_id, false, true, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3️⃣ EQUITY (4 accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'EQUITY';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_account_type_id, NULL, true, false, true)
    RETURNING id INTO v_equity_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_account_type_id, v_equity_id, false, true, true),
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', v_account_type_id, v_equity_id, false, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', v_account_type_id, v_equity_id, false, true, true),
        (v_tenant_id, p_company_id, '34', 'احتياطيات', 'Reserves', v_account_type_id, v_equity_id, false, true, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4️⃣ REVENUE (12 accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'REVENUE';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_account_type_id, NULL, true, false, true)
    RETURNING id INTO v_revenue_id;
    
    -- Fabric sales (if fabric chart)
    IF p_include_fabric_accounts THEN
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES (v_tenant_id, p_company_id, '41', 'مبيعات الأقمشة', 'Fabric Sales', v_account_type_id, v_revenue_id, true, false, true)
        RETURNING id INTO v_fabric_sales_id;
        
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES 
            (v_tenant_id, p_company_id, '411', 'مبيعات الأقمشة - جملة', 'Fabric Sales - Wholesale', v_account_type_id, v_fabric_sales_id, false, true, true),
            (v_tenant_id, p_company_id, '412', 'مبيعات الأقمشة - تجزئة', 'Fabric Sales - Retail', v_account_type_id, v_fabric_sales_id, false, true, true),
            (v_tenant_id, p_company_id, '413', 'مبيعات الرولونات', 'Roll Sales', v_account_type_id, v_fabric_sales_id, false, true, true);
    ELSE
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES (v_tenant_id, p_company_id, '41', 'مبيعات عامة', 'General Sales', v_account_type_id, v_revenue_id, false, true, true);
    END IF;
    
    -- Other revenue
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '42', 'مبيعات خدمات', 'Service Revenue', v_account_type_id, v_revenue_id, false, true, true),
        (v_tenant_id, p_company_id, '43', 'خصومات المبيعات', 'Sales Discounts', v_account_type_id, v_revenue_id, false, true, true),
        (v_tenant_id, p_company_id, '44', 'مردودات المبيعات', 'Sales Returns', v_account_type_id, v_revenue_id, false, true, true),
        (v_tenant_id, p_company_id, '45', 'إيرادات أخرى', 'Other Income', v_account_type_id, v_revenue_id, false, true, true),
        (v_tenant_id, p_company_id, '46', 'أرباح فروقات العملة', 'FX Gains', v_account_type_id, v_revenue_id, false, true, true),
        (v_tenant_id, p_company_id, '47', 'إيرادات الفوائد', 'Interest Income', v_account_type_id, v_revenue_id, false, true, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5️⃣ EXPENSES (18-24 accounts)
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_account_type_id FROM account_types WHERE code = 'EXPENSE';
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_account_type_id, NULL, true, false, true)
    RETURNING id INTO v_expenses_id;
    
    -- 51 - COGS (Group)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES (v_tenant_id, p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', v_account_type_id, v_expenses_id, true, false, true)
    RETURNING id INTO v_cogs_group_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '511', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', v_account_type_id, v_cogs_group_id, false, true, true),
        (v_tenant_id, p_company_id, '512', 'تكلفة المبيعات العامة', 'General COGS', v_account_type_id, v_cogs_group_id, false, true, true),
        (v_tenant_id, p_company_id, '513', 'تكلفة الخدمات المباعة', 'Cost of Services', v_account_type_id, v_cogs_group_id, false, true, true);
    
    -- 52 - Fabric Expenses (if fabric chart)
    IF p_include_fabric_accounts THEN
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES (v_tenant_id, p_company_id, '52', 'مصاريف الأقمشة', 'Fabric Expenses', v_account_type_id, v_expenses_id, true, false, true)
        RETURNING id INTO v_fabric_expenses_id;
        
        INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
        VALUES 
            (v_tenant_id, p_company_id, '521', 'مصاريف العينات', 'Sample Expenses', v_account_type_id, v_fabric_expenses_id, false, true, true),
            (v_tenant_id, p_company_id, '522', 'مصاريف القص والهالك', 'Cutting & Waste', v_account_type_id, v_fabric_expenses_id, false, true, true),
            (v_tenant_id, p_company_id, '523', 'مصاريف الشحن والجمارك', 'Shipping & Customs', v_account_type_id, v_fabric_expenses_id, false, true, true),
            (v_tenant_id, p_company_id, '524', 'مصاريف التخزين', 'Storage Expenses', v_account_type_id, v_fabric_expenses_id, false, true, true),
            (v_tenant_id, p_company_id, '525', 'مصاريف الفحص والجودة', 'Quality Control', v_account_type_id, v_fabric_expenses_id, false, true, true);
    END IF;
    
    -- Operating Expenses
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_group, is_detail, is_system)
    VALUES 
        (v_tenant_id, p_company_id, '53', 'مصروفات الرواتب', 'Salary Expenses', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '54', 'مصروفات الإيجار', 'Rent Expenses', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '55', 'مصروفات المرافق', 'Utilities', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '56', 'مصروفات التسويق', 'Marketing Expenses', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات إدارية', 'Administrative Expenses', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '58', 'مصروفات الإهلاك', 'Depreciation Expense', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '59', 'مصروفات البنوك', 'Bank Charges', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '591', 'خسائر فروقات العملة', 'FX Losses', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '592', 'فروق المخزون', 'Inventory Variances', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات الصيانة', 'Maintenance', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '594', 'مصروفات التأمين', 'Insurance', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '595', 'مصروفات قانونية ومهنية', 'Legal & Professional', v_account_type_id, v_expenses_id, false, true, true),
        (v_tenant_id, p_company_id, '596', 'مصروفات أخرى', 'Other Expenses', v_account_type_id, v_expenses_id, false, true, true);
    
    -- Update company chart type
    UPDATE companies 
    SET chart_type = CASE 
        WHEN p_include_fabric_accounts THEN 'fabric_extended'
        ELSE 'extended'
    END
    WHERE id = p_company_id;
    
    RAISE NOTICE '✅ Unified extended chart created successfully!';
    RAISE NOTICE '   Chart type: %', CASE WHEN p_include_fabric_accounts THEN 'fabric_extended (80 accounts)' ELSE 'extended (72 accounts)' END;
END;
$$;

COMMENT ON FUNCTION create_unified_extended_chart IS 'Create unified extended COA with 72 accounts (or 80 with fabric)';

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 65 completed successfully!';
    RAISE NOTICE '   - create_unified_extended_chart() function created';
    RAISE NOTICE '   - Supports 72 accounts (extended) or 80 (fabric_extended)';
    RAISE NOTICE '   - Dynamic banks (112 → 1121, 1122, ...)';
    RAISE NOTICE '   - Dynamic cash (111 → 1111, 1112, ...)';
END $$;
