-- ═══════════════════════════════════════════════════════════════════════════
-- 🏗️ إعادة هيكلة الموديولات - STEP_40
-- التاريخ: 24 يناير 2026
-- ═══════════════════════════════════════════════════════════════════════════
-- الهدف:
-- 1. حذف الموديولات المكررة
-- 2. دمج الموديولات الإدارية في Settings
-- 3. إضافة موديولات المشافي والأطباء
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1: التنظيف - حذف المكررات
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1: حذف realestate المكرر (استخدم real_estate)
DELETE FROM tenant_modules WHERE module_code = 'realestate';
DELETE FROM modules WHERE module_code = 'realestate';

-- 1.2: التحقق من purchases المكرر
-- (نفذ هذا للتحقق أولاً)
SELECT id, module_code, name_ar, created_at 
FROM modules 
WHERE module_code = 'purchases'
ORDER BY created_at;

-- إذا كان مكرر، احذف الأقدم:
-- DELETE FROM modules WHERE module_code = 'purchases' AND id = 'OLD_ID_HERE';

-- 1.3: التحقق من accounting المكرر
SELECT id, module_code, name_ar, created_at 
FROM modules 
WHERE module_code = 'accounting'
ORDER BY created_at;

-- إذا كان مكرر، احذف الأقدم:
-- DELETE FROM modules WHERE module_code = 'accounting' AND id = 'OLD_ID_HERE';

-- 1.4: التحقق من inventory/warehouse/storage المكرر
SELECT id, module_code, name_ar, name_en, created_at 
FROM modules 
WHERE module_code IN ('inventory', 'warehouse', 'storage', 'warehouses')
ORDER BY module_code, created_at;

-- إذا كان مكرر، احذف المكررات واستخدم inventory فقط:
-- DELETE FROM tenant_modules WHERE module_code IN ('warehouse', 'storage', 'warehouses');
-- DELETE FROM modules WHERE module_code IN ('warehouse', 'storage', 'warehouses');


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2: إعادة الترتيب والدمج
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1: تحويل system_config إلى settings شامل
UPDATE modules 
SET 
    module_code = 'settings',
    name_ar = 'الإعدادات',
    name_en = 'Settings',
    name_de = 'Einstellungen',
    name_tr = 'Ayarlar',
    name_ru = 'Настройки',
    name_uk = 'Налаштування',
    name_it = 'Impostazioni',
    name_pl = 'Ustawienia',
    name_ro = 'Setări',
    description_ar = 'إعدادات شاملة: النظام، المستخدمين، الشركات، الصلاحيات، API',
    description_en = 'Comprehensive settings: System, users, companies, permissions, API',
    icon = 'Settings',
    color = 'slate',
    category = 'core',
    display_order = 3,
    is_core = true
WHERE module_code = 'system_config';

-- تحديث tenant_modules
UPDATE tenant_modules 
SET module_code = 'settings' 
WHERE module_code = 'system_config';

-- 2.2: إخفاء الموديولات المدمجة في Settings
UPDATE modules 
SET 
    is_active = true,  -- نبقيهم active لكن
    category = 'settings_submodule',  -- نغير الفئة
    display_order = display_order + 100  -- نحركهم للأسفل
WHERE module_code IN ('users', 'companies', 'activity_log');

-- ملاحظة: هذه الموديولات ستصبح تبويبات داخل Settings في الـ Frontend


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3: إضافة الموديولات الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1: إضافة Healthcare (المشافي)
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
    'Comprehensive hospital, medical center, and clinic management system',
    
    'Hospital',
    'blue',
    'specialized',
    19,
    false,
    true
) ON CONFLICT (module_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    updated_at = NOW();

-- 3.2: إضافة Doctors Management (إدارة الأطباء)
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
    
    'إدارة الأطباء والمواعيد والسجلات الطبية والعمليات',
    'Manage doctors, appointments, medical records, and operations',
    
    'Stethoscope',
    'teal',
    'specialized',
    20,
    false,
    true
) ON CONFLICT (module_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4: إعادة ترتيب display_order
-- ═══════════════════════════════════════════════════════════════════════════

-- Core (1-3)
UPDATE modules SET display_order = 1 WHERE module_code = 'dashboard';
UPDATE modules SET display_order = 2 WHERE module_code = 'core';
UPDATE modules SET display_order = 3 WHERE module_code = 'settings';

-- Accounting (4-5)
UPDATE modules SET display_order = 4 WHERE module_code = 'accounting';
UPDATE modules SET display_order = 5 WHERE module_code = 'funds';

-- Operations (6-10)
UPDATE modules SET display_order = 6 WHERE module_code = 'crm';
UPDATE modules SET display_order = 7 WHERE module_code = 'sales';
UPDATE modules SET display_order = 8 WHERE module_code = 'purchases';
UPDATE modules SET display_order = 9 WHERE module_code = 'inventory';
UPDATE modules SET display_order = 10 WHERE module_code = 'payments';

-- Specialized (11-20)
UPDATE modules SET display_order = 11 WHERE module_code = 'real_estate';
UPDATE modules SET display_order = 12 WHERE module_code = 'fabric';
UPDATE modules SET display_order = 13 WHERE module_code = 'pos';
UPDATE modules SET display_order = 14 WHERE module_code = 'exchange';
UPDATE modules SET display_order = 15 WHERE module_code = 'pharmacy';
UPDATE modules SET display_order = 16 WHERE module_code = 'restaurant';
UPDATE modules SET display_order = 17 WHERE module_code = 'gold';
UPDATE modules SET display_order = 18 WHERE module_code = 'manufacturing';
UPDATE modules SET display_order = 19 WHERE module_code = 'healthcare';
UPDATE modules SET display_order = 20 WHERE module_code = 'doctors';

-- Advanced (21-24)
UPDATE modules SET display_order = 21 WHERE module_code = 'hr';
UPDATE modules SET display_order = 22 WHERE module_code = 'ai_analytics';
UPDATE modules SET display_order = 23 WHERE module_code = 'e-commerce';
UPDATE modules SET display_order = 24 WHERE module_code = 'saas';

-- Development (25)
UPDATE modules SET display_order = 25 WHERE module_code = 'component_lab';


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

-- عرض الموديولات النهائية
SELECT 
    module_code,
    name_ar,
    name_en,
    category,
    display_order,
    is_active
FROM modules
WHERE is_active = true
ORDER BY display_order;

-- عدد الموديولات النهائي
SELECT 
    'Total Modules' as metric,
    COUNT(*) as count
FROM modules
WHERE is_active = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ انتهى! تم إعادة الهيكلة بنجاح
-- ═══════════════════════════════════════════════════════════════════════════
