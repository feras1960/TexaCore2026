-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 62: تهيئة قوالب الشجرات المحاسبية لجميع التينانتات
-- Init Chart Templates for All Tenants
-- ═══════════════════════════════════════════════════════════════════════════════

-- هذا السكربت يقوم بتشغيل دالة propagate_templates_to_all_tenants
-- لضمان أن جميع التينانتات (بما فيها السوبر أدمن) لديهم القوالب الأربعة:
-- 1. Standard (simple)
-- 2. Extended
-- 3. Fabric Extended
-- 4. Fabric Extended (Demo)

DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE '🚀 بدء تهيئة القوالب...';
    
    -- تنفيذ الدالة لتعميم القوالب
    PERFORM propagate_templates_to_all_tenants();
    
    -- التحقق من النتائج
    SELECT COUNT(*) INTO v_count FROM chart_templates;
    
    RAISE NOTICE '✅ تمت العملية بنجاح.';
    RAISE NOTICE '📊 عدد القوالب الكلي في النظام الآن: %', v_count;
END;
$$;
