-- ═══════════════════════════════════════════════════════════════
-- MASTER FIX FOR RECEIPT & INVENTORY ISSUES
-- إصلاح شامل لمشاكل الاستلام والمخزون والمحاسبة
-- ═══════════════════════════════════════════════════════════════

-- 1. إصلاح جدول الرولونات (Fabric Rolls)
-- التأكد من وجود الأعمدة اللازمة وتسميتها الصحيحة
DO $$
BEGIN
    -- Check for original_length vs initial_length
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_rolls' AND column_name = 'original_length') THEN
        ALTER TABLE fabric_rolls RENAME COLUMN original_length TO initial_length;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_rolls' AND column_name = 'initial_length') THEN
        ALTER TABLE fabric_rolls ADD COLUMN initial_length DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Ensure available_length is a stored generated column or normal column
    -- If it's missing, add it as a normal column for now to prevent insert errors, 
    -- or handled by trigger. The code expects to READ it, but we removed it from INSERT in TS.
    -- But let's make sure 'current_length' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_rolls' AND column_name = 'current_length') THEN
        ALTER TABLE fabric_rolls ADD COLUMN current_length DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Ensure batch_id exists (code uses batch_id, previously batch_number)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_rolls' AND column_name = 'batch_id') THEN
        ALTER TABLE fabric_rolls ADD COLUMN batch_id UUID REFERENCES inventory_batches(id);
    END IF;

    -- Ensure notes exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_rolls' AND column_name = 'notes') THEN
        ALTER TABLE fabric_rolls ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 2. إصلاح جدول الفواتير (Purchase Invoices)
-- إضافة عمود حالة الاستلام المفقود
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_invoices' AND column_name = 'receiving_status') THEN
        ALTER TABLE purchase_invoices ADD COLUMN receiving_status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

-- 3. حل مشكلة اسم جدول المواد (Materials vs Fabric Materials)
-- إنشاء View باسم materials يقرأ من fabric_materials لتوافق الكود
CREATE OR REPLACE VIEW materials AS
SELECT 
    id, 
    tenant_id, 
    company_id, 
    code AS material_code, 
    name_ar, 
    name_en, 
    category, 
    status,
    created_at 
FROM fabric_materials;

-- 4. إضافة الحسابات المحاسبية المفقودة (Seeding Chart of Accounts)
-- هذا الجزء يضيف الحسابات لأول شركة يجدها (لأغراض التطوير الحالية)
-- أو يمكننا استخدام DO block ذكي
DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_asset_type UUID;
    v_liability_type UUID;
    v_expense_type UUID;
BEGIN
    -- Get first tenant and company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    -- Get Account Types
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'CURRENT_ASSET' LIMIT 1;
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY' LIMIT 1;
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE' LIMIT 1;

    IF v_company_id IS NOT NULL THEN
        -- 1400: مخزون (Inventory)
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '1400') THEN
            INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_group, is_detail)
            VALUES (v_tenant_id, v_company_id, '1400', 'مخزون البضاعة', 'Inventory', v_asset_type, false, true);
        END IF;

        -- 2100: ذمم دائنة (Accounts Payable)
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '2100') THEN
            INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_group, is_detail)
            VALUES (v_tenant_id, v_company_id, '2100', 'ذمم دائنة — موردين', 'Accounts Payable', v_liability_type, false, true);
        END IF;

        -- 2108: بضاعة مستلمة غير مفوترة (GRNI)
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '2108') THEN
            INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_group, is_detail)
            VALUES (v_tenant_id, v_company_id, '2108', 'بضاعة مستلمة غير مفوترة', 'Goods Received Not Invoiced', v_liability_type, false, true);
        END IF;

        -- 5108: فروقات الاستلام (Receipt Discrepancies) (Expense/COGS)
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '5108') THEN
            INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_group, is_detail)
            VALUES (v_tenant_id, v_company_id, '5108', 'فروقات المخزون والاستلام', 'Inventory/Receipt Discrepancies', v_expense_type, false, true);
        END IF;
    END IF;
END $$;
