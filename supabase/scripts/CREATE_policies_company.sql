-- =====================================================
-- CREATE_policies_company.sql
-- المرحلة 5.4: سياسات جداول الشركة
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- المجموعة د: جداول الشركة (Company Tables)
-- السياسة الموحدة: Brand → Tenant → Company
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- دالة مساعدة لإنشاء السياسات على الجداول التي تحتوي tenant_id + company_id
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_company_rls_policies(
    p_table_name TEXT,
    p_has_tenant_id BOOLEAN DEFAULT true,
    p_has_company_id BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_select_condition TEXT;
    v_insert_condition TEXT;
    v_update_condition TEXT;
    v_delete_condition TEXT;
BEGIN
    -- حذف السياسات القديمة
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I', p_table_name, p_table_name);

    -- تفعيل RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);

    -- بناء الشروط بناءً على الأعمدة الموجودة
    IF p_has_tenant_id AND p_has_company_id THEN
        -- الجداول التي تحتوي tenant_id + company_id
        v_select_condition := 'is_platform_admin() OR check_row_access(tenant_id, company_id)';
        v_insert_condition := 'is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id))';
        v_update_condition := 'is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id))';
        v_delete_condition := 'is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id) AND is_company_admin(auth.uid(), company_id))';
    ELSIF p_has_tenant_id AND NOT p_has_company_id THEN
        -- الجداول التي تحتوي tenant_id فقط
        v_select_condition := 'is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())';
        v_insert_condition := 'is_platform_admin() OR tenant_id = get_user_tenant_id()';
        v_update_condition := 'is_platform_admin() OR tenant_id = get_user_tenant_id()';
        v_delete_condition := 'is_platform_admin() OR (tenant_id = get_user_tenant_id() AND is_tenant_admin())';
    ELSIF NOT p_has_tenant_id AND p_has_company_id THEN
        -- الجداول التي تحتوي company_id فقط
        v_select_condition := 'is_platform_admin() OR can_access_company(company_id)';
        v_insert_condition := 'is_platform_admin() OR can_access_company(company_id)';
        v_update_condition := 'is_platform_admin() OR can_access_company(company_id)';
        v_delete_condition := 'is_platform_admin() OR (can_access_company(company_id) AND is_company_admin(auth.uid(), company_id))';
    ELSE
        RAISE EXCEPTION 'يجب تحديد tenant_id أو company_id على الأقل';
    END IF;

    -- إنشاء السياسات
    EXECUTE format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING (%s)',
        p_table_name, p_table_name, v_select_condition);
    
    EXECUTE format('CREATE POLICY %I_insert_policy ON public.%I FOR INSERT WITH CHECK (%s)',
        p_table_name, p_table_name, v_insert_condition);
    
    EXECUTE format('CREATE POLICY %I_update_policy ON public.%I FOR UPDATE USING (%s)',
        p_table_name, p_table_name, v_update_condition);
    
    EXECUTE format('CREATE POLICY %I_delete_policy ON public.%I FOR DELETE USING (%s)',
        p_table_name, p_table_name, v_delete_condition);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. الجداول الأساسية (tenant_id + company_id)
-- ═══════════════════════════════════════════════════════════════

-- 1.1 companies (الشركات)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_select_policy ON public.companies;
DROP POLICY IF EXISTS companies_insert_policy ON public.companies;
DROP POLICY IF EXISTS companies_update_policy ON public.companies;
DROP POLICY IF EXISTS companies_delete_policy ON public.companies;

CREATE POLICY companies_select_policy ON public.companies
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
            AND (is_tenant_owner() OR can_access_company(id))
        )
    );

CREATE POLICY companies_insert_policy ON public.companies
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_tenant_owner()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY companies_update_policy ON public.companies
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            tenant_id = get_user_tenant_id()
            AND (is_tenant_owner() OR is_company_admin(auth.uid(), id))
        )
    );

CREATE POLICY companies_delete_policy ON public.companies
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_owner()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- 1.2 branches (الفروع)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        PERFORM public.create_company_rls_policies('branches', true, true);
    END IF;
END $$;

-- 1.3 user_profiles (ملفات المستخدمين)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_select_policy ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_policy ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_policy ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_policy ON public.user_profiles;

CREATE POLICY user_profiles_select_policy ON public.user_profiles
    FOR SELECT USING (
        is_platform_admin()
        OR id = auth.uid()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
            AND (is_tenant_admin() OR can_access_company(company_id))
        )
    );

CREATE POLICY user_profiles_insert_policy ON public.user_profiles
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR id = auth.uid()
    );

CREATE POLICY user_profiles_update_policy ON public.user_profiles
    FOR UPDATE USING (
        is_platform_admin()
        OR id = auth.uid()
        OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
    );

CREATE POLICY user_profiles_delete_policy ON public.user_profiles
    FOR DELETE USING (
        is_platform_admin()
        OR (is_tenant_admin() AND tenant_id = get_user_tenant_id() AND id != auth.uid())
    );

-- 1.4 user_roles (أدوار المستخدمين)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
        DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
        DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
        DROP POLICY IF EXISTS user_roles_delete_policy ON public.user_roles;
        
        CREATE POLICY user_roles_select_policy ON public.user_roles
            FOR SELECT USING (
                is_platform_admin()
                OR user_id = auth.uid()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY user_roles_insert_policy ON public.user_roles
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY user_roles_update_policy ON public.user_roles
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY user_roles_delete_policy ON public.user_roles
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. جداول المحاسبة
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'chart_of_accounts',
        'journal_entries',
        'journal_entry_lines',
        'fiscal_years',
        'accounting_periods',
        'cost_centers',
        'budgets',
        'budget_lines',
        'bank_accounts'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            PERFORM public.create_company_rls_policies(v_table, true, true);
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. جداول الخزينة والأموال
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'funds',
        'fund_transactions',
        'cash_accounts',
        'cash_transactions',
        'payment_receipts',
        'payment_vouchers'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            -- تحقق من وجود tenant_id و company_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                PERFORM public.create_company_rls_policies(v_table, false, true);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. جداول العملاء والموردين
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'customers',
        'customer_groups',
        'customer_addresses',
        'suppliers',
        'supplier_groups',
        'contact_persons'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. جداول المخزون
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'products',
        'product_categories',
        'product_variants',
        'product_images',
        'warehouses',
        'warehouse_locations',
        'bin_locations',
        'stock_items',
        'stock_levels',
        'inventory_movements',
        'inventory_adjustments',
        'stock_transfers',
        'stock_counts',
        'stock_count_items'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                PERFORM public.create_company_rls_policies(v_table, false, true);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. جداول المبيعات
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'sales_invoices',
        'sales_invoice_items',
        'sales_quotations',
        'sales_quotation_items',
        'sales_orders',
        'sales_order_items',
        'sales_returns',
        'sales_return_items',
        'delivery_notes',
        'delivery_note_items'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. جداول المشتريات
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'purchase_invoices',
        'purchase_invoice_items',
        'purchase_orders',
        'purchase_order_items',
        'purchase_returns',
        'purchase_return_items',
        'goods_receipts',
        'goods_receipt_items'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. جداول الأقمشة والإنتاج
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'fabric_groups',
        'fabric_rolls',
        'fabric_colors',
        'fabric_materials',
        'fabric_material_colors',
        'fabric_transactions',
        'cutting_orders',
        'cutting_order_items',
        'sample_cuttings',
        'sample_cutting_items',
        'production_orders',
        'production_order_items',
        'warehouse_settings'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                PERFORM public.create_company_rls_policies(v_table, false, true);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. جداول الشحن والحاويات
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'containers',
        'container_items',
        'container_expenses',
        'shipments',
        'shipment_items',
        'shipping_companies'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. جداول الصرافة والذهب
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'gold_items',
        'gold_transactions',
        'exchange_transactions',
        'commission_entries'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                PERFORM public.create_company_rls_policies(v_table, false, true);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. جداول أخرى
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'exchange_rates',
        'price_lists',
        'price_list_items',
        'tax_rates',
        'payment_terms',
        'attachments',
        'documents',
        'company_settings',
        'sequences',
        'tags',
        'entity_tags'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                PERFORM public.create_company_rls_policies(v_table, false, true);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق
-- ═══════════════════════════════════════════════════════════════
SELECT 'تم إنشاء سياسات جداول الشركة بنجاح!' as result;

-- عرض ملخص السياسات
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
