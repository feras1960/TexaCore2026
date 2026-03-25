-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 تحسين نظام 2FA - إضافة التحكم المتقدم
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إضافة حقول جديدة لإعدادات النظام
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة حقل التحقق من اكتمال الملف الشخصي
ALTER TABLE mfa_system_settings 
ADD COLUMN IF NOT EXISTS require_complete_profile BOOLEAN DEFAULT true;

-- إضافة قائمة الأدوار التي يُفرض عليها 2FA
ALTER TABLE mfa_system_settings 
ADD COLUMN IF NOT EXISTS enforced_roles TEXT[] DEFAULT ARRAY['super_admin', 'tenant_admin', 'company_admin', 'accountant'];

-- إضافة رسالة تخصيصية
ALTER TABLE mfa_system_settings 
ADD COLUMN IF NOT EXISTS custom_message_ar TEXT DEFAULT 'لحماية بياناتك، يرجى تفعيل التحقق بخطوتين';

ALTER TABLE mfa_system_settings 
ADD COLUMN IF NOT EXISTS custom_message_en TEXT DEFAULT 'To protect your data, please enable two-factor authentication';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ تحديث الإعدادات الافتراضية
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE mfa_system_settings SET
    is_enabled = true,           -- الخدمة متاحة
    enforce_for_all = false,     -- ليس إلزامي للجميع
    enforce_for_admins = false,  -- ليس إلزامي للمدراء (بعد يمكن تفعيله)
    allow_totp = true,           -- Authenticator متاح
    allow_email_otp = true,      -- Email متاح
    allow_sms_otp = false,       -- SMS معطل (يحتاج Twilio)
    require_complete_profile = true,  -- يتطلب ملف مكتمل
    updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ دالة التحقق من أهلية المستخدم لتفعيل 2FA
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION can_enable_mfa(p_user_id UUID)
RETURNS TABLE (
    can_enable BOOLEAN,
    reason_ar TEXT,
    reason_en TEXT,
    missing_fields TEXT[]
) AS $$
DECLARE
    v_email TEXT;
    v_phone TEXT;
    v_full_name TEXT;
    v_system_enabled BOOLEAN;
    v_require_profile BOOLEAN;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- التحقق من إعدادات النظام
    SELECT is_enabled, require_complete_profile 
    INTO v_system_enabled, v_require_profile
    FROM mfa_system_settings LIMIT 1;
    
    -- إذا الخدمة معطلة على مستوى النظام
    IF NOT COALESCE(v_system_enabled, false) THEN
        RETURN QUERY SELECT 
            false,
            'خدمة التحقق بخطوتين معطلة حالياً'::TEXT,
            'Two-factor authentication is currently disabled'::TEXT,
            ARRAY[]::TEXT[];
        RETURN;
    END IF;
    
    -- الحصول على بيانات المستخدم
    SELECT 
        COALESCE(up.email, au.email),
        up.phone,
        up.full_name
    INTO v_email, v_phone, v_full_name
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    WHERE up.id = p_user_id;
    
    -- التحقق من اكتمال البيانات إذا مطلوب
    IF v_require_profile THEN
        IF v_email IS NULL OR v_email = '' THEN
            v_missing := array_append(v_missing, 'email');
        END IF;
        
        IF v_full_name IS NULL OR v_full_name = '' THEN
            v_missing := array_append(v_missing, 'full_name');
        END IF;
    END IF;
    
    -- إذا هناك حقول ناقصة
    IF array_length(v_missing, 1) > 0 THEN
        RETURN QUERY SELECT 
            false,
            'يرجى إكمال بياناتك الشخصية أولاً'::TEXT,
            'Please complete your profile first'::TEXT,
            v_missing;
        RETURN;
    END IF;
    
    -- المستخدم مؤهل
    RETURN QUERY SELECT 
        true,
        'يمكنك تفعيل التحقق بخطوتين'::TEXT,
        'You can enable two-factor authentication'::TEXT,
        ARRAY[]::TEXT[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ دالة محسنة للتحقق من الإلزام
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_mfa_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_system_enforce_all BOOLEAN;
    v_system_enforce_admins BOOLEAN;
    v_enforced_roles TEXT[];
    v_company_enforce_all BOOLEAN;
    v_company_enforce_admins BOOLEAN;
    v_user_roles TEXT[];
    v_company_id UUID;
BEGIN
    -- الحصول على إعدادات النظام
    SELECT enforce_for_all, enforce_for_admins, enforced_roles 
    INTO v_system_enforce_all, v_system_enforce_admins, v_enforced_roles
    FROM mfa_system_settings LIMIT 1;
    
    -- إذا مفروض على الجميع
    IF v_system_enforce_all THEN
        RETURN true;
    END IF;
    
    -- الحصول على أدوار المستخدم
    SELECT array_agg(ur.code) INTO v_user_roles
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = p_user_id;
    
    -- التحقق إذا المستخدم لديه دور مفروض عليه
    IF v_user_roles && v_enforced_roles THEN
        RETURN true;
    END IF;
    
    -- إذا مفروض على المدراء
    IF v_system_enforce_admins THEN
        IF v_user_roles && ARRAY['super_admin', 'tenant_admin', 'company_admin'] THEN
            RETURN true;
        END IF;
    END IF;
    
    -- الحصول على إعدادات الشركة
    SELECT company_id INTO v_company_id FROM user_profiles WHERE id = p_user_id;
    
    SELECT enforce_for_all, enforce_for_admins 
    INTO v_company_enforce_all, v_company_enforce_admins
    FROM mfa_company_settings WHERE company_id = v_company_id;
    
    IF v_company_enforce_all THEN
        RETURN true;
    END IF;
    
    IF v_company_enforce_admins AND v_user_roles && ARRAY['company_admin', 'accountant'] THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ دالة حالة 2FA الكاملة للمستخدم
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_mfa_status(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    service_enabled BOOLEAN,      -- الخدمة متاحة على مستوى النظام
    is_required BOOLEAN,          -- مفروض على المستخدم
    user_enabled BOOLEAN,         -- المستخدم فعّلها
    can_enable BOOLEAN,           -- يستطيع تفعيلها
    preferred_method TEXT,        -- الطريقة المفضلة
    available_methods TEXT[],     -- الطرق المتاحة
    missing_fields TEXT[]         -- الحقول الناقصة
) AS $$
DECLARE
    v_can_enable BOOLEAN;
    v_missing TEXT[];
BEGIN
    -- التحقق من الأهلية
    SELECT ce.can_enable, ce.missing_fields 
    INTO v_can_enable, v_missing
    FROM can_enable_mfa(p_user_id) ce;
    
    RETURN QUERY
    SELECT 
        COALESCE(ss.is_enabled, false),
        is_mfa_required(p_user_id),
        COALESCE(us.is_enabled, false),
        v_can_enable,
        COALESCE(us.preferred_method, 'totp')::TEXT,
        ARRAY(
            SELECT m.method FROM get_available_mfa_methods() m WHERE m.is_available
        ),
        v_missing
    FROM mfa_system_settings ss
    LEFT JOIN mfa_user_settings us ON us.user_id = p_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ رسالة النجاح
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم تحسين نظام 2FA بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📋 الإضافات:';
    RAISE NOTICE '   • require_complete_profile - التحقق من اكتمال البيانات';
    RAISE NOTICE '   • enforced_roles - قائمة الأدوار المفروض عليها';
    RAISE NOTICE '   • can_enable_mfa() - التحقق من الأهلية';
    RAISE NOTICE '   • get_mfa_status() - الحالة الكاملة';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🔐 الوضع الافتراضي:';
    RAISE NOTICE '   • الخدمة: متاحة ✅';
    RAISE NOTICE '   • إلزامي: لا ❌';
    RAISE NOTICE '   • المستخدم يختار: نعم ✅';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
