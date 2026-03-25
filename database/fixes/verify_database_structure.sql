-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق الشامل من هيكلية قاعدة البيانات (Database Structure Verification)
-- Complete Database Structure Verification
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يتحقق من:
-- 1. وجود جميع الجداول المطلوبة
-- 2. وجود جميع الأعمدة في كل جدول
-- 3. وجود RLS Policies
-- 4. وجود Triggers
-- 5. وجود Functions
-- 6. وجود Constraints
-- 
-- الاستخدام: نفذ هذا الملف في Supabase SQL Editor
-- النتيجة: تقرير شامل عن الفروقات بين المتوقع والموجود
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 0. إنشاء جدول مؤقت للنتائج
-- ═══════════════════════════════════════════════════════════════

CREATE TEMP TABLE verification_results (
    category VARCHAR(50),
    item_name VARCHAR(200),
    expected BOOLEAN,
    exists BOOLEAN,
    status VARCHAR(20),
    details TEXT,
    priority VARCHAR(10)
);

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من الجداول الأساسية (Core Tables)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_tables TEXT[] := ARRAY[
        'tenants',
        'companies',
        'branches',
        'user_profiles',
        'currencies',
        'countries'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '📊 التحقق من الجداول الأساسية...';
    
    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Core Tables',
            v_table,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الجدول موجود ✅' 
                ELSE 'الجدول مفقود ❌' 
            END,
            'HIGH'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من جداول المحاسبة (Accounting Tables)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_tables TEXT[] := ARRAY[
        'account_types',
        'chart_of_accounts',
        'fiscal_years',
        'accounting_periods',
        'journal_entries',
        'journal_entry_lines',
        'cost_centers',
        'cash_accounts',
        'cash_transactions',
        'tax_rates'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
    v_row_count BIGINT;
BEGIN
    RAISE NOTICE '💰 التحقق من جداول المحاسبة...';
    
    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) INTO v_exists;
        
        IF v_exists THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_row_count;
        ELSE
            v_row_count := 0;
        END IF;
        
        INSERT INTO verification_results VALUES (
            'Accounting Tables',
            v_table,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN format('الجدول موجود ✅ (%s صف)', v_row_count)
                ELSE 'الجدول مفقود ❌' 
            END,
            'CRITICAL'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من جداول الأقمشة (Fabric Tables)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_tables TEXT[] := ARRAY[
        'fabric_groups',
        'fabric_colors',
        'fabric_materials',
        'fabric_material_colors',
        'fabric_rolls',
        'roll_movements',
        'fabric_samples',
        'roll_reservations'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🧵 التحقق من جداول الأقمشة...';
    
    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Fabric Tables',
            v_table,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الجدول موجود ✅' 
                ELSE 'الجدول مفقود ❌' 
            END,
            'MEDIUM'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من جداول الصرافة (Exchange Tables)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_tables TEXT[] := ARRAY[
        'exchange_rates',
        'exchange_transactions',
        'exchange_agents',
        'remittances',
        'currency_vaults',
        'vault_movements',
        'agent_balances',
        'agent_movements'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '💱 التحقق من جداول الصرافة...';
    
    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Exchange Tables',
            v_table,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الجدول موجود ✅' 
                ELSE 'الجدول مفقود ❌' 
            END,
            'MEDIUM'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق من جداول SaaS والوكلاء
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_tables TEXT[] := ARRAY[
        'subscription_plans',
        'promotional_discounts',
        'subscriptions',
        'tenant_modules',
        'agents',
        'agent_tiers',
        'agent_commissions',
        'agent_withdrawals',
        'agent_targets',
        'agent_events',
        'white_label_domains',
        'white_label_configs',
        'white_label_payments',
        'white_label_stats'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🏢 التحقق من جداول SaaS والوكلاء...';
    
    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = v_table
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'SaaS & Agents Tables',
            v_table,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الجدول موجود ✅' 
                ELSE 'الجدول مفقود ❌' 
            END,
            'HIGH'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. التحقق من الأعمدة الحرجة في chart_of_accounts
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_columns TEXT[] := ARRAY[
        'id', 'tenant_id', 'company_id', 'account_code',
        'name_ar', 'name_en', 'name_ru', 'name_uk', 'name_ro',
        'name_pl', 'name_tr', 'name_de', 'name_it',
        'account_type_id', 'parent_id', 'currency'
    ];
    v_column TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '📝 التحقق من أعمدة chart_of_accounts...';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
        INSERT INTO verification_results VALUES (
            'Table Columns',
            'chart_of_accounts',
            true,
            false,
            'MISSING',
            'الجدول غير موجود - لا يمكن فحص الأعمدة ❌',
            'CRITICAL'
        );
        RETURN;
    END IF;
    
    FOREACH v_column IN ARRAY v_expected_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'chart_of_accounts'
              AND column_name = v_column
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Table Columns',
            'chart_of_accounts.' || v_column,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'العمود موجود ✅' 
                ELSE 'العمود مفقود ❌' 
            END,
            'HIGH'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_policy_count INT;
    v_has_tenant_isolation BOOLEAN;
BEGIN
    RAISE NOTICE '🔒 التحقق من RLS Policies...';
    
    FOR v_table IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
          AND table_name IN (
              'tenants', 'companies', 'customers', 'suppliers',
              'chart_of_accounts', 'journal_entries',
              'products', 'sales_invoices', 'purchase_invoices'
          )
    LOOP
        -- عدد الـ Policies
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table;
        
        -- هل يوجد tenant_isolation policy؟
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = v_table
              AND policyname LIKE 'tenant_isolation%'
        ) INTO v_has_tenant_isolation;
        
        INSERT INTO verification_results VALUES (
            'RLS Policies',
            v_table,
            true,
            v_policy_count > 0,
            CASE 
                WHEN v_has_tenant_isolation THEN 'SECURE'
                WHEN v_policy_count > 0 THEN 'PARTIAL'
                ELSE 'MISSING'
            END,
            format('%s policies - %s',
                v_policy_count,
                CASE 
                    WHEN v_has_tenant_isolation THEN 'معزول ✅'
                    WHEN v_policy_count > 0 THEN 'غير معزول ⚠️'
                    ELSE 'لا يوجد policies ❌'
                END
            ),
            CASE 
                WHEN v_has_tenant_isolation THEN 'LOW'
                ELSE 'CRITICAL'
            END
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. التحقق من Triggers المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_triggers TEXT[][] := ARRAY[
        ARRAY['sales_invoices', 'trg_sales_invoice_journal_entry'],
        ARRAY['purchase_invoices', 'trg_purchase_invoice_journal_entry'],
        ARRAY['payment_receipts', 'trg_payment_receipt_journal_entry'],
        ARRAY['payment_vouchers', 'trg_payment_voucher_journal_entry'],
        ARRAY['sales_invoices', 'trg_deduct_inventory_on_sale'],
        ARRAY['journal_entries', 'trg_validate_balance']
    ];
    v_trigger_info TEXT[];
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '⚡ التحقق من Triggers المحاسبية...';
    
    FOREACH v_trigger_info SLICE 1 IN ARRAY v_expected_triggers
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = v_trigger_info[1]
              AND t.tgname = v_trigger_info[2]
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Triggers',
            v_trigger_info[1] || '.' || v_trigger_info[2],
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الـ Trigger موجود ✅' 
                ELSE 'الـ Trigger مفقود ❌' 
            END,
            'HIGH'
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. التحقق من Functions الحرجة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_expected_functions TEXT[] := ARRAY[
        'register_new_subscriber',
        'create_new_tenant',
        'create_default_company_for_tenant',
        'apply_chart_template_to_company',
        'get_plan_pricing',
        'get_promotional_discounts',
        'activate_white_label',
        'get_current_user_tenant_id',
        'is_super_admin'
    ];
    v_function TEXT;
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔧 التحقق من Functions الحرجة...';
    
    FOREACH v_function IN ARRAY v_expected_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = v_function
        ) INTO v_exists;
        
        INSERT INTO verification_results VALUES (
            'Functions',
            v_function,
            true,
            v_exists,
            CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
            CASE WHEN v_exists 
                THEN 'الدالة موجودة ✅' 
                ELSE 'الدالة مفقودة ❌' 
            END,
            CASE 
                WHEN v_function IN ('register_new_subscriber', 'get_current_user_tenant_id') 
                THEN 'CRITICAL'
                ELSE 'HIGH'
            END
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. التحقق من Constraints المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '⚖️ التحقق من Constraints المحاسبية...';
    
    -- Balance Constraint
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_entries'::regclass
          AND conname = 'chk_balanced_entry'
    ) INTO v_exists;
    
    INSERT INTO verification_results VALUES (
        'Constraints',
        'journal_entries.chk_balanced_entry',
        true,
        v_exists,
        CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
        CASE WHEN v_exists 
            THEN 'الـ Constraint موجود ✅ (يمنع قيد غير متوازن)' 
            ELSE 'الـ Constraint مفقود ❌ (خطر محاسبي!)' 
        END,
        'CRITICAL'
    );
    
    -- Debit/Credit Check
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_entry_lines'::regclass
          AND conname = 'chk_debit_or_credit'
    ) INTO v_exists;
    
    INSERT INTO verification_results VALUES (
        'Constraints',
        'journal_entry_lines.chk_debit_or_credit',
        true,
        v_exists,
        CASE WHEN v_exists THEN 'OK' ELSE 'MISSING' END,
        CASE WHEN v_exists 
            THEN 'الـ Constraint موجود ✅' 
            ELSE 'الـ Constraint مفقود ❌' 
        END,
        'HIGH'
    );
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. التحقق من البيانات الأساسية (Master Data)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE '📊 التحقق من البيانات الأساسية...';
    
    -- Account Types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_types') THEN
        SELECT COUNT(*) INTO v_count FROM account_types;
        
        INSERT INTO verification_results VALUES (
            'Master Data',
            'account_types',
            true,
            v_count >= 10,
            CASE WHEN v_count >= 10 THEN 'OK' ELSE 'INCOMPLETE' END,
            format('%s نوع حساب %s',
                v_count,
                CASE WHEN v_count >= 10 THEN '✅' ELSE '⚠️' END
            ),
            CASE WHEN v_count >= 10 THEN 'LOW' ELSE 'HIGH' END
        );
    END IF;
    
    -- Agent Tiers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_tiers') THEN
        SELECT COUNT(*) INTO v_count FROM agent_tiers;
        
        INSERT INTO verification_results VALUES (
            'Master Data',
            'agent_tiers',
            true,
            v_count >= 4,
            CASE WHEN v_count >= 4 THEN 'OK' ELSE 'INCOMPLETE' END,
            format('%s مستوى %s',
                v_count,
                CASE WHEN v_count >= 4 THEN '✅' ELSE '⚠️' END
            ),
            'MEDIUM'
        );
    END IF;
    
    -- Subscription Plans
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        SELECT COUNT(*) INTO v_count FROM subscription_plans WHERE is_active = true;
        
        INSERT INTO verification_results VALUES (
            'Master Data',
            'subscription_plans',
            true,
            v_count >= 3,
            CASE WHEN v_count >= 3 THEN 'OK' ELSE 'INCOMPLETE' END,
            format('%s باقة نشطة %s',
                v_count,
                CASE WHEN v_count >= 3 THEN '✅' ELSE '⚠️' END
            ),
            'HIGH'
        );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 12. عرض النتائج - ملخص عام
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '═══════════════════════════════════════════════════════'; END $$;
DO $$ BEGIN RAISE NOTICE '📋 ملخص نتائج التحقق'; END $$;
DO $$ BEGIN RAISE NOTICE '═══════════════════════════════════════════════════════'; END $$;

-- إحصائيات حسب الفئة
SELECT 
    category as "الفئة",
    COUNT(*) as "الإجمالي",
    COUNT(*) FILTER (WHERE status = 'OK') as "موجود",
    COUNT(*) FILTER (WHERE status = 'SECURE') as "آمن",
    COUNT(*) FILTER (WHERE status IN ('MISSING', 'PARTIAL', 'INCOMPLETE')) as "مفقود/ناقص",
    ROUND(
        COUNT(*) FILTER (WHERE status IN ('OK', 'SECURE'))::DECIMAL / 
        COUNT(*)::DECIMAL * 100, 
        1
    ) || '%' as "نسبة الاكتمال"
FROM verification_results
GROUP BY category
ORDER BY 
    CASE category
        WHEN 'Core Tables' THEN 1
        WHEN 'Accounting Tables' THEN 2
        WHEN 'SaaS & Agents Tables' THEN 3
        WHEN 'Fabric Tables' THEN 4
        WHEN 'Exchange Tables' THEN 5
        WHEN 'RLS Policies' THEN 6
        WHEN 'Triggers' THEN 7
        WHEN 'Functions' THEN 8
        WHEN 'Constraints' THEN 9
        WHEN 'Master Data' THEN 10
        ELSE 99
    END;

-- ═══════════════════════════════════════════════════════════════
-- 13. عرض العناصر المفقودة (CRITICAL & HIGH فقط)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🚨 العناصر المفقودة (CRITICAL & HIGH Priority)'; END $$;

SELECT 
    category as "الفئة",
    item_name as "العنصر",
    status as "الحالة",
    details as "التفاصيل",
    priority as "الأولوية"
FROM verification_results
WHERE status IN ('MISSING', 'PARTIAL', 'INCOMPLETE')
  AND priority IN ('CRITICAL', 'HIGH')
ORDER BY 
    CASE priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        ELSE 3
    END,
    category,
    item_name;

-- ═══════════════════════════════════════════════════════════════
-- 14. عرض جميع النتائج (تفصيلي)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '📊 النتائج التفصيلية'; END $$;

SELECT 
    category as "الفئة",
    item_name as "العنصر",
    CASE 
        WHEN status IN ('OK', 'SECURE') THEN '✅ ' || status
        WHEN status = 'PARTIAL' THEN '⚠️ ' || status
        WHEN status IN ('MISSING', 'INCOMPLETE') THEN '❌ ' || status
        ELSE status
    END as "الحالة",
    details as "التفاصيل"
FROM verification_results
ORDER BY 
    CASE category
        WHEN 'Core Tables' THEN 1
        WHEN 'Accounting Tables' THEN 2
        WHEN 'SaaS & Agents Tables' THEN 3
        WHEN 'Fabric Tables' THEN 4
        WHEN 'Exchange Tables' THEN 5
        WHEN 'Table Columns' THEN 6
        WHEN 'RLS Policies' THEN 7
        WHEN 'Triggers' THEN 8
        WHEN 'Functions' THEN 9
        WHEN 'Constraints' THEN 10
        WHEN 'Master Data' THEN 11
        ELSE 99
    END,
    item_name;

-- ═══════════════════════════════════════════════════════════════
-- 15. النتيجة النهائية والتوصيات
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_total_items INT;
    v_ok_items INT;
    v_missing_critical INT;
    v_missing_high INT;
    v_completion_percent DECIMAL;
    v_final_status TEXT;
BEGIN
    -- الإحصائيات
    SELECT COUNT(*) INTO v_total_items FROM verification_results;
    
    SELECT COUNT(*) INTO v_ok_items 
    FROM verification_results 
    WHERE status IN ('OK', 'SECURE');
    
    SELECT COUNT(*) INTO v_missing_critical
    FROM verification_results
    WHERE status IN ('MISSING', 'PARTIAL', 'INCOMPLETE')
      AND priority = 'CRITICAL';
    
    SELECT COUNT(*) INTO v_missing_high
    FROM verification_results
    WHERE status IN ('MISSING', 'PARTIAL', 'INCOMPLETE')
      AND priority = 'HIGH';
    
    v_completion_percent := ROUND((v_ok_items::DECIMAL / v_total_items::DECIMAL) * 100, 1);
    
    -- تحديد الحالة النهائية
    IF v_missing_critical > 0 THEN
        v_final_status := '🔴 غير جاهز للإنتاج - يوجد عناصر حرجة مفقودة';
    ELSIF v_missing_high > 5 THEN
        v_final_status := '🟡 يحتاج تحسينات - يوجد عناصر مهمة مفقودة';
    ELSIF v_completion_percent >= 95 THEN
        v_final_status := '🟢 جاهز للإنتاج - النظام مكتمل';
    ELSIF v_completion_percent >= 85 THEN
        v_final_status := '🟢 جيد جداً - بعض النواقص البسيطة';
    ELSE
        v_final_status := '🟡 يحتاج عمل - نسبة الاكتمال منخفضة';
    END IF;
    
    -- عرض النتيجة
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🏁 النتيجة النهائية';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 إجمالي العناصر: %', v_total_items;
    RAISE NOTICE '✅ موجود وسليم: % (%)', v_ok_items, v_completion_percent || '%';
    RAISE NOTICE '🔴 مفقود (CRITICAL): %', v_missing_critical;
    RAISE NOTICE '🟡 مفقود (HIGH): %', v_missing_high;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الحالة: %', v_final_status;
    RAISE NOTICE '';
    
    -- التوصيات
    IF v_missing_critical > 0 THEN
        RAISE NOTICE '💡 التوصيات:';
        RAISE NOTICE '   1. أصلح العناصر CRITICAL فوراً';
        RAISE NOTICE '   2. راجع القسم "العناصر المفقودة" أعلاه';
        RAISE NOTICE '   3. شغّل الـ Migrations المطلوبة';
        RAISE NOTICE '   4. لا تطلق في الإنتاج حتى يتم إصلاح CRITICAL';
    ELSIF v_missing_high > 0 THEN
        RAISE NOTICE '💡 التوصيات:';
        RAISE NOTICE '   1. أصلح العناصر HIGH Priority';
        RAISE NOTICE '   2. اختبر النظام بشكل شامل';
        RAISE NOTICE '   3. يمكن الإطلاق مع مراقبة دقيقة';
    ELSE
        RAISE NOTICE '💡 النظام جاهز:';
        RAISE NOTICE '   ✅ جميع العناصر الحرجة موجودة';
        RAISE NOTICE '   ✅ يمكن الإطلاق في الإنتاج';
        RAISE NOTICE '   ✅ تأكد من تشغيل اختبار الأمان (test_tenant_isolation.sql)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 16. حفظ النتائج (اختياري)
-- ═══════════════════════════════════════════════════════════════

-- يمكنك إنشاء جدول دائم لحفظ النتائج:
-- CREATE TABLE IF NOT EXISTS database_verification_history (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     verification_date TIMESTAMPTZ DEFAULT NOW(),
--     category VARCHAR(50),
--     item_name VARCHAR(200),
--     status VARCHAR(20),
--     details TEXT,
--     priority VARCHAR(10)
-- );

-- INSERT INTO database_verification_history 
-- (category, item_name, status, details, priority)
-- SELECT category, item_name, status, details, priority
-- FROM verification_results;

-- ═══════════════════════════════════════════════════════════════
-- نهاية التحقق
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل التحقق من هيكلية قاعدة البيانات';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوات التالية:';
    RAISE NOTICE '   1. راجع النتائج أعلاه';
    RAISE NOTICE '   2. أصلح العناصر المفقودة (إن وجدت)';
    RAISE NOTICE '   3. شغّل اختبار الأمان: test_tenant_isolation.sql';
    RAISE NOTICE '   4. راجع التقرير الشامل: CTO_COMPREHENSIVE_AUDIT_REPORT.md';
    RAISE NOTICE '';
END $$;
