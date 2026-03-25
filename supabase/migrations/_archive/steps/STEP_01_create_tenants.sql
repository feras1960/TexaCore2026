-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: إنشاء جدول tenants (للمشتركين SaaS)
-- STEP 1: Create tenants table (for SaaS subscribers)
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables
-- 
-- 📝 ملاحظة: هذا الجدول يمثل المشتركين في النظام SaaS
-- 📝 Note: This table represents SaaS subscribers

-- إنشاء جدول tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_language VARCHAR(5) DEFAULT 'ar',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء tenant افتراضي للبيانات الموجودة (إن وجدت)
-- هذا للبيانات القديمة فقط - المشتركين الجدد سيتم إنشاؤهم بشكل منفصل
INSERT INTO tenants (code, name, email, status, default_language)
VALUES ('default', 'Default Tenant', 'default@erp.local', 'active', 'ar')
ON CONFLICT (code) DO NOTHING;

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- RLS Policy
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy: المستخدمون يروا tenant الخاص بهم فقط
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
CREATE POLICY "Users can view their tenant" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM companies 
            WHERE id IN (
                SELECT company_id FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- ✅ تم! الآن لديك جدول tenants جاهز
-- ✅ Done! You now have a tenants table ready
--
-- 📝 ملاحظة: عند تسجيل مشترك جديد، سيتم إنشاء tenant جديد
-- 📝 Note: When a new subscriber registers, a new tenant will be created
