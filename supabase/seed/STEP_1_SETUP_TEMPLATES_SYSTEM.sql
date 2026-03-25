-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 1: إعداد نظام قوالب الشجرات المحاسبية
-- Step 1: Setup Chart Templates System
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا السكريبت:
-- 1. يضيف حقل chart_type للشركات
-- 2. ينشئ جدول chart_templates
-- 3. ينشئ الدوال الأساسية
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة حقل chart_type للشركات
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';
COMMENT ON COLUMN companies.chart_type IS 'نوع شجرة الحسابات: simple, extended, fabric_extended';

-- ═══════════════════════════════════════════════════════════════
-- 2. إنشاء جدول قوالب الشجرات
-- ═══════════════════════════════════════════════════════════════

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

COMMENT ON TABLE chart_templates IS 'قوالب الشجرات المحاسبية الجاهزة لكل تينانت';
COMMENT ON COLUMN chart_templates.template_code IS 'رمز القالب: simple, extended, fabric_extended, fabric_extended_demo';
COMMENT ON COLUMN chart_templates.include_demo_data IS 'هل يتضمن القالب بيانات تجريبية';

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة إعداد القوالب لتينانت
-- ═══════════════════════════════════════════════════════════════

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

COMMENT ON FUNCTION setup_chart_templates_for_tenant(UUID) IS 'إعداد القوالب الأربعة لتينانت جديد';

-- ═══════════════════════════════════════════════════════════════
-- التحقق من النجاح
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '✅ الخطوة 1 مكتملة!' AS status,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_templates') AS table_exists,
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'setup_chart_templates_for_tenant') AS function_exists;
