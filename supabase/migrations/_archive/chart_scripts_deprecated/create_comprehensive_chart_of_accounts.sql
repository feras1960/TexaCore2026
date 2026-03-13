-- ═══════════════════════════════════════════════════════════════
-- إنشاء شجرة محاسبية شاملة مثل ERPNext
-- تشمل صناديق متعددة بالعملات، حسابات الفروع، وحسابات تفصيلية
-- ═══════════════════════════════════════════════════════════════

-- Function لإنشاء شجرة محاسبية شاملة
CREATE OR REPLACE FUNCTION public.create_comprehensive_chart_of_accounts(
    p_company_id UUID,
    p_chart_type VARCHAR(50) DEFAULT 'standard' -- 'standard', 'saudi', 'uae', 'detailed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assets_id UUID;
    v_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
    
    -- Current Assets
    v_current_assets_id UUID;
    v_cash_id UUID;
    v_bank_id UUID;
    v_receivables_id UUID;
    v_inventory_id UUID;
    
    -- Fixed Assets
    v_fixed_assets_id UUID;
    
    -- Liabilities
    v_current_liabilities_id UUID;
    v_long_term_liabilities_id UUID;
    
    -- Equity
    v_equity_detail_id UUID;
    
    -- Revenue
    v_revenue_detail_id UUID;
    v_sales_id UUID;
    v_other_income_id UUID;
    
    -- Expenses
    v_expenses_detail_id UUID;
    v_cost_of_sales_id UUID;
    v_operating_expenses_id UUID;
    v_financial_expenses_id UUID;
BEGIN
    -- ═══════════════════════════════════════════════════════════
    -- 1. ASSETS (الأصول) - Level 1
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1000', 'الأصول', 'Assets', 'asset', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_assets_id;
    
    -- ═══════════════════════════════════════════════════════════
    -- 1.1 CURRENT ASSETS (الأصول المتداولة) - Level 2
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1100', 'الأصول المتداولة', 'Current Assets', 'asset', v_assets_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_current_assets_id;
    
    -- Cash & Bank (النقد والبنوك) - Level 3
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1110', 'النقد والبنوك', 'Cash & Bank', 'asset', v_current_assets_id, 3, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_cash_id;
    
    -- Multiple Cash Accounts (صناديق متعددة بالعملات)
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '1111', 'الصندوق الرئيسي - ريال', 'Main Cash - SAR', 'asset', v_cash_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1112', 'الصندوق الرئيسي - دولار', 'Main Cash - USD', 'asset', v_cash_id, 4, false, true, 'USD', 0, 0),
        (p_company_id, '1113', 'الصندوق الرئيسي - يورو', 'Main Cash - EUR', 'asset', v_cash_id, 4, false, true, 'EUR', 0, 0),
        (p_company_id, '1114', 'صندوق فرع 1', 'Cash - Branch 1', 'asset', v_cash_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1115', 'صندوق فرع 2', 'Cash - Branch 2', 'asset', v_cash_id, 4, false, true, 'SAR', 0, 0);
    
    -- Bank Accounts (الحسابات البنكية) - Level 3
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1120', 'الحسابات البنكية', 'Bank Accounts', 'asset', v_current_assets_id, 3, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_bank_id;
    
    -- Multiple Bank Accounts
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '1121', 'البنك الأهلي - ريال', 'Al Ahli Bank - SAR', 'asset', v_bank_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1122', 'البنك الأهلي - دولار', 'Al Ahli Bank - USD', 'asset', v_bank_id, 4, false, true, 'USD', 0, 0),
        (p_company_id, '1123', 'البنك السعودي الفرنسي', 'Saudi French Bank', 'asset', v_bank_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1124', 'البنك الراجحي', 'Al Rajhi Bank', 'asset', v_bank_id, 4, false, true, 'SAR', 0, 0);
    
    -- Accounts Receivable (العملاء) - Level 3
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1130', 'العملاء', 'Accounts Receivable', 'asset', v_current_assets_id, 3, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_receivables_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '1131', 'عملاء - نقد', 'Customers - Cash', 'asset', v_receivables_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1132', 'عملاء - آجل', 'Customers - Credit', 'asset', v_receivables_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1133', 'مدينون آخرون', 'Other Debtors', 'asset', v_receivables_id, 4, false, true, 'SAR', 0, 0);
    
    -- Inventory (المخزون) - Level 3
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1140', 'المخزون', 'Inventory', 'asset', v_current_assets_id, 3, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_inventory_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '1141', 'مخزون البضائع', 'Stock in Hand', 'asset', v_inventory_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1142', 'مخزون المواد الخام', 'Raw Materials', 'asset', v_inventory_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1143', 'مخزون قيد التصنيع', 'Work in Progress', 'asset', v_inventory_id, 4, false, true, 'SAR', 0, 0),
        (p_company_id, '1144', 'مخزون البضائع التامة', 'Finished Goods', 'asset', v_inventory_id, 4, false, true, 'SAR', 0, 0);
    
    -- Prepaid Expenses (المصروفات المدفوعة مقدماً) - Level 3
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1150', 'المصروفات المدفوعة مقدماً', 'Prepaid Expenses', 'asset', v_current_assets_id, 3, false, true, 'SAR', 0, 0);
    
    -- ═══════════════════════════════════════════════════════════
    -- 1.2 FIXED ASSETS (الأصول الثابتة) - Level 2
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1500', 'الأصول الثابتة', 'Fixed Assets', 'asset', v_assets_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_fixed_assets_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '1510', 'الأراضي', 'Land', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '1520', 'المباني', 'Buildings', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '1530', 'الآلات والمعدات', 'Machinery & Equipment', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '1540', 'السيارات', 'Vehicles', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '1550', 'الأثاث والمفروشات', 'Furniture & Fixtures', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '1560', 'مجمع الإهلاك', 'Accumulated Depreciation', 'asset', v_fixed_assets_id, 3, false, true, 'SAR', 0, 0);
    
    -- ═══════════════════════════════════════════════════════════
    -- 2. LIABILITIES (الخصوم) - Level 1
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2000', 'الخصوم', 'Liabilities', 'liability', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_liabilities_id;
    
    -- Current Liabilities (الخصوم المتداولة) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', v_liabilities_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_current_liabilities_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '2110', 'الموردون', 'Accounts Payable', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '2120', 'القروض قصيرة الأجل', 'Short Term Loans', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '2130', 'الضريبة المستحقة', 'Tax Payable', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '2140', 'الزكاة المستحقة', 'Zakat Payable', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '2150', 'المصروفات المستحقة', 'Accrued Expenses', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0);
    
    -- Long Term Liabilities (الخصوم طويلة الأجل) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2200', 'الخصوم طويلة الأجل', 'Long Term Liabilities', 'liability', v_liabilities_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_long_term_liabilities_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '2210', 'القروض طويلة الأجل', 'Long Term Loans', 'liability', v_long_term_liabilities_id, 3, false, true, 'SAR', 0, 0);
    
    -- ═══════════════════════════════════════════════════════════
    -- 3. EQUITY (حقوق الملكية) - Level 1
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '3000', 'حقوق الملكية', 'Equity', 'equity', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_equity_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '3100', 'رأس المال', 'Capital', 'equity', v_equity_id, 2, false, true, 'SAR', 0, 0),
        (p_company_id, '3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', v_equity_id, 2, false, true, 'SAR', 0, 0),
        (p_company_id, '3300', 'صافي الدخل', 'Net Income', 'equity', v_equity_id, 2, false, true, 'SAR', 0, 0);
    
    -- ═══════════════════════════════════════════════════════════
    -- 4. REVENUE (الإيرادات) - Level 1
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '4000', 'الإيرادات', 'Revenue', 'revenue', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_revenue_id;
    
    -- Sales (المبيعات) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '4100', 'المبيعات', 'Sales', 'revenue', v_revenue_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_sales_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '4110', 'مبيعات البضائع', 'Sales - Goods', 'revenue', v_sales_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '4120', 'مبيعات الخدمات', 'Sales - Services', 'revenue', v_sales_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '4130', 'خصم مسموح به', 'Discount Allowed', 'revenue', v_sales_id, 3, false, true, 'SAR', 0, 0);
    
    -- Other Income (إيرادات أخرى) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '4200', 'إيرادات أخرى', 'Other Income', 'revenue', v_revenue_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_other_income_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '4210', 'إيرادات الفوائد', 'Interest Income', 'revenue', v_other_income_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '4220', 'إيرادات أخرى', 'Miscellaneous Income', 'revenue', v_other_income_id, 3, false, true, 'SAR', 0, 0);
    
    -- ═══════════════════════════════════════════════════════════
    -- 5. EXPENSES (المصروفات) - Level 1
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5000', 'المصروفات', 'Expenses', 'expense', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_expenses_id;
    
    -- Cost of Sales (تكلفة المبيعات) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5100', 'تكلفة المبيعات', 'Cost of Sales', 'expense', v_expenses_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_cost_of_sales_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '5110', 'تكلفة البضائع المباعة', 'Cost of Goods Sold', 'expense', v_cost_of_sales_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5120', 'مخزون أول المدة', 'Opening Stock', 'expense', v_cost_of_sales_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5130', 'المشتريات', 'Purchases', 'expense', v_cost_of_sales_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5140', 'مخزون آخر المدة', 'Closing Stock', 'expense', v_cost_of_sales_id, 3, false, true, 'SAR', 0, 0);
    
    -- Operating Expenses (المصروفات التشغيلية) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5200', 'المصروفات التشغيلية', 'Operating Expenses', 'expense', v_expenses_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_operating_expenses_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '5210', 'الرواتب والأجور', 'Salaries & Wages', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5220', 'الإيجار', 'Rent', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5230', 'الكهرباء والماء', 'Utilities', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5240', 'الاتصالات', 'Communications', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5250', 'الوقود والمواصلات', 'Fuel & Transportation', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5260', 'الصيانة', 'Maintenance', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5270', 'الإعلان والدعاية', 'Advertising', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5280', 'الاستهلاك', 'Depreciation', 'expense', v_operating_expenses_id, 3, false, true, 'SAR', 0, 0);
    
    -- Financial Expenses (المصروفات المالية) - Level 2
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5300', 'المصروفات المالية', 'Financial Expenses', 'expense', v_expenses_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_financial_expenses_id;
    
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES 
        (p_company_id, '5310', 'فوائد القروض', 'Interest Expense', 'expense', v_financial_expenses_id, 3, false, true, 'SAR', 0, 0),
        (p_company_id, '5320', 'رسوم البنوك', 'Bank Charges', 'expense', v_financial_expenses_id, 3, false, true, 'SAR', 0, 0);
    
END;
$$;

-- Function محدثة لـ trigger
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء الشجرة المحاسبية الشاملة للشركة الجديدة
    PERFORM public.create_comprehensive_chart_of_accounts(NEW.id, 'standard');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث trigger
DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- إنشاء حسابات لجميع الشركات الموجودة (إذا لم يكن لديها)
DO $$
DECLARE
    company_record RECORD;
    account_count INTEGER;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        SELECT COUNT(*) INTO account_count
        FROM accounts
        WHERE company_id = company_record.id;
        
        IF account_count = 0 THEN
            PERFORM public.create_comprehensive_chart_of_accounts(company_record.id, 'standard');
            RAISE NOTICE 'Created comprehensive chart of accounts for company: %', company_record.id;
        END IF;
    END LOOP;
END $$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.create_comprehensive_chart_of_accounts TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_comprehensive_chart_of_accounts TO anon;
