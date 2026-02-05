-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 47: إصلاح RLS Policies - عزل تام بين Tenants
-- STEP 47: Fix RLS Policies - Complete Tenant Isolation
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ⚠️ هذا الملف يحل المشكلة الأمنية الأكثر حرجية في النظام!
-- 
-- المشكلة: RLS Policies الحالية تسمح لأي مستخدم برؤية بيانات جميع Tenants
-- الحل: استبدال جميع الـ Policies بـ Policies صحيحة تعزل البيانات
-- 
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 بدء إصلاح RLS Policies - عزل Tenants';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. حذف جميع الـ Policies القديمة (غير الآمنة)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '🗑️ حذف الـ Policies القديمة...';
    
    -- حذف جميع الـ Policies التي تستخدم USING (true)
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual = 'true' OR with_check = 'true')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ تم حذف % policy قديمة', v_count;
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. دالة مساعدة: الحصول على tenant_id للمستخدم الحالي
-- ═══════════════════════════════════════════════════════════════

-- حذف جميع النسخ القديمة
DROP FUNCTION IF EXISTS get_current_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_tenant_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_tenant_id(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- البحث عن tenant_id من user_profiles
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    -- إذا لم يوجد، تحقق من user_metadata
    IF v_tenant_id IS NULL THEN
        SELECT (raw_user_meta_data->>'tenant_id')::UUID INTO v_tenant_id
        FROM auth.users
        WHERE id = auth.uid();
    END IF;
    
    RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_tenant_id() IS 
'الحصول على tenant_id للمستخدم الحالي من user_profiles أو auth.users';

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة مساعدة: التحقق من Super Admin
-- ═══════════════════════════════════════════════════════════════

-- حذف جميع النسخ القديمة من is_super_admin
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_is_super BOOLEAN;
BEGIN
    SELECT COALESCE(
        (raw_user_meta_data->>'is_super_admin')::BOOLEAN,
        false
    ) INTO v_is_super
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_is_super, false);
END;
$$;

COMMENT ON FUNCTION is_super_admin() IS 
'التحقق من أن المستخدم الحالي هو Super Admin';

-- ═══════════════════════════════════════════════════════════════
-- 4. Macro لإنشاء Policies متسقة لجدول (مع التحقق من tenant_id)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_tenant_isolation_policies(
    p_table_name TEXT,
    p_has_tenant_id BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_tenant_id BOOLEAN;
BEGIN
    -- التحقق الفعلي من وجود عمود tenant_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = 'tenant_id'
    ) INTO v_has_tenant_id;
    
    -- إذا لم يكن لديه tenant_id، تخطي
    IF NOT v_has_tenant_id THEN
        RAISE NOTICE '⚠️ الجدول % لا يحتوي على tenant_id - تم التخطي', p_table_name;
        RETURN;
    END IF;
    -- Policy: SELECT
    EXECUTE format(
        'CREATE POLICY tenant_isolation_select ON %I 
         FOR SELECT USING (
             %s OR is_super_admin()
         )',
        p_table_name,
        CASE WHEN p_has_tenant_id 
             THEN 'tenant_id = get_current_user_tenant_id()' 
             ELSE 'true' 
        END
    );
    
    -- Policy: INSERT
    EXECUTE format(
        'CREATE POLICY tenant_isolation_insert ON %I 
         FOR INSERT WITH CHECK (
             %s OR is_super_admin()
         )',
        p_table_name,
        CASE WHEN p_has_tenant_id 
             THEN 'tenant_id = get_current_user_tenant_id()' 
             ELSE 'true' 
        END
    );
    
    -- Policy: UPDATE
    EXECUTE format(
        'CREATE POLICY tenant_isolation_update ON %I 
         FOR UPDATE USING (
             %s OR is_super_admin()
         ) WITH CHECK (
             %s OR is_super_admin()
         )',
        p_table_name,
        CASE WHEN p_has_tenant_id 
             THEN 'tenant_id = get_current_user_tenant_id()' 
             ELSE 'true' 
        END,
        CASE WHEN p_has_tenant_id 
             THEN 'tenant_id = get_current_user_tenant_id()' 
             ELSE 'true' 
        END
    );
    
    -- Policy: DELETE
    EXECUTE format(
        'CREATE POLICY tenant_isolation_delete ON %I 
         FOR DELETE USING (
             %s OR is_super_admin()
         )',
        p_table_name,
        CASE WHEN p_has_tenant_id 
             THEN 'tenant_id = get_current_user_tenant_id()' 
             ELSE 'true' 
        END
    );
    
    RAISE NOTICE '✅ تم إنشاء Policies لجدول: %', p_table_name;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. تطبيق Policies على جميع الجداول الحساسة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        -- Core Tables (WITHOUT tenants - handled separately)
        'companies',
        'branches',
        'user_profiles',
        
        -- Accounting Tables
        'chart_of_accounts',
        'fiscal_years',
        'accounting_periods',
        'journal_entries',
        'journal_entry_lines',
        'cost_centers',
        'cash_accounts',
        'cash_transactions',
        'tax_rates',
        
        -- Business Tables
        'customers',
        'suppliers',
        'products',
        'product_variants',
        'warehouses',
        'warehouse_locations',
        'inventory_batches',
        'inventory_movements',
        
        -- Sales & Purchases
        'sales_invoices',
        'sales_invoice_items',
        'purchase_invoices',
        'purchase_invoice_items',
        'payment_receipts',
        'payment_vouchers',
        
        -- Fabric Module
        'fabric_groups',
        'fabric_colors',
        'fabric_materials',
        'fabric_material_colors',
        'fabric_rolls',
        'roll_movements',
        'fabric_samples',
        'roll_reservations',
        
        -- Exchange Module
        'exchange_rates',
        'exchange_transactions',
        'exchange_agents',
        'remittances',
        'currency_vaults',
        'vault_movements',
        'agent_balances',
        'agent_movements',
        
        -- SaaS & Agents
        'agents',
        'agent_commissions',
        'agent_withdrawals',
        'agent_targets',
        'agent_events',
        'agent_messages',
        
        -- White Label
        'white_label_domains',
        'white_label_configs',
        'white_label_payments',
        'white_label_stats',
        
        -- Subscriptions
        'subscriptions',
        'tenant_modules',
        'subscription_plans',
        'promotional_discounts'
    ];
    v_table TEXT;
BEGIN
    RAISE NOTICE '🔐 تطبيق Policies على % جدول...', array_length(v_tables, 1);
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        -- التحقق من وجود الجدول
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) THEN
            -- تطبيق الـ Policies
            PERFORM create_tenant_isolation_policies(v_table, true);
        ELSE
            RAISE NOTICE '⚠️ الجدول % غير موجود - تم التخطي', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل تطبيق Policies';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5.1. Policy خاص لجدول tenants (يستخدم id بدلاً من tenant_id)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- حذف Policies القديمة
    DROP POLICY IF EXISTS tenant_isolation_select ON tenants;
    DROP POLICY IF EXISTS tenant_isolation_insert ON tenants;
    DROP POLICY IF EXISTS tenant_isolation_update ON tenants;
    DROP POLICY IF EXISTS tenant_isolation_delete ON tenants;
    
    -- Policy خاص: يسمح للمستخدم برؤية tenant الخاص به فقط
    CREATE POLICY tenant_isolation_select ON tenants
    FOR SELECT USING (
        id = get_current_user_tenant_id() OR is_super_admin()
    );
    
    -- Super Admin فقط يمكنه الإنشاء/التعديل/الحذف
    CREATE POLICY tenant_isolation_insert ON tenants
    FOR INSERT WITH CHECK (is_super_admin());
    
    CREATE POLICY tenant_isolation_update ON tenants
    FOR UPDATE USING (is_super_admin());
    
    CREATE POLICY tenant_isolation_delete ON tenants
    FOR DELETE USING (is_super_admin());
    
    RAISE NOTICE '✅ تم تطبيق Policy خاص لجدول tenants';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. Policies خاصة لجداول المراجع (Reference Tables)
-- ═══════════════════════════════════════════════════════════════

-- account_types: قراءة فقط للجميع
DROP POLICY IF EXISTS account_types_select ON account_types;
CREATE POLICY account_types_select ON account_types
FOR SELECT USING (true);

-- system_modules: قراءة فقط للجميع
DROP POLICY IF EXISTS system_modules_select ON system_modules;
CREATE POLICY system_modules_select ON system_modules
FOR SELECT USING (true);

-- saas_products: قراءة فقط للجميع
DROP POLICY IF EXISTS saas_products_select ON saas_products;
CREATE POLICY saas_products_select ON saas_products
FOR SELECT USING (true);

-- agent_tiers: قراءة فقط للجميع
DROP POLICY IF EXISTS agent_tiers_select ON agent_tiers;
CREATE POLICY agent_tiers_select ON agent_tiers
FOR SELECT USING (true);

-- chart_templates: قراءة فقط للجميع
DROP POLICY IF EXISTS chart_templates_select ON chart_templates;
CREATE POLICY chart_templates_select ON chart_templates
FOR SELECT USING (true);

-- chart_template_accounts: تم حذفه (الجدول غير موجود)
-- DROP POLICY IF EXISTS chart_template_accounts_select ON chart_template_accounts;
-- CREATE POLICY chart_template_accounts_select ON chart_template_accounts
-- FOR SELECT USING (true);

-- marketing_materials: قراءة فقط للجميع
DROP POLICY IF EXISTS marketing_materials_select ON marketing_materials;
CREATE POLICY marketing_materials_select ON marketing_materials
FOR SELECT USING (true);

DO $$ BEGIN RAISE NOTICE '✅ تم تطبيق Policies خاصة للجداول المرجعية'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. اختبار التطبيق
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_total_policies INT;
    v_tenant_policies INT;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 إحصائيات الـ Policies';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- عدد الـ Policies الكلي
    SELECT COUNT(*) INTO v_total_policies
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- عدد الـ Policies التي تستخدم tenant isolation
    SELECT COUNT(*) INTO v_tenant_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'tenant_isolation%';
    
    RAISE NOTICE '📊 إجمالي الـ Policies: %', v_total_policies;
    RAISE NOTICE '🔐 Tenant Isolation Policies: %', v_tenant_policies;
    RAISE NOTICE '';
    
    IF v_tenant_policies > 0 THEN
        RAISE NOTICE '✅ تم تطبيق عزل Tenants بنجاح!';
    ELSE
        RAISE WARNING '⚠️ لم يتم تطبيق أي Tenant Isolation Policies';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. التحقق من الأمان
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_unsafe_policies INT;
BEGIN
    -- البحث عن Policies غير آمنة (USING true)
    SELECT COUNT(*) INTO v_unsafe_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true')
      AND tablename NOT IN (
          'account_types', 'system_modules', 'saas_products',
          'agent_tiers', 'chart_templates',
          'marketing_materials'
      );
    
    IF v_unsafe_policies > 0 THEN
        RAISE WARNING '⚠️ تم العثور على % policies غير آمنة!', v_unsafe_policies;
        RAISE NOTICE 'قد تحتاج إلى مراجعة يدوية';
    ELSE
        RAISE NOTICE '✅ جميع الـ Policies آمنة';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. إضافة Constraint للتوازن المحاسبي (Bonus)
-- ═══════════════════════════════════════════════════════════════

-- حذف Constraint إذا كان موجوداً
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_balanced_entry;

-- إضافة Constraint جديد
ALTER TABLE journal_entries 
ADD CONSTRAINT chk_balanced_entry 
CHECK (ABS(total_debit - total_credit) < 0.01);

COMMENT ON CONSTRAINT chk_balanced_entry ON journal_entries IS 
'ضمان توازن القيد المحاسبي: مدين = دائن (ضمن هامش 0.01)';

-- إنشاء Trigger للتحقق قبل الترحيل
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- فقط عند الترحيل (is_posted = true)
    IF NEW.is_posted = true THEN
        IF ABS(NEW.total_debit - NEW.total_credit) > 0.01 THEN
            RAISE EXCEPTION 'القيد غير متوازن: مدين % ≠ دائن %', 
                            NEW.total_debit, NEW.total_credit
            USING HINT = 'تأكد من أن مجموع المدين = مجموع الدائن';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- حذف Trigger إذا كان موجوداً
DROP TRIGGER IF EXISTS trg_validate_balance ON journal_entries;

-- إنشاء Trigger جديد
CREATE TRIGGER trg_validate_balance
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW
WHEN (NEW.is_posted = true)
EXECUTE FUNCTION validate_journal_entry_balance();

COMMENT ON TRIGGER trg_validate_balance ON journal_entries IS 
'التحقق من توازن القيد قبل الترحيل';

DO $$ BEGIN RAISE NOTICE '✅ تم إضافة حماية التوازن المحاسبي'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- النهاية
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل STEP 47: إصلاح RLS Policies';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 تم تطبيق:';
    RAISE NOTICE '   • عزل تام بين Tenants';
    RAISE NOTICE '   • دعم Super Admin';
    RAISE NOTICE '   • حماية التوازن المحاسبي';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '   • اختبار شامل للعزل';
    RAISE NOTICE '   • تسجيل دخول من accounts مختلفة';
    RAISE NOTICE '   • التأكد من عدم رؤية بيانات Tenants أخرى';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
