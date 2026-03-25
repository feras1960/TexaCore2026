-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 9: إصلاح وإنشاء الشجرة مباشرة
-- Step 9: Fix and Create Chart Directly
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

-- التحقق من وجود الدالة أولاً
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_fabric_extended_chart') 
        THEN '✅ الدالة موجودة'
        ELSE '❌ الدالة غير موجودة - سيتم إنشاء الشجرة مباشرة'
    END AS function_status;

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_count INT;
    v_asset_type UUID;
    v_current_asset_type UUID;
    v_fixed_asset_type UUID;
    v_liability_type UUID;
    v_current_liability_type UUID;
    v_long_term_liability_type UUID;
    v_equity_type UUID;
    v_revenue_type UUID;
    v_expense_type UUID;
    v_cogs_type UUID;
    v_assets_id UUID;
    v_current_assets_id UUID;
    v_fixed_assets_id UUID;
    v_fabric_inventory_id UUID;
    v_liabilities_id UUID;
    v_current_liabilities_id UUID;
    v_long_term_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 إنشاء الشجرة مباشرة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على شركة';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 Tenant ID: %', v_tenant_id;
    RAISE NOTICE '📌 Company ID: %', v_company_id;
    
    -- حذف الحسابات القديمة إن وجدت
    DELETE FROM chart_of_accounts WHERE company_id = v_company_id;
    RAISE NOTICE '🗑️ تم حذف الحسابات القديمة';
    
    -- الحصول على أنواع الحسابات
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_term_liability_type FROM account_types WHERE code = 'LONG_TERM_LIABILITY';
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';
    
    IF v_asset_type IS NULL THEN
        RAISE NOTICE '❌ أنواع الحسابات غير موجودة';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔄 بدء إنشاء الحسابات...';
    
    -- 1. الأصول
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '1', 'الأصول', 'Assets', v_asset_type, NULL, false, true)
    RETURNING id INTO v_assets_id;
    
    -- 11 الأصول المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '11', 'الأصول المتداولة', 'Current Assets', v_current_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_current_assets_id;
    
    -- 111-118
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable)
    VALUES 
        (v_tenant_id, v_company_id, '111', 'الصندوق الرئيسي', 'Main Cash', v_current_asset_type, v_current_assets_id, true, true, true, false, false),
        (v_tenant_id, v_company_id, '112', 'البنك - العملة المحلية', 'Bank - Local Currency', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, v_company_id, '113', 'البنك - دولار', 'Bank - USD', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, v_company_id, '114', 'البنك - يورو', 'Bank - EUR', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, v_company_id, '115', 'ذمم الجملة', 'Wholesale Receivables', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, v_company_id, '116', 'ذمم التجزئة', 'Retail Receivables', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, v_company_id, '117', 'أوراق القبض', 'Notes Receivable', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, v_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Advances', v_current_asset_type, v_current_assets_id, true, true, false, false, false);
    
    -- 12 الأصول الثابتة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_fixed_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_fixed_assets_id;
    
    -- 121-129
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '121', 'المباني و المستودعات', 'Buildings & Warehouses', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, v_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, v_company_id, '123', 'الأثاث و التجهيزات', 'Furniture & Fixtures', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, v_company_id, '124', 'وسائل النقل', 'Vehicles', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, v_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Systems', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, v_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', v_fixed_asset_type, v_fixed_assets_id, true, true);
    
    -- 13 مخزون الأقمشة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '13', 'مخزون الأقمشة', 'Fabric Inventory', v_current_asset_type, v_current_assets_id, false, true)
    RETURNING id INTO v_fabric_inventory_id;
    
    -- 131-134
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '131', 'مخزون الأقمشة - رولونات', 'Fabric Stock - Rolls', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, v_company_id, '132', 'مخزون الأقمشة - أمتار', 'Fabric Stock - Meters', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, v_company_id, '133', 'مخزون قيد التحويل', 'Inventory in Transit', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, v_company_id, '134', 'مخزون معيب', 'Defective Inventory', v_current_asset_type, v_fabric_inventory_id, true, true);
    
    -- 2. الخصوم
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '2', 'الخصوم', 'Liabilities', v_liability_type, NULL, false, true)
    RETURNING id INTO v_liabilities_id;
    
    -- 21 الخصوم المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_current_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_current_liabilities_id;
    
    -- 211-216
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES 
        (v_tenant_id, v_company_id, '211', 'دين موردين الأقمشة', 'Fabric Suppliers Payable', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, v_company_id, '212', 'دين موردين آخرين', 'Other Suppliers Payable', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, v_company_id, '213', 'أوراق الدفع', 'Notes Payable', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, v_company_id, '214', 'الرواتب المستحقة', 'Accrued Salaries', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, v_company_id, '215', 'ضريبة القيمة المضافة', 'VAT Payable', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, v_company_id, '216', 'دفعات مقدمة من العملاء', 'Customer Advances', v_current_liability_type, v_current_liabilities_id, true, true, false);
    
    -- 22 الخصوم طويلة الأجل
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', v_long_term_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_long_term_liabilities_id;
    
    -- 221
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', v_long_term_liability_type, v_long_term_liabilities_id, true, true);
    
    -- 3. حقوق الملكية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '3', 'حقوق الملكية', 'Equity', v_equity_type, NULL, false, true)
    RETURNING id INTO v_equity_id;
    
    -- 31-33
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '31', 'رأس المال', 'Capital', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, v_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, v_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', v_equity_type, v_equity_id, true, true);
    
    -- 4. الإيرادات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '4', 'الإيرادات', 'Revenue', v_revenue_type, NULL, false, true)
    RETURNING id INTO v_revenue_id;
    
    -- 41-47
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '41', 'مبيعات الأقمشة - جملة', 'Fabric Sales - Wholesale', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '42', 'مبيعات الأقمشة - تجزئة', 'Fabric Sales - Retail', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '43', 'مبيعات الرولونات', 'Roll Sales', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '44', 'خصومات المبيعات', 'Sales Discounts', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '45', 'مردودات المبيعات', 'Sales Returns', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '46', 'إيرادات أخرى', 'Other Income', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, v_company_id, '47', 'أرباح فروقات العملة', 'FX Gains', v_revenue_type, v_revenue_id, true, true);
    
    -- 5. المصروفات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, v_company_id, '5', 'المصروفات', 'Expenses', v_expense_type, NULL, false, true)
    RETURNING id INTO v_expenses_id;
    
    -- 51-595
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '51', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', v_cogs_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '52', 'مصاريف العينات', 'Sample Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '53', 'مصاريف القص والهالك', 'Cutting & Waste', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '54', 'مصاريف الشحن والجمارك', 'Shipping & Customs', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '55', 'مصاريف التخزين', 'Storage Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '56', 'مصروفات الرواتب', 'Salary Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '57', 'مصروفات الإيجار', 'Rent Expenses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '58', 'مصروفات المرافق', 'Utilities', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '59', 'مصروفات التسويق', 'Marketing', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '591', 'مصروفات إدارية', 'Administrative', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '592', 'مصروفات الإهلاك', 'Depreciation', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '593', 'مصروفات البنوك', 'Bank Charges', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '594', 'خسائر فروقات العملة', 'FX Losses', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, v_company_id, '595', 'فروق المخزون', 'Inventory Variances', v_expense_type, v_expenses_id, true, true);
    
    -- تحديث نوع الشجرة
    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = v_company_id;
    
    -- التحقق من النتيجة
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء الشجرة بنجاح!';
    RAISE NOTICE '📊 عدد الحسابات: %', v_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ: %', SQLERRM;
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
END;
$$;

-- التحقق من النتيجة
SELECT 
    'النتيجة النهائية' AS info,
    COUNT(*) AS accounts_count
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.name = 'NexRev Platform';
