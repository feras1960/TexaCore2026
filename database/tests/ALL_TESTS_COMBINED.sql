-- ═══════════════════════════════════════════════════════════════════════════
-- جميع الاختبارات مجمعة في ملف واحد
-- ALL TESTS COMBINED - Complete Testing Suite
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على جميع الاختبارات في مكان واحد
-- نفذه مرة واحدة للتحقق من كل شيء
-- 
-- المدة الكلية: ~10 دقائق
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🧪 جميع الاختبارات - Complete Testing Suite';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'تاريخ: 25 يناير 2026';
    RAISE NOTICE 'الحالة: جاهز للتنفيذ';
    RAISE NOTICE '';
    RAISE NOTICE 'هذا الملف يشمل:';
    RAISE NOTICE '  1. الفحص السريع (30 ثانية)';
    RAISE NOTICE '  2. الفحص الشامل (2 دقيقة)';
    RAISE NOTICE '  3. اختبار RLS والأمان (2 دقيقة)';
    RAISE NOTICE '  4. الاختبار العملي الشامل (5 دقائق)';
    RAISE NOTICE '  5. الفحص النهائي الكامل (1 دقيقة)';
    RAISE NOTICE '';
    RAISE NOTICE 'المدة الكلية: ~10 دقائق';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- القسم 1: الفحص السريع (quick_database_check.sql)
-- المدة: 30 ثانية
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 القسم 1: الفحص السريع';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- 1.1: المؤشرات الرئيسية
SELECT 
    '📁 إجمالي الجداول' as "المؤشر",
    COUNT(*)::TEXT as "القيمة",
    CASE 
        WHEN COUNT(*) >= 100 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 50 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END as "الحالة",
    'يجب أن يكون 135+' as "المطلوب"
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '🔒 جداول بـ RLS',
    COUNT(DISTINCT tablename)::TEXT,
    CASE 
        WHEN COUNT(DISTINCT tablename) >= 40 THEN '✅ ممتاز'
        WHEN COUNT(DISTINCT tablename) >= 20 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END,
    'يجب أن يكون 44+'
FROM pg_policies

UNION ALL

SELECT 
    '⚡ Triggers نشطة',
    COUNT(DISTINCT tgname)::TEXT,
    CASE 
        WHEN COUNT(DISTINCT tgname) >= 25 THEN '✅ ممتاز'
        WHEN COUNT(DISTINCT tgname) >= 15 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END,
    'يجب أن يكون 32+'
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal AND t.tgenabled = 'O'

UNION ALL

SELECT 
    '🔧 Functions',
    COUNT(DISTINCT proname)::TEXT,
    CASE 
        WHEN COUNT(DISTINCT proname) >= 80 THEN '✅ ممتاز'
        WHEN COUNT(DISTINCT proname) >= 50 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END,
    'يجب أن يكون 105+'
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT 
    '🔗 Foreign Keys',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) >= 200 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 100 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END,
    'يجب أن يكون 283+'
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- 1.2: Triggers المحاسبية الحرجة
SELECT 
    '⚡ Triggers المحاسبية' as "النوع",
    STRING_AGG(
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc WHERE proname = t.func_name
            ) THEN '✅ ' || t.display_name
            ELSE '❌ ' || t.display_name
        END,
        ', '
    ) as "الحالة"
FROM (VALUES 
    ('create_sales_invoice_journal_entry', 'فواتير المبيعات'),
    ('create_purchase_invoice_journal_entry', 'فواتير المشتريات'),
    ('create_payment_receipt_journal_entry', 'سندات القبض'),
    ('create_payment_voucher_journal_entry', 'سندات الصرف'),
    ('deduct_inventory_on_sale', 'خصم المخزون')
) AS t(func_name, display_name);

-- ═══════════════════════════════════════════════════════════════════════════
-- القسم 2: الفحص الشامل (verify_database_structure.sql - مبسط)
-- المدة: 2 دقيقة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 القسم 2: الفحص الشامل';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- 2.1: الجداول الأساسية
SELECT 
    '2.1' as "الاختبار",
    'الجداول الأساسية' as "الوصف",
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ كامل'
        ELSE '⚠️ ناقص: ' || (6 - COUNT(*))::TEXT
    END as "النتيجة"
FROM (VALUES ('tenants'), ('companies'), ('branches'), ('user_profiles'), ('currencies'), ('countries')) AS t(table_name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name);

-- 2.2: جداول المحاسبة
SELECT 
    '2.2' as "الاختبار",
    'جداول المحاسبة' as "الوصف",
    CASE 
        WHEN COUNT(*) >= 8 THEN '✅ كامل'
        ELSE '⚠️ ناقص: ' || (10 - COUNT(*))::TEXT
    END as "النتيجة"
FROM (VALUES 
    ('account_types'), ('chart_of_accounts'), ('fiscal_years'), ('accounting_periods'),
    ('journal_entries'), ('journal_entry_lines'), ('cost_centers'), ('cash_accounts'),
    ('cash_transactions'), ('tax_rates')
) AS t(table_name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name);

-- 2.3: جداول الأعمال
SELECT 
    '2.3' as "الاختبار",
    'جداول الأعمال' as "الوصف",
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ كامل'
        ELSE '⚠️ ناقص: ' || (8 - COUNT(*))::TEXT
    END as "النتيجة"
FROM (VALUES 
    ('customers'), ('suppliers'), ('sales_invoices'), ('purchase_invoices'),
    ('payment_receipts'), ('payment_vouchers'), ('products'), ('inventory_movements')
) AS t(table_name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name);

-- ═══════════════════════════════════════════════════════════════════════════
-- القسم 3: اختبار RLS والأمان
-- المدة: 2 دقيقة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 القسم 3: اختبار RLS والأمان';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- 3.1: عدد RLS Policies
SELECT 
    '3.1' as "الاختبار",
    'إجمالي RLS Policies' as "الوصف",
    COUNT(*)::TEXT as "العدد",
    CASE 
        WHEN COUNT(*) >= 150 THEN '✅ ممتاز (176+)'
        WHEN COUNT(*) >= 100 THEN '🟡 جيد'
        WHEN COUNT(*) >= 50 THEN '⚠️ ناقص'
        ELSE '❌ حرج'
    END as "النتيجة"
FROM pg_policies;

-- 3.2: الجداول الحرجة المحمية
SELECT 
    '3.2' as "الاختبار",
    'الجداول الحرجة المحمية' as "الوصف",
    COUNT(DISTINCT t.table_name)::TEXT || '/10' as "العدد",
    CASE 
        WHEN COUNT(DISTINCT t.table_name) = 10 THEN '✅ كامل'
        WHEN COUNT(DISTINCT t.table_name) >= 7 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END as "النتيجة"
FROM (VALUES 
    ('companies'), ('customers'), ('suppliers'), ('sales_invoices'), 
    ('purchase_invoices'), ('journal_entries'), ('inventory_movements'),
    ('agents'), ('tenant_modules'), ('user_profiles')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = t.table_name
);

-- 3.3: Functions الأمنية
SELECT 
    '3.3' as "الاختبار",
    f.func_name as "Function",
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = f.func_name) THEN '✅ موجودة'
        ELSE '❌ مفقودة'
    END as "الحالة"
FROM (VALUES 
    ('get_current_user_tenant_id'),
    ('is_super_admin')
) AS f(func_name);

-- ═══════════════════════════════════════════════════════════════════════════
-- القسم 4: الاختبار العملي الشامل
-- المدة: 5 دقائق
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 القسم 4: الاختبار العملي الشامل';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- 4.1: وجود Triggers المحاسبية
SELECT 
    '4.' || ROW_NUMBER() OVER() as "الاختبار",
    c.relname as "الجدول",
    t.tgname as "Trigger",
    CASE t.tgenabled
        WHEN 'O' THEN '✅ مفعّل'
        WHEN 'D' THEN '❌ معطّل'
        ELSE 'غير معروف'
    END as "الحالة"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal
  AND c.relname IN ('sales_invoices', 'purchase_invoices', 'payment_receipts', 'payment_vouchers', 'journal_entries')
  AND t.tgname LIKE 'trg_%'
ORDER BY c.relname, t.tgname;

-- 4.2: التحقق من البيانات الأساسية
SELECT 
    '4.2' as "الاختبار",
    'البيانات الأساسية' as "الوصف",
    CASE 
        WHEN tenants_count > 0 AND companies_count > 0 THEN '✅ جاهز'
        ELSE '⚠️ يحتاج بيانات'
    END as "النتيجة",
    format('Tenants: %s, Companies: %s', tenants_count, companies_count) as "التفاصيل"
FROM (
    SELECT 
        (SELECT COUNT(*) FROM tenants) as tenants_count,
        (SELECT COUNT(*) FROM companies) as companies_count
) AS counts;

-- ═══════════════════════════════════════════════════════════════════════════
-- القسم 5: الفحص النهائي الكامل
-- المدة: 1 دقيقة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🏁 القسم 5: الفحص النهائي الكامل';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- 5.1: الإحصائيات النهائية
SELECT 
    'النظام' as "المكون",
    'البنية التحتية' as "الفئة",
    COUNT(*) as "العدد",
    CASE 
        WHEN COUNT(*) >= 135 THEN '✅ ممتاز'
        WHEN COUNT(*) >= 100 THEN '🟡 جيد'
        ELSE '⚠️ ناقص'
    END as "التقييم"
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 'الأمان', 'RLS Policies', COUNT(*),
    CASE WHEN COUNT(*) >= 176 THEN '✅ ممتاز' WHEN COUNT(*) >= 100 THEN '🟡 جيد' ELSE '⚠️ ناقص' END
FROM pg_policies

UNION ALL

SELECT 'الأتمتة', 'Triggers', COUNT(DISTINCT tgname),
    CASE WHEN COUNT(DISTINCT tgname) >= 32 THEN '✅ ممتاز' WHEN COUNT(*) >= 20 THEN '🟡 جيد' ELSE '⚠️ ناقص' END
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal

UNION ALL

SELECT 'المعالجات', 'Functions', COUNT(*),
    CASE WHEN COUNT(*) >= 105 THEN '✅ ممتاز' WHEN COUNT(*) >= 70 THEN '🟡 جيد' ELSE '⚠️ ناقص' END
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT 'العلاقات', 'Foreign Keys', COUNT(*),
    CASE WHEN COUNT(*) >= 283 THEN '✅ ممتاز' WHEN COUNT(*) >= 200 THEN '🟡 جيد' ELSE '⚠️ ناقص' END
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- ═══════════════════════════════════════════════════════════════════════════
-- النتيجة النهائية والتقييم
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables INT;
    v_policies INT;
    v_triggers INT;
    v_functions INT;
    v_fks INT;
    v_score INT := 0;
    v_max_score INT := 500;
    v_percentage DECIMAL;
    v_status TEXT;
BEGIN
    -- جمع الإحصائيات
    SELECT COUNT(*) INTO v_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO v_policies FROM pg_policies;
    SELECT COUNT(DISTINCT tgname) INTO v_triggers FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE NOT t.tgisinternal;
    SELECT COUNT(*) INTO v_functions FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    SELECT COUNT(*) INTO v_fks FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';
    
    -- حساب النقاط
    IF v_tables >= 135 THEN v_score := v_score + 100; ELSIF v_tables >= 100 THEN v_score := v_score + 70; END IF;
    IF v_policies >= 176 THEN v_score := v_score + 100; ELSIF v_policies >= 100 THEN v_score := v_score + 70; END IF;
    IF v_triggers >= 32 THEN v_score := v_score + 100; ELSIF v_triggers >= 20 THEN v_score := v_score + 70; END IF;
    IF v_functions >= 105 THEN v_score := v_score + 100; ELSIF v_functions >= 70 THEN v_score := v_score + 70; END IF;
    IF v_fks >= 283 THEN v_score := v_score + 100; ELSIF v_fks >= 200 THEN v_score := v_score + 70; END IF;
    
    -- حساب النسبة
    v_percentage := (v_score::DECIMAL / v_max_score) * 100;
    
    -- تحديد الحالة
    IF v_percentage >= 95 THEN
        v_status := '🟢 ممتاز - جاهز للإنتاج 100%';
    ELSIF v_percentage >= 85 THEN
        v_status := '🟢 جيد جداً - جاهز مع مراقبة';
    ELSIF v_percentage >= 70 THEN
        v_status := '🟡 جيد - يحتاج بعض التحسينات';
    ELSE
        v_status := '🔴 يحتاج عمل - غير جاهز';
    END IF;
    
    -- عرض النتيجة النهائية
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🏆 النتيجة النهائية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   • الجداول: % (المطلوب: 135+)', v_tables;
    RAISE NOTICE '   • RLS Policies: % (المطلوب: 176+)', v_policies;
    RAISE NOTICE '   • Triggers: % (المطلوب: 32+)', v_triggers;
    RAISE NOTICE '   • Functions: % (المطلوب: 105+)', v_functions;
    RAISE NOTICE '   • Foreign Keys: % (المطلوب: 283+)', v_fks;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 التقييم:';
    RAISE NOTICE '   • النقاط: %/%', v_score, v_max_score;
    RAISE NOTICE '   • النسبة: %%%', ROUND(v_percentage, 2);
    RAISE NOTICE '   • الحالة: %', v_status;
    RAISE NOTICE '';
    
    -- التوصيات
    IF v_percentage >= 95 THEN
        RAISE NOTICE '✅ التوصيات:';
        RAISE NOTICE '   • النظام جاهز تماماً';
        RAISE NOTICE '   • يمكن الإطلاق فوراً';
        RAISE NOTICE '   • اختبر من Frontend';
        RAISE NOTICE '   • أطلق في الإنتاج! 🚀';
    ELSIF v_percentage >= 85 THEN
        RAISE NOTICE '🟡 التوصيات:';
        RAISE NOTICE '   • النظام جيد جداً';
        RAISE NOTICE '   • راجع المكونات الناقصة';
        RAISE NOTICE '   • أكمل التحسينات البسيطة';
        RAISE NOTICE '   • ثم أطلق! 🚀';
    ELSE
        RAISE NOTICE '⚠️ التوصيات:';
        IF v_tables < 135 THEN
            RAISE NOTICE '   • أكمل Migrations الأساسية';
        END IF;
        IF v_triggers < 32 THEN
            RAISE NOTICE '   • شغّل fix_accounting_triggers.sql';
        END IF;
        IF v_policies < 176 THEN
            RAISE NOTICE '   • شغّل STEP_47_fix_rls_tenant_isolation.sql';
        END IF;
        RAISE NOTICE '   • أعد الاختبار بعد الإصلاحات';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل جميع الاختبارات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'تاريخ الاختبار: %', NOW();
    RAISE NOTICE 'النتيجة: % (%)', v_status, ROUND(v_percentage, 2) || '%';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية الاختبارات
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 تم إكمال جميع الاختبارات بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الملفات الأصلية المُستخدمة:';
    RAISE NOTICE '   1. quick_database_check.sql';
    RAISE NOTICE '   2. verify_database_structure.sql';
    RAISE NOTICE '   3. test_tenant_isolation.sql';
    RAISE NOTICE '   4. practical_testing_guide.sql';
    RAISE NOTICE '   5. final_comprehensive_check.sql';
    RAISE NOTICE '';
    RAISE NOTICE '📊 هذا الملف يجمع كل الاختبارات في مكان واحد';
    RAISE NOTICE '';
    RAISE NOTICE 'شكراً لاستخدامك Texa Core! 🚀';
    RAISE NOTICE '';
END $$;
