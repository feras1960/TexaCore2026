# 🚀 دليل إعداد Supabase
# Supabase Setup Guide

---

## 📋 الخطوات المطلوبة

| الخطوة | الوصف | الوقت المقدر |
|--------|-------|-------------|
| 1 | تنفيذ Migration 00018 | 1 دقيقة |
| 2 | تنفيذ Migration 00020 | 1 دقيقة |
| 3 | تنفيذ Migration 00021 | 1 دقيقة |
| 4 | إنشاء Storage Bucket | 2 دقيقة |
| 5 | التحقق من النتائج | 1 دقيقة |

---

## الخطوة 1: فتح SQL Editor

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. من القائمة الجانبية، اضغط **SQL Editor**
4. اضغط **+ New Query**

---

## الخطوة 2: تنفيذ Migration 00018 (المستندات والاشتراكات)

> ⚠️ **هام:** نفذ هذا أولاً إذا لم تكن قد نفذته من قبل

انسخ الكود من:
```
supabase/migrations/00018_documents_and_subscriptions.sql
```

أو استخدم هذا الكود المختصر للتأكد من وجود الجداول الأساسية:

```sql
-- ════════════════════════════════════════════════════════════════
-- التحقق من وجود جداول المستندات والاشتراكات
-- ════════════════════════════════════════════════════════════════

-- جدول المستندات
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول حدود التخزين
CREATE TABLE IF NOT EXISTS storage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    max_storage_bytes BIGINT DEFAULT 5368709120, -- 5GB
    used_storage_bytes BIGINT DEFAULT 0,
    max_files_count INT DEFAULT 1000,
    current_files_count INT DEFAULT 0,
    max_file_size_bytes BIGINT DEFAULT 26214400, -- 25MB
    alert_threshold_percent INT DEFAULT 80,
    critical_threshold_percent INT DEFAULT 95,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تنبيهات الاشتراك
CREATE TABLE IF NOT EXISTS subscription_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    channels TEXT[] DEFAULT ARRAY['in_app'],
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    title VARCHAR(255),
    message TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة أعمدة للاشتراكات إذا لم تكن موجودة
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'grace_period_days') THEN
        ALTER TABLE subscriptions ADD COLUMN grace_period_days INT DEFAULT 7;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'locked_at') THEN
        ALTER TABLE subscriptions ADD COLUMN locked_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'lock_reason') THEN
        ALTER TABLE subscriptions ADD COLUMN lock_reason TEXT;
    END IF;
END $$;

-- تفعيل RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_alerts ENABLE ROW LEVEL SECURITY;

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_tenant ON subscription_alerts(tenant_id);

SELECT '✅ تم إنشاء جداول المستندات والاشتراكات' as status;
```

اضغط **Run** لتنفيذ الكود.

---

## الخطوة 3: تنفيذ Migration 00020 (الدوال الأساسية)

انسخ والصق هذا الكود في SQL Editor جديد:

```sql
-- ════════════════════════════════════════════════════════════════
-- Migration 00020: الدوال الأساسية للباك إند
-- ════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. الدالة الحرجة: get_current_tenant_id
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- المحاولة 1: من JWT metadata
    v_tenant_id := NULLIF(
        COALESCE(
            auth.jwt() -> 'user_metadata' ->> 'tenant_id',
            auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        ),
        ''
    )::UUID;
    
    IF v_tenant_id IS NOT NULL THEN
        RETURN v_tenant_id;
    END IF;
    
    -- المحاولة 2: من user_profiles
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM user_profiles
        WHERE id = v_user_id
        LIMIT 1;
        
        IF v_tenant_id IS NOT NULL THEN
            RETURN v_tenant_id;
        END IF;
    END IF;
    
    -- المحاولة 3: من companies
    IF v_user_id IS NOT NULL THEN
        SELECT c.tenant_id INTO v_tenant_id
        FROM companies c
        JOIN user_profiles up ON up.company_id = c.id
        WHERE up.id = v_user_id
        LIMIT 1;
    END IF;
    
    RETURN v_tenant_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- 2. دوال مساعدة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION belongs_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_tenant_id() = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := get_current_tenant_id();
    
    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT jsonb_build_object(
        'id', t.id,
        'code', t.code,
        'name', t.name,
        'status', t.status,
        'default_language', t.default_language,
        'settings', t.settings
    ) INTO v_result
    FROM tenants t
    WHERE t.id = v_tenant_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- 3. جدول Audit Logs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    entity_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    metadata JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    FOR SELECT USING (
        tenant_id = get_current_tenant_id()
        OR COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة تسجيل Audit
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_audit(
    p_action VARCHAR(50),
    p_entity_type VARCHAR(100),
    p_entity_id UUID DEFAULT NULL,
    p_entity_name VARCHAR(255) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_severity VARCHAR(20) DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_changes JSONB;
BEGIN
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT jsonb_object_agg(key, value)
        INTO v_changes
        FROM jsonb_each(p_new_values)
        WHERE p_old_values -> key IS DISTINCT FROM value;
    END IF;
    
    INSERT INTO audit_logs (
        tenant_id, user_id, action, entity_type, entity_id,
        entity_name, old_values, new_values, changes, metadata, severity
    ) VALUES (
        get_current_tenant_id(), auth.uid(), p_action, p_entity_type, p_entity_id,
        p_entity_name, p_old_values, p_new_values, v_changes, p_metadata, p_severity
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 5. دوال الاشتراك
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_subscription_access(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_subscription RECORD;
    v_days_remaining INT;
    v_access_level TEXT;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('access_level', 'denied', 'reason', 'no_tenant');
    END IF;
    
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('access_level', 'denied', 'reason', 'no_subscription');
    END IF;
    
    IF v_subscription.locked_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'access_level', 'locked',
            'reason', v_subscription.lock_reason,
            'locked_at', v_subscription.locked_at
        );
    END IF;
    
    v_days_remaining := GREATEST(0, 
        (v_subscription.current_period_end::date - CURRENT_DATE)
    );
    
    IF v_days_remaining <= 0 THEN
        v_access_level := 'expired';
    ELSIF v_days_remaining <= 3 THEN
        v_access_level := 'critical_warning';
    ELSIF v_days_remaining <= 7 THEN
        v_access_level := 'warning';
    ELSE
        v_access_level := 'full';
    END IF;
    
    RETURN jsonb_build_object(
        'access_level', v_access_level,
        'status', v_subscription.status,
        'days_remaining', v_days_remaining,
        'period_end', v_subscription.current_period_end,
        'plan_id', v_subscription.plan_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_tenant_statistics(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    SELECT jsonb_build_object(
        'companies', (SELECT COUNT(*) FROM companies WHERE tenant_id = v_tenant_id),
        'users', (SELECT COUNT(*) FROM user_profiles WHERE tenant_id = v_tenant_id),
        'customers', (SELECT COUNT(*) FROM customers WHERE tenant_id = v_tenant_id),
        'suppliers', (SELECT COUNT(*) FROM suppliers WHERE tenant_id = v_tenant_id),
        'products', (SELECT COUNT(*) FROM products WHERE tenant_id = v_tenant_id),
        'documents', (SELECT COUNT(*) FROM documents WHERE tenant_id = v_tenant_id)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- 6. RLS Policies للجداول الجديدة
-- ═══════════════════════════════════════════════════════════════

-- Documents
DROP POLICY IF EXISTS documents_tenant_select ON documents;
CREATE POLICY documents_tenant_select ON documents
    FOR SELECT USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS documents_tenant_insert ON documents;
CREATE POLICY documents_tenant_insert ON documents
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS documents_tenant_update ON documents;
CREATE POLICY documents_tenant_update ON documents
    FOR UPDATE USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS documents_tenant_delete ON documents;
CREATE POLICY documents_tenant_delete ON documents
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- Storage Quotas
DROP POLICY IF EXISTS storage_quotas_tenant_select ON storage_quotas;
CREATE POLICY storage_quotas_tenant_select ON storage_quotas
    FOR SELECT USING (tenant_id = get_current_tenant_id());

-- Subscription Alerts
DROP POLICY IF EXISTS subscription_alerts_tenant_select ON subscription_alerts;
CREATE POLICY subscription_alerts_tenant_select ON subscription_alerts
    FOR SELECT USING (tenant_id = get_current_tenant_id());

SELECT '✅ تم إنشاء الدوال الأساسية و RLS Policies' as status;
```

اضغط **Run** لتنفيذ الكود.

---

## الخطوة 4: إنشاء Storage Bucket

### من Dashboard:

1. اذهب إلى **Storage** من القائمة الجانبية
2. اضغط **New bucket**
3. أدخل:
   - **Name:** `documents`
   - **Public bucket:** ❌ (غير محدد)
4. اضغط **Create bucket**

### أو من SQL Editor:

```sql
-- إنشاء Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    26214400,
    ARRAY[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 26214400,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

SELECT '✅ تم إنشاء Storage Bucket' as status;
```

---

## الخطوة 5: إعداد Storage Policies

في **Storage** > **Policies** > اضغط **New Policy** على bucket `documents`:

### Policy 1: Upload (INSERT)

```sql
-- اسم: tenant_upload
-- العملية: INSERT
CREATE POLICY "tenant_upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
);
```

### Policy 2: Read (SELECT)

```sql
-- اسم: tenant_read
-- العملية: SELECT
CREATE POLICY "tenant_read" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
);
```

### Policy 3: Delete (DELETE)

```sql
-- اسم: tenant_delete
-- العملية: DELETE
CREATE POLICY "tenant_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
);
```

---

## الخطوة 6: التحقق من النجاح

نفذ هذا الكود للتأكد:

```sql
-- ═══════════════════════════════════════════════════════════════
-- التحقق من الإعداد
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 فحص الإعداد:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    -- التحقق من الدوال
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_tenant_id') THEN
        RAISE NOTICE '✅ get_current_tenant_id()';
    ELSE
        RAISE NOTICE '❌ get_current_tenant_id() - مفقودة!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_subscription_access') THEN
        RAISE NOTICE '✅ check_subscription_access()';
    ELSE
        RAISE NOTICE '❌ check_subscription_access() - مفقودة!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit') THEN
        RAISE NOTICE '✅ log_audit()';
    ELSE
        RAISE NOTICE '❌ log_audit() - مفقودة!';
    END IF;
    
    -- التحقق من الجداول
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        RAISE NOTICE '✅ جدول documents';
    ELSE
        RAISE NOTICE '❌ جدول documents - مفقود!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE NOTICE '✅ جدول audit_logs';
    ELSE
        RAISE NOTICE '❌ جدول audit_logs - مفقود!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_quotas') THEN
        RAISE NOTICE '✅ جدول storage_quotas';
    ELSE
        RAISE NOTICE '❌ جدول storage_quotas - مفقود!';
    END IF;
    
    -- التحقق من Storage Bucket
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
        RAISE NOTICE '✅ Storage Bucket: documents';
    ELSE
        RAISE NOTICE '❌ Storage Bucket: documents - مفقود!';
    END IF;
    
    -- عدد RLS Policies
    SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'public';
    RAISE NOTICE '📈 عدد RLS Policies: %', v_count;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل الفحص!';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;
```

---

## 🎉 مبروك!

إذا ظهرت جميع العلامات ✅، فإن الإعداد اكتمل بنجاح!

---

## ❓ استكشاف الأخطاء

### خطأ: "relation does not exist"
- تأكد من تنفيذ الـ migrations بالترتيب
- تأكد من وجود جداول `tenants`, `subscriptions`, `companies`

### خطأ: "permission denied"
- تأكد من استخدام حساب له صلاحيات كافية
- جرب من **SQL Editor** في Dashboard

### خطأ: "function already exists"
- هذا طبيعي - `CREATE OR REPLACE` يحدّث الدالة الموجودة

---

## 📞 الدعم

إذا واجهت أي مشكلة، تحقق من:
1. **Database Logs** في Supabase Dashboard
2. **Console** في المتصفح للتطبيق
