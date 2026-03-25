-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 6: الإعداد الكامل - التحقق والتطبيق
-- Step 6: Complete Setup - Verify and Apply
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من الحالة الحالية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    t.name AS tenant_name,
    c.id AS company_id,
    c.name_ar AS company_name,
    c.chart_type,
    COUNT(coa.id) AS current_accounts,
    CASE 
        WHEN COUNT(coa.id) = 0 THEN '❌ لا توجد شجرة'
        WHEN COUNT(coa.id) < 50 THEN '⚠️ شجرة صغيرة'
        WHEN COUNT(coa.id) = 59 THEN '✅ شجرة الأقمشة الموسعة'
        ELSE '✅ شجرة موجودة'
    END AS status
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE t.name = 'NexRev Platform'
GROUP BY t.id, t.name, c.id, c.name_ar, c.chart_type;

-- ═══════════════════════════════════════════════════════════════
-- 2. تطبيق القالب الكامل (إذا لم تكن الشجرة كاملة)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_current_count INT;
    v_template_code VARCHAR(50) := 'fabric_extended_demo';
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 التحقق من الحالة الحالية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
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
    
    -- عدد الحسابات الحالي
    SELECT COUNT(*) INTO v_current_count 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id;
    
    RAISE NOTICE '📊 عدد الحسابات الحالي: %', v_current_count;
    
    -- إذا كانت الشجرة موجودة ولكنها غير كاملة (أقل من 59)
    IF v_current_count > 0 AND v_current_count < 59 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ الشركة لديها شجرة غير كاملة (% حساب)', v_current_count;
        RAISE NOTICE '   هل تريد استبدالها بالشجرة الكاملة؟';
        RAISE NOTICE '   إذا نعم، شغّل:';
        RAISE NOTICE '   DELETE FROM chart_of_accounts WHERE company_id = ''%'';', v_company_id;
        RAISE NOTICE '   ثم أعد تشغيل هذا السكريبت';
        RETURN;
    END IF;
    
    -- إذا كانت الشجرة كاملة (59 حساب)
    IF v_current_count = 59 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ الشجرة موجودة وكاملة (59 حساب)';
        RAISE NOTICE '   جاري التحقق من البيانات التجريبية...';
        
        -- التحقق من البيانات التجريبية
        DECLARE
            v_customers INT;
            v_suppliers INT;
            v_fabric_groups INT;
        BEGIN
            SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_tenant_id AND company_id = v_company_id;
            SELECT COUNT(*) INTO v_suppliers FROM suppliers WHERE tenant_id = v_tenant_id AND company_id = v_company_id;
            SELECT COUNT(*) INTO v_fabric_groups FROM fabric_groups WHERE tenant_id = v_tenant_id;
            
            RAISE NOTICE '   - العملاء: %', v_customers;
            RAISE NOTICE '   - الموردين: %', v_suppliers;
            RAISE NOTICE '   - مجموعات الأقمشة: %', v_fabric_groups;
            
            -- إذا لم تكن البيانات التجريبية موجودة، إضافتها
            IF v_customers = 0 OR v_suppliers = 0 OR v_fabric_groups = 0 THEN
                RAISE NOTICE '';
                RAISE NOTICE '📦 إضافة البيانات التجريبية...';
                
                -- التحقق من وجود دالة copy_demo_data_to_company
                IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'copy_demo_data_to_company') THEN
                    PERFORM copy_demo_data_to_company(v_company_id);
                    RAISE NOTICE '✅ تم إضافة البيانات التجريبية';
                ELSE
                    RAISE NOTICE '⚠️ دالة copy_demo_data_to_company غير موجودة';
                END IF;
            ELSE
                RAISE NOTICE '✅ البيانات التجريبية موجودة';
            END IF;
        END;
        
        RETURN;
    END IF;
    
    -- إذا لم تكن هناك شجرة (0 حساب)
    IF v_current_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🔄 لا توجد شجرة - جاري تطبيق القالب...';
        
        -- التأكد من وجود القوالب
        IF NOT EXISTS (SELECT 1 FROM chart_templates WHERE tenant_id = v_tenant_id AND template_code = v_template_code) THEN
            RAISE NOTICE '📦 إعداد القوالب...';
            PERFORM setup_chart_templates_for_tenant(v_tenant_id);
        END IF;
        
        -- التأكد من وجود الدالة
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_chart_template_to_company') THEN
            RAISE NOTICE '❌ دالة apply_chart_template_to_company غير موجودة';
            RAISE NOTICE '   يجب تشغيل STEP_31_chart_templates_system.sql أولاً';
            RETURN;
        END IF;
        
        -- تطبيق القالب
        BEGIN
            PERFORM apply_chart_template_to_company(v_company_id, v_template_code);
            
            SELECT COUNT(*) INTO v_current_count 
            FROM chart_of_accounts 
            WHERE company_id = v_company_id;
            
            RAISE NOTICE '';
            RAISE NOTICE '✅ تم تطبيق القالب بنجاح!';
            RAISE NOTICE '📊 عدد الحسابات: %', v_current_count;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ خطأ: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. النتيجة النهائية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    'النتيجة النهائية' AS info,
    t.name AS tenant_name,
    c.name_ar AS company_name,
    COUNT(coa.id) AS accounts_count,
    (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id AND company_id = c.id) AS customers_count,
    (SELECT COUNT(*) FROM suppliers WHERE tenant_id = t.id AND company_id = c.id) AS suppliers_count,
    (SELECT COUNT(*) FROM fabric_groups WHERE tenant_id = t.id) AS fabric_groups_count
FROM tenants t
JOIN companies c ON c.tenant_id = t.id
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE t.name = 'NexRev Platform'
GROUP BY t.id, t.name, c.id, c.name_ar;
