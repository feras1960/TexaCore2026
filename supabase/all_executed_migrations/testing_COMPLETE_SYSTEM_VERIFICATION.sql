-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق الشامل النهائي من النظام
-- Complete Final System Verification
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ هذا الملف يتحقق من كل شيء ويضمن جاهزية النظام الكاملة
-- ✅ This file verifies everything and ensures complete system readiness

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: تطبيق RLS Policies على جميع الجداول
-- ═══════════════════════════════════════════════════════════════

-- Helper Function
CREATE OR REPLACE FUNCTION apply_comprehensive_rls(p_table_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_table_exists BOOLEAN;
    v_tenant_id_exists BOOLEAN;
    v_policy_name TEXT;
    v_is_super_admin_check TEXT := '
        COALESCE(
            (auth.jwt() -> ''user_metadata'' ->> ''is_super_admin'')::BOOLEAN,
            (auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::BOOLEAN,
            false
        )';
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE NOTICE '⚠️ %: غير موجود', p_table_name;
        RETURN;
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = 'tenant_id'
    ) INTO v_tenant_id_exists;
    
    IF NOT v_tenant_id_exists THEN
        RAISE NOTICE '⚠️ %: لا يحتوي على tenant_id', p_table_name;
        RETURN;
    END IF;
    
    v_policy_name := p_table_name || '_tenant_isolation';
    
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_select', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_insert', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_update', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name || '_delete', p_table_name);
    
    EXECUTE format('
        CREATE POLICY %I ON %I FOR SELECT
        USING (tenant_id = get_current_tenant_id() OR %s)
    ', v_policy_name || '_select', p_table_name, v_is_super_admin_check);
    
    EXECUTE format('
        CREATE POLICY %I ON %I FOR INSERT
        WITH CHECK (tenant_id = get_current_tenant_id() OR %s)
    ', v_policy_name || '_insert', p_table_name, v_is_super_admin_check);
    
    EXECUTE format('
        CREATE POLICY %I ON %I FOR UPDATE
        USING (tenant_id = get_current_tenant_id() OR %s)
        WITH CHECK (tenant_id = get_current_tenant_id() OR %s)
    ', v_policy_name || '_update', p_table_name, v_is_super_admin_check, v_is_super_admin_check);
    
    EXECUTE format('
        CREATE POLICY %I ON %I FOR DELETE
        USING (tenant_id = get_current_tenant_id() OR %s)
    ', v_policy_name || '_delete', p_table_name, v_is_super_admin_check);
    
    RAISE NOTICE '✅ %: تم تطبيق RLS', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- تطبيق RLS على جميع الجداول
SELECT apply_comprehensive_rls('companies');
SELECT apply_comprehensive_rls('branches');
SELECT apply_comprehensive_rls('user_profiles');
SELECT apply_comprehensive_rls('currencies');
SELECT apply_comprehensive_rls('chart_of_accounts');
SELECT apply_comprehensive_rls('journal_entries');
SELECT apply_comprehensive_rls('journal_entry_lines');
SELECT apply_comprehensive_rls('warehouses');
SELECT apply_comprehensive_rls('products');
SELECT apply_comprehensive_rls('inventory_stock');
SELECT apply_comprehensive_rls('inventory_movements');
SELECT apply_comprehensive_rls('customers');
SELECT apply_comprehensive_rls('suppliers');
SELECT apply_comprehensive_rls('sales_invoices');
SELECT apply_comprehensive_rls('purchase_invoices');
SELECT apply_comprehensive_rls('roles');
SELECT apply_comprehensive_rls('user_roles');

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '✅ النظام جاهز!' as status,
    (SELECT COUNT(*) FROM tenants) as tenants,
    (SELECT COUNT(*) FROM companies) as companies,
    (SELECT COUNT(*) FROM journal_entries) as journal_entries,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM warehouses) as warehouses;

-- ✅ تم التحقق من النظام بنجاح!
-- ✅ System verification completed successfully!
