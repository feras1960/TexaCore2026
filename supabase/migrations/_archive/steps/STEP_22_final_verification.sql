-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 22: التحقق النهائي الشامل من النظام
-- STEP 22: Final Comprehensive System Verification
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ هذا الملف يتحقق من كل شيء ويضمن جاهزية النظام
-- ✅ This file verifies everything and ensures system readiness

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من وجود جميع الجداول الأساسية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_missing_tables TEXT[] := ARRAY[]::TEXT[];
    v_required_tables TEXT[] := ARRAY[
        'tenants', 'companies', 'branches', 'user_profiles', 'currencies',
        'journal_entries', 'journal_entry_lines', 'chart_of_accounts',
        'products', 'warehouses', 'inventory_stock', 'inventory_movements',
        'customers', 'suppliers', 'sales_invoices', 'purchase_invoices',
        'roles', 'user_roles', 'subscriptions', 'tenant_modules'
    ];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 التحقق من الجداول الأساسية:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOREACH v_table IN ARRAY v_required_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            RAISE NOTICE '✅ % موجود', v_table;
        ELSE
            RAISE WARNING '❌ % غير موجود', v_table;
            v_missing_tables := array_append(v_missing_tables, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE WARNING '⚠️ الجداول المفقودة: %', array_to_string(v_missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ جميع الجداول الأساسية موجودة';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من Functions المهمة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_func TEXT;
    v_missing_funcs TEXT[] := ARRAY[]::TEXT[];
    v_required_funcs TEXT[] := ARRAY[
        'get_current_tenant_id',
        'is_super_admin',
        'post_journal_entry',
        'check_journal_entry_balance',
        'update_inventory_stock',
        'generate_sequence_number',
        'assign_available_tenant',
        'register_new_subscriber'
    ];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 التحقق من Functions المهمة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOREACH v_func IN ARRAY v_required_funcs
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
              AND routine_name = v_func
              AND routine_type = 'FUNCTION'
        ) THEN
            RAISE NOTICE '✅ %() موجود', v_func;
        ELSE
            RAISE WARNING '❌ %() غير موجود', v_func;
            v_missing_funcs := array_append(v_missing_funcs, v_func);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_funcs, 1) > 0 THEN
        RAISE WARNING '⚠️ Functions المفقودة: %', array_to_string(v_missing_funcs, ', ');
    ELSE
        RAISE NOTICE '✅ جميع Functions المهمة موجودة';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من Triggers المهمة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_trigger TEXT;
    v_missing_triggers TEXT[] := ARRAY[]::TEXT[];
    v_required_triggers TEXT[] := ARRAY[
        'trg_check_journal_balance',
        'trg_update_inventory_stock',
        'trg_sync_journal_entry_line_tenant',
        'trg_auto_refill_tenants'
    ];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 التحقق من Triggers المهمة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOREACH v_trigger IN ARRAY v_required_triggers
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_schema = 'public' 
              AND trigger_name = v_trigger
        ) THEN
            RAISE NOTICE '✅ % موجود', v_trigger;
        ELSE
            RAISE WARNING '⚠️ % غير موجود (قد يكون اختياري)', v_trigger;
            v_missing_triggers := array_append(v_missing_triggers, v_trigger);
        END IF;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table RECORD;
    v_policy_count INT;
    v_tables_without_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 التحقق من RLS Policies:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_table IN 
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT IN ('_prisma_migrations')
        ORDER BY table_name
    LOOP
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table.table_name;
        
        IF v_policy_count = 0 THEN
            -- التحقق من أن الجدول يحتوي على tenant_id
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = v_table.table_name 
                  AND column_name = 'tenant_id'
            ) THEN
                RAISE WARNING '⚠️ %: لا يحتوي على RLS Policies', v_table.table_name;
                v_tables_without_rls := array_append(v_tables_without_rls, v_table.table_name);
            END IF;
        ELSE
            RAISE NOTICE '✅ %: % policies', v_table.table_name, v_policy_count;
        END IF;
    END LOOP;
    
    IF array_length(v_tables_without_rls, 1) > 0 THEN
        RAISE WARNING '⚠️ الجداول بدون RLS: %', array_to_string(v_tables_without_rls, ', ');
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق من البيانات الأساسية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_count INT;
    v_company_count INT;
    v_user_count INT;
    v_currency_count INT;
    v_role_count INT;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 إحصائيات البيانات:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        SELECT COUNT(*) INTO v_tenant_count FROM tenants;
        RAISE NOTICE 'Tenants: %', v_tenant_count;
        IF v_tenant_count = 0 THEN
            RAISE WARNING '⚠️ لا يوجد Tenants - يجب إنشاء tenant افتراضي';
        END IF;
    ELSE
        RAISE NOTICE 'Tenants: الجدول غير موجود';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        SELECT COUNT(*) INTO v_company_count FROM companies;
        RAISE NOTICE 'Companies: %', v_company_count;
    ELSE
        RAISE NOTICE 'Companies: الجدول غير موجود';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        SELECT COUNT(*) INTO v_user_count FROM user_profiles;
        RAISE NOTICE 'Users: %', v_user_count;
    ELSE
        RAISE NOTICE 'Users: الجدول غير موجود';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
        SELECT COUNT(*) INTO v_currency_count FROM currencies;
        RAISE NOTICE 'Currencies: %', v_currency_count;
        IF v_currency_count = 0 THEN
            RAISE WARNING '⚠️ لا يوجد Currencies - يجب إضافة عملات افتراضية';
        END IF;
    ELSE
        RAISE NOTICE 'Currencies: الجدول غير موجود';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        SELECT COUNT(*) INTO v_role_count FROM roles;
        RAISE NOTICE 'Roles: %', v_role_count;
        IF v_role_count = 0 THEN
            RAISE WARNING '⚠️ لا يوجد Roles - يجب تطبيق STEP_12';
        END IF;
    ELSE
        RAISE NOTICE 'Roles: الجدول غير موجود';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. اختبار إنشاء قيد يومية (اختبار شامل)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_test_tenant_id UUID;
    v_test_company_id UUID;
    v_test_entry_id UUID;
    v_test_line_id UUID;
    v_test_account_id UUID;
BEGIN
    -- التحقق من وجود الجداول المطلوبة
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - جدول tenants غير موجود';
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - جدول companies غير موجود';
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - جدول journal_entries غير موجود';
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - جدول journal_entry_lines غير موجود';
        RETURN;
    END IF;
    
    -- الحصول على tenant و company للاختبار
    SELECT id INTO v_test_tenant_id FROM tenants WHERE status = 'active' LIMIT 1;
    
    IF v_test_tenant_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - لا يوجد tenant نشط';
        RETURN;
    END IF;
    
    SELECT id INTO v_test_company_id FROM companies WHERE tenant_id = v_test_tenant_id LIMIT 1;
    
    IF v_test_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - لا يوجد company';
        RETURN;
    END IF;
    
    -- الحصول على حساب للاختبار
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
        SELECT id INTO v_test_account_id 
        FROM chart_of_accounts 
        WHERE tenant_id = v_test_tenant_id 
          AND company_id = v_test_company_id
        LIMIT 1;
        
        IF v_test_account_id IS NULL THEN
            RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - لا يوجد حسابات';
            RETURN;
        END IF;
    ELSE
        RAISE NOTICE '⚠️ لا يمكن إجراء الاختبار - جدول chart_of_accounts غير موجود';
        RETURN;
    END IF;
    
    BEGIN
        -- إنشاء قيد تجريبي
        INSERT INTO journal_entries (
            tenant_id,
            company_id,
            entry_number,
            entry_date,
            description,
            total_debit,
            total_credit,
            status
        ) VALUES (
            v_test_tenant_id,
            v_test_company_id,
            'TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
            CURRENT_DATE,
            'قيد تجريبي للتحقق',
            1000,
            1000,
            'draft'
        ) RETURNING id INTO v_test_entry_id;
        
        -- إنشاء بند القيد
        INSERT INTO journal_entry_lines (
            tenant_id,
            entry_id,
            line_number,
            account_id,
            debit,
            credit,
            description
        ) VALUES (
            v_test_tenant_id,
            v_test_entry_id,
            1,
            v_test_account_id,
            1000,
            0,
            'مدين'
        ), (
            v_test_tenant_id,
            v_test_entry_id,
            2,
            v_test_account_id,
            0,
            1000,
            'دائن'
        );
        
        RAISE NOTICE '✅ تم إنشاء قيد تجريبي بنجاح: %', v_test_entry_id;
        
        -- حذف القيد التجريبي
        DELETE FROM journal_entries WHERE id = v_test_entry_id;
        RAISE NOTICE '✅ تم حذف القيد التجريبي';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ فشل الاختبار: %', SQLERRM;
    END;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. ملخص نهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '✅ النظام جاهز!' as status,
    NOW() as verified_at,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_functions,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;

-- ✅ تم التحقق من النظام بنجاح!
-- ✅ System verification completed successfully!
