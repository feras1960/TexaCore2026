-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 3: التحقق من النظام وتطبيق قالب على شركتك
-- Step 3: Verify System and Apply Template to Your Company
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا السكريبت:
-- 1. يتحقق من وجود القوالب لجميع التينانتات
-- 2. يعرض القوالب المتاحة
-- 3. يطبق قالب على شركتك الحالية (اختياري)
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type إذا لم يكن موجوداً
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ التحقق من وجود القوالب
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    COUNT(ct.id) AS templates_count,
    CASE 
        WHEN COUNT(ct.id) = 4 THEN '✅ جاهز'
        WHEN COUNT(ct.id) > 0 THEN '⚠️ ناقص'
        ELSE '❌ غير موجود'
    END AS status,
    STRING_AGG(ct.template_code, ', ' ORDER BY ct.template_code) AS available_templates
FROM tenants t
LEFT JOIN chart_templates ct ON ct.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.created_at;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ عرض القوالب المتاحة لكل تينانت
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    ct.template_code,
    ct.template_name_ar,
    ct.chart_type,
    ct.include_demo_data,
    ct.is_active
FROM tenants t
JOIN chart_templates ct ON ct.tenant_id = t.id
ORDER BY t.name, ct.template_code;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ عرض الشركات الموجودة وحالة شجراتها
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    c.name_ar AS company_name,
    COALESCE(c.chart_type, 'غير محدد') AS chart_type,
    COUNT(coa.id) AS accounts_count,
    CASE 
        WHEN COUNT(coa.id) = 0 THEN '❌ لا توجد شجرة'
        WHEN COUNT(coa.id) > 0 AND (c.chart_type IS NULL OR c.chart_type = '') THEN '⚠️ شجرة بدون نوع'
        ELSE '✅ جاهز'
    END AS status
FROM companies c
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
GROUP BY t.id, t.name, c.id, c.name_ar, c.chart_type
ORDER BY t.name, c.created_at;

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ تطبيق قالب على شركتك الحالية (اختياري)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_target_tenant_id UUID;
    v_target_company_id UUID;
    v_current_chart_count INT;
    v_template_code VARCHAR(50) := 'fabric_extended_demo'; -- يمكنك تغيير هذا
    v_customers_count INT;
    v_suppliers_count INT;
    v_fabric_groups_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 تطبيق قالب على شركتك الحالية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على آخر تينانت (غير Default Tenant)
    SELECT t.id, c.id INTO v_target_tenant_id, v_target_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name != 'Default Tenant'
    ORDER BY t.created_at DESC, c.created_at DESC
    LIMIT 1;
    
    IF v_target_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لم يتم العثور على شركة للهدف';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 الشركة المستهدفة: %', (SELECT name_ar FROM companies WHERE id = v_target_company_id);
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
    
    -- تطبيق القالب
    BEGIN
        PERFORM apply_chart_template_to_company(v_target_company_id, v_template_code);
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ تم تطبيق القالب بنجاح!';
        RAISE NOTICE '';
        RAISE NOTICE '📊 التحقق من النتيجة:';
        
        -- عرض عدد الحسابات
        SELECT COUNT(*) INTO v_current_chart_count 
        FROM chart_of_accounts 
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE '   - عدد الحسابات: %', v_current_chart_count;
        
        -- عرض عدد العملاء (إذا كان القالب يتضمن بيانات تجريبية)
        IF v_template_code LIKE '%demo%' THEN
            SELECT COUNT(*) INTO v_customers_count 
            FROM customers 
            WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
            
            SELECT COUNT(*) INTO v_suppliers_count 
            FROM suppliers 
            WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
            
            SELECT COUNT(*) INTO v_fabric_groups_count 
            FROM fabric_groups 
            WHERE tenant_id = v_target_tenant_id;
            
            RAISE NOTICE '   - العملاء: %', v_customers_count;
            RAISE NOTICE '   - الموردين: %', v_suppliers_count;
            RAISE NOTICE '   - مجموعات الأقمشة: %', v_fabric_groups_count;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في تطبيق القالب: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ ملخص نهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '✅ النظام جاهز!' AS message,
    (SELECT COUNT(DISTINCT tenant_id) FROM chart_templates) AS tenants_with_templates,
    (SELECT COUNT(*) FROM chart_templates) AS total_templates,
    (SELECT COUNT(*) FROM companies WHERE chart_type IS NOT NULL) AS companies_with_charts;
