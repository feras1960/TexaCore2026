-- ════════════════════════════════════════════════════════════════
-- 🚀 المرحلة 2: تأسيس جداول الاتصالات والشحن والبنوك
-- 
-- 1. سجلات المكالمات وتحليل AI (Grandstream + Gemini)
-- 2. تتبع الشحنات (Nova Poshta / Ukrposhta)
-- 3. التكامل البنكي (Monobank / PrivatBank)
-- 4. تفضيلات الإشعارات
--
-- ✅ v3.0 — متوافق مع نظام العزل الرسمي:
--     - Brand → Tenant → Company hierarchy
--     - Uses get_user_tenant_id(), is_platform_admin(), 
--       is_tenant_admin(), is_partner_or_reseller(), etc.
--     - Policy naming: tablename_operation_policy
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ نظام الاتصالات (Call Logs & AI Analysis)
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(100), -- ID من Grandstream
    caller_number VARCHAR(50),
    receiver_number VARCHAR(50),
    direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
    duration INT, -- بالثواني
    status VARCHAR(20) CHECK (status IN ('answered', 'missed', 'failed', 'busy')),
    recording_url TEXT,
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
    summary TEXT, -- ملخص المكالمة
    customer_mood VARCHAR(50) CHECK (customer_mood IN ('happy', 'neutral', 'angry', 'frustrated')),
    category VARCHAR(50) CHECK (category IN ('sales', 'support', 'complaint', 'inquiry', 'booking')),
    action_required BOOLEAN DEFAULT false,
    transcript TEXT, -- النص الكامل
    ai_model VARCHAR(50) DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ تتبع الشحنات (Shipment Tracking)
CREATE TABLE IF NOT EXISTS shipments_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    provider VARCHAR(50) CHECK (provider IN ('nova_poshta', 'ukrposhta', 'dhl', 'aramex', 'fedex', 'other')),
    tracking_number VARCHAR(100),
    current_status VARCHAR(50),
    status_history JSONB DEFAULT '[]'::jsonb, -- سجل الحالات الكامل
    label_url TEXT, -- رابط بوليصة الشحن
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ إعدادات التكامل البنكي (Bank Integrations)
CREATE TABLE IF NOT EXISTS bank_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) CHECK (bank_name IN ('monobank', 'privatbank', 'other')),
    api_key TEXT, -- مشفر (يفضل استخدام Vault)
    account_id UUID REFERENCES accounts(id), -- الحساب في شجرة الحسابات
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ تفضيلات الإشعارات (Notification Preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    channels JSONB DEFAULT '["telegram"]'::jsonb, -- telegram, email, sms
    events JSONB DEFAULT '{}'::jsonb, -- {"new_order": true, "payment": false}
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- 🔑 الفهارس (Performance Indexes)
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_number);
CREATE INDEX IF NOT EXISTS idx_call_analyses_call ON call_analyses(call_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_tenant ON shipments_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_bank_integrations_tenant ON bank_integrations(tenant_id);

-- ════════════════════════════════════════════════════════════════
-- 🛡️ سياسات الأمان (RLS) — وفق النمط الرسمي لـ TexaCore
-- ════════════════════════════════════════════════════════════════

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ══════ حذف السياسات القديمة (تنظيف) ══════
DROP POLICY IF EXISTS "Employees can view call logs" ON call_logs;
DROP POLICY IF EXISTS "System/Employees can insert call logs" ON call_logs;
DROP POLICY IF EXISTS "Employees can view analyses" ON call_analyses;
DROP POLICY IF EXISTS "Employees can view tracking" ON shipments_tracking;
DROP POLICY IF EXISTS "Employees can update tracking" ON shipments_tracking;
DROP POLICY IF EXISTS "Managers can manage bank integrations" ON bank_integrations;
DROP POLICY IF EXISTS "Users manage their own preferences" ON notification_preferences;

-- ═══════════════════════════════════════════════════════════════
-- CALL LOGS — سياسات المكالمات
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY call_logs_select_policy ON call_logs
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY call_logs_insert_policy ON call_logs
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY call_logs_update_policy ON call_logs
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY call_logs_delete_policy ON call_logs
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- CALL ANALYSES — سياسات تحليل المكالمات
-- tenant_id مشتق من call_logs (no direct tenant_id)
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY call_analyses_select_policy ON call_analyses
    FOR SELECT USING (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM call_logs cl
            WHERE cl.id = call_analyses.call_id
              AND cl.tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY call_analyses_insert_policy ON call_analyses
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM call_logs cl
            WHERE cl.id = call_analyses.call_id
              AND cl.tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY call_analyses_update_policy ON call_analyses
    FOR UPDATE USING (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM call_logs cl
            WHERE cl.id = call_analyses.call_id
              AND cl.tenant_id = get_user_tenant_id()
              AND is_tenant_admin()
        )
    );

CREATE POLICY call_analyses_delete_policy ON call_analyses
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- SHIPMENTS TRACKING — سياسات تتبع الشحنات
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY shipments_tracking_select_policy ON shipments_tracking
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY shipments_tracking_insert_policy ON shipments_tracking
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY shipments_tracking_update_policy ON shipments_tracking
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY shipments_tracking_delete_policy ON shipments_tracking
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- BANK INTEGRATIONS — سياسات التكامل البنكي (حساسة)
-- Tenant Admin / Manager فقط (ليس أي موظف)
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY bank_integrations_select_policy ON bank_integrations
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY bank_integrations_insert_policy ON bank_integrations
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY bank_integrations_update_policy ON bank_integrations
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY bank_integrations_delete_policy ON bank_integrations
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES — سياسات تفضيلات الإشعارات
-- كل مستخدم يدير تفضيلاته هو فقط + Platform/Tenant Admin
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY notification_preferences_select_policy ON notification_preferences
    FOR SELECT USING (
        is_platform_admin()
        OR user_id = auth.uid()
    );

CREATE POLICY notification_preferences_insert_policy ON notification_preferences
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR user_id = auth.uid()
    );

CREATE POLICY notification_preferences_update_policy ON notification_preferences
    FOR UPDATE USING (
        is_platform_admin()
        OR user_id = auth.uid()
    );

CREATE POLICY notification_preferences_delete_policy ON notification_preferences
    FOR DELETE USING (
        is_platform_admin()
        OR user_id = auth.uid()
    );

-- ════════════════════════════════════════════════════════════════
-- 🧪 التحقق من السياسات
-- ════════════════════════════════════════════════════════════════
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations', 
    'notification_preferences'
)
ORDER BY tablename, cmd;
