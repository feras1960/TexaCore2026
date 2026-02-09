-- ════════════════════════════════════════════════════════════════
-- 🚀 متابعة التنفيذ: المرحلة 1 (الجزء المتبقي)
-- تم تخطي الجزء الأول (تعديل جدول Customers) لأنه تم تنفيذه بنجاح
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ تحديث جدول الموظفين (User Profiles)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_access_level INT DEFAULT 1;

-- 2️⃣ إنشاء جدول رموز QR (QR Codes Registry)
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'material', 'roll', 'invoice', 'entry', 'delivery_note'
    entity_id UUID NOT NULL,
    current_status VARCHAR(50) DEFAULT 'active', -- active, scanned, delivered, received
    generated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- 3️⃣ سجل المسح (Scan Logs)
CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id),
    scanned_by_telegram_id BIGINT,
    scanned_by_user_id UUID REFERENCES user_profiles(id),
    action_type VARCHAR(50), -- view, receive, update_status
    prev_status VARCHAR(50),
    new_status VARCHAR(50),
    location_data JSONB,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ تفعيل RLS (سياسات الأمان الصارمة)
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- 🛡️ سياسات الأمان (مع التحقق لتجنب الأخطاء في حالة التكرار)
DO $$
BEGIN
    -- سياسات qr_codes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view QR codes' AND tablename = 'qr_codes') THEN
        CREATE POLICY "Employees can view QR codes" ON qr_codes FOR SELECT USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = qr_codes.tenant_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can update QR status' AND tablename = 'qr_codes') THEN
        CREATE POLICY "Employees can update QR status" ON qr_codes FOR UPDATE USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = qr_codes.tenant_id)) WITH CHECK (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = qr_codes.tenant_id));
    END IF;

    -- سياسات qr_scans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can log scans' AND tablename = 'qr_scans') THEN
        CREATE POLICY "Employees can log scans" ON qr_scans FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = qr_scans.tenant_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view logs' AND tablename = 'qr_scans') THEN
        CREATE POLICY "Employees can view logs" ON qr_scans FOR SELECT USING (auth.uid() IN (SELECT id FROM user_profiles WHERE tenant_id = qr_scans.tenant_id));
    END IF;
END $$;

-- 5️⃣ دالة لتحديث حالة الفاتورة/القيد عند المسح (Trigger Function Support)
CREATE OR REPLACE FUNCTION update_entity_status_on_scan(
    p_qr_code VARCHAR, 
    p_new_status VARCHAR,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_qr_record RECORD;
BEGIN
    -- 1. جلب بيانات الـ QR
    SELECT * INTO v_qr_record FROM qr_codes WHERE code = p_qr_code LIMIT 1;
    
    IF v_qr_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'QR Code not found');
    END IF;

    -- 2. تحديث الحالة في جدول الـ QR
    UPDATE qr_codes SET current_status = p_new_status 
    WHERE id = v_qr_record.id;

    -- 3. تحديث الكيان الأصلي (Dynamic SQL)
    IF v_qr_record.entity_type = 'invoice' THEN
        EXECUTE 'UPDATE sales_invoices SET status = $1 WHERE id = $2' 
        USING p_new_status, v_qr_record.entity_id;
        
    ELSIF v_qr_record.entity_type = 'entry' THEN
        EXECUTE 'UPDATE journal_entries SET status = $1 WHERE id = $2' 
        USING p_new_status, v_qr_record.entity_id;
        
    ELSIF v_qr_record.entity_type = 'delivery_note' THEN
        EXECUTE 'UPDATE delivery_notes SET status = $1 WHERE id = $2' 
        USING p_new_status, v_qr_record.entity_id;
    END IF;

    -- 4. تسجيل العملية في السجل
    INSERT INTO qr_scans (qr_code_id, scanned_by_user_id, action_type, new_status, tenant_id)
    VALUES (v_qr_record.id, p_user_id, 'update_status', p_new_status, v_qr_record.tenant_id);

    RETURN json_build_object('success', true, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحية للدالة
GRANT EXECUTE ON FUNCTION update_entity_status_on_scan(VARCHAR, VARCHAR, UUID) TO authenticated, service_role;
