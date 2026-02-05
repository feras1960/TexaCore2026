-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 20: تحديث شامل لـ RLS Policies على جميع الجداول
-- STEP 20: Comprehensive RLS Policies Update for All Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ هذا الملف يتحقق من جميع الجداول ويحدث RLS Policies
-- ✅ This file checks all tables and updates RLS Policies

-- ═══════════════════════════════════════════════════════════════
-- Helper Function: تطبيق RLS على جدول (مع التحقق الكامل)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION apply_comprehensive_rls(
    p_table_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_table_exists BOOLEAN;
    v_tenant_id_exists BOOLEAN;
    v_policy_name TEXT;
BEGIN
    -- التحقق من وجود الجدول
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE NOTICE '⚠️ الجدول % غير موجود - سيتم تخطيه', p_table_name;
        RETURN;
    END IF;
    
    -- التحقق من وجود عمود tenant_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = 'tenant_id'
    ) INTO v_tenant_id_exists;
    
    IF NOT v_tenant_id_exists THEN
        RAISE NOTICE '⚠️ الجدول % لا يحتوي على عمود tenant_id - سيتم تخطيه', p_table_name;
        RETURN;
    END IF;
    
    v_policy_name := p_table_name || '_tenant_isolation';
    
    -- تفعيل RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- حذف جميع Policies القديمة
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_select', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_insert', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_update', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_delete', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name, p_table_name);
    
    -- إنشاء Policies جديدة (مع التحقق من Super Admin مباشرة)
    EXECUTE format('
        CREATE POLICY %I ON %I
        FOR SELECT
        USING (
            tenant_id = get_current_tenant_id() 
            OR COALESCE(
                (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                false
            )
        )
    ', v_policy_name || '_select', p_table_name);
    
    EXECUTE format('
        CREATE POLICY %I ON %I
        FOR INSERT
        WITH CHECK (
            tenant_id = get_current_tenant_id() 
            OR COALESCE(
                (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                false
            )
        )
    ', v_policy_name || '_insert', p_table_name);
    
    EXECUTE format('
        CREATE POLICY %I ON %I
        FOR UPDATE
        USING (
            tenant_id = get_current_tenant_id() 
            OR COALESCE(
                (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                false
            )
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id() 
            OR COALESCE(
                (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                false
            )
        )
    ', v_policy_name || '_update', p_table_name);
    
    EXECUTE format('
        CREATE POLICY %I ON %I
        FOR DELETE
        USING (
            tenant_id = get_current_tenant_id() 
            OR COALESCE(
                (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
                false
            )
        )
    ', v_policy_name || '_delete', p_table_name);
    
    RAISE NOTICE '✅ تم تطبيق RLS على %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- قائمة جميع الجداول التي تحتاج RLS
-- ═══════════════════════════════════════════════════════════════

-- Core Tables
SELECT apply_comprehensive_rls('companies');
SELECT apply_comprehensive_rls('branches');
SELECT apply_comprehensive_rls('user_profiles');
SELECT apply_comprehensive_rls('currencies');

-- Accounting Tables
SELECT apply_comprehensive_rls('chart_of_accounts');
SELECT apply_comprehensive_rls('journal_entries');
SELECT apply_comprehensive_rls('journal_entry_lines');
SELECT apply_comprehensive_rls('fiscal_years');
SELECT apply_comprehensive_rls('accounting_periods');
SELECT apply_comprehensive_rls('cost_centers');
SELECT apply_comprehensive_rls('cash_accounts');
SELECT apply_comprehensive_rls('cash_transactions');
SELECT apply_comprehensive_rls('tax_rates');

-- Inventory & Products
SELECT apply_comprehensive_rls('warehouses');
SELECT apply_comprehensive_rls('warehouse_locations');
SELECT apply_comprehensive_rls('products');
SELECT apply_comprehensive_rls('product_categories');
SELECT apply_comprehensive_rls('product_variants');
SELECT apply_comprehensive_rls('product_attributes');
SELECT apply_comprehensive_rls('brands');
SELECT apply_comprehensive_rls('inventory_stock');
SELECT apply_comprehensive_rls('inventory_movements');
SELECT apply_comprehensive_rls('inventory_batches');
SELECT apply_comprehensive_rls('inventory_serials');
SELECT apply_comprehensive_rls('units_of_measure');

-- Customers & Suppliers
SELECT apply_comprehensive_rls('customers');
SELECT apply_comprehensive_rls('customer_groups');
SELECT apply_comprehensive_rls('suppliers');
SELECT apply_comprehensive_rls('supplier_groups');

-- Sales & Purchases
SELECT apply_comprehensive_rls('quotations');
SELECT apply_comprehensive_rls('quotation_items');
SELECT apply_comprehensive_rls('sales_orders');
SELECT apply_comprehensive_rls('sales_order_items');
SELECT apply_comprehensive_rls('sales_invoices');
SELECT apply_comprehensive_rls('sales_invoice_items');
SELECT apply_comprehensive_rls('delivery_notes');
SELECT apply_comprehensive_rls('delivery_note_items');
SELECT apply_comprehensive_rls('purchase_orders');
SELECT apply_comprehensive_rls('purchase_order_items');
SELECT apply_comprehensive_rls('purchase_invoices');
SELECT apply_comprehensive_rls('purchase_invoice_items');
SELECT apply_comprehensive_rls('purchase_receipts');
SELECT apply_comprehensive_rls('purchase_receipt_items');
SELECT apply_comprehensive_rls('payment_receipts');
SELECT apply_comprehensive_rls('payment_receipt_allocations');
SELECT apply_comprehensive_rls('payment_vouchers');
SELECT apply_comprehensive_rls('payment_voucher_allocations');

-- Fabric Module
SELECT apply_comprehensive_rls('fabric_groups');
SELECT apply_comprehensive_rls('fabric_colors');
SELECT apply_comprehensive_rls('fabric_materials');
SELECT apply_comprehensive_rls('fabric_rolls');
SELECT apply_comprehensive_rls('roll_movements');

-- Exchange Module
SELECT apply_comprehensive_rls('exchange_rates');
SELECT apply_comprehensive_rls('exchange_transactions');
SELECT apply_comprehensive_rls('exchange_agents');
SELECT apply_comprehensive_rls('remittances');
SELECT apply_comprehensive_rls('currency_vaults');

-- Other Tables
SELECT apply_comprehensive_rls('sequences');
SELECT apply_comprehensive_rls('audit_logs');
SELECT apply_comprehensive_rls('roles');
SELECT apply_comprehensive_rls('user_roles');

-- ═══════════════════════════════════════════════════════════════
-- التحقق من جميع الجداول التي تحتوي على tenant_id
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 قائمة الجداول التي تحتوي على tenant_id:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_table IN 
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'tenant_id'
        ORDER BY table_name
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: %', LPAD(v_count::TEXT, 3, ' '), v_table.table_name;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ إجمالي الجداول: %', v_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من RLS Policies المطبقة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_policy RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 قائمة RLS Policies المطبقة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_policy IN 
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname LIKE '%tenant_isolation%'
        ORDER BY tablename, policyname
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: % on % (%)', 
            LPAD(v_count::TEXT, 3, ' '), 
            v_policy.policyname, 
            v_policy.tablename,
            v_policy.cmd;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ إجمالي Policies: %', v_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ✅ تم تحديث RLS Policies على جميع الجداول!
-- ✅ RLS Policies updated on all tables!
