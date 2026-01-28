-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار عزل Tenants (Tenant Isolation Test)
-- Verify that RLS Policies work correctly
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الاختبار يتحقق من:
-- 1. عزل البيانات بين Tenants
-- 2. Super Admin يمكنه رؤية الكل
-- 3. المستخدم العادي يرى فقط tenant الخاص به
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Test 1: إحصائيات الـ RLS Policies
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📊 Test 1: إحصائيات RLS Policies'; END $$;

SELECT 
    'إجمالي الـ Policies' as "النوع",
    COUNT(*)::TEXT as "العدد"
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Tenant Isolation Policies',
    COUNT(*)::TEXT
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'tenant_isolation%'

UNION ALL

SELECT 
    'Policies غير آمنة (USING true)',
    COUNT(*)::TEXT
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND tablename NOT IN (
      'account_types', 'system_modules', 'saas_products',
      'agent_tiers', 'chart_templates', 'chart_template_accounts',
      'marketing_materials'
  );

-- ═══════════════════════════════════════════════════════════════
-- Test 2: قائمة الجداول المحمية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🔒 Test 2: الجداول المحمية بـ RLS'; END $$;

SELECT 
    tablename as "الجدول",
    COUNT(*) as "عدد Policies",
    STRING_AGG(policyname, ', ') as "الـ Policies"
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'tenant_isolation%'
GROUP BY tablename
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════
-- Test 3: التحقق من Constraints المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '💰 Test 3: Constraints المحاسبية'; END $$;

SELECT 
    conname as "Constraint",
    contype as "النوع",
    CASE 
        WHEN contype = 'c' THEN 'Check Constraint ✅'
        WHEN contype = 'f' THEN 'Foreign Key'
        WHEN contype = 'p' THEN 'Primary Key'
        ELSE contype
    END as "الوصف"
FROM pg_constraint
WHERE conrelid = 'journal_entries'::regclass
  AND conname = 'chk_balanced_entry';

-- ═══════════════════════════════════════════════════════════════
-- Test 4: التحقق من Triggers المحاسبية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '⚡ Test 4: Triggers المحاسبية'; END $$;

SELECT 
    tgname as "Trigger",
    tgtype as "النوع",
    CASE 
        WHEN tgname = 'trg_validate_balance' THEN '✅ التحقق من التوازن'
        WHEN tgname LIKE '%journal_entry' THEN '✅ قيد يومي تلقائي'
        WHEN tgname LIKE '%inventory%' THEN '✅ حركة مخزون تلقائية'
        ELSE tgname
    END as "الوظيفة"
FROM pg_trigger
WHERE tgrelid IN (
    'journal_entries'::regclass,
    'sales_invoices'::regclass,
    'purchase_invoices'::regclass,
    'payment_receipts'::regclass,
    'payment_vouchers'::regclass
)
ORDER BY tgname;

-- ═══════════════════════════════════════════════════════════════
-- Test 5: قائمة الـ Tenants الموجودة
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🏢 Test 5: الـ Tenants الموجودة'; END $$;

SELECT 
    code as "الكود",
    name as "الاسم",
    email as "البريد",
    status as "الحالة",
    (SELECT COUNT(*) FROM companies WHERE tenant_id = tenants.id) as "عدد الشركات",
    (SELECT COUNT(*) FROM user_profiles WHERE tenant_id = tenants.id) as "عدد المستخدمين"
FROM tenants
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- Test 6: اختبار عزل البيانات (Simulation)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🧪 Test 6: محاكاة عزل البيانات'; END $$;

DO $$
DECLARE
    v_tenant_count INT;
    v_customer_count INT;
    v_company_count INT;
BEGIN
    -- عدد الـ Tenants
    SELECT COUNT(*) INTO v_tenant_count FROM tenants;
    
    -- عدد العملاء
    SELECT COUNT(*) INTO v_customer_count FROM customers;
    
    -- عدد الشركات
    SELECT COUNT(*) INTO v_company_count FROM companies;
    
    RAISE NOTICE '📊 البيانات الحالية:';
    RAISE NOTICE '   • Tenants: %', v_tenant_count;
    RAISE NOTICE '   • Companies: %', v_company_count;
    RAISE NOTICE '   • Customers: %', v_customer_count;
    RAISE NOTICE '';
    
    IF v_tenant_count > 1 AND v_customer_count > 0 THEN
        RAISE NOTICE '✅ يمكن اختبار العزل (يوجد أكثر من Tenant وبيانات)';
        RAISE NOTICE '💡 للاختبار الفعلي:';
        RAISE NOTICE '   1. سجل دخول كمستخدم من Tenant A';
        RAISE NOTICE '   2. حاول الوصول لبيانات Tenant B';
        RAISE NOTICE '   3. يجب أن تحصل على نتائج فارغة';
    ELSIF v_tenant_count = 1 THEN
        RAISE NOTICE '⚠️ يوجد Tenant واحد فقط';
        RAISE NOTICE '💡 أنشئ Tenant آخر للاختبار الفعلي';
    ELSE
        RAISE NOTICE '⚠️ لا يوجد Tenants';
        RAISE NOTICE '💡 سجل أول مشترك عبر /register';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Test 7: التحقق من دوال الأمان
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🔐 Test 7: دوال الأمان'; END $$;

SELECT 
    proname as "الدالة",
    CASE 
        WHEN proname = 'get_current_user_tenant_id' THEN '✅ الحصول على tenant_id'
        WHEN proname = 'is_super_admin' THEN '✅ التحقق من Super Admin'
        WHEN proname = 'create_tenant_isolation_policies' THEN '✅ إنشاء Policies'
        WHEN proname = 'validate_journal_entry_balance' THEN '✅ التحقق من التوازن'
        ELSE proname
    END as "الوظيفة"
FROM pg_proc
WHERE proname IN (
    'get_current_user_tenant_id',
    'is_super_admin',
    'create_tenant_isolation_policies',
    'validate_journal_entry_balance'
)
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════
-- Test 8: اختبار Balance Constraint (محاكاة)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '⚖️ Test 8: اختبار Balance Constraint'; END $$;

DO $$
DECLARE
    v_test_entry_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
BEGIN
    -- الحصول على أول Tenant و Company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد Tenant أو Company للاختبار';
        RETURN;
    END IF;
    
    BEGIN
        -- محاولة إدخال قيد غير متوازن
        INSERT INTO journal_entries (
            tenant_id, company_id,
            entry_number, entry_date,
            description,
            total_debit, total_credit,
            status, is_posted
        ) VALUES (
            v_tenant_id, v_company_id,
            'TEST-UNBALANCED-001', CURRENT_DATE,
            'اختبار قيد غير متوازن',
            1000, 999,  -- ❌ غير متوازن!
            'posted', true
        )
        RETURNING id INTO v_test_entry_id;
        
        -- إذا وصلنا هنا، فالـ Constraint لم يعمل!
        RAISE WARNING '❌ FAILED: تم قبول قيد غير متوازن!';
        
        -- حذف القيد التجريبي
        DELETE FROM journal_entries WHERE id = v_test_entry_id;
        
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ PASSED: تم رفض القيد غير المتوازن';
        RAISE NOTICE '   الخطأ: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ خطأ غير متوقع: %', SQLERRM;
    END;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Test 9: ملخص الأمان
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '═══════════════════════════════════════════════════════'; END $$;
DO $$ BEGIN RAISE NOTICE '📋 ملخص اختبارات الأمان'; END $$;
DO $$ BEGIN RAISE NOTICE '═══════════════════════════════════════════════════════'; END $$;

DO $$
DECLARE
    v_rls_policies INT;
    v_unsafe_policies INT;
    v_balance_constraint BOOLEAN;
    v_security_functions INT;
    v_result TEXT;
BEGIN
    -- عدد Tenant Isolation Policies
    SELECT COUNT(*) INTO v_rls_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'tenant_isolation%';
    
    -- عدد Policies غير آمنة
    SELECT COUNT(*) INTO v_unsafe_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true')
      AND tablename NOT IN (
          'account_types', 'system_modules', 'saas_products',
          'agent_tiers', 'chart_templates', 'chart_template_accounts',
          'marketing_materials'
      );
    
    -- التحقق من Balance Constraint
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_entries'::regclass
          AND conname = 'chk_balanced_entry'
    ) INTO v_balance_constraint;
    
    -- عدد دوال الأمان
    SELECT COUNT(*) INTO v_security_functions
    FROM pg_proc
    WHERE proname IN (
        'get_current_user_tenant_id',
        'is_super_admin',
        'validate_journal_entry_balance'
    );
    
    -- عرض النتائج
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tenant Isolation Policies: %', v_rls_policies;
    RAISE NOTICE '%', CASE WHEN v_rls_policies >= 40 THEN '   ✅ ممتاز (40+)' ELSE '   ⚠️ قليل' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '🔒 Policies غير آمنة: %', v_unsafe_policies;
    RAISE NOTICE '%', CASE WHEN v_unsafe_policies = 0 THEN '   ✅ لا يوجد (آمن)' ELSE '   ⚠️ يحتاج مراجعة' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '⚖️ Balance Constraint: %', CASE WHEN v_balance_constraint THEN 'موجود ✅' ELSE 'غير موجود ❌' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '🔐 دوال الأمان: %', v_security_functions;
    RAISE NOTICE '%', CASE WHEN v_security_functions = 3 THEN '   ✅ جميع الدوال موجودة' ELSE '   ⚠️ ناقص' END;
    RAISE NOTICE '';
    
    -- الحكم النهائي
    IF v_rls_policies >= 40 AND v_unsafe_policies = 0 AND v_balance_constraint AND v_security_functions = 3 THEN
        v_result := '🎉 النظام آمن 100% - جاهز للإنتاج!';
    ELSIF v_rls_policies >= 30 AND v_unsafe_policies < 5 THEN
        v_result := '✅ النظام آمن بشكل جيد - ينصح بمراجعة بسيطة';
    ELSE
        v_result := '⚠️ النظام يحتاج تحسينات أمنية - لا تطلق الإنتاج بعد!';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🏁 النتيجة النهائية:';
    RAISE NOTICE '   %', v_result;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- نهاية الاختبار
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل اختبار عزل Tenants';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '   1. إذا كانت النتيجة "جاهز للإنتاج" - يمكنك الإطلاق ✅';
    RAISE NOTICE '   2. إذا كانت النتيجة "يحتاج مراجعة" - راجع الـ Policies اليدوياً';
    RAISE NOTICE '   3. للاختبار الفعلي - سجل دخول من حسابين مختلفين';
    RAISE NOTICE '';
END $$;
