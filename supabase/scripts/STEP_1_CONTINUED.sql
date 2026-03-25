-- ════════════════════════════════════════════════════════════════
-- 🚀 متابعة التنفيذ: المرحلة 1 (الجزء المتبقي)
-- تم تخطي الجزء الأول (تعديل جدول Customers) لأنه تم تنفيذه بنجاح
--
-- ⚠️ هذا الملف مطابق لـ STEP_1_ADVANCED_FEATURES_SCHEMA.sql
-- يمكن تشغيل هذا الملف بأمان (IF NOT EXISTS + DROP IF EXISTS)
--
-- ✅ v3.0 — متوافق مع نظام العزل الرسمي
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
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (
        entity_type IN ('material', 'roll', 'invoice', 'entry', 'delivery_note', 'container')
    ),
    entity_id UUID NOT NULL,
    current_status VARCHAR(50) DEFAULT 'active' CHECK (
        current_status IN ('active', 'scanned', 'delivered', 'received', 'rejected', 'expired')
    ),
    metadata JSONB DEFAULT '{}'::jsonb,
    generated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- 3️⃣ سجل المسح (Scan Logs)
CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_by_telegram_id BIGINT,
    scanned_by_user_id UUID REFERENCES user_profiles(id),
    action_type VARCHAR(50) NOT NULL CHECK (
        action_type IN ('view', 'receive', 'update_status', 'verify', 'reject')
    ),
    prev_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    location_data JSONB,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ الفهارس
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_scans_tenant ON qr_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code ON qr_scans(qr_code_id);

-- 5️⃣ تفعيل RLS + السياسات وفق النمط الرسمي
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Employees can view QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Employees can update QR status" ON qr_codes;
DROP POLICY IF EXISTS "Employees can log scans" ON qr_scans;
DROP POLICY IF EXISTS "Employees can view logs" ON qr_scans;

-- سياسات qr_codes (وفق النمط الرسمي)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_codes_select_policy' AND tablename = 'qr_codes') THEN
        CREATE POLICY qr_codes_select_policy ON qr_codes
            FOR SELECT USING (
                is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())
                OR (is_partner_or_reseller() AND tenant_id = ANY(get_partner_tenant_ids()))
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_codes_insert_policy' AND tablename = 'qr_codes') THEN
        CREATE POLICY qr_codes_insert_policy ON qr_codes
            FOR INSERT WITH CHECK (
                is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_codes_update_policy' AND tablename = 'qr_codes') THEN
        CREATE POLICY qr_codes_update_policy ON qr_codes
            FOR UPDATE USING (
                is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_codes_delete_policy' AND tablename = 'qr_codes') THEN
        CREATE POLICY qr_codes_delete_policy ON qr_codes
            FOR DELETE USING (
                is_platform_admin() OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
    END IF;

    -- سياسات qr_scans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_scans_select_policy' AND tablename = 'qr_scans') THEN
        CREATE POLICY qr_scans_select_policy ON qr_scans
            FOR SELECT USING (
                is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())
                OR (is_partner_or_reseller() AND tenant_id = ANY(get_partner_tenant_ids()))
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_scans_insert_policy' AND tablename = 'qr_scans') THEN
        CREATE POLICY qr_scans_insert_policy ON qr_scans
            FOR INSERT WITH CHECK (
                is_platform_admin() OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id())
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_scans_update_policy' AND tablename = 'qr_scans') THEN
        CREATE POLICY qr_scans_update_policy ON qr_scans
            FOR UPDATE USING (false);  -- سجلات لا تُعدّل
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qr_scans_delete_policy' AND tablename = 'qr_scans') THEN
        CREATE POLICY qr_scans_delete_policy ON qr_scans
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- 6️⃣ دالة تحديث الحالة
CREATE OR REPLACE FUNCTION update_entity_status_on_scan(
    p_qr_code VARCHAR, 
    p_new_status VARCHAR,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_qr_record RECORD;
    v_prev_status VARCHAR;
    v_user_tenant UUID;
BEGIN
    v_user_tenant := get_user_tenant_id(p_user_id);
    
    IF v_user_tenant IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found or has no tenant');
    END IF;

    SELECT * INTO v_qr_record FROM qr_codes 
    WHERE code = p_qr_code AND tenant_id = v_user_tenant LIMIT 1;
    
    IF v_qr_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'QR Code not found or access denied');
    END IF;

    v_prev_status := v_qr_record.current_status;

    UPDATE qr_codes SET current_status = p_new_status, updated_at = NOW()
    WHERE id = v_qr_record.id;

    IF v_qr_record.entity_type = 'invoice' THEN
        EXECUTE 'UPDATE sales_invoices SET status = $1 WHERE id = $2 AND tenant_id = $3' 
        USING p_new_status, v_qr_record.entity_id, v_user_tenant;
    ELSIF v_qr_record.entity_type = 'entry' THEN
        EXECUTE 'UPDATE journal_entries SET status = $1 WHERE id = $2 AND tenant_id = $3' 
        USING p_new_status, v_qr_record.entity_id, v_user_tenant;
    ELSIF v_qr_record.entity_type = 'delivery_note' THEN
        EXECUTE 'UPDATE delivery_notes SET status = $1 WHERE id = $2 AND tenant_id = $3' 
        USING p_new_status, v_qr_record.entity_id, v_user_tenant;
    END IF;

    INSERT INTO qr_scans (qr_code_id, scanned_by_user_id, action_type, prev_status, new_status, tenant_id)
    VALUES (v_qr_record.id, p_user_id, 'update_status', v_prev_status, p_new_status, v_user_tenant);

    RETURN json_build_object(
        'success', true, 'prev_status', v_prev_status,
        'new_status', p_new_status, 'entity_type', v_qr_record.entity_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_entity_status_on_scan(VARCHAR, VARCHAR, UUID) TO authenticated, service_role;
