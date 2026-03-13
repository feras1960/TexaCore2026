-- ═══════════════════════════════════════════════════════════════════════════
-- تطبيق الشجرة المحاسبية على Demo Company
-- Apply Chart of Accounts to Demo Company
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_demo_company_id UUID;
    v_template_exists BOOLEAN;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🌳 بدء تطبيق الشجرة المحاسبية على Demo Company';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 1: الحصول على Demo Company ID
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT c.id INTO v_demo_company_id
    FROM companies c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE t.code = 'demo-tenant'
      AND c.code = 'DEMO-FABRIC-001';
    
    IF v_demo_company_id IS NULL THEN
        RAISE EXCEPTION 'Demo Company غير موجودة!';
    END IF;
    
    RAISE NOTICE '✅ تم العثور على Demo Company (ID: %)', v_demo_company_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 2: التحقق من وجود القوالب
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود دالة apply_chart_template_to_company
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'apply_chart_template_to_company'
    ) THEN
        RAISE WARNING '⚠️ دالة apply_chart_template_to_company غير موجودة';
        RAISE NOTICE '💡 سنحاول تطبيق الشجرة يدوياً...';
        RAISE NOTICE '';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RAISE NOTICE '❌ فشل: الدالة غير موجودة';
        RAISE NOTICE '💡 الحل: نفذ STEP_31 أولاً لإنشاء نظام القوالب';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ دالة apply_chart_template_to_company موجودة';
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 3: محاولة تطبيق القوالب بالترتيب
    -- ═══════════════════════════════════════════════════════════════
    
    -- محاولة 1: fabric_extended_demo (مع بيانات تجريبية)
    BEGIN
        PERFORM apply_chart_template_to_company(v_demo_company_id, 'fabric_extended_demo');
        RAISE NOTICE '✅ تم تطبيق القالب: fabric_extended_demo (مع بيانات تجريبية)';
        RAISE NOTICE '';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ نجح التطبيق!';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RETURN;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل القالب: fabric_extended_demo (%)', SQLERRM;
    END;
    
    -- محاولة 2: fabric_extended (بدون بيانات تجريبية)
    BEGIN
        PERFORM apply_chart_template_to_company(v_demo_company_id, 'fabric_extended');
        RAISE NOTICE '✅ تم تطبيق القالب: fabric_extended (بدون بيانات تجريبية)';
        RAISE NOTICE '';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ نجح التطبيق!';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RETURN;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل القالب: fabric_extended (%)', SQLERRM;
    END;
    
    -- محاولة 3: extended (قالب موسع عام)
    BEGIN
        PERFORM apply_chart_template_to_company(v_demo_company_id, 'extended');
        RAISE NOTICE '✅ تم تطبيق القالب: extended (موسع عام)';
        RAISE NOTICE '';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ نجح التطبيق!';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RETURN;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل القالب: extended (%)', SQLERRM;
    END;
    
    -- محاولة 4: simple (قالب قياسي)
    BEGIN
        PERFORM apply_chart_template_to_company(v_demo_company_id, 'simple');
        RAISE NOTICE '✅ تم تطبيق القالب: simple (قياسي)';
        RAISE NOTICE '';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ نجح التطبيق!';
        RAISE NOTICE '════════════════════════════════════════════════════════';
        RETURN;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل القالب: simple (%)', SQLERRM;
    END;
    
    -- إذا فشلت جميع المحاولات
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE WARNING '❌ فشل تطبيق جميع القوالب!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '💡 الحلول الممكنة:';
    RAISE NOTICE '   1. تحقق من وجود القوالب في جدول chart_templates';
    RAISE NOTICE '   2. نفذ STEP_30 (fabric_extended_chart)';
    RAISE NOTICE '   3. نفذ STEP_31 (chart_templates_system)';
    RAISE NOTICE '   4. أو أنشئ الحسابات يدوياً من الواجهة';
    RAISE NOTICE '';
    
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من النتيجة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_accounts_count INT;
BEGIN
    SELECT COUNT(*) INTO v_accounts_count
    FROM chart_of_accounts coa
    JOIN companies c ON c.id = coa.company_id
    JOIN tenants t ON t.id = c.tenant_id
    WHERE t.code = 'demo-tenant';
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 النتيجة النهائية';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'عدد الحسابات في Demo Company: %', v_accounts_count;
    
    IF v_accounts_count > 0 THEN
        RAISE NOTICE '✅ الشجرة المحاسبية موجودة الآن!';
    ELSE
        RAISE NOTICE '❌ الشجرة المحاسبية ما زالت فارغة';
        RAISE NOTICE '💡 تحتاج لتنفيذ STEP_30 و STEP_31 أولاً';
    END IF;
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ✅ اكتمل
-- ═══════════════════════════════════════════════════════════════
