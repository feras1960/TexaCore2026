-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح جميع دوال MFA - الإصلاح الكامل
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف الدوال وإعادة إنشائها
DROP FUNCTION IF EXISTS get_mfa_status(UUID);
DROP FUNCTION IF EXISTS is_mfa_required(UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إصلاح is_mfa_required
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_mfa_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_system_enforce_all BOOLEAN;
    v_system_enforce_admins BOOLEAN;
    v_enforced_roles TEXT[];
    v_user_roles TEXT[];
    v_company_id UUID;
    v_company_enforce_all BOOLEAN;
BEGIN
    -- الحصول على إعدادات النظام
    SELECT enforce_for_all, enforce_for_admins, enforced_roles 
    INTO v_system_enforce_all, v_system_enforce_admins, v_enforced_roles
    FROM mfa_system_settings LIMIT 1;
    
    -- إذا مفروض على الجميع
    IF COALESCE(v_system_enforce_all, false) THEN
        RETURN true;
    END IF;
    
    -- الحصول على أدوار المستخدم
    SELECT array_agg(ur.role_code::TEXT) INTO v_user_roles
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = p_user_id;
    
    -- التحقق إذا المستخدم لديه دور مفروض عليه
    IF v_user_roles IS NOT NULL AND v_enforced_roles IS NOT NULL THEN
        IF v_user_roles && v_enforced_roles THEN
            RETURN true;
        END IF;
    END IF;
    
    -- إذا مفروض على المدراء
    IF COALESCE(v_system_enforce_admins, false) AND v_user_roles IS NOT NULL THEN
        IF v_user_roles && ARRAY['super_admin', 'tenant_admin', 'company_admin']::TEXT[] THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إصلاح get_mfa_status - نسخة مبسطة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_mfa_status(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    service_enabled BOOLEAN,
    is_required BOOLEAN,
    user_enabled BOOLEAN,
    can_enable BOOLEAN,
    preferred_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ss.is_enabled, false),
        is_mfa_required(p_user_id),
        COALESCE(us.is_enabled, false),
        COALESCE(ss.is_enabled, false), -- يستطيع التفعيل إذا الخدمة متاحة
        COALESCE(us.preferred_method, 'totp')::TEXT
    FROM mfa_system_settings ss
    LEFT JOIN mfa_user_settings us ON us.user_id = p_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ اختبار
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '✅ تم إصلاح الدوال!' as status;

SELECT * FROM get_mfa_status();
