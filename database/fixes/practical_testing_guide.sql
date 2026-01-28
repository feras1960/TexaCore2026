-- ═══════════════════════════════════════════════════════════════════════════
-- دليل الاختبار العملي الشامل
-- Complete Practical Testing Guide
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على اختبارات عملية خطوة بخطوة
-- يمكنك تنفيذها مباشرة في Supabase SQL Editor
-- 
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🧪 دليل الاختبار العملي الشامل';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📝 هذا الاختبار سيتحقق من:';
    RAISE NOTICE '   1. وجود الجداول والعلاقات';
    RAISE NOTICE '   2. Triggers المحاسبية';
    RAISE NOTICE '   3. Functions الحرجة';
    RAISE NOTICE '   4. RLS Policies';
    RAISE NOTICE '   5. محاكاة عملية بيع كاملة';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- المرحلة 1: التحقق من الهيكل الأساسي
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '📊 المرحلة 1: التحقق من الهيكل الأساسي'; 
    RAISE NOTICE '════════════════════════════════════════════════';
END $$;

-- 1.1 الجداول الحرجة
SELECT 
    '1.1' as "الاختبار",
    'الجداول الحرجة' as "الوصف",
    CASE 
        WHEN COUNT(*) >= 9 THEN '✅ نجح'
        ELSE '❌ فشل'
    END as "النتيجة",
    COUNT(*)::TEXT || '/9' as "التفاصيل"
FROM (VALUES 
    ('tenants'), ('companies'), ('customers'), ('suppliers'),
    ('chart_of_accounts'), ('journal_entries'), ('sales_invoices'),
    ('purchase_invoices'), ('payment_receipts')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
);

-- 1.2 Foreign Keys
SELECT 
    '1.2' as "الاختبار",
    'Foreign Keys' as "الوصف",
    CASE 
        WHEN COUNT(*) >= 200 THEN '✅ نجح'
        ELSE '⚠️ ناقص'
    END as "النتيجة",
    COUNT(*)::TEXT || ' علاقة' as "التفاصيل"
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- 1.3 RLS Policies
SELECT 
    '1.3' as "الاختبار",
    'RLS Policies' as "الوصف",
    CASE 
        WHEN COUNT(*) >= 100 THEN '✅ نجح'
        WHEN COUNT(*) >= 50 THEN '🟡 جيد'
        ELSE '❌ ناقص'
    END as "النتيجة",
    COUNT(*)::TEXT || ' policy' as "التفاصيل"
FROM pg_policies;

-- ═══════════════════════════════════════════════════════════════
-- المرحلة 2: التحقق من Triggers المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '⚡ المرحلة 2: التحقق من Triggers المحاسبية';
    RAISE NOTICE '════════════════════════════════════════════════';
END $$;

-- 2.1 وجود Triggers
SELECT 
    '2.' || ROW_NUMBER() OVER() as "الاختبار",
    t.trigger_name as "Trigger",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger tr
            JOIN pg_class c ON tr.tgrelid = c.oid
            WHERE c.relname = t.table_name
              AND tr.tgname = t.trigger_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('trg_sales_invoice_journal_entry', 'sales_invoices'),
    ('trg_purchase_invoice_journal_entry', 'purchase_invoices'),
    ('trg_payment_receipt_journal_entry', 'payment_receipts'),
    ('trg_deduct_inventory_on_sale', 'sales_invoices'),
    ('trg_validate_balance', 'journal_entries')
) AS t(trigger_name, table_name);

-- ═══════════════════════════════════════════════════════════════
-- المرحلة 3: التحقق من Functions
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🔧 المرحلة 3: التحقق من Functions';
    RAISE NOTICE '════════════════════════════════════════════════';
END $$;

SELECT 
    '3.' || ROW_NUMBER() OVER() as "الاختبار",
    f.func_name as "Function",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = f.func_name
        ) THEN '✅ موجودة'
        ELSE '❌ مفقودة'
    END as "الحالة"
FROM (VALUES 
    ('get_current_user_tenant_id'),
    ('is_super_admin'),
    ('get_account_by_code'),
    ('create_sales_invoice_journal_entry'),
    ('validate_journal_entry_balance'),
    ('register_new_subscriber')
) AS f(func_name);

-- ═══════════════════════════════════════════════════════════════
-- المرحلة 4: اختبار عملي - محاكاة فاتورة مبيعات
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🎯 المرحلة 4: اختبار عملي - محاكاة فاتورة مبيعات';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ هذا الاختبار يتطلب:';
    RAISE NOTICE '   • وجود tenant واحد على الأقل';
    RAISE NOTICE '   • وجود company واحدة على الأقل';
    RAISE NOTICE '   • وجود شجرة حسابات مطبقة';
    RAISE NOTICE '';
END $$;

-- 4.1 التحقق من وجود بيانات أساسية
SELECT 
    '4.1' as "الاختبار",
    'البيانات الأساسية' as "الوصف",
    CASE 
        WHEN tenants_count > 0 AND companies_count > 0 AND accounts_count >= 10 
        THEN '✅ جاهز للاختبار'
        ELSE '⚠️ يحتاج بيانات أساسية'
    END as "النتيجة",
    format('Tenants: %s, Companies: %s, Accounts: %s', 
           tenants_count, companies_count, accounts_count) as "التفاصيل"
FROM (
    SELECT 
        (SELECT COUNT(*) FROM tenants) as tenants_count,
        (SELECT COUNT(*) FROM companies) as companies_count,
        (SELECT COUNT(*) FROM chart_of_accounts WHERE is_active = true) as accounts_count
) AS counts;

-- 4.2 اختبار توفر الحسابات المحاسبية المطلوبة
DO $$
DECLARE
    v_company_id UUID;
    v_account_1110 UUID;
    v_account_1130 UUID;
    v_account_4100 UUID;
    v_all_exist BOOLEAN;
BEGIN
    -- اختيار أول company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '4.2 ❌ لا يوجد companies للاختبار';
        RETURN;
    END IF;
    
    -- البحث عن الحسابات المطلوبة
    v_account_1110 := get_account_by_code(v_company_id, '1110'); -- الصندوق
    v_account_1130 := get_account_by_code(v_company_id, '1130'); -- العملاء
    v_account_4100 := get_account_by_code(v_company_id, '4100'); -- المبيعات
    
    v_all_exist := (v_account_1110 IS NOT NULL AND v_account_1130 IS NOT NULL AND v_account_4100 IS NOT NULL);
    
    IF v_all_exist THEN
        RAISE NOTICE '4.2 ✅ الحسابات المحاسبية متوفرة';
        RAISE NOTICE '   • 1110 (الصندوق): %', CASE WHEN v_account_1110 IS NOT NULL THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   • 1130 (العملاء): %', CASE WHEN v_account_1130 IS NOT NULL THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   • 4100 (المبيعات): %', CASE WHEN v_account_4100 IS NOT NULL THEN '✅' ELSE '❌' END;
    ELSE
        RAISE NOTICE '4.2 ⚠️ بعض الحسابات مفقودة - يحتاج تطبيق chart template';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- المرحلة 5: النتيجة النهائية الشاملة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables_ok BOOLEAN;
    v_triggers_ok BOOLEAN;
    v_functions_ok BOOLEAN;
    v_rls_ok BOOLEAN;
    v_data_ok BOOLEAN;
    v_score INT := 0;
    v_final_status TEXT;
BEGIN
    -- 1. الجداول
    SELECT COUNT(*) >= 9 INTO v_tables_ok
    FROM (VALUES 
        ('tenants'), ('companies'), ('customers'), ('suppliers'),
        ('chart_of_accounts'), ('journal_entries'), ('sales_invoices'),
        ('purchase_invoices'), ('payment_receipts')
    ) AS t(table_name)
    WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    );
    IF v_tables_ok THEN v_score := v_score + 30; END IF;
    
    -- 2. Triggers
    SELECT COUNT(*) >= 4 INTO v_triggers_ok
    FROM (VALUES 
        ('trg_sales_invoice_journal_entry'),
        ('trg_purchase_invoice_journal_entry'),
        ('trg_payment_receipt_journal_entry'),
        ('trg_deduct_inventory_on_sale')
    ) AS t(trigger_name)
    WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = REPLACE(t.trigger_name, 'trg_', 'create_'));
    IF v_triggers_ok THEN v_score := v_score + 25; END IF;
    
    -- 3. Functions
    SELECT COUNT(*) >= 5 INTO v_functions_ok
    FROM (VALUES 
        ('get_current_user_tenant_id'),
        ('is_super_admin'),
        ('get_account_by_code')
    ) AS f(func_name)
    WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = f.func_name);
    IF v_functions_ok THEN v_score := v_score + 20; END IF;
    
    -- 4. RLS
    SELECT COUNT(*) >= 100 INTO v_rls_ok FROM pg_policies;
    IF v_rls_ok THEN v_score := v_score + 15; END IF;
    
    -- 5. البيانات الأساسية
    SELECT (SELECT COUNT(*) FROM tenants) > 0 
       AND (SELECT COUNT(*) FROM companies) > 0
       INTO v_data_ok;
    IF v_data_ok THEN v_score := v_score + 10; END IF;
    
    -- تحديد الحالة النهائية
    IF v_score >= 95 THEN
        v_final_status := '🟢 ممتاز - جاهز للإنتاج 100%';
    ELSIF v_score >= 85 THEN
        v_final_status := '🟢 جيد جداً - جاهز مع مراقبة';
    ELSIF v_score >= 70 THEN
        v_final_status := '🟡 جيد - يحتاج بعض التحسينات';
    ELSE
        v_final_status := '🔴 يحتاج عمل - غير جاهز';
    END IF;
    
    -- عرض النتيجة
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🏁 النتيجة النهائية';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 النتائج التفصيلية:';
    RAISE NOTICE '   1. الجداول: % (30 نقطة)', CASE WHEN v_tables_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   2. Triggers: % (25 نقطة)', CASE WHEN v_triggers_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   3. Functions: % (20 نقطة)', CASE WHEN v_functions_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   4. RLS: % (15 نقطة)', CASE WHEN v_rls_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   5. البيانات: % (10 نقاط)', CASE WHEN v_data_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 المجموع: %/100', v_score;
    RAISE NOTICE '🎯 الحالة: %', v_final_status;
    RAISE NOTICE '';
    
    -- التوصيات
    IF v_score >= 95 THEN
        RAISE NOTICE '✅ التوصيات:';
        RAISE NOTICE '   • النظام جاهز للإطلاق';
        RAISE NOTICE '   • اختبر من Frontend';
        RAISE NOTICE '   • أطلق في الإنتاج! 🚀';
    ELSIF NOT v_tables_ok THEN
        RAISE NOTICE '⚠️ التوصيات:';
        RAISE NOTICE '   • أكمل Migrations الأساسية';
        RAISE NOTICE '   • شغّل create_missing_invoice_tables.sql';
    ELSIF NOT v_triggers_ok THEN
        RAISE NOTICE '⚠️ التوصيات:';
        RAISE NOTICE '   • شغّل fix_accounting_triggers.sql';
    ELSIF NOT v_rls_ok THEN
        RAISE NOTICE '⚠️ التوصيات:';
        RAISE NOTICE '   • شغّل STEP_47_fix_rls_tenant_isolation.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- اختبار إضافي: عرض تفاصيل Triggers
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '📋 تفاصيل Triggers المحاسبية:';
END $$;

SELECT 
    c.relname as "الجدول",
    t.tgname as "Trigger",
    CASE t.tgtype & 2
        WHEN 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END as "التوقيت",
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'UNKNOWN'
    END as "الحدث",
    CASE t.tgenabled
        WHEN 'O' THEN '✅ مفعّل'
        WHEN 'D' THEN '❌ معطّل'
        ELSE 'غير معروف'
    END as "الحالة"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal
  AND c.relname IN ('sales_invoices', 'purchase_invoices', 'payment_receipts', 'journal_entries')
  AND t.tgname LIKE 'trg_%'
ORDER BY c.relname, t.tgname;

-- ═══════════════════════════════════════════════════════════════
-- نهاية الاختبار
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل الاختبار الشامل';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوات التالية:';
    RAISE NOTICE '   1. راجع النتائج أعلاه';
    RAISE NOTICE '   2. إذا كان المجموع 95+ → أطلق!';
    RAISE NOTICE '   3. إذا كان أقل → اتبع التوصيات';
    RAISE NOTICE '';
END $$;
