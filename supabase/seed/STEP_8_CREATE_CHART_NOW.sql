-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 8: إنشاء الشجرة مباشرة (عدد الحسابات = 0)
-- Step 8: Create Chart Directly (0 accounts)
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_count INT;
BEGIN
    RAISE NOTICE '🚀 بدء إنشاء الشجرة...';
    
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
    
    -- التحقق من عدد الحسابات
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
    RAISE NOTICE '📊 عدد الحسابات الحالي: %', v_count;
    
    -- إذا كانت هناك حسابات، حذفها
    IF v_count > 0 THEN
        RAISE NOTICE '🗑️ حذف الحسابات القديمة...';
        DELETE FROM chart_of_accounts WHERE company_id = v_company_id;
    END IF;
    
    -- التحقق من وجود دالة create_fabric_extended_chart
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_fabric_extended_chart') THEN
        RAISE NOTICE '❌ دالة create_fabric_extended_chart غير موجودة';
        RAISE NOTICE '   يجب تشغيل STEP_30_fabric_extended_chart.sql أولاً';
        RETURN;
    END IF;
    
    -- إنشاء الشجرة
    BEGIN
        RAISE NOTICE '🔄 إنشاء شجرة الأقمشة الموسعة...';
        PERFORM create_fabric_extended_chart(v_company_id);
        
        SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
        RAISE NOTICE '✅ تم! عدد الحسابات: %', v_count;
        
        IF v_count = 0 THEN
            RAISE NOTICE '⚠️ المشكلة: الشجرة لم تُنشأ';
            RAISE NOTICE '   تحقق من وجود دالة create_fabric_extended_chart';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ: %', SQLERRM;
    END;
END;
$$;

-- التحقق من النتيجة
SELECT 
    'عدد الحسابات' AS info,
    COUNT(*) AS count
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.name = 'NexRev Platform';
