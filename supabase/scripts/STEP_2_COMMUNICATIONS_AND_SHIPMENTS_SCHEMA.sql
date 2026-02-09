-- ════════════════════════════════════════════════════════════════
-- 🚀 المرحلة 2: تأسيس جداول الاتصالات والشحن والبنوك
-- 
-- 1. سجلات المكالمات وتحليل AI (Grandstream + Gemini)
-- 2. تتبع الشحنات (Nova Poshta / Ukrposhta)
-- 3. التكامل البنكي (Monobank / PrivatBank)
-- 4. تفضيلات الإشعارات
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ نظام الاتصالات (Call Logs & AI Analysis)
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(100), -- ID من Grandstream
    caller_number VARCHAR(50),
    receiver_number VARCHAR(50),
    direction VARCHAR(20), -- inbound, outbound
    duration INT, -- بالثواني
    status VARCHAR(20), -- answered, missed, failed
    recording_url TEXT,
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    summary TEXT, -- ملخص المكالمة
    customer_mood VARCHAR(50), -- happy, angry, neutral
    category VARCHAR(50), -- sales, support, complaint
    action_required BOOLEAN DEFAULT false,
    transcript TEXT, -- النص الكامل
    ai_model VARCHAR(50) DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ تتبع الشحنات (Shipment Tracking)
CREATE TABLE IF NOT EXISTS shipments_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE, -- ربط مع جدول الشحنات الموجود
    provider VARCHAR(50), -- nova_poshta, dhl, aramex
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
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    bank_name VARCHAR(50), -- monobank, privatbank
    api_key TEXT, -- مشفر (يفضل استخدام Vault لكن سنضعه هنا مؤقتاً)
    account_id UUID REFERENCES accounts(id), -- الحساب في شجرة الحسابات
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ تفضيلات الإشعارات (Notification Preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    channels JSONB DEFAULT '["telegram"]', -- telegram, email, sms
    events JSONB DEFAULT '{}', -- {"new_order": true, "payment": false}
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- 🛡️ سياسات الأمان (RLS)
-- ════════════════════════════════════════════════════════════════

-- تفعيل RLS للجداول الجديدة
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- سياسات call_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view call logs' AND tablename = 'call_logs') THEN
        CREATE POLICY "Employees can view call logs" ON call_logs FOR SELECT USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = call_logs.tenant_id));
    END IF;
    
    -- السماح لـ Service Role (n8n/API) بالإدراج بدون قيدTenant مباشر إذا لزم الأمر، أو الاعتماد على auth.uid() إذا كان المستخدم API
    -- هنا سنفترض أن الموظفين يمكنهم الإدراج أيضاً يدوياً إذا لزم الأمر، أو النظام
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System/Employees can insert call logs' AND tablename = 'call_logs') THEN
        CREATE POLICY "System/Employees can insert call logs" ON call_logs FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = call_logs.tenant_id));
    END IF;

    -- سياسات call_analyses
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view analyses' AND tablename = 'call_analyses') THEN
        CREATE POLICY "Employees can view analyses" ON call_analyses FOR SELECT USING (EXISTS (SELECT 1 FROM call_logs WHERE call_logs.id = call_analyses.call_id AND auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = call_logs.tenant_id)));
    END IF;

    -- سياسات shipments_tracking
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view tracking' AND tablename = 'shipments_tracking') THEN
        CREATE POLICY "Employees can view tracking" ON shipments_tracking FOR SELECT USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = shipments_tracking.tenant_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can update tracking' AND tablename = 'shipments_tracking') THEN
        CREATE POLICY "Employees can update tracking" ON shipments_tracking FOR ALL USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = shipments_tracking.tenant_id));
    END IF;

    -- سياسات bank_integrations (حساسة - للمدراء فقط)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Managers can manage bank integrations' AND tablename = 'bank_integrations') THEN
        CREATE POLICY "Managers can manage bank integrations" ON bank_integrations FOR ALL USING (
            auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = bank_integrations.tenant_id AND (is_manager = true OR role = 'admin'))
        );
    END IF;

    -- سياسات notification_preferences (كل مستخدم يرى ويعدل خاصته)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own preferences' AND tablename = 'notification_preferences') THEN
        CREATE POLICY "Users manage their own preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

END $$;
