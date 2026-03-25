-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 نظام التحقق بخطوتين (2FA/MFA)
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إعدادات 2FA على مستوى النظام
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- هل 2FA مفعل على مستوى النظام
    is_enabled BOOLEAN DEFAULT false,
    
    -- الطرق المتاحة
    allow_totp BOOLEAN DEFAULT true,          -- Google Authenticator / Authy
    allow_email_otp BOOLEAN DEFAULT true,     -- OTP عبر البريد
    allow_sms_otp BOOLEAN DEFAULT false,      -- OTP عبر SMS (يحتاج Twilio)
    
    -- إعدادات الإلزام
    enforce_for_admins BOOLEAN DEFAULT false, -- إلزامي للمدراء
    enforce_for_all BOOLEAN DEFAULT false,    -- إلزامي للجميع
    
    -- إعدادات OTP
    otp_expiry_seconds INT DEFAULT 300,       -- 5 دقائق
    otp_length INT DEFAULT 6,                 -- 6 أرقام
    max_attempts INT DEFAULT 5,               -- عدد المحاولات
    lockout_duration_minutes INT DEFAULT 15,  -- مدة الحظر
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- إدخال الإعدادات الافتراضية
INSERT INTO mfa_system_settings (is_enabled, allow_totp, allow_email_otp)
VALUES (false, true, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إعدادات 2FA على مستوى الشركة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- هل 2FA مفعل للشركة
    is_enabled BOOLEAN DEFAULT false,
    
    -- الطرق المسموحة للشركة
    allow_totp BOOLEAN DEFAULT true,
    allow_email_otp BOOLEAN DEFAULT true,
    allow_sms_otp BOOLEAN DEFAULT false,
    
    -- إعدادات الإلزام
    enforce_for_admins BOOLEAN DEFAULT false,
    enforce_for_all BOOLEAN DEFAULT false,
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ حالة 2FA للمستخدمين
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- هل 2FA مفعل للمستخدم
    is_enabled BOOLEAN DEFAULT false,
    
    -- الطريقة المفضلة
    preferred_method VARCHAR(20) DEFAULT 'totp', -- totp, email, sms
    
    -- TOTP
    totp_secret TEXT,                           -- مشفر
    totp_verified BOOLEAN DEFAULT false,
    totp_enabled_at TIMESTAMPTZ,
    
    -- Email OTP
    email_otp_enabled BOOLEAN DEFAULT false,
    
    -- SMS OTP
    sms_otp_enabled BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    
    -- الأمان
    backup_codes TEXT[],                        -- أكواد الطوارئ (مشفرة)
    backup_codes_generated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ سجل محاولات التحقق
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    method VARCHAR(20) NOT NULL,                -- totp, email, sms, backup
    
    is_successful BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ OTPs المؤقتة (للبريد و SMS)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_pending_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    otp_hash TEXT NOT NULL,                     -- OTP مشفر
    method VARCHAR(20) NOT NULL,                -- email, sms
    
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- System Settings - Super Admin فقط
ALTER TABLE mfa_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_system_read" ON mfa_system_settings;
CREATE POLICY "mfa_system_read" ON mfa_system_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "mfa_system_write" ON mfa_system_settings;
CREATE POLICY "mfa_system_write" ON mfa_system_settings
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Company Settings - Company Admin
ALTER TABLE mfa_company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_company_tenant_access" ON mfa_company_settings;
CREATE POLICY "mfa_company_tenant_access" ON mfa_company_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- User Settings - المستخدم نفسه فقط
ALTER TABLE mfa_user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_user_own_settings" ON mfa_user_settings;
CREATE POLICY "mfa_user_own_settings" ON mfa_user_settings
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verification Log - المستخدم نفسه + الأدمن
ALTER TABLE mfa_verification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_log_access" ON mfa_verification_log;
CREATE POLICY "mfa_log_access" ON mfa_verification_log
    FOR SELECT USING (
        user_id = auth.uid() 
        OR is_super_admin(auth.uid())
    );

-- Pending OTPs - المستخدم نفسه فقط
ALTER TABLE mfa_pending_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_otp_own" ON mfa_pending_otps;
CREATE POLICY "mfa_otp_own" ON mfa_pending_otps
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ دوال المساعدة
-- ═══════════════════════════════════════════════════════════════════════════

-- التحقق إذا 2FA مطلوب للمستخدم
CREATE OR REPLACE FUNCTION is_mfa_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_system_enforce_all BOOLEAN;
    v_system_enforce_admins BOOLEAN;
    v_company_enforce_all BOOLEAN;
    v_company_enforce_admins BOOLEAN;
    v_is_admin BOOLEAN;
    v_company_id UUID;
BEGIN
    -- الحصول على إعدادات النظام
    SELECT enforce_for_all, enforce_for_admins INTO v_system_enforce_all, v_system_enforce_admins
    FROM mfa_system_settings LIMIT 1;
    
    -- إذا مفروض على الجميع
    IF v_system_enforce_all THEN
        RETURN true;
    END IF;
    
    -- الحصول على معلومات المستخدم
    SELECT company_id INTO v_company_id FROM user_profiles WHERE id = p_user_id;
    
    -- التحقق إذا المستخدم أدمن
    v_is_admin := EXISTS (
        SELECT 1 FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id 
        AND ur.code IN ('super_admin', 'tenant_admin', 'company_admin')
    );
    
    -- إذا مفروض على الأدمن
    IF v_system_enforce_admins AND v_is_admin THEN
        RETURN true;
    END IF;
    
    -- الحصول على إعدادات الشركة
    SELECT enforce_for_all, enforce_for_admins INTO v_company_enforce_all, v_company_enforce_admins
    FROM mfa_company_settings WHERE company_id = v_company_id;
    
    IF v_company_enforce_all THEN
        RETURN true;
    END IF;
    
    IF v_company_enforce_admins AND v_is_admin THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- التحقق إذا المستخدم فعّل 2FA
CREATE OR REPLACE FUNCTION is_mfa_enabled_for_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM mfa_user_settings 
        WHERE user_id = p_user_id 
        AND is_enabled = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- الحصول على الطرق المتاحة
CREATE OR REPLACE FUNCTION get_available_mfa_methods()
RETURNS TABLE (method VARCHAR, is_available BOOLEAN) AS $$
DECLARE
    v_totp BOOLEAN;
    v_email BOOLEAN;
    v_sms BOOLEAN;
BEGIN
    SELECT allow_totp, allow_email_otp, allow_sms_otp 
    INTO v_totp, v_email, v_sms
    FROM mfa_system_settings LIMIT 1;
    
    method := 'totp'; is_available := COALESCE(v_totp, true); RETURN NEXT;
    method := 'email'; is_available := COALESCE(v_email, true); RETURN NEXT;
    method := 'sms'; is_available := COALESCE(v_sms, false); RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ الفهارس
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_mfa_user_settings_user ON mfa_user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_company_settings_company ON mfa_company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_mfa_log_user ON mfa_verification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_log_created ON mfa_verification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mfa_pending_user ON mfa_pending_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_pending_expires ON mfa_pending_otps(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ تنظيف OTPs المنتهية (يمكن تشغيلها كـ cron job)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM mfa_pending_otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ رسالة النجاح
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء نظام 2FA بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📋 الجداول المنشأة:';
    RAISE NOTICE '   • mfa_system_settings - إعدادات النظام';
    RAISE NOTICE '   • mfa_company_settings - إعدادات الشركة';
    RAISE NOTICE '   • mfa_user_settings - إعدادات المستخدم';
    RAISE NOTICE '   • mfa_verification_log - سجل التحقق';
    RAISE NOTICE '   • mfa_pending_otps - OTPs المؤقتة';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🔐 2FA معطل بشكل افتراضي';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
