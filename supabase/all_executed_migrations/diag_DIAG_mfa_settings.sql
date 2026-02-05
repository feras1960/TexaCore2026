-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 فحص إعدادات التحقق بخطوتين (2FA)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ إعدادات النظام
SELECT 
    '🔐 System MFA Settings' as section,
    is_enabled as "2FA مفعل؟",
    enforce_for_all as "إلزامي للجميع؟",
    enforce_for_admins as "إلزامي للمدراء؟",
    allow_totp as "TOTP متاح؟",
    allow_email_otp as "Email OTP متاح؟",
    allow_sms_otp as "SMS OTP متاح؟",
    max_attempts as "محاولات الدخول",
    otp_expiry_seconds as "صلاحية OTP (ثانية)",
    updated_at as "آخر تحديث"
FROM mfa_system_settings
LIMIT 1;

-- 2️⃣ إحصائيات المستخدمين
SELECT 
    '📊 User MFA Stats' as section,
    COUNT(*) FILTER (WHERE is_enabled = true) as "مستخدمين مفعّلين 2FA",
    COUNT(*) FILTER (WHERE totp_verified = true) as "مستخدمين بـ Authenticator",
    COUNT(*) FILTER (WHERE email_otp_enabled = true) as "مستخدمين بـ Email OTP",
    COUNT(*) as "إجمالي السجلات"
FROM mfa_user_settings;

-- 3️⃣ سجل التحقق (آخر 10)
SELECT 
    '📋 Recent Verifications' as section,
    method as "الطريقة",
    is_successful as "نجح؟",
    failure_reason as "سبب الفشل",
    created_at as "التاريخ"
FROM mfa_verification_log
ORDER BY created_at DESC
LIMIT 10;

-- 4️⃣ الطرق المتاحة
SELECT * FROM get_available_mfa_methods();
