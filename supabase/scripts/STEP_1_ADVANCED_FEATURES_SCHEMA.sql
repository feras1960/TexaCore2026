-- ════════════════════════════════════════════════════════════════
-- 🚀 المرحلة 1: تأسيس ميزات TexaCore المتقدمة (AI, QR, Telegram)
-- 
-- 1. إضافة معرفات Telegram للعملاء والموظفين
-- 2. إنشاء جداول QR Code الذكي (شامل الفواتير والقيود)
-- 3. تفعيل سياسات الأمان (RLS) وفق النمط الرسمي للمشروع
--
-- ✅ v3.0 — متوافق مع نظام العزل الرسمي:
--     - Brand → Tenant → Company hierarchy
--     - Uses get_user_tenant_id(), is_platform_admin(), 
--       is_tenant_admin(), is_partner_or_reseller(), etc.
--     - Policy naming: tablename_operation_policy
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ تحديث جدول العملاء والموظفين (Telegram Meta)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_access_level INT DEFAULT 1;

-- 2️⃣ إنشاء جدول رموز QR (QR Codes Registry)
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    code VARCHAR(100) NOT NULL, -- الكود المطبوع الفريد
    
    entity_type VARCHAR(50) NOT NULL CHECK (
        entity_type IN ('material', 'roll', 'invoice', 'entry', 'delivery_note', 'container')
    ),
    entity_id UUID NOT NULL, -- ID السجل الأصلي
    
    current_status VARCHAR(50) DEFAULT 'active' CHECK (
        current_status IN ('active', 'scanned', 'delivered', 'received', 'rejected', 'expired')
    ),
    
    metadata JSONB DEFAULT '{}'::jsonb, -- بيانات إضافية مرنة
    
    generated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- 3️⃣ سجل المسح (Scan Logs) - لتتبع العمليات
CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    
    scanned_by_telegram_id BIGINT, -- معرف الماسح (من n8n/Telegram)
    scanned_by_user_id UUID REFERENCES user_profiles(id), -- إذا كان موظفاً
    
    action_type VARCHAR(50) NOT NULL CHECK (
        action_type IN ('view', 'receive', 'update_status', 'verify', 'reject')
    ),
    prev_status VARCHAR(50), -- الحالة قبل المسح
    new_status VARCHAR(50),  -- الحالة بعد المسح
    
    notes TEXT, -- ملاحظات اختيارية
    location_data JSONB, -- GPS coordinates
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- 🔑 الفهارس (Performance Indexes)
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(current_status);

CREATE INDEX IF NOT EXISTS idx_qr_scans_tenant ON qr_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code ON qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_telegram ON customers(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_telegram ON user_profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 🛡️ سياسات الأمان (RLS) — وفق النمط الرسمي لـ TexaCore
-- 
-- النمط: Brand → Tenant → Company
-- الدوال: get_user_tenant_id(), is_platform_admin(), 
--         is_tenant_admin(), is_partner_or_reseller(), 
--         get_partner_tenant_ids(), is_same_brand()
-- التسمية: tablename_operation_policy
-- ════════════════════════════════════════════════════════════════

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- ══════ حذف السياسات القديمة (تنظيف) ══════
DROP POLICY IF EXISTS "Employees can view QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Employees can update QR status" ON qr_codes;
DROP POLICY IF EXISTS "Employees can log scans" ON qr_scans;
DROP POLICY IF EXISTS "Employees can view logs" ON qr_scans;
DROP POLICY IF EXISTS "qr_codes_tenant_select" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_tenant_insert" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_tenant_update" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_tenant_delete" ON qr_codes;
DROP POLICY IF EXISTS "qr_scans_tenant_select" ON qr_scans;
DROP POLICY IF EXISTS "qr_scans_tenant_insert" ON qr_scans;

-- ══════════════════════════════════
-- QR CODES — سياسات وفق النمط الرسمي
-- ══════════════════════════════════

-- SELECT: Platform Admin + Partner على مشتركيهم + Tenant user على تينانته (مع فحص البراند)
CREATE POLICY qr_codes_select_policy ON qr_codes
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

-- INSERT: Platform Admin + Tenant Admin + أي مستخدم مصادق عليه ضمن نفس التينانت
CREATE POLICY qr_codes_insert_policy ON qr_codes
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

-- UPDATE: Platform Admin + Tenant Admin + مستخدم ضمن نفس التينانت (البراند)
CREATE POLICY qr_codes_update_policy ON qr_codes
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

-- DELETE: Platform Admin + Tenant Admin فقط
CREATE POLICY qr_codes_delete_policy ON qr_codes
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ══════════════════════════════════
-- QR SCANS — سياسات وفق النمط الرسمي
-- ══════════════════════════════════

-- SELECT: Platform Admin + Partner على مشتركيهم + Tenant user على تينانته
CREATE POLICY qr_scans_select_policy ON qr_scans
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

-- INSERT: أي مستخدم مصادق عليه ضمن نفس التينانت (لتسجيل عمليات المسح)
CREATE POLICY qr_scans_insert_policy ON qr_scans
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

-- UPDATE: لا يُعدّل سجل المسح (immutable log)
CREATE POLICY qr_scans_update_policy ON qr_scans
    FOR UPDATE USING (false);

-- DELETE: Platform Admin فقط (سجلات مسح لا تُحذف عادة)
CREATE POLICY qr_scans_delete_policy ON qr_scans
    FOR DELETE USING (is_platform_admin());

-- ════════════════════════════════════════════════════════════════
-- 🔧 دالة تحديث حالة الكيان عند المسح (Enhanced v3)
-- مع فحص البراند + التينانت + سجل prev_status
-- ════════════════════════════════════════════════════════════════
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
    -- 1. Verify user's tenant via the official helper
    v_user_tenant := get_user_tenant_id(p_user_id);
    
    IF v_user_tenant IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found or has no tenant'
        );
    END IF;

    -- 2. جلب بيانات الـ QR مع التحقق من عزل المستأجر
    SELECT * INTO v_qr_record 
    FROM qr_codes 
    WHERE code = p_qr_code 
      AND tenant_id = v_user_tenant
    LIMIT 1;
    
    IF v_qr_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'QR Code not found or access denied'
        );
    END IF;

    -- 3. حفظ الحالة السابقة
    v_prev_status := v_qr_record.current_status;

    -- 4. تحديث الحالة في جدول الـ QR
    UPDATE qr_codes 
    SET current_status = p_new_status,
        updated_at = NOW()
    WHERE id = v_qr_record.id;

    -- 5. تحديث الكيان الأصلي (Dynamic SQL) — مع التحقق من tenant_id
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

    -- 6. تسجيل العملية في السجل (مع الحالة السابقة)
    INSERT INTO qr_scans (
        qr_code_id, scanned_by_user_id, action_type, 
        prev_status, new_status, tenant_id
    )
    VALUES (
        v_qr_record.id, p_user_id, 'update_status', 
        v_prev_status, p_new_status, v_user_tenant
    );

    RETURN json_build_object(
        'success', true, 
        'prev_status', v_prev_status,
        'new_status', p_new_status,
        'entity_type', v_qr_record.entity_type,
        'entity_id', v_qr_record.entity_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحية للدالة
GRANT EXECUTE ON FUNCTION update_entity_status_on_scan(VARCHAR, VARCHAR, UUID) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 🔧 Trigger: تحديث updated_at تلقائياً في qr_codes
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER trg_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_codes_updated_at();
