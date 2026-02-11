-- ════════════════════════════════════════════════════════════════
-- 🚀 CRM Contacts Module — جداول جهات الاتصال
-- 
-- 1. contacts — جهات الاتصال (Leads/Prospects)
-- 2. contact_interactions — سجل التفاعلات
-- 3. ربط call_logs بجهات الاتصال
--
-- ✅ v1.0 — متوافق مع نظام العزل الرسمي:
--     - Brand → Tenant → Company hierarchy
--     - Uses get_user_tenant_id(), is_platform_admin(), etc.
--     - Policy naming: tablename_operation_policy
-- ════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ جدول جهات الاتصال (Contacts / Leads)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- المعلومات الأساسية — 9 لغات (نفس نمط chart_of_accounts, fabric_groups)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    name_ar VARCHAR(200),       -- العربية
    name_en VARCHAR(200),       -- English
    name_ru VARCHAR(200),       -- Русский
    name_uk VARCHAR(200),       -- Українська
    name_ro VARCHAR(200),       -- Română
    name_pl VARCHAR(200),       -- Polski
    name_tr VARCHAR(200),       -- Türkçe
    name_de VARCHAR(200),       -- Deutsch
    name_it VARCHAR(200),       -- Italiano
    display_name VARCHAR(200),  -- الاسم المعروض (fallback)
    
    -- الشركة/المنظمة
    organization VARCHAR(200),
    job_title VARCHAR(100),
    
    -- معلومات الاتصال
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    whatsapp VARCHAR(50),
    telegram_username VARCHAR(100),
    telegram_chat_id BIGINT,
    
    -- العنوان
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    
    -- التصنيف — من أين جاء العميل المحتمل؟
    source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (
        source IN (
            'phone_inbound', 'phone_outbound', 
            'google_ads', 'facebook_ads', 'instagram_ads',
            'website', 'telegram', 'online_store',
            'referral', 'walk_in', 'exhibition', 
            'whatsapp', 'email_campaign', 'manual'
        )
    ),
    source_details JSONB DEFAULT '{}'::jsonb,  -- تفاصيل المصدر (campaign_id, ad_id, etc.)
    
    -- نوع جهة الاتصال
    contact_type VARCHAR(30) DEFAULT 'lead' CHECK (
        contact_type IN ('lead', 'prospect', 'wholesale_lead', 'retail_lead', 
                         'partner_lead', 'existing_contact')
    ),
    
    -- مرحلة دورة الحياة
    lifecycle_stage VARCHAR(30) DEFAULT 'new' CHECK (
        lifecycle_stage IN ('new', 'contacted', 'interested', 'qualified', 
                           'negotiation', 'converted', 'lost', 'archived')
    ),
    lost_reason VARCHAR(200),  -- سبب الخسارة (إن وُجد)
    
    -- التقييم والأولوية
    priority VARCHAR(10) DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    ),
    lead_score INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    
    -- المسؤول عن المتابعة
    assigned_to UUID REFERENCES user_profiles(id),
    
    -- التحويل — ربط بالعميل بعد التحويل
    converted_customer_id UUID REFERENCES customers(id),
    converted_at TIMESTAMPTZ,
    converted_by UUID REFERENCES user_profiles(id),
    
    -- التتبع
    last_interaction_at TIMESTAMPTZ,
    last_interaction_type VARCHAR(50),  -- 'call', 'email', 'meeting', 'note'
    interaction_count INT DEFAULT 0,
    last_call_at TIMESTAMPTZ,  -- آخر مكالمة
    total_calls INT DEFAULT 0,
    
    -- البيانات الإضافية
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    avatar_url TEXT,
    
    -- النظام
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'inactive', 'converted', 'archived', 'blacklisted')
    ),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ سجل التفاعلات (Contact Interactions / Activity Log)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- نوع التفاعل
    interaction_type VARCHAR(30) NOT NULL CHECK (
        interaction_type IN (
            'call', 'email', 'meeting', 'note', 'sms', 
            'whatsapp', 'telegram', 'visit', 'task',
            'status_change', 'assignment_change'
        )
    ),
    
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    
    -- المحتوى
    subject VARCHAR(200),
    content TEXT,
    
    -- ربط بسجل المكالمات (إن كان التفاعل مكالمة)
    call_log_id UUID REFERENCES call_logs(id),
    
    -- المدة والنتيجة
    duration_seconds INT,
    outcome VARCHAR(50) CHECK (
        outcome IN ('answered', 'missed', 'voicemail', 'busy', 
                    'callback_requested', 'successful', 'follow_up_needed',
                    'no_answer', 'completed', NULL)
    ),
    
    -- المواعيد (للمهام والاجتماعات)
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    
    -- البيانات الإضافية
    metadata JSONB DEFAULT '{}'::jsonb,  -- بيانات مرنة
    
    -- المسؤول
    performed_by UUID REFERENCES user_profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ ربط المكالمات بجهات الاتصال (إضافة أعمدة لـ call_logs)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notes TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 🔑 الفهارس (Performance Indexes)
-- ═══════════════════════════════════════════════════════════════

-- contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_mobile ON contacts(mobile) WHERE mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle ON contacts(tenant_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contacts_telegram ON contacts(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_converted ON contacts(converted_customer_id) WHERE converted_customer_id IS NOT NULL;

-- contact_interactions indexes
CREATE INDEX IF NOT EXISTS idx_contact_interactions_tenant ON contact_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_type ON contact_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_call ON contact_interactions(call_log_id) WHERE call_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_interactions_created ON contact_interactions(created_at DESC);

-- call_logs → contact link
CREATE INDEX IF NOT EXISTS idx_call_logs_contact ON call_logs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON call_logs(customer_id) WHERE customer_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 🛡️ سياسات الأمان (RLS) — النمط الرسمي
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

-- ═══════════════ CONTACTS ═══════════════

DROP POLICY IF EXISTS contacts_select_policy ON contacts;
CREATE POLICY contacts_select_policy ON contacts
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

DROP POLICY IF EXISTS contacts_insert_policy ON contacts;
CREATE POLICY contacts_insert_policy ON contacts
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

DROP POLICY IF EXISTS contacts_update_policy ON contacts;
CREATE POLICY contacts_update_policy ON contacts
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

DROP POLICY IF EXISTS contacts_delete_policy ON contacts;
CREATE POLICY contacts_delete_policy ON contacts
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ═══════════════ CONTACT INTERACTIONS ═══════════════

DROP POLICY IF EXISTS contact_interactions_select_policy ON contact_interactions;
CREATE POLICY contact_interactions_select_policy ON contact_interactions
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

DROP POLICY IF EXISTS contact_interactions_insert_policy ON contact_interactions;
CREATE POLICY contact_interactions_insert_policy ON contact_interactions
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

DROP POLICY IF EXISTS contact_interactions_update_policy ON contact_interactions;
CREATE POLICY contact_interactions_update_policy ON contact_interactions
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

DROP POLICY IF EXISTS contact_interactions_delete_policy ON contact_interactions;
CREATE POLICY contact_interactions_delete_policy ON contact_interactions
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- 🔧 Trigger: تحديث updated_at تلقائياً
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 🔧 Trigger: تحديث إحصائيات التفاعل تلقائياً
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_contact_interaction_stats()
RETURNS trigger AS $$
BEGIN
    UPDATE contacts SET 
        last_interaction_at = NEW.created_at,
        last_interaction_type = NEW.interaction_type,
        interaction_count = interaction_count + 1,
        -- تحديث إحصائيات المكالمات تحديداً
        last_call_at = CASE WHEN NEW.interaction_type = 'call' THEN NEW.created_at ELSE last_call_at END,
        total_calls = CASE WHEN NEW.interaction_type = 'call' THEN total_calls + 1 ELSE total_calls END
    WHERE id = NEW.contact_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_interaction_stats ON contact_interactions;
CREATE TRIGGER trg_contact_interaction_stats
    AFTER INSERT ON contact_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_interaction_stats();

-- ═══════════════════════════════════════════════════════════════
-- 🔧 دالة ربط المكالمة تلقائياً بجهة اتصال (Auto-link)
-- عند إدخال مكالمة جديدة، يبحث عن جهة اتصال بنفس الرقم
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_link_call_to_contact()
RETURNS trigger AS $$
DECLARE
    v_contact_id UUID;
    v_customer_id UUID;
    v_phone VARCHAR;
BEGIN
    -- تحديد الرقم المعني (الطرف الآخر)
    v_phone := CASE 
        WHEN NEW.direction = 'inbound' THEN NEW.caller_number 
        ELSE NEW.receiver_number 
    END;
    
    IF v_phone IS NULL THEN RETURN NEW; END IF;
    
    -- البحث في جهات الاتصال أولاً
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE tenant_id = NEW.tenant_id
      AND (phone = v_phone OR mobile = v_phone)
      AND status != 'archived'
    LIMIT 1;
    
    -- البحث في العملاء
    SELECT id INTO v_customer_id
    FROM customers
    WHERE tenant_id = NEW.tenant_id
      AND (phone = v_phone OR mobile = v_phone)
    LIMIT 1;
    
    -- تحديث المكالمة
    NEW.contact_id := v_contact_id;
    NEW.customer_id := v_customer_id;
    
    -- تسجيل التفاعل في جهة الاتصال (إن وُجدت)
    IF v_contact_id IS NOT NULL THEN
        INSERT INTO contact_interactions (
            tenant_id, contact_id, interaction_type, direction,
            subject, call_log_id, duration_seconds, outcome, performed_by
        ) VALUES (
            NEW.tenant_id, v_contact_id, 'call', NEW.direction,
            CASE NEW.direction 
                WHEN 'inbound' THEN 'Inbound Call'
                ELSE 'Outbound Call'
            END,
            NEW.id, NEW.duration, NEW.status, NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_link_call ON call_logs;
CREATE TRIGGER trg_auto_link_call
    BEFORE INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_link_call_to_contact();

-- ═══════════════════════════════════════════════════════════════
-- 🔧 دالة تحويل جهة اتصال إلى عميل (Convert to Customer)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION convert_contact_to_customer(
    p_contact_id UUID,
    p_customer_code VARCHAR DEFAULT NULL,
    p_customer_type VARCHAR DEFAULT 'individual',
    p_receivable_account_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_contact RECORD;
    v_customer_id UUID;
    v_user_tenant UUID;
    v_code VARCHAR;
BEGIN
    v_user_tenant := get_user_tenant_id();
    
    IF v_user_tenant IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User has no tenant');
    END IF;
    
    -- جلب بيانات جهة الاتصال
    SELECT * INTO v_contact FROM contacts
    WHERE id = p_contact_id AND tenant_id = v_user_tenant;
    
    IF v_contact.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Contact not found');
    END IF;
    
    IF v_contact.converted_customer_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Already converted', 
                                 'customer_id', v_contact.converted_customer_id);
    END IF;
    
    -- إنشاء كود تلقائي إن لم يُحدد
    v_code := COALESCE(p_customer_code, 'CUST-' || LPAD(
        (SELECT COALESCE(MAX(CAST(REPLACE(code, 'CUST-', '') AS INT)), 0) + 1 
         FROM customers WHERE tenant_id = v_user_tenant)::TEXT, 5, '0'
    ));
    
    -- إنشاء العميل (نقل الأسماء بنفس النمط)
    INSERT INTO customers (
        tenant_id, company_id, code, customer_type,
        name_ar, name_en, company_name,
        email, phone, mobile, whatsapp,
        country, city, address,
        telegram_username, telegram_chat_id,
        receivable_account_id,
        status, created_by, notes
    ) VALUES (
        v_user_tenant, v_contact.company_id, v_code, p_customer_type,
        COALESCE(v_contact.name_ar, COALESCE(v_contact.first_name, '') || ' ' || COALESCE(v_contact.last_name, '')),
        COALESCE(v_contact.name_en, v_contact.display_name, COALESCE(v_contact.first_name, '') || ' ' || COALESCE(v_contact.last_name, '')),
        v_contact.organization,
        v_contact.email, v_contact.phone, v_contact.mobile, v_contact.whatsapp,
        v_contact.country, v_contact.city, v_contact.address,
        v_contact.telegram_username, v_contact.telegram_chat_id,
        p_receivable_account_id,
        'active', auth.uid(), v_contact.notes
    )
    RETURNING id INTO v_customer_id;
    
    -- تحديث جهة الاتصال
    UPDATE contacts SET
        converted_customer_id = v_customer_id,
        converted_at = NOW(),
        converted_by = auth.uid(),
        lifecycle_stage = 'converted',
        status = 'converted'
    WHERE id = p_contact_id;
    
    -- إضافة تفاعل التحويل
    INSERT INTO contact_interactions (
        tenant_id, contact_id, interaction_type, subject, content, performed_by
    ) VALUES (
        v_user_tenant, p_contact_id, 'status_change', 
        'Converted to Customer',
        'Contact converted to customer with code: ' || v_code,
        auth.uid()
    );
    
    -- ربط المكالمات القديمة بالعميل الجديد
    UPDATE call_logs SET customer_id = v_customer_id
    WHERE contact_id = p_contact_id AND customer_id IS NULL;
    
    RETURN json_build_object(
        'success', true,
        'customer_id', v_customer_id,
        'customer_code', v_code,
        'message', 'Contact converted to customer successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION convert_contact_to_customer(UUID, VARCHAR, VARCHAR, UUID) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════
-- 🧪 التحقق
-- ═══════════════════════════════════════════════════════════════
WITH checks AS (
    SELECT 'contacts' as tbl, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts' AND table_schema = 'public') as ok
    UNION ALL
    SELECT 'contact_interactions', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_interactions' AND table_schema = 'public')
    UNION ALL
    SELECT 'call_logs.contact_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'contact_id')
    UNION ALL
    SELECT 'RLS contacts', (SELECT relrowsecurity FROM pg_class WHERE relname = 'contacts')
    UNION ALL
    SELECT 'RLS interactions', (SELECT relrowsecurity FROM pg_class WHERE relname = 'contact_interactions')
)
SELECT 
    tbl as item,
    CASE WHEN ok THEN '✅' ELSE '❌' END as status
FROM checks;

-- فحص عدد السياسات
SELECT 
    tablename,
    COUNT(*) as policy_count,
    CASE WHEN COUNT(*) = 4 THEN '✅ Complete' ELSE '⚠️ ' || COUNT(*)::text || '/4' END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('contacts', 'contact_interactions')
GROUP BY tablename
ORDER BY tablename;
