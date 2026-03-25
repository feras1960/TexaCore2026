-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 5: تطبيق القالب الآن على الشركة
-- Step 5: Apply Template Now to Company
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type إذا لم يكن موجوداً
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_template_code VARCHAR(50) := 'fabric_extended_demo';
    v_count INT;
BEGIN
    RAISE NOTICE '🚀 بدء تطبيق القالب...';
    
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على شركة';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 Company ID: %', v_company_id;
    
    -- التحقق من وجود شجرة
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️ الشركة لديها % حساب - سيتم حذفها أولاً', v_count;
        DELETE FROM chart_of_accounts WHERE company_id = v_company_id;
    END IF;
    
    -- التأكد من وجود القوالب
    IF NOT EXISTS (SELECT 1 FROM chart_templates WHERE tenant_id = v_tenant_id AND template_code = v_template_code) THEN
        RAISE NOTICE '📦 إعداد القوالب...';
        PERFORM setup_chart_templates_for_tenant(v_tenant_id);
    END IF;
    
    -- التأكد من وجود الدالة
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_chart_template_to_company') THEN
        RAISE NOTICE '❌ الدالة غير موجودة - يجب تشغيل STEP_31 أولاً';
        RETURN;
    END IF;
    
    -- تطبيق القالب
    BEGIN
        RAISE NOTICE '🔄 تطبيق القالب %...', v_template_code;
        PERFORM apply_chart_template_to_company(v_company_id, v_template_code);
        
        SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
        RAISE NOTICE '✅ تم! عدد الحسابات: %', v_count;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ: %', SQLERRM;
    END;
END;
$$;

-- التحقق من النتيجة
SELECT 
    'النتيجة النهائية' AS info,
    COUNT(*) AS accounts_count
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.name = 'NexRev Platform';
