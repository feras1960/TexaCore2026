-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح دالة get_user_allowed_modules
-- المشكلة: تبحث عن is_admin غير موجود
-- الحل: إزالة التحقق من is_admin
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_allowed_modules(p_user_id UUID)
RETURNS TABLE (
    module_code VARCHAR(50),
    name_ar VARCHAR(100),
    name_en VARCHAR(100),
    name_de VARCHAR(100),
    name_tr VARCHAR(100),
    name_ru VARCHAR(100),
    name_uk VARCHAR(100),
    name_it VARCHAR(100),
    name_pl VARCHAR(100),
    name_ro VARCHAR(100),
    description_ar TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    color VARCHAR(50),
    category VARCHAR(50),
    display_order INT,
    is_core BOOLEAN,
    is_beta BOOLEAN,
    requires_setup BOOLEAN,
    is_enabled BOOLEAN,
    requires_upgrade BOOLEAN,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    can_export BOOLEAN,
    can_import BOOLEAN,
    can_approve BOOLEAN,
    can_manage_settings BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
BEGIN
    -- الحصول على tenant_id و company_id للمستخدم
    SELECT up.tenant_id, up.company_id
    INTO v_tenant_id, v_company_id
    FROM user_profiles up
    WHERE up.id = p_user_id;
    
    -- إذا لم يوجد user_profile، إرجاع فارغ
    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;
    
    -- إرجاع الموديولات مع الصلاحيات
    RETURN QUERY
    SELECT 
        m.module_code,
        m.name_ar,
        m.name_en,
        m.name_de,
        m.name_tr,
        m.name_ru,
        m.name_uk,
        m.name_it,
        m.name_pl,
        m.name_ro,
        m.description_ar,
        m.description_en,
        m.icon,
        m.color,
        m.category,
        m.display_order,
        m.is_core,
        m.is_beta,
        m.requires_setup,
        
        -- التحقق من تفعيل الموديول للـ tenant
        COALESCE(tm.is_active, false) as is_enabled,
        
        -- التحقق من الحاجة للترقية
        CASE 
            WHEN tm.is_active = false THEN true
            ELSE false
        END as requires_upgrade,
        
        -- الصلاحيات من user_module_permissions (أو افتراضي true إذا لم توجد)
        COALESCE(ump.can_view, true) as can_view,
        COALESCE(ump.can_create, false) as can_create,
        COALESCE(ump.can_edit, false) as can_edit,
        COALESCE(ump.can_delete, false) as can_delete,
        COALESCE(ump.can_export, false) as can_export,
        COALESCE(ump.can_import, false) as can_import,
        COALESCE(ump.can_approve, false) as can_approve,
        COALESCE(ump.can_manage_settings, false) as can_manage_settings
        
    FROM modules m
    LEFT JOIN tenant_modules tm 
        ON m.module_code = tm.module_code 
        AND tm.tenant_id = v_tenant_id
    LEFT JOIN user_module_permissions ump
        ON m.module_code = ump.module_code
        AND ump.user_id = p_user_id
        AND ump.tenant_id = v_tenant_id
        AND ump.company_id = v_company_id
    WHERE m.is_active = true
    ORDER BY m.display_order;
    
END;
$$;

-- التحقق من الدالة
SELECT 'Function fixed successfully' as status;
