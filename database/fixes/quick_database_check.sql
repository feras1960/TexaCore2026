-- ═══════════════════════════════════════════════════════════════════════════
-- مقارنة سريعة - Quick Database Comparison
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا اختبار سريع (30 ثانية) للتحقق من العناصر الأساسية فقط
-- للاختبار الشامل، استخدم: verify_database_structure.sql
-- 
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '⚡ مقارنة سريعة للـ Database';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. إحصائيات سريعة للجداول
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📊 إحصائيات الجداول:'; END $$;

SELECT 
    '📁 إجمالي الجداول' as "المؤشر",
    COUNT(*)::TEXT as "القيمة",
    CASE 
        WHEN COUNT(*) >= 60 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 40 THEN '🟡 جيد'
        ELSE '🔴 قليل'
    END as "التقييم"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '🔒 جداول بـ RLS',
    COUNT(DISTINCT tablename)::TEXT,
    CASE 
        WHEN COUNT(DISTINCT tablename) >= 30 THEN '✅ ممتاز'
        WHEN COUNT(DISTINCT tablename) >= 20 THEN '🟡 جيد'
        ELSE '🔴 قليل'
    END
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    '⚡ إجمالي Triggers',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 4 THEN '🟡 جيد'
        ELSE '🔴 قليل'
    END
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND NOT t.tgisinternal

UNION ALL

SELECT 
    '🔧 إجمالي Functions',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 10 THEN '🟡 جيد'
        ELSE '🔴 قليل'
    END
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من الجداول الحرجة (CRITICAL)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🔴 الجداول الحرجة (CRITICAL):'; END $$;

SELECT 
    table_name as "الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND information_schema.tables.table_name = t.table_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = t.table_name
              AND policyname LIKE 'tenant_isolation%'
        ) THEN '🔒 معزول'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = t.table_name
        ) THEN '⚠️ غير معزول'
        ELSE '❌ لا RLS'
    END as "RLS"
FROM (VALUES 
    ('tenants'),
    ('companies'),
    ('user_profiles'),
    ('chart_of_accounts'),
    ('journal_entries'),
    ('customers'),
    ('suppliers'),
    ('subscription_plans'),
    ('agents')
) AS t(table_name)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من Functions الحرجة
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🔧 Functions الحرجة:'; END $$;

SELECT 
    func_name as "الدالة",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = f.func_name
        ) THEN '✅ موجودة'
        ELSE '❌ مفقودة'
    END as "الحالة",
    priority as "الأولوية"
FROM (VALUES 
    ('register_new_subscriber', 'CRITICAL'),
    ('create_new_tenant', 'CRITICAL'),
    ('get_current_user_tenant_id', 'CRITICAL'),
    ('is_super_admin', 'HIGH'),
    ('get_plan_pricing', 'HIGH'),
    ('apply_chart_template_to_company', 'HIGH'),
    ('activate_white_label', 'MEDIUM')
) AS f(func_name, priority)
ORDER BY 
    CASE priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        ELSE 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من Constraints المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '⚖️ Constraints المحاسبية:'; END $$;

SELECT 
    'chk_balanced_entry' as "Constraint",
    'journal_entries' as "الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'journal_entries'::regclass
              AND conname = 'chk_balanced_entry'
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة",
    'CRITICAL' as "الأولوية"

UNION ALL

SELECT 
    'chk_debit_or_credit',
    'journal_entry_lines',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'journal_entry_lines'::regclass
              AND conname = 'chk_debit_or_credit'
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END,
    'HIGH';

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق من Triggers المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '⚡ Triggers المحاسبية:'; END $$;

SELECT 
    trigger_name as "Trigger",
    table_name as "الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = tr.table_name
              AND t.tgname = tr.trigger_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('trg_sales_invoice_journal_entry', 'sales_invoices'),
    ('trg_purchase_invoice_journal_entry', 'purchase_invoices'),
    ('trg_payment_receipt_journal_entry', 'payment_receipts'),
    ('trg_validate_balance', 'journal_entries'),
    ('trg_deduct_inventory_on_sale', 'sales_invoices')
) AS tr(trigger_name, table_name);

-- ═══════════════════════════════════════════════════════════════
-- 6. إحصائيات البيانات
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '📊 إحصائيات البيانات:'; END $$;

DO $$
DECLARE
    v_tenants INT;
    v_companies INT;
    v_users INT;
    v_plans INT;
    v_agents INT;
BEGIN
    -- عدد الـ Tenants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        EXECUTE 'SELECT COUNT(*) FROM tenants' INTO v_tenants;
    ELSE
        v_tenants := 0;
    END IF;
    
    -- عدد الشركات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        EXECUTE 'SELECT COUNT(*) FROM companies' INTO v_companies;
    ELSE
        v_companies := 0;
    END IF;
    
    -- عدد المستخدمين
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        EXECUTE 'SELECT COUNT(*) FROM user_profiles' INTO v_users;
    ELSE
        v_users := 0;
    END IF;
    
    -- عدد الباقات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        EXECUTE 'SELECT COUNT(*) FROM subscription_plans WHERE is_active = true' INTO v_plans;
    ELSE
        v_plans := 0;
    END IF;
    
    -- عدد الوكلاء
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        EXECUTE 'SELECT COUNT(*) FROM agents' INTO v_agents;
    ELSE
        v_agents := 0;
    END IF;
    
    RAISE NOTICE '👥 Tenants: % %', v_tenants, CASE WHEN v_tenants >= 1 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE '🏢 Companies: % %', v_companies, CASE WHEN v_companies >= 1 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE '👤 Users: % %', v_users, CASE WHEN v_users >= 1 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE '📦 Subscription Plans: % %', v_plans, CASE WHEN v_plans >= 3 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE '🤝 Agents: %', v_agents;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. النتيجة السريعة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_total_tables INT;
    v_critical_tables INT := 9;
    v_missing_tables INT;
    v_critical_functions INT := 3;
    v_missing_functions INT;
    v_rls_secure INT;
    v_constraints INT;
    v_final_status TEXT;
    v_color TEXT;
BEGIN
    -- عدد الجداول
    SELECT COUNT(*) INTO v_total_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    
    -- الجداول المفقودة
    SELECT COUNT(*) INTO v_missing_tables
    FROM (VALUES 
        ('tenants'), ('companies'), ('user_profiles'),
        ('chart_of_accounts'), ('journal_entries'),
        ('customers'), ('suppliers'),
        ('subscription_plans'), ('agents')
    ) AS t(table_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND information_schema.tables.table_name = t.table_name
    );
    
    -- Functions المفقودة
    SELECT COUNT(*) INTO v_missing_functions
    FROM (VALUES 
        ('register_new_subscriber'),
        ('get_current_user_tenant_id'),
        ('is_super_admin')
    ) AS f(func_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = f.func_name
    );
    
    -- RLS المعزولة
    SELECT COUNT(*) INTO v_rls_secure
    FROM (VALUES 
        ('tenants'), ('companies'), ('customers')
    ) AS t(table_name)
    WHERE EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t.table_name
          AND policyname LIKE 'tenant_isolation%'
    );
    
    -- Constraints
    SELECT 
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'journal_entries'::regclass
              AND conname = 'chk_balanced_entry'
        ) THEN 1 ELSE 0 END INTO v_constraints;
    
    -- تحديد الحالة
    IF v_missing_tables = 0 AND v_missing_functions = 0 AND v_rls_secure >= 2 AND v_constraints = 1 THEN
        v_final_status := 'جاهز للإنتاج';
        v_color := '🟢';
    ELSIF v_missing_tables > 0 OR v_missing_functions > 0 THEN
        v_final_status := 'غير جاهز - عناصر حرجة مفقودة';
        v_color := '🔴';
    ELSIF v_rls_secure < 2 THEN
        v_final_status := 'يحتاج إصلاح RLS فوراً';
        v_color := '🔴';
    ELSE
        v_final_status := 'يحتاج تحسينات';
        v_color := '🟡';
    END IF;
    
    -- عرض النتيجة
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🏁 النتيجة السريعة';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 إجمالي الجداول: %', v_total_tables;
    RAISE NOTICE '❌ جداول حرجة مفقودة: %', v_missing_tables;
    RAISE NOTICE '❌ Functions حرجة مفقودة: %', v_missing_functions;
    RAISE NOTICE '🔒 RLS معزول: %/%', v_rls_secure, 3;
    RAISE NOTICE '⚖️ Constraints محاسبية: %/%', v_constraints, 1;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الحالة: % %', v_color, v_final_status;
    RAISE NOTICE '';
    
    -- التوصيات
    IF v_missing_tables > 0 OR v_missing_functions > 0 THEN
        RAISE NOTICE '💡 التوصية:';
        RAISE NOTICE '   1. شغّل الـ Migrations المطلوبة';
        RAISE NOTICE '   2. للتفاصيل، شغّل: verify_database_structure.sql';
    ELSIF v_rls_secure < 2 THEN
        RAISE NOTICE '💡 التوصية:';
        RAISE NOTICE '   1. شغّل: STEP_47_fix_rls_tenant_isolation.sql';
        RAISE NOTICE '   2. هذا حرجي للأمان!';
    ELSIF v_constraints = 0 THEN
        RAISE NOTICE '💡 التوصية:';
        RAISE NOTICE '   1. شغّل: STEP_47_fix_rls_tenant_isolation.sql';
        RAISE NOTICE '   2. لإضافة حماية التوازن المحاسبي';
    ELSE
        RAISE NOTICE '✅ النظام سليم - يمكن المتابعة';
        RAISE NOTICE '📝 للتحقق الشامل: verify_database_structure.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- نهاية المقارنة السريعة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتملت المقارنة السريعة';
    RAISE NOTICE '';
    RAISE NOTICE '⏱️ الوقت: 30 ثانية تقريباً';
    RAISE NOTICE '📝 للتحقق الشامل (10 دقائق): verify_database_structure.sql';
    RAISE NOTICE '';
END $$;
