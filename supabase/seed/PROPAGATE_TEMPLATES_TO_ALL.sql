-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔄 تعميم قوالب الشجرات المحاسبية على جميع التينانتات الموجودة
-- Propagate Chart Templates to All Existing Tenants
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- الاستخدام: شغّل هذا الملف في Supabase SQL Editor
-- سيقوم بإعداد القوالب الأربعة لكل تينانت موجود
-- ═══════════════════════════════════════════════════════════════════════════════

-- التأكد من وجود جدول chart_templates
CREATE TABLE IF NOT EXISTS chart_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_code VARCHAR(50) NOT NULL,
    template_name_ar VARCHAR(200) NOT NULL,
    template_name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    chart_type VARCHAR(30) NOT NULL,
    include_demo_data BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, template_code)
);

-- التأكد من وجود دالة setup_chart_templates_for_tenant
CREATE OR REPLACE FUNCTION setup_chart_templates_for_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء القوالب الأربعة للتينانت
    INSERT INTO chart_templates (tenant_id, template_code, template_name_ar, template_name_en, description_ar, description_en, chart_type, include_demo_data, is_active)
    VALUES 
        (p_tenant_id, 'simple', 'الشجرة القياسية', 'Standard Chart', 'شجرة محاسبية قياسية (~40 حساب) - مناسبة للشركات الصغيرة', 'Standard accounting chart (~40 accounts) - suitable for small companies', 'simple', false, true),
        (p_tenant_id, 'extended', 'الشجرة الموسعة', 'Extended Chart', 'شجرة محاسبية موسعة (~80 حساب) - مناسبة للشركات المتوسطة', 'Extended accounting chart (~80 accounts) - suitable for medium companies', 'extended', false, true),
        (p_tenant_id, 'fabric_extended', 'الشجرة الموسعة للأقمشة', 'Extended Fabric Chart', 'شجرة محاسبية موسعة مخصصة لتجارة الأقمشة (59 حساب)', 'Extended accounting chart for fabric trading (59 accounts)', 'fabric_extended', false, true),
        (p_tenant_id, 'fabric_extended_demo', 'الشجرة الموسعة للأقمشة + بيانات تجريبية', 'Extended Fabric Chart + Demo Data', 'شجرة محاسبية موسعة للأقمشة مع بيانات تجريبية كاملة (للاختبار والتعلم)', 'Extended fabric chart with complete demo data (for testing and learning)', 'fabric_extended', true, true)
    ON CONFLICT (tenant_id, template_code) DO UPDATE SET
        template_name_ar = EXCLUDED.template_name_ar,
        description_ar = EXCLUDED.description_ar;
    
    RAISE NOTICE '✅ تم إعداد 4 قوالب شجرات محاسبية للتينانت %', p_tenant_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- تعميم القوالب على جميع التينانتات
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    rec RECORD;
    v_count INT;
    v_total_tenants INT := 0;
    v_success_count INT := 0;
    v_fail_count INT := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔄 بدء تعميم قوالب الشجرات المحاسبية على جميع التينانتات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- إعداد القوالب لكل تينانت موجود
    FOR rec IN SELECT id, name FROM tenants ORDER BY created_at LOOP
        BEGIN
            v_total_tenants := v_total_tenants + 1;
            
            RAISE NOTICE '';
            RAISE NOTICE '📌 معالجة التينانت: % (%)', rec.name, rec.id;
            
            -- إعداد القوالب
            PERFORM setup_chart_templates_for_tenant(rec.id);
            
            -- التحقق من عدد القوالب المُنشأة
            SELECT COUNT(*) INTO v_count FROM chart_templates WHERE tenant_id = rec.id;
            
            IF v_count >= 4 THEN
                v_success_count := v_success_count + 1;
                RAISE NOTICE '   ✅ نجح - تم إنشاء % قوالب', v_count;
            ELSE
                v_fail_count := v_fail_count + 1;
                RAISE NOTICE '   ⚠️ تحذير - تم إنشاء % قوالب فقط (متوقع 4)', v_count;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_fail_count := v_fail_count + 1;
            RAISE NOTICE '   ❌ فشل - خطأ: %', SQLERRM;
        END;
    END LOOP;
    
    -- النتيجة النهائية
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 ملخص النتائج:';
    RAISE NOTICE '   - إجمالي التينانتات: %', v_total_tenants;
    RAISE NOTICE '   - نجح: %', v_success_count;
    RAISE NOTICE '   - فشل: %', v_fail_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- عرض النتائج
SELECT 
    t.name AS tenant_name,
    COUNT(ct.id) AS templates_count,
    STRING_AGG(ct.template_code, ', ' ORDER BY ct.template_code) AS available_templates
FROM tenants t
LEFT JOIN chart_templates ct ON ct.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.created_at;

-- عرض إجمالي القوالب
SELECT 
    'إجمالي التينانتات' AS category,
    COUNT(DISTINCT tenant_id) AS count
FROM chart_templates
UNION ALL
SELECT 
    'إجمالي القوالب',
    COUNT(*)
FROM chart_templates;
