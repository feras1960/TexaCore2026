-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 3: تطبيق قالب على شركتك الحالية
-- Step 3: Apply Template to Your Company
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا السكريبت:
-- 1. يعرض القوالب المتاحة لشركتك
-- 2. يطبق القالب المختار (fabric_extended_demo) على شركتك
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type إذا لم يكن موجوداً
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

-- ═══════════════════════════════════════════════════════════════
-- 1. عرض القوالب المتاحة لشركتك
-- ═══════════════════════════════════════════════════════════════

SELECT 
    'القوالب المتاحة لشركتك:' AS info,
    ct.template_code,
    ct.template_name_ar,
    ct.chart_type,
    ct.include_demo_data
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
JOIN chart_templates ct ON ct.tenant_id = t.id
WHERE t.name != 'Default Tenant'
ORDER BY t.created_at DESC, c.created_at DESC, ct.template_code
LIMIT 4;

-- ═══════════════════════════════════════════════════════════════
-- 2. تطبيق القالب على شركتك
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_target_tenant_id UUID;
    v_target_company_id UUID;
    v_current_chart_count INT;
    v_template_code VARCHAR(50) := 'fabric_extended_demo'; -- القالب المختار
    v_company_name VARCHAR(200);
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 تطبيق قالب على شركتك الحالية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على آخر تينانت (غير Default Tenant)
    SELECT t.id, c.id, c.name_ar INTO v_target_tenant_id, v_target_company_id, v_company_name
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name != 'Default Tenant'
    ORDER BY t.created_at DESC, c.created_at DESC
    LIMIT 1;
    
    IF v_target_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لم يتم العثور على شركة للهدف';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 الشركة المستهدفة: %', v_company_name;
    RAISE NOTICE '📌 القالب المختار: %', v_template_code;
    
    -- التحقق من وجود شجرة مسبقة
    SELECT COUNT(*) INTO v_current_chart_count 
    FROM chart_of_accounts 
    WHERE company_id = v_target_company_id;
    
    IF v_current_chart_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ الشركة لديها شجرة حسابات موجودة (% حساب)', v_current_chart_count;
        RAISE NOTICE '   إذا كنت تريد استبدالها، قم بتشغيل:';
        RAISE NOTICE '   DELETE FROM chart_of_accounts WHERE company_id = ''%'';', v_target_company_id;
        RAISE NOTICE '   ثم أعد تشغيل هذا السكريبت';
        RETURN;
    END IF;
    
    -- التحقق من وجود القالب
    IF NOT EXISTS (
        SELECT 1 FROM chart_templates 
        WHERE tenant_id = v_target_tenant_id 
        AND template_code = v_template_code
        AND is_active = true
    ) THEN
        RAISE NOTICE '❌ القالب % غير موجود للتينانت', v_template_code;
        RAISE NOTICE '   قم بتشغيل: SELECT setup_chart_templates_for_tenant(''%'');', v_target_tenant_id;
        RETURN;
    END IF;
    
    -- التحقق من وجود دالة apply_chart_template_to_company
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'apply_chart_template_to_company'
    ) THEN
        RAISE NOTICE '❌ دالة apply_chart_template_to_company غير موجودة';
        RAISE NOTICE '   يجب تشغيل STEP_31_chart_templates_system.sql أولاً';
        RETURN;
    END IF;
    
    -- تطبيق القالب
    BEGIN
        PERFORM apply_chart_template_to_company(v_target_company_id, v_template_code);
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ تم تطبيق القالب بنجاح!';
        
        -- التحقق من النتيجة
        SELECT COUNT(*) INTO v_current_chart_count 
        FROM chart_of_accounts 
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE '📊 عدد الحسابات المُنشأة: %', v_current_chart_count;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في تطبيق القالب: %', SQLERRM;
    END;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من النتيجة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    c.name_ar AS company_name,
    COALESCE(c.chart_type, 'غير محدد') AS chart_type,
    COUNT(coa.id) AS accounts_count,
    CASE 
        WHEN COUNT(coa.id) = 0 THEN '❌ لا توجد شجرة'
        WHEN COUNT(coa.id) > 0 THEN '✅ شجرة موجودة'
    END AS status
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE t.name != 'Default Tenant'
GROUP BY t.id, t.name, c.id, c.name_ar, c.chart_type
ORDER BY t.created_at DESC, c.created_at DESC
LIMIT 1;
