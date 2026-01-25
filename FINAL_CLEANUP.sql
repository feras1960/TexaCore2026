-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 تنظيف الموديولات - النسخة النهائية
-- التاريخ: 24 يناير 2026
-- ═══════════════════════════════════════════════════════════════════════════
-- بناءً على التحليل:
-- - realestate مكرر (نحذفه)
-- - real_estate موجود (نبقيه)
-- - باقي الموديولات OK
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1: حذف المكرر الوحيد
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. حذف من tenant_modules أولاً
DELETE FROM tenant_modules WHERE module_code = 'realestate';

-- 2. حذف من modules
DELETE FROM modules WHERE module_code = 'realestate';

-- التحقق
SELECT 
    'Deleted realestate' as action,
    (SELECT COUNT(*) FROM modules WHERE module_code = 'realestate') as remaining_count;
-- Expected: 0


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2: إضافة الموديولات الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1: Healthcare (المشافي)
INSERT INTO modules (
    module_code, 
    name_ar, name_en, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    description_ar, description_en,
    icon, color, category, display_order, is_core, requires_setup
) VALUES (
    'healthcare',
    'إدارة المشافي',
    'Healthcare',
    'Krankenhaus',
    'Hastane',
    'Больница',
    'Лікарня',
    'Ospedale',
    'Szpital',
    'Spital',
    
    'نظام شامل لإدارة المشافي والمراكز الطبية والعيادات',
    'Comprehensive hospital, medical center, and clinic management',
    
    'Hospital',
    'blue',
    'specialized',
    26,
    false,
    true
) ON CONFLICT (module_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    updated_at = NOW();

-- 2.2: Doctors (إدارة الأطباء)
INSERT INTO modules (
    module_code, 
    name_ar, name_en, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    description_ar, description_en,
    icon, color, category, display_order, is_core, requires_setup
) VALUES (
    'doctors',
    'إدارة الأطباء',
    'Doctors',
    'Ärzte',
    'Doktorlar',
    'Врачи',
    'Лікарі',
    'Medici',
    'Lekarze',
    'Medici',
    
    'إدارة الأطباء والمواعيد والسجلات الطبية',
    'Manage doctors, appointments, and medical records',
    
    'Stethoscope',
    'teal',
    'specialized',
    27,
    false,
    true
) ON CONFLICT (module_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3: دمج الموديولات الإدارية في Settings
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1: تحويل system_config إلى settings شامل
UPDATE modules 
SET 
    name_ar = 'الإعدادات',
    name_en = 'Settings',
    name_de = 'Einstellungen',
    name_tr = 'Ayarlar',
    name_ru = 'Настройки',
    name_uk = 'Налаштування',
    name_it = 'Impostazioni',
    name_pl = 'Ustawienia',
    name_ro = 'Setări',
    description_ar = 'إعدادات شاملة: النظام، المستخدمين، الشركات، الصلاحيات، سجل الأنشطة',
    description_en = 'Comprehensive settings: System, users, companies, permissions, activity log',
    icon = 'Settings',
    color = 'slate',
    category = 'core',
    display_order = 3,
    is_core = true
WHERE module_code = 'system_config';

-- 3.2: إخفاء الموديولات الفرعية (ستصبح tabs داخل Settings)
UPDATE modules 
SET 
    category = 'settings_submodule',
    display_order = display_order + 100
WHERE module_code IN ('users', 'companies', 'activity_log');


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4: إعادة ترتيب display_order (تنظيم نهائي)
-- ═══════════════════════════════════════════════════════════════════════════

-- Core (1-3)
UPDATE modules SET display_order = 1, category = 'core' WHERE module_code = 'dashboard';
UPDATE modules SET display_order = 2, category = 'core' WHERE module_code = 'core';
UPDATE modules SET display_order = 3, category = 'core' WHERE module_code = 'system_config';

-- Basic Operations (10-15)
UPDATE modules SET display_order = 10, category = 'basic' WHERE module_code = 'inventory';
UPDATE modules SET display_order = 11, category = 'basic' WHERE module_code = 'sales';
UPDATE modules SET display_order = 12, category = 'basic' WHERE module_code = 'purchases';
UPDATE modules SET display_order = 13, category = 'basic' WHERE module_code = 'accounting';
UPDATE modules SET display_order = 14, category = 'basic' WHERE module_code = 'customers';
UPDATE modules SET display_order = 15, category = 'basic' WHERE module_code = 'suppliers';

-- Specialized (20-27)
UPDATE modules SET display_order = 20, category = 'specialized' WHERE module_code = 'fabric';
UPDATE modules SET display_order = 21, category = 'specialized' WHERE module_code = 'exchange';
UPDATE modules SET display_order = 22, category = 'specialized' WHERE module_code = 'pharmacy';
UPDATE modules SET display_order = 23, category = 'specialized' WHERE module_code = 'restaurant';
UPDATE modules SET display_order = 24, category = 'specialized' WHERE module_code = 'gold';
UPDATE modules SET display_order = 25, category = 'specialized' WHERE module_code = 'real_estate';
UPDATE modules SET display_order = 26, category = 'specialized' WHERE module_code = 'healthcare';
UPDATE modules SET display_order = 27, category = 'specialized' WHERE module_code = 'doctors';

-- Advanced (30-36)
UPDATE modules SET display_order = 30, category = 'advanced' WHERE module_code = 'manufacturing';
UPDATE modules SET display_order = 31, category = 'advanced' WHERE module_code = 'hr';
UPDATE modules SET display_order = 32, category = 'advanced' WHERE module_code = 'pos';
UPDATE modules SET display_order = 33, category = 'advanced' WHERE module_code = 'e-commerce';
UPDATE modules SET display_order = 34, category = 'advanced' WHERE module_code = 'wms';
UPDATE modules SET display_order = 41, category = 'advanced' WHERE module_code = 'ai_analytics';
UPDATE modules SET display_order = 42, category = 'advanced' WHERE module_code = 'api';

-- Premium (40+)
UPDATE modules SET display_order = 46, category = 'premium' WHERE module_code = 'ai';
UPDATE modules SET display_order = 42, category = 'premium' WHERE module_code = 'analytics';
UPDATE modules SET display_order = 43, category = 'premium' WHERE module_code = 'fintech';
UPDATE modules SET display_order = 44, category = 'premium' WHERE module_code = 'saas';

-- Development (99)
UPDATE modules SET display_order = 99, category = 'development' WHERE module_code = 'component_lab';


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 5: تفعيل الموديولات الجديدة للـ tenants
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE 
    v_tenant RECORD;
    v_count INT := 0;
BEGIN
    FOR v_tenant IN 
        SELECT id, code FROM tenants WHERE status = 'active'
    LOOP
        -- تفعيل healthcare
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        VALUES (v_tenant.id, 'healthcare', true)
        ON CONFLICT (tenant_id, module_code) 
        DO UPDATE SET is_active = true;
        
        -- تفعيل doctors
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        VALUES (v_tenant.id, 'doctors', true)
        ON CONFLICT (tenant_id, module_code) 
        DO UPDATE SET is_active = true;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ تم تفعيل الموديولات الجديدة لـ % tenants', v_count;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 6: التحقق النهائي
-- ═══════════════════════════════════════════════════════════════════════════

-- 6.1: عرض الموديولات حسب الفئة
SELECT 
    category,
    module_code,
    name_ar,
    name_en,
    display_order,
    is_active
FROM modules
WHERE is_active = true
ORDER BY 
    CASE category
        WHEN 'core' THEN 1
        WHEN 'basic' THEN 2
        WHEN 'specialized' THEN 3
        WHEN 'advanced' THEN 4
        WHEN 'premium' THEN 5
        WHEN 'development' THEN 6
        ELSE 7
    END,
    display_order;

-- 6.2: إحصائيات نهائية
SELECT 
    'Total Active Modules' as metric,
    COUNT(*) as count
FROM modules
WHERE is_active = true
UNION ALL
SELECT 
    'Healthcare Added',
    COUNT(*)
FROM modules
WHERE module_code = 'healthcare'
UNION ALL
SELECT 
    'Doctors Added',
    COUNT(*)
FROM modules
WHERE module_code = 'doctors'
UNION ALL
SELECT 
    'Realestate Removed',
    COUNT(*)
FROM modules
WHERE module_code = 'realestate';

-- Expected Results:
-- Total Active Modules: ~28-30
-- Healthcare Added: 1
-- Doctors Added: 1
-- Realestate Removed: 0


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ انتهى! تم التنظيف والإضافة بنجاح
-- ═══════════════════════════════════════════════════════════════════════════
