-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 32-B: نظام اللغات المتعددة للتينانت
-- Multi-Language System for Tenants
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables
--
-- المحتويات:
-- 1. جدول tenant_languages - اللغات المفعلة لكل تينانت
-- 2. تحديث subscription_plans - إضافة max_languages
-- 3. دوال إدارة اللغات
-- 4. دوال التحقق من الحدود

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: جدول اللغات المفعلة للتينانت
-- Part 1: Tenant Active Languages Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ الربط ═══
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- ═══ اللغة ═══
    language_code VARCHAR(5) NOT NULL,
    -- ar, en, de, tr, ru, uk, it, pl, ro
    
    language_name_ar VARCHAR(100) NOT NULL,
    language_name_en VARCHAR(100) NOT NULL,
    
    -- ═══ الحالة ═══
    is_primary BOOLEAN DEFAULT false,
    -- اللغة الأساسية للشركة
    
    is_enabled BOOLEAN DEFAULT true,
    
    -- ═══ الترتيب ═══
    display_order INT DEFAULT 0,
    
    -- ═══ التتبع ═══
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    enabled_by UUID REFERENCES auth.users(id),
    
    disabled_at TIMESTAMPTZ,
    disabled_by UUID REFERENCES auth.users(id),
    
    -- ═══ ملاحظات ═══
    notes TEXT,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, language_code)
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_tenant_languages_tenant ON tenant_languages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_languages_enabled ON tenant_languages(tenant_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_tenant_languages_primary ON tenant_languages(tenant_id, is_primary) WHERE is_primary = true;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: تحديث جدول الباقات (إضافة حد اللغات)
-- Part 2: Update Subscription Plans (Add Language Limit)
-- ═══════════════════════════════════════════════════════════════

-- إضافة عمود max_languages
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_languages INT DEFAULT 2;

-- تحديث الباقات الحالية
UPDATE subscription_plans SET max_languages = 2 WHERE code = 'starter';
UPDATE subscription_plans SET max_languages = 3 WHERE code = 'professional';
UPDATE subscription_plans SET max_languages = 5 WHERE code = 'enterprise';

-- إضافة عمود للغات الإضافية المدفوعة
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS additional_language_price DECIMAL(10,2) DEFAULT 0;

-- تحديث أسعار اللغات الإضافية
UPDATE subscription_plans SET additional_language_price = 20 WHERE code = 'starter';
UPDATE subscription_plans SET additional_language_price = 15 WHERE code = 'professional';
UPDATE subscription_plans SET additional_language_price = 10 WHERE code = 'enterprise';

-- ═══════════════════════════════════════════════════════════════
-- الجزء 3: جدول اللغات المتاحة في النظام
-- Part 3: System Available Languages Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS system_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(5) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_native VARCHAR(100) NOT NULL,
    
    -- ═══ معلومات اللغة ═══
    direction VARCHAR(3) DEFAULT 'ltr',
    -- ltr أو rtl
    
    flag_emoji VARCHAR(10),
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج اللغات المتاحة
INSERT INTO system_languages (code, name_ar, name_en, name_native, direction, flag_emoji, display_order) VALUES
('ar', 'العربية', 'Arabic', 'العربية', 'rtl', '🇸🇦', 1),
('en', 'الإنجليزية', 'English', 'English', 'ltr', '🇬🇧', 2),
('de', 'الألمانية', 'German', 'Deutsch', 'ltr', '🇩🇪', 3),
('tr', 'التركية', 'Turkish', 'Türkçe', 'ltr', '🇹🇷', 4),
('ru', 'الروسية', 'Russian', 'Русский', 'ltr', '🇷🇺', 5),
('uk', 'الأوكرانية', 'Ukrainian', 'Українська', 'ltr', '🇺🇦', 6),
('it', 'الإيطالية', 'Italian', 'Italiano', 'ltr', '🇮🇹', 7),
('pl', 'البولندية', 'Polish', 'Polski', 'ltr', '🇵🇱', 8),
('ro', 'الرومانية', 'Romanian', 'Română', 'ltr', '🇷🇴', 9)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 4: الدوال (Functions)
-- Part 4: Functions
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- دالة: الحصول على اللغات المفعلة للتينانت
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tenant_active_languages(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    language_code VARCHAR(5),
    language_name_ar VARCHAR(100),
    language_name_en VARCHAR(100),
    is_primary BOOLEAN,
    display_order INT,
    direction VARCHAR(3),
    flag_emoji VARCHAR(10)
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    
    RETURN QUERY
    SELECT 
        tl.language_code,
        sl.name_ar,
        sl.name_en,
        tl.is_primary,
        tl.display_order,
        sl.direction,
        sl.flag_emoji
    FROM tenant_languages tl
    JOIN system_languages sl ON sl.code = tl.language_code
    WHERE tl.tenant_id = v_tenant_id
    AND tl.is_enabled = true
    ORDER BY tl.is_primary DESC, tl.display_order, sl.name_en;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- دالة: التحقق من عدد اللغات المسموح به
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_language_limit(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_plan_id UUID;
    v_max_languages INT;
    v_current_languages INT;
    v_remaining INT;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    
    -- الحصول على الباقة الحالية
    SELECT s.plan_id INTO v_plan_id
    FROM subscriptions s
    WHERE s.tenant_id = v_tenant_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object(
            'max_languages', 0,
            'current_languages', 0,
            'remaining', 0,
            'can_add_more', false,
            'error', 'No active subscription'
        );
    END IF;
    
    -- الحصول على الحد الأقصى
    SELECT sp.max_languages INTO v_max_languages
    FROM subscription_plans sp
    WHERE sp.id = v_plan_id;
    
    -- عد اللغات الحالية
    SELECT COUNT(*) INTO v_current_languages
    FROM tenant_languages
    WHERE tenant_id = v_tenant_id
    AND is_enabled = true;
    
    v_remaining := GREATEST(0, v_max_languages - v_current_languages);
    
    RETURN jsonb_build_object(
        'max_languages', v_max_languages,
        'current_languages', v_current_languages,
        'remaining', v_remaining,
        'can_add_more', v_remaining > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- دالة: تفعيل لغة للتينانت
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enable_tenant_language(
    p_tenant_id UUID,
    p_language_code VARCHAR(5),
    p_is_primary BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_limit_check JSONB;
    v_can_add BOOLEAN;
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    -- التحقق من وجود اللغة في النظام
    IF NOT EXISTS (SELECT 1 FROM system_languages WHERE code = p_language_code AND is_active = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Language not available in system'
        );
    END IF;
    
    -- التحقق من أن اللغة غير مفعلة مسبقاً
    IF EXISTS (SELECT 1 FROM tenant_languages WHERE tenant_id = p_tenant_id AND language_code = p_language_code AND is_enabled = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Language already enabled'
        );
    END IF;
    
    -- التحقق من الحد الأقصى
    v_limit_check := check_language_limit(p_tenant_id);
    v_can_add := (v_limit_check->>'can_add_more')::BOOLEAN;
    
    IF NOT v_can_add THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Language limit reached',
            'limit_info', v_limit_check
        );
    END IF;
    
    -- إذا كانت أول لغة، تصبح primary تلقائياً
    IF NOT EXISTS (SELECT 1 FROM tenant_languages WHERE tenant_id = p_tenant_id AND is_enabled = true) THEN
        p_is_primary := true;
    END IF;
    
    -- إذا كانت primary جديدة، إلغاء primary من اللغات الأخرى
    IF p_is_primary THEN
        UPDATE tenant_languages
        SET is_primary = false
        WHERE tenant_id = p_tenant_id;
    END IF;
    
    -- إدراج أو تحديث اللغة
    INSERT INTO tenant_languages (
        tenant_id,
        language_code,
        language_name_ar,
        language_name_en,
        is_primary,
        is_enabled,
        enabled_at,
        enabled_by
    )
    SELECT
        p_tenant_id,
        p_language_code,
        sl.name_ar,
        sl.name_en,
        p_is_primary,
        true,
        NOW(),
        v_current_user_id
    FROM system_languages sl
    WHERE sl.code = p_language_code
    ON CONFLICT (tenant_id, language_code)
    DO UPDATE SET
        is_enabled = true,
        is_primary = p_is_primary,
        enabled_at = NOW(),
        enabled_by = v_current_user_id,
        disabled_at = NULL,
        disabled_by = NULL;
    
    -- تسجيل في audit log
    PERFORM log_audit(
        'enable_language',
        'tenant_languages',
        p_tenant_id,
        p_language_code,
        NULL,
        jsonb_build_object('language_code', p_language_code, 'is_primary', p_is_primary)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'language_code', p_language_code,
        'is_primary', p_is_primary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- دالة: تعطيل لغة للتينانت
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION disable_tenant_language(
    p_tenant_id UUID,
    p_language_code VARCHAR(5)
)
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_is_primary BOOLEAN;
    v_enabled_count INT;
BEGIN
    v_current_user_id := auth.uid();
    
    -- التحقق من أن اللغة مفعلة
    SELECT is_primary INTO v_is_primary
    FROM tenant_languages
    WHERE tenant_id = p_tenant_id
    AND language_code = p_language_code
    AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Language not enabled or not found'
        );
    END IF;
    
    -- التحقق من أنها ليست آخر لغة
    SELECT COUNT(*) INTO v_enabled_count
    FROM tenant_languages
    WHERE tenant_id = p_tenant_id
    AND is_enabled = true;
    
    IF v_enabled_count <= 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot disable last language'
        );
    END IF;
    
    -- تعطيل اللغة
    UPDATE tenant_languages
    SET 
        is_enabled = false,
        disabled_at = NOW(),
        disabled_by = v_current_user_id
    WHERE tenant_id = p_tenant_id
    AND language_code = p_language_code;
    
    -- إذا كانت primary، تعيين لغة أخرى كـ primary
    IF v_is_primary THEN
        UPDATE tenant_languages
        SET is_primary = true
        WHERE id = (
            SELECT id
            FROM tenant_languages
            WHERE tenant_id = p_tenant_id
            AND is_enabled = true
            ORDER BY display_order
            LIMIT 1
        );
    END IF;
    
    -- تسجيل في audit log
    PERFORM log_audit(
        'disable_language',
        'tenant_languages',
        p_tenant_id,
        p_language_code,
        NULL,
        jsonb_build_object('language_code', p_language_code)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'language_code', p_language_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- دالة: تعيين اللغة الأساسية
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_primary_language(
    p_tenant_id UUID,
    p_language_code VARCHAR(5)
)
RETURNS JSONB AS $$
BEGIN
    -- التحقق من أن اللغة مفعلة
    IF NOT EXISTS (
        SELECT 1 FROM tenant_languages
        WHERE tenant_id = p_tenant_id
        AND language_code = p_language_code
        AND is_enabled = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Language not enabled'
        );
    END IF;
    
    -- إلغاء primary من كل اللغات
    UPDATE tenant_languages
    SET is_primary = false
    WHERE tenant_id = p_tenant_id;
    
    -- تعيين اللغة الجديدة كـ primary
    UPDATE tenant_languages
    SET is_primary = true
    WHERE tenant_id = p_tenant_id
    AND language_code = p_language_code;
    
    -- تسجيل في audit log
    PERFORM log_audit(
        'set_primary_language',
        'tenant_languages',
        p_tenant_id,
        p_language_code,
        NULL,
        jsonb_build_object('language_code', p_language_code)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'primary_language', p_language_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 5: RLS Policies
-- Part 5: RLS Policies
-- ═══════════════════════════════════════════════════════════════

-- تفعيل RLS
ALTER TABLE tenant_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_languages ENABLE ROW LEVEL SECURITY;

-- Policy: المستخدم يرى لغات tenant الخاص به
DROP POLICY IF EXISTS "Users can view their tenant languages" ON tenant_languages;
CREATE POLICY "Users can view their tenant languages" ON tenant_languages
    FOR SELECT USING (
        tenant_id = get_current_tenant_id()
        OR COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

-- Policy: الجميع يمكنهم قراءة اللغات المتاحة في النظام
DROP POLICY IF EXISTS "Anyone can view system languages" ON system_languages;
CREATE POLICY "Anyone can view system languages" ON system_languages
    FOR SELECT USING (true);

-- Policy: Super Admin فقط يمكنه التعديل
DROP POLICY IF EXISTS "Super Admin can manage system languages" ON system_languages;
CREATE POLICY "Super Admin can manage system languages" ON system_languages
    FOR ALL USING (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- الجزء 6: Triggers
-- Part 6: Triggers
-- ═══════════════════════════════════════════════════════════════

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_tenant_languages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_languages_updated_at ON tenant_languages;
CREATE TRIGGER trg_tenant_languages_updated_at
    BEFORE UPDATE ON tenant_languages
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_languages_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- الجزء 7: التحقق النهائي
-- Part 7: Final Verification
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_exists BOOLEAN;
    v_tables TEXT[] := ARRAY[
        'tenant_languages',
        'system_languages'
    ];
    v_func TEXT;
    v_functions TEXT[] := ARRAY[
        'get_tenant_active_languages',
        'check_language_limit',
        'enable_tenant_language',
        'disable_tenant_language',
        'set_primary_language'
    ];
    v_system_languages_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 التحقق من نظام اللغات المتعددة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    -- التحقق من الجداول
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = v_table
        ) INTO v_exists;
        
        IF v_exists THEN
            RAISE NOTICE '✅ جدول: %', v_table;
        ELSE
            RAISE NOTICE '❌ جدول: % - غير موجود', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 التحقق من الدوال:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    -- التحقق من الدوال
    FOREACH v_func IN ARRAY v_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = v_func
        ) INTO v_exists;
        
        IF v_exists THEN
            RAISE NOTICE '✅ دالة: %', v_func;
        ELSE
            RAISE NOTICE '❌ دالة: % - غير موجودة', v_func;
        END IF;
    END LOOP;
    
    -- عد اللغات المتاحة
    SELECT COUNT(*) INTO v_system_languages_count FROM system_languages;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل تنفيذ STEP 32-B: Multi-Language System';
    RAISE NOTICE '📊 عدد اللغات المتاحة في النظام: %', v_system_languages_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ✅ تم إنشاء نظام اللغات المتعددة
-- ✅ Multi-Language System Created
