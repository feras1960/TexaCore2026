-- ═══════════════════════════════════════════════════════════════
-- إنشاء الحسابات الافتراضية للشركات
-- ═══════════════════════════════════════════════════════════════

-- Function لإنشاء الحسابات الافتراضية لشركة جديدة
CREATE OR REPLACE FUNCTION public.create_default_accounts_for_company(p_company_id UUID)
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
    v_current_assets_id UUID;
    v_fixed_assets_id UUID;
    v_current_liabilities_id UUID;
BEGIN
    -- إنشاء الحسابات الرئيسية (المجموعات)
    
    -- 1. Assets (الأصول) - 1000
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1000', 'الأصول', 'Assets', 'asset', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_assets_id;
    
    -- Current Assets (الأصول المتداولة) - 1100
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1100', 'الأصول المتداولة', 'Current Assets', 'asset', v_assets_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_current_assets_id;
    
    -- Cash (النقدية) - 1110
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1110', 'النقدية', 'Cash', 'asset', v_current_assets_id, 3, false, true, 'SAR', 0, 0);
    
    -- Bank (الحسابات البنكية) - 1120
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1120', 'الحسابات البنكية', 'Bank Accounts', 'asset', v_current_assets_id, 3, false, true, 'SAR', 0, 0);
    
    -- Fixed Assets (الأصول الثابتة) - 1500
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '1500', 'الأصول الثابتة', 'Fixed Assets', 'asset', v_assets_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_fixed_assets_id;
    
    -- 2. Liabilities (الخصوم) - 2000
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2000', 'الخصوم', 'Liabilities', 'liability', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_liabilities_id;
    
    -- Current Liabilities (الخصوم المتداولة) - 2100
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', v_liabilities_id, 2, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_current_liabilities_id;
    
    -- Accounts Payable (دائنون) - 2110
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '2110', 'دائنون', 'Accounts Payable', 'liability', v_current_liabilities_id, 3, false, true, 'SAR', 0, 0);
    
    -- 3. Equity (حقوق الملكية) - 3000
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '3000', 'حقوق الملكية', 'Equity', 'equity', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_equity_id;
    
    -- Capital (رأس المال) - 3100
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '3100', 'رأس المال', 'Capital', 'equity', v_equity_id, 2, false, true, 'SAR', 0, 0);
    
    -- Retained Earnings (الأرباح المحتجزة) - 3200
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', v_equity_id, 2, false, true, 'SAR', 0, 0);
    
    -- 4. Revenue (الإيرادات) - 4000
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '4000', 'الإيرادات', 'Revenue', 'revenue', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_revenue_id;
    
    -- Sales (المبيعات) - 4100
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '4100', 'المبيعات', 'Sales', 'revenue', v_revenue_id, 2, false, true, 'SAR', 0, 0);
    
    -- 5. Expenses (المصروفات) - 5000
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5000', 'المصروفات', 'Expenses', 'expense', NULL, 1, true, true, 'SAR', 0, 0)
    RETURNING id INTO v_expenses_id;
    
    -- Operating Expenses (المصروفات التشغيلية) - 5100
    INSERT INTO accounts (company_id, code, name, name_en, account_type, parent_id, level, is_group, is_active, currency_code, opening_balance, current_balance)
    VALUES (p_company_id, '5100', 'المصروفات التشغيلية', 'Operating Expenses', 'expense', v_expenses_id, 2, false, true, 'SAR', 0, 0);
END;
$$;

-- Function لإنشاء الحسابات لجميع الشركات الموجودة (إذا لم يكن لديها حسابات)
DO $$
DECLARE
    company_record RECORD;
    account_count INTEGER;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        -- التحقق من وجود حسابات لهذه الشركة
        SELECT COUNT(*) INTO account_count
        FROM accounts
        WHERE company_id = company_record.id;
        
        -- إذا لم يكن لديها حسابات، أنشئ الحسابات الافتراضية
        IF account_count = 0 THEN
            PERFORM public.create_default_accounts_for_company(company_record.id);
            RAISE NOTICE 'Created default accounts for company: %', company_record.id;
        END IF;
    END LOOP;
END $$;

-- منح صلاحية الاستخدام
GRANT EXECUTE ON FUNCTION public.create_default_accounts_for_company TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_accounts_for_company TO anon;
