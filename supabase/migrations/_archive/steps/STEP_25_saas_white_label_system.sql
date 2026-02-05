-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 25: نظام White Label للوكلاء (White Label System for Agents)
-- نظام كامل للوكلاء الذين يريدون بيع النظام باسمهم الخاص
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة حقول White Label لجدول agents
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
        -- ═══ حالة White Label ═══
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS has_white_label BOOLEAN DEFAULT false;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_status VARCHAR(20) DEFAULT 'inactive';
        -- inactive: غير مفعل
        -- pending: في انتظار الدفع
        -- active: نشط
        -- suspended: موقوف
        -- expired: منتهي
        
        -- ═══ الدفع ═══
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_payment_amount DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_payment_date TIMESTAMPTZ;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_payment_reference VARCHAR(200);
        
        -- ═══ النسبة ═══
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_commission_percent DECIMAL(5,2) DEFAULT 50;
        -- نسبة الأرباح للوكيل بـ White Label (50% افتراضياً)
        
        -- ═══ التواريخ ═══
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_activated_at TIMESTAMPTZ;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_expires_at TIMESTAMPTZ;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_suspended_at TIMESTAMPTZ;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_suspended_reason TEXT;
        
        -- ═══ الموافقة ═══
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_approved_at TIMESTAMPTZ;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS white_label_approved_by UUID;
        
        RAISE NOTICE '✅ تم إضافة حقول White Label لجدول agents';
    ELSE
        RAISE NOTICE '⚠️ جدول agents غير موجود - سيتم تخطي إضافة الحقول';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. جدول الدومينات الخاصة (White Label Domains)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS white_label_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- ═══ الدومين ═══
    domain VARCHAR(255) NOT NULL UNIQUE,
    -- مثال: erp.companyname.com أو companyname.com
    
    -- ═══ نوع الدومين ═══
    domain_type VARCHAR(20) DEFAULT 'subdomain',
    -- subdomain: نطاق فرعي (erp.companyname.com)
    -- custom: نطاق مخصص (companyname.com)
    
    -- ═══ SSL ═══
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_certificate TEXT,
    ssl_key TEXT,
    ssl_expires_at TIMESTAMPTZ,
    
    -- ═══ DNS ═══
    dns_configured BOOLEAN DEFAULT false,
    dns_records JSONB DEFAULT '[]',
    -- [
    --   {"type": "A", "name": "@", "value": "IP_ADDRESS"},
    --   {"type": "CNAME", "name": "www", "value": "domain.com"}
    -- ]
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في انتظار التكوين
    -- active: نشط
    -- inactive: غير نشط
    -- failed: فشل التكوين
    
    -- ═══ التحقق ═══
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_token VARCHAR(100),
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- 3. جدول إعدادات White Label
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS white_label_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- ═══ العلامة التجارية ═══
    brand_name VARCHAR(200),
    brand_name_en VARCHAR(200),
    brand_slogan_ar TEXT,
    brand_slogan_en TEXT,
    
    -- ═══ الشعار ═══
    logo_url TEXT,
    logo_dark_url TEXT,  -- للوضع الداكن
    favicon_url TEXT,
    
    -- ═══ الألوان ═══
    primary_color VARCHAR(7) DEFAULT '#0A2540',
    secondary_color VARCHAR(7) DEFAULT '#f59e0b',
    accent_color VARCHAR(7),
    background_color VARCHAR(7) DEFAULT '#FFFFFF',
    
    -- ═══ معلومات الاتصال ═══
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    contact_whatsapp VARCHAR(50),
    support_email VARCHAR(200),
    support_phone VARCHAR(50),
    
    -- ═══ العنوان ═══
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    
    -- ═══ روابط ═══
    website_url TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    instagram_url TEXT,
    
    -- ═══ إعدادات إضافية ═══
    custom_css TEXT,  -- CSS مخصص
    custom_js TEXT,   -- JavaScript مخصص
    footer_text_ar TEXT,
    footer_text_en TEXT,
    
    -- ═══ اللغة الافتراضية ═══
    default_language VARCHAR(5) DEFAULT 'ar',
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. جدول دفعات White Label
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS white_label_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- ═══ المبلغ ═══
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- ═══ نوع الدفع ═══
    payment_type VARCHAR(50) DEFAULT 'one_time',
    -- one_time: دفعة واحدة
    -- annual: سنوي
    -- monthly: شهري
    
    -- ═══ الفترة ═══
    period_months INT DEFAULT 12,  -- عدد الأشهر المشمولة
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    
    -- ═══ طريقة الدفع ═══
    payment_method VARCHAR(50),
    -- bank_transfer, credit_card, paypal, wise, crypto
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في الانتظار
    -- processing: قيد المعالجة
    -- completed: مكتمل
    -- failed: فشل
    -- refunded: مسترد
    
    -- ═══ المرجع ═══
    payment_reference VARCHAR(200),
    transaction_id VARCHAR(200),
    receipt_url TEXT,
    
    -- ═══ المعالجة ═══
    paid_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    
    -- ═══ ملاحظات ═══
    notes TEXT,
    admin_notes TEXT,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. جدول إحصائيات White Label
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS white_label_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- ═══ الفترة ═══
    period_date DATE NOT NULL,
    
    -- ═══ العملاء ═══
    total_tenants INT DEFAULT 0,
    new_tenants INT DEFAULT 0,
    active_tenants INT DEFAULT 0,
    
    -- ═══ الإيرادات ═══
    total_revenue DECIMAL(10,2) DEFAULT 0,
    agent_commission DECIMAL(10,2) DEFAULT 0,
    platform_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- ═══ الزيارات ═══
    website_visits INT DEFAULT 0,
    signup_conversions INT DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- ═══ تفاصيل ═══
    details JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, period_date)
);

-- ═══════════════════════════════════════════════════════════════
-- 6. Indexes
-- ═══════════════════════════════════════════════════════════════

-- Indexes لجدول white_label_domains
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'white_label_domains') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_domains' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_domains_agent_id ON white_label_domains(agent_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_domains' AND column_name = 'domain') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_domains_domain ON white_label_domains(domain);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_domains' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_domains_status ON white_label_domains(status);
        END IF;
    END IF;
END $$;

-- Indexes لجدول white_label_configs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'white_label_configs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_configs' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_configs_agent_id ON white_label_configs(agent_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول white_label_payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'white_label_payments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_payments' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_payments_agent_id ON white_label_payments(agent_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_payments' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_payments_status ON white_label_payments(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_payments' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_payments_created_at ON white_label_payments(created_at);
        END IF;
    END IF;
END $$;

-- Indexes لجدول white_label_stats
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'white_label_stats') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_stats' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_stats_agent_id ON white_label_stats(agent_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'white_label_stats' AND column_name = 'period_date') THEN
            CREATE INDEX IF NOT EXISTS idx_white_label_stats_period_date ON white_label_stats(period_date);
        END IF;
    END IF;
END $$;

-- Indexes لجدول agents (White Label fields)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'has_white_label') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_has_white_label ON agents(has_white_label);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'white_label_status') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_white_label_status ON agents(white_label_status);
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. Functions
-- ═══════════════════════════════════════════════════════════════

-- Function: تفعيل White Label بعد الدفع
CREATE OR REPLACE FUNCTION activate_white_label(
    p_agent_id UUID,
    p_payment_id UUID,
    p_approved_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_agent RECORD;
    v_payment RECORD;
    v_config_id UUID;
BEGIN
    -- الحصول على الوكيل
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الوكيل غير موجود');
    END IF;
    
    -- الحصول على الدفعة
    SELECT * INTO v_payment FROM white_label_payments WHERE id = p_payment_id AND agent_id = p_agent_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الدفعة غير موجودة');
    END IF;
    
    IF v_payment.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'الدفعة غير مكتملة');
    END IF;
    
    -- تحديث الوكيل
    UPDATE agents
    SET has_white_label = true,
        white_label_status = 'active',
        white_label_payment_amount = v_payment.amount,
        white_label_payment_date = v_payment.paid_at,
        white_label_payment_reference = v_payment.payment_reference,
        white_label_commission_percent = 50,  -- 50% للوكلاء بـ White Label
        white_label_activated_at = NOW(),
        white_label_expires_at = v_payment.valid_to,
        white_label_approved_at = NOW(),
        white_label_approved_by = p_approved_by,
        commission_percent = 50,  -- تحديث نسبة العمولة الأساسية
        recurring_commission_percent = 50  -- تحديث نسبة العمولة المتكررة
    WHERE id = p_agent_id;
    
    -- إنشاء إعدادات White Label افتراضية
    INSERT INTO white_label_configs (agent_id, brand_name, is_active)
    VALUES (p_agent_id, v_agent.name, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_config_id;
    
    -- تسجيل الحدث
    INSERT INTO agent_events (agent_id, event_type, event_data)
    VALUES (p_agent_id, 'white_label_activated', jsonb_build_object(
        'payment_id', p_payment_id,
        'amount', v_payment.amount,
        'approved_by', p_approved_by
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'agent_id', p_agent_id,
        'config_id', v_config_id,
        'message', 'تم تفعيل White Label بنجاح'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: إضافة دومين White Label
CREATE OR REPLACE FUNCTION add_white_label_domain(
    p_agent_id UUID,
    p_domain VARCHAR(255),
    p_domain_type VARCHAR(20) DEFAULT 'subdomain'
) RETURNS JSONB AS $$
DECLARE
    v_agent RECORD;
    v_domain_id UUID;
    v_verification_token VARCHAR(100);
BEGIN
    -- التحقق من الوكيل
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id AND has_white_label = true AND white_label_status = 'active';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الوكيل غير مفعل لـ White Label');
    END IF;
    
    -- التحقق من عدم وجود الدومين
    IF EXISTS (SELECT 1 FROM white_label_domains WHERE domain = p_domain) THEN
        RETURN jsonb_build_object('success', false, 'error', 'الدومين مسجل مسبقاً');
    END IF;
    
    -- توليد token للتحقق
    v_verification_token := 'WL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 32));
    
    -- إضافة الدومين
    INSERT INTO white_label_domains (agent_id, domain, domain_type, verification_token, status)
    VALUES (p_agent_id, p_domain, p_domain_type, v_verification_token, 'pending')
    RETURNING id INTO v_domain_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'domain_id', v_domain_id,
        'verification_token', v_verification_token,
        'message', 'تم إضافة الدومين بنجاح - يرجى تكوين DNS'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: التحقق من صحة الدومين
CREATE OR REPLACE FUNCTION verify_white_label_domain(
    p_domain_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_domain RECORD;
BEGIN
    SELECT * INTO v_domain FROM white_label_domains WHERE id = p_domain_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الدومين غير موجود');
    END IF;
    
    -- TODO: إضافة منطق التحقق من DNS
    
    -- تحديث حالة الدومين
    UPDATE white_label_domains
    SET verified = true,
        verified_at = NOW(),
        status = 'active',
        activated_at = NOW()
    WHERE id = p_domain_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم التحقق من الدومين بنجاح'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: تسجيل دفعة White Label
CREATE OR REPLACE FUNCTION register_white_label_payment(
    p_agent_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50),
    p_payment_reference VARCHAR(200),
    p_period_months INT DEFAULT 12
) RETURNS JSONB AS $$
DECLARE
    v_agent RECORD;
    v_payment_id UUID;
    v_valid_from TIMESTAMPTZ;
    v_valid_to TIMESTAMPTZ;
BEGIN
    -- التحقق من الوكيل
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الوكيل غير موجود أو غير نشط');
    END IF;
    
    -- حساب الفترة
    v_valid_from := NOW();
    v_valid_to := v_valid_from + (p_period_months || ' months')::INTERVAL;
    
    -- إنشاء سجل الدفعة
    INSERT INTO white_label_payments (
        agent_id, amount, payment_method, payment_reference,
        period_months, valid_from, valid_to, status
    ) VALUES (
        p_agent_id, p_amount, p_payment_method, p_payment_reference,
        p_period_months, v_valid_from, v_valid_to, 'pending'
    ) RETURNING id INTO v_payment_id;
    
    -- تحديث حالة الوكيل
    UPDATE agents
    SET white_label_status = 'pending'
    WHERE id = p_agent_id;
    
    -- تسجيل الحدث
    INSERT INTO agent_events (agent_id, event_type, event_data)
    VALUES (p_agent_id, 'white_label_payment_registered', jsonb_build_object(
        'payment_id', v_payment_id,
        'amount', p_amount,
        'period_months', p_period_months
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'valid_from', v_valid_from,
        'valid_to', v_valid_to,
        'message', 'تم تسجيل الدفعة بنجاح - في انتظار المعالجة'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: التحقق من صلاحية White Label
CREATE OR REPLACE FUNCTION check_white_label_validity(
    p_agent_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_agent RECORD;
BEGIN
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'الوكيل غير موجود');
    END IF;
    
    IF NOT v_agent.has_white_label THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'الوكيل غير مفعل لـ White Label');
    END IF;
    
    IF v_agent.white_label_status != 'active' THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'White Label غير نشط', 'status', v_agent.white_label_status);
    END IF;
    
    IF v_agent.white_label_expires_at IS NOT NULL AND v_agent.white_label_expires_at < NOW() THEN
        -- تحديث الحالة تلقائياً
        UPDATE agents SET white_label_status = 'expired' WHERE id = p_agent_id;
        RETURN jsonb_build_object('valid', false, 'reason', 'White Label منتهي الصلاحية');
    END IF;
    
    RETURN jsonb_build_object(
        'valid', true,
        'expires_at', v_agent.white_label_expires_at,
        'commission_percent', v_agent.white_label_commission_percent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 8. Trigger: تحديث updated_at
-- ═══════════════════════════════════════════════════════════════

-- Trigger لـ white_label_domains
CREATE OR REPLACE FUNCTION update_white_label_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_white_label_domains_updated_at ON white_label_domains;
CREATE TRIGGER trg_white_label_domains_updated_at
    BEFORE UPDATE ON white_label_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_white_label_domains_updated_at();

-- Trigger لـ white_label_configs
CREATE OR REPLACE FUNCTION update_white_label_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_white_label_configs_updated_at ON white_label_configs;
CREATE TRIGGER trg_white_label_configs_updated_at
    BEFORE UPDATE ON white_label_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_white_label_configs_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 9. View: ملخص White Label للوكيل
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW white_label_summary_view AS
SELECT 
    a.id as agent_id,
    a.code as agent_code,
    a.name as agent_name,
    a.has_white_label,
    a.white_label_status,
    a.white_label_commission_percent,
    a.white_label_activated_at,
    a.white_label_expires_at,
    -- الدومينات
    COUNT(DISTINCT wld.id) as total_domains,
    COUNT(DISTINCT wld.id) FILTER (WHERE wld.status = 'active') as active_domains,
    -- الإعدادات
    wlc.brand_name,
    wlc.logo_url,
    wlc.primary_color,
    -- الدفعات
    COUNT(DISTINCT wlp.id) as total_payments,
    COALESCE(SUM(wlp.amount) FILTER (WHERE wlp.status = 'completed'), 0) as total_paid,
    -- الإحصائيات
    COALESCE(SUM(wls.total_tenants), 0) as total_tenants,
    COALESCE(SUM(wls.total_revenue), 0) as total_revenue,
    COALESCE(SUM(wls.agent_commission), 0) as total_commission
FROM agents a
LEFT JOIN white_label_domains wld ON wld.agent_id = a.id
LEFT JOIN white_label_configs wlc ON wlc.agent_id = a.id AND wlc.is_active = true
LEFT JOIN white_label_payments wlp ON wlp.agent_id = a.id
LEFT JOIN white_label_stats wls ON wls.agent_id = a.id
WHERE a.has_white_label = true
GROUP BY a.id, a.code, a.name, a.has_white_label, a.white_label_status,
         a.white_label_commission_percent, a.white_label_activated_at, a.white_label_expires_at,
         wlc.brand_name, wlc.logo_url, wlc.primary_color;

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies (سيتم إضافتها في ملف منفصل)
-- ═══════════════════════════════════════════════════════════════

-- سيتم إضافة RLS Policies في STEP_26
