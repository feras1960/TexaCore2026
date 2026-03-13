-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP CHART TEMPLATES
-- This script removes all duplicate/messy templates and inserts the 3 Official System Templates.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- 1. Delete all existing templates (Safe to do as these are just definitions, not user data)
    TRUNCATE TABLE chart_templates CASCADE;

    -- 2. Insert the 3 Official Templates
    INSERT INTO chart_templates (
        template_code, 
        chart_type, 
        template_name_ar, 
        template_name_en, 
        description_ar, 
        description_en, 
        is_active, 
        include_demo_data
    ) VALUES 
    -- A. Simple / Standard
    (
        'simple', 
        'simple', 
        'الشجرة القياسية', 
        'Standard Chart', 
        'مناسبة للشركات الصغيرة والخدمية. حسابات أساسية ومختصرة (~40 حساب).', 
        'Suitable for small service companies. Basic accounts (~40 accounts).', 
        true, 
        false
    ),
    -- B. Extended / Commercial
    (
        'extended', 
        'extended', 
        'الشجرة الموسعة', 
        'Extended Chart', 
        'شجرة كاملة ومفصلة. مناسبة للشركات التجارية والصناعية الكبيرة (~80 حساب).', 
        'Comprehensive chart. Suitable for large commercial/industrial companies (~80 accounts).', 
        true, 
        false
    ),
    -- C. Fabric Extended
    (
        'fabric_extended', 
        'fabric_extended', 
        'شجرة الأقمشة المتخصصة', 
        'Fabric Extended Chart', 
        'مخصصة لتجارة الأقمشة. تشمل تفاصيل المخزون (خام/تام)، الإكسسوارات، والآلات.', 
        'Specialized for Fabric Trade. Includes nuances for raw/finished inventory, accessories, and machinery.', 
        true, 
        false
    );

    RAISE NOTICE '✅ Chart Templates have been cleaned and standardized (3 Types).';
END $$;
