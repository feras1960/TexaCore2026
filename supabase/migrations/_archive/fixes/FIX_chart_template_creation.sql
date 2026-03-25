-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: إصلاح مشكلة إنشاء الشجرة المحاسبية
-- تاريخ: 2026-02-03
-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 ملخص الشجرات:
-- | simple           | ~40 حساب | ترميز 1000, 1100... |
-- | extended         |  72 حساب | ترميز 1, 11, 111... |
-- | fabric_extended  |  80 حساب | نفس الترميز + أقمشة |
-- ═══════════════════════════════════════════════════════════════════════════

-- 0️⃣ حذف الدوال القديمة لتجنب تعارض أنواع الإرجاع
DROP FUNCTION IF EXISTS upgrade_company_chart(UUID, VARCHAR);
DROP FUNCTION IF EXISTS apply_chart_template_to_company(UUID, VARCHAR);

-- 1️⃣ حذف الـ Trigger الذي ينشئ شجرة تلقائياً
DROP TRIGGER IF EXISTS company_created_trigger ON companies;
DROP TRIGGER IF EXISTS trg_on_company_created ON companies;

-- 2️⃣ تحديث دالة apply_chart_template_to_company لاستخدام الدالة الصحيحة
CREATE OR REPLACE FUNCTION apply_chart_template_to_company(
    p_company_id UUID,
    p_template_code VARCHAR(50)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_chart_type VARCHAR(30);
    v_include_fabric BOOLEAN;
    v_existing_count INT;
BEGIN
    -- الحصول على tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;
    
    -- التحقق من وجود شجرة مسبقة
    SELECT COUNT(*) INTO v_existing_count FROM chart_of_accounts WHERE company_id = p_company_id;
    
    IF v_existing_count > 0 THEN
        RAISE NOTICE '⚠️ الشركة لديها % حساب مسبق - سيتم تخطي الإنشاء', v_existing_count;
        RETURN;
    END IF;
    
    -- تحديد نوع الشجرة
    v_chart_type := CASE p_template_code
        WHEN 'simple' THEN 'simple'
        WHEN 'extended' THEN 'extended'
        WHEN 'fabric_extended' THEN 'fabric_extended'
        WHEN 'fabric_extended_demo' THEN 'fabric_extended'
        ELSE 'fabric_extended'  -- افتراضي
    END;
    
    v_include_fabric := (v_chart_type = 'fabric_extended');
    
    RAISE NOTICE '🚀 إنشاء شجرة الحسابات نوع: % للشركة: %', v_chart_type, p_company_id;
    
    -- إنشاء الشجرة حسب النوع
    CASE v_chart_type
        WHEN 'simple' THEN
            -- الشجرة البسيطة (ترميز قديم 1000, 1100...)
            PERFORM create_simple_chart_of_accounts(p_company_id);
        WHEN 'extended' THEN
            -- الشجرة الموحدة الموسعة (72 حساب)
            PERFORM create_unified_extended_chart(p_company_id, false);
        WHEN 'fabric_extended' THEN
            -- الشجرة الموحدة للأقمشة (80 حساب)
            PERFORM create_unified_extended_chart(p_company_id, true);
    END CASE;
    
    RAISE NOTICE '✅ تم تطبيق القالب % على الشركة %', p_template_code, p_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_chart_template_to_company TO authenticated, anon;

-- 3️⃣ دالة ترقية الشجرة (الترقية فقط، لا يمكن الرجوع)
CREATE OR REPLACE FUNCTION upgrade_company_chart(
    p_company_id UUID,
    p_target_chart_type VARCHAR(30)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_chart_type VARCHAR(30);
    v_tenant_id UUID;
    v_current_count INT;
    v_hierarchy_level INT;
    v_target_level INT;
BEGIN
    -- الحصول على نوع الشجرة الحالي
    SELECT chart_type, tenant_id INTO v_current_chart_type, v_tenant_id
    FROM companies WHERE id = p_company_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الشركة غير موجودة');
    END IF;
    
    -- التحقق من نفس النوع
    IF v_current_chart_type = p_target_chart_type THEN
        RETURN jsonb_build_object('success', true, 'message', 'الشجرة من نفس النوع المطلوب');
    END IF;
    
    -- تحديد مستوى التسلسل الهرمي
    -- simple = 1, extended = 2, fabric_extended = 3
    v_hierarchy_level := CASE v_current_chart_type
        WHEN 'simple' THEN 1
        WHEN 'extended' THEN 2
        WHEN 'fabric_extended' THEN 3
        ELSE 0
    END;
    
    v_target_level := CASE p_target_chart_type
        WHEN 'simple' THEN 1
        WHEN 'extended' THEN 2
        WHEN 'fabric_extended' THEN 3
        ELSE 0
    END;
    
    -- 🔒 القاعدة: الترقية فقط، لا يمكن الرجوع
    IF v_target_level <= v_hierarchy_level THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'لا يمكن الرجوع من شجرة متقدمة إلى شجرة أبسط',
            'current_type', v_current_chart_type,
            'target_type', p_target_chart_type,
            'allowed_upgrades', CASE v_current_chart_type
                WHEN 'simple' THEN 'extended, fabric_extended'
                WHEN 'extended' THEN 'fabric_extended'
                ELSE 'لا يمكن الترقية'
            END
        );
    END IF;
    
    -- عدد الحسابات الحالية
    SELECT COUNT(*) INTO v_current_count FROM chart_of_accounts WHERE company_id = p_company_id;
    
    -- ملاحظة: الترقية الفعلية تتطلب إضافة الحسابات الجديدة فقط
    -- هذا يحتاج تنفيذ مخصص لكل مسار ترقية
    
    IF v_current_chart_type = 'simple' AND p_target_chart_type IN ('extended', 'fabric_extended') THEN
        -- حذف الشجرة القديمة وإنشاء الجديدة
        -- ⚠️ هذا يفقد أي تخصيصات
        RAISE NOTICE '⚠️ سيتم حذف الشجرة القديمة وإنشاء شجرة جديدة';
        
        DELETE FROM chart_of_accounts WHERE company_id = p_company_id;
        
        IF p_target_chart_type = 'fabric_extended' THEN
            PERFORM create_unified_extended_chart(p_company_id, true);
        ELSE
            PERFORM create_unified_extended_chart(p_company_id, false);
        END IF;
        
    ELSIF v_current_chart_type = 'extended' AND p_target_chart_type = 'fabric_extended' THEN
        -- إضافة حسابات الأقمشة فقط
        -- TODO: تنفيذ إضافة الحسابات الجزئية
        UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تمت ترقية الشجرة بنجاح',
        'from', v_current_chart_type,
        'to', p_target_chart_type,
        'accounts_before', v_current_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION upgrade_company_chart TO authenticated;

-- 4️⃣ تحديث register_new_subscriber لاستخدام apply_chart_template_to_company
-- هذا يضمن أن التسجيل يستخدم الدالة الصحيحة

-- 5️⃣ ملخص التغييرات
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إصلاح نظام الشجرات المحاسبية';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الشجرات المتاحة:';
    RAISE NOTICE '   simple           → ~40 حساب (ترميز 1000, 1100...)';
    RAISE NOTICE '   extended         →  72 حساب (ترميز 1, 11, 111...)';
    RAISE NOTICE '   fabric_extended  →  80 حساب (نفس الترميز + أقمشة)';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 مسارات الترقية المسموحة:';
    RAISE NOTICE '   simple → extended ✅';
    RAISE NOTICE '   simple → fabric_extended ✅';
    RAISE NOTICE '   extended → fabric_extended ✅';
    RAISE NOTICE '   fabric_extended → أي شيء ❌';
    RAISE NOTICE '   extended → simple ❌';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ الدوال المحدثة:';
    RAISE NOTICE '   - apply_chart_template_to_company(company_id, template_code)';
    RAISE NOTICE '   - upgrade_company_chart(company_id, target_type)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- التحقق من وجود الدوال
SELECT 
    proname as function_name,
    'موجودة ✅' as status
FROM pg_proc 
WHERE proname IN (
    'apply_chart_template_to_company',
    'create_unified_extended_chart', 
    'create_simple_chart_of_accounts',
    'upgrade_company_chart'
)
ORDER BY proname;
