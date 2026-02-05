-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FABRIC EXTENDED CHART TEMPLATE
-- This script replaces the simplified function with a comprehensive version
-- tailored for Textile/Fabric business needs.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    
    -- Account Type IDs
    v_asset UUID; v_curr_asset UUID; v_fixed_asset UUID;
    v_liability UUID; v_curr_liab UUID; v_long_liab UUID;
    v_equity UUID;
    v_revenue UUID;
    v_expense UUID; v_cogs UUID;

    -- Parent Account IDs (for hierarchy)
    v_assets_id UUID; v_curr_assets_id UUID; v_fixed_assets_id UUID;
    v_cash_id UUID; v_bank_id UUID; v_receivables_id UUID;
    v_inventory_id UUID; v_fabric_inv_id UUID; v_acc_inv_id UUID;
    
    v_liabilities_id UUID; v_curr_liab_id UUID; v_payables_id UUID;
    
    v_equity_id UUID;
    
    v_revenue_id UUID; v_sales_id UUID;
    
    v_expenses_id UUID; v_direct_costs_id UUID; v_admin_exp_id UUID; v_marketing_exp_id UUID;
BEGIN
    -- 1. Get Tenant ID & Validate
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Company not found';
    END IF;

    -- 2. Check if acts already exist (Optional: if you want to force overwrite, you'd delete here. 
    -- But safe approach is to stop or return).
    -- For this fix, let's assume we want to APPEND if empty, or user will wipe manually.
    -- IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id) THEN ... END IF;

    -- 3. Get Account Types (Assuming standard seeds exist)
    SELECT id INTO v_asset FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_curr_asset FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_curr_liab FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_liab FROM account_types WHERE code = 'LONG_TERM_LIABILITY';
    SELECT id INTO v_equity FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs FROM account_types WHERE code = 'COGS';

    RAISE NOTICE 'Creating Full Fabric Structure...';

    -- ════════════════════ ASSETS ════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', v_asset, NULL, true)
    RETURNING id INTO v_assets_id;

        -- Current Assets
        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_curr_asset, v_assets_id, true)
        RETURNING id INTO v_curr_assets_id;

            -- Cash & Equivalent
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES (v_tenant_id, p_company_id, '111', 'النقد وما يعادله', 'Cash & Equivalent', v_curr_asset, v_curr_assets_id, true)
            RETURNING id INTO v_cash_id;

                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES 
                (v_tenant_id, p_company_id, '1111', 'الصندوق الرئيسي', 'Main Cash', v_curr_asset, v_cash_id, false),
                (v_tenant_id, p_company_id, '1112', 'صندوق المعرض', 'Showroom Cash', v_curr_asset, v_cash_id, false);

            -- Banks
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES (v_tenant_id, p_company_id, '112', 'البنوك', 'Banks', v_curr_asset, v_curr_assets_id, true)
            RETURNING id INTO v_bank_id;

                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES (v_tenant_id, p_company_id, '1121', 'الحساب الجاري - بنك 1', 'Current Account - Bank 1', v_curr_asset, v_bank_id, false);

            -- Receivables (CONTROL ACCOUNT - As agreed)
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES (v_tenant_id, p_company_id, '113', 'الذمم المدينة (العملاء)', 'Accounts Receivable', v_curr_asset, v_curr_assets_id, true)
            RETURNING id INTO v_receivables_id;
            
                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES 
                (v_tenant_id, p_company_id, '1131', 'عملاء الجملة', 'Wholesale Customers', v_curr_asset, v_receivables_id, false),
                (v_tenant_id, p_company_id, '1132', 'عملاء التجزئة', 'Retail Customers', v_curr_asset, v_receivables_id, false);

            -- Inventory (The Core of Fabric Business)
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES (v_tenant_id, p_company_id, '114', 'المخزون', 'Inventory', v_curr_asset, v_curr_assets_id, true)
            RETURNING id INTO v_inventory_id;

                -- Fabric Categories
                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES (v_tenant_id, p_company_id, '1141', 'مخزون الأقمشة', 'Fabric Inventory', v_curr_asset, v_inventory_id, true)
                RETURNING id INTO v_fabric_inv_id;

                    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                    VALUES 
                    (v_tenant_id, p_company_id, '11411', 'مخزون أقمشة خام', 'Raw Fabric', v_curr_asset, v_fabric_inv_id, false),
                    (v_tenant_id, p_company_id, '11412', 'مخزون أقمشة تامة الصنع', 'Finished Fabric', v_curr_asset, v_fabric_inv_id, false),
                    (v_tenant_id, p_company_id, '11413', 'مخزون قصاصات / فضلات', 'Scrap Fabric', v_curr_asset, v_fabric_inv_id, false);

                -- Accessories
                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES (v_tenant_id, p_company_id, '1142', 'مخزون الإكسسوارات', 'Accessories Inventory', v_curr_asset, v_inventory_id, true)
                RETURNING id INTO v_acc_inv_id;

                     INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                    VALUES 
                    (v_tenant_id, p_company_id, '11421', 'أزرار وسحابات', 'Buttons & Zippers', v_curr_asset, v_acc_inv_id, false),
                    (v_tenant_id, p_company_id, '11422', 'خيوط', 'Threads', v_curr_asset, v_acc_inv_id, false);

        -- Fixed Assets
        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_fixed_asset, v_assets_id, true)
        RETURNING id INTO v_fixed_assets_id;

             INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
             VALUES 
             (v_tenant_id, p_company_id, '121', 'آلات ومعدات نسيج', 'Textile Machines', v_fixed_asset, v_fixed_assets_id, false),
             (v_tenant_id, p_company_id, '122', 'أثاث ومفروشات', 'Furniture', v_fixed_asset, v_fixed_assets_id, false),
             (v_tenant_id, p_company_id, '123', 'أجهزة كمبيوتر وبرامج', 'IT Equipment', v_fixed_asset, v_fixed_assets_id, false);

    -- ════════════════════ LIABILITIES ════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', v_liability, NULL, true)
    RETURNING id INTO v_liabilities_id;

        -- Current Liabilities
        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_curr_liab, v_liabilities_id, true)
        RETURNING id INTO v_curr_liab_id;

            -- Payables (CONTROL ACCOUNT)
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES (v_tenant_id, p_company_id, '211', 'الذمم الدائنة (الموردين)', 'Accounts Payable', v_curr_liab, v_curr_liab_id, true)
            RETURNING id INTO v_payables_id;
            
                INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
                VALUES 
                (v_tenant_id, p_company_id, '2111', 'موردين محليين', 'Local Suppliers', v_curr_liab, v_payables_id, false),
                (v_tenant_id, p_company_id, '2112', 'موردين خارجيين', 'Intl Suppliers', v_curr_liab, v_payables_id, false);

            -- Tax
            INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
            VALUES 
            (v_tenant_id, p_company_id, '212', 'ضريبة القيمة المضافة', 'VAT Payable', v_curr_liab, v_curr_liab_id, false);

    -- ════════════════════ EQUITY ════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', v_equity, NULL, true)
    RETURNING id INTO v_equity_id;

        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES 
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', v_equity, v_equity_id, false),
        (v_tenant_id, p_company_id, '32', 'جاري المالك', 'Owner Drawing', v_equity, v_equity_id, false),
        (v_tenant_id, p_company_id, '33', 'الأرباح المدورة', 'Retained Earnings', v_equity, v_equity_id, false);

    -- ════════════════════ REVENUE ════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', v_revenue, NULL, true)
    RETURNING id INTO v_revenue_id;

        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '41', 'إيرادات المبيعات', 'Sales Revenue', v_revenue, v_revenue_id, true)
        RETURNING id INTO v_sales_id;

             INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
             VALUES 
             (v_tenant_id, p_company_id, '411', 'مبيعات أقمشة', 'Fabric Sales', v_revenue, v_sales_id, false),
             (v_tenant_id, p_company_id, '412', 'مبيعات إكسسوارات', 'Accessories Sales', v_revenue, v_sales_id, false);

    -- ════════════════════ EXPENSES ════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', v_expense, NULL, true)
    RETURNING id INTO v_expenses_id;

        -- COGS
        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '51', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', v_cogs, v_expenses_id, true)
        RETURNING id INTO v_direct_costs_id;

             INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
             VALUES 
             (v_tenant_id, p_company_id, '511', 'تكلفة مبيعات الأقمشة', 'COGS - Fabric', v_cogs, v_direct_costs_id, false);

        -- Expenses Categories
        INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
        VALUES (v_tenant_id, p_company_id, '52', 'المصروفات الإدارية', 'Admin Expenses', v_expense, v_expenses_id, true)
        RETURNING id INTO v_admin_exp_id;

             INSERT INTO chart_of_accounts (tenant_id, company_id, code, name_ar, name_en, type_id, parent_id, is_group)
             VALUES 
             (v_tenant_id, p_company_id, '521', 'رواتب وإجور', 'Salaries', v_expense, v_admin_exp_id, false),
             (v_tenant_id, p_company_id, '522', 'إيجارات', 'Rent', v_expense, v_admin_exp_id, false),
             (v_tenant_id, p_company_id, '523', 'كهرباء وماء', 'Utilities', v_expense, v_admin_exp_id, false);

    -- Mark Company as having this chart
    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;

    RAISE NOTICE '✅ Comprehensive Fabric Chart Created.';
END;
$$;
