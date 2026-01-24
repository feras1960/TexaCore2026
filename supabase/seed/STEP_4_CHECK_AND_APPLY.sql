-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 4: التحقق من الشركة وتطبيق القالب
-- Step 4: Check Company and Apply Template
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. عرض جميع الشركات في التينانت
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    c.id AS company_id,
    c.name_ar AS company_name,
    c.name_en AS company_name_en,
    c.chart_type,
    (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = c.id) AS accounts_count
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
WHERE t.name != 'Default Tenant'
ORDER BY t.created_at DESC, c.created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من القوالب المتاحة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    ct.template_code,
    ct.template_name_ar,
    ct.chart_type,
    ct.include_demo_data
FROM tenants t
JOIN chart_templates ct ON ct.tenant_id = t.id
WHERE t.name != 'Default Tenant'
ORDER BY t.created_at DESC, ct.template_code;

-- ═══════════════════════════════════════════════════════════════
-- 3. تطبيق القالب على الشركة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_target_tenant_id UUID;
    v_target_company_id UUID;
    v_company_name VARCHAR(200);
    v_template_code VARCHAR(50) := 'fabric_extended_demo';
    v_chart_count INT;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 تطبيق قالب على شركتك';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على آخر تينانت وشركة (غير Default Tenant)
    SELECT t.id, c.id, COALESCE(c.name_ar, c.name_en, 'شركة بدون اسم') 
    INTO v_target_tenant_id, v_target_company_id, v_company_name
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name != 'Default Tenant'
    ORDER BY t.created_at DESC, c.created_at DESC
    LIMIT 1;
    
    IF v_target_company_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على شركة';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 التينانت: %', (SELECT name FROM tenants WHERE id = v_target_tenant_id);
    RAISE NOTICE '📌 الشركة: %', v_company_name;
    RAISE NOTICE '📌 معرف الشركة: %', v_target_company_id;
    RAISE NOTICE '📌 القالب المختار: %', v_template_code;
    
    -- التحقق من وجود شجرة
    SELECT COUNT(*) INTO v_chart_count 
    FROM chart_of_accounts 
    WHERE company_id = v_target_company_id;
    
    IF v_chart_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ الشركة لديها شجرة حسابات موجودة (% حساب)', v_chart_count;
        RAISE NOTICE '   إذا كنت تريد استبدالها، شغّل:';
        RAISE NOTICE '   DELETE FROM chart_of_accounts WHERE company_id = ''%'';', v_target_company_id;
        RETURN;
    END IF;
    
    -- التحقق من وجود دالة apply_chart_template_to_company
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_chart_template_to_company') THEN
        RAISE NOTICE '❌ دالة apply_chart_template_to_company غير موجودة';
        RAISE NOTICE '   يجب تشغيل STEP_31_chart_templates_system.sql أولاً';
        RETURN;
    END IF;
    
    -- التحقق من وجود القالب
    IF NOT EXISTS (
        SELECT 1 FROM chart_templates 
        WHERE tenant_id = v_target_tenant_id 
        AND template_code = v_template_code
        AND is_active = true
    ) THEN
        RAISE NOTICE '❌ القالب % غير موجود - جاري إعداد القوالب...', v_template_code;
        PERFORM setup_chart_templates_for_tenant(v_target_tenant_id);
    END IF;
    
    -- تطبيق القالب
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE '🔄 جاري تطبيق القالب...';
        
        PERFORM apply_chart_template_to_company(v_target_company_id, v_template_code);
        
        -- التحقق من النتيجة
        SELECT COUNT(*) INTO v_chart_count 
        FROM chart_of_accounts 
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ تم تطبيق القالب بنجاح!';
        RAISE NOTICE '📊 عدد الحسابات: %', v_chart_count;
        
        -- إذا كان القالب يتضمن بيانات تجريبية
        IF v_template_code LIKE '%demo%' THEN
            DECLARE
                v_customers INT;
                v_suppliers INT;
                v_fabric_groups INT;
            BEGIN
                SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
                SELECT COUNT(*) INTO v_suppliers FROM suppliers WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
                SELECT COUNT(*) INTO v_fabric_groups FROM fabric_groups WHERE tenant_id = v_target_tenant_id;
                
                RAISE NOTICE '📦 البيانات التجريبية:';
                RAISE NOTICE '   - العملاء: %', v_customers;
                RAISE NOTICE '   - الموردين: %', v_suppliers;
                RAISE NOTICE '   - مجموعات الأقمشة: %', v_fabric_groups;
            END;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ: %', SQLERRM;
        RAISE NOTICE '   تفاصيل: %', SQLSTATE;
    END;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من النتيجة النهائية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    c.name_ar AS company_name,
    c.chart_type,
    COUNT(coa.id) AS accounts_count,
    CASE 
        WHEN COUNT(coa.id) = 0 THEN '❌ لا توجد شجرة'
        WHEN COUNT(coa.id) BETWEEN 1 AND 50 THEN '✅ شجرة قياسية'
        WHEN COUNT(coa.id) BETWEEN 51 AND 70 THEN '✅ شجرة موسعة'
        ELSE '✅ شجرة كبيرة'
    END AS status
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE t.name != 'Default Tenant'
GROUP BY t.id, t.name, c.id, c.name_ar, c.chart_type
ORDER BY t.created_at DESC, c.created_at DESC
LIMIT 1;
