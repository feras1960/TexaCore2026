-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 12: إنشاء Super Admin System
-- STEP 12: Create Super Admin System
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء نظام Super Admin للدعم والمساعدة
-- ✅ Create Super Admin system for support and assistance

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء جدول roles
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ═══════════════════════════════════════════════════════════════
-- 2. إنشاء جدول user_roles
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. إدراج Super Admin Role
-- ═══════════════════════════════════════════════════════════════

INSERT INTO roles (code, name_ar, name_en, is_super_admin, is_system, permissions)
VALUES (
    'super_admin',
    'مدير النظام',
    'Super Admin',
    true,
    true,
    '{"all": true}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. Function للتحقق من Super Admin
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.is_super_admin = true
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 5. Function للحصول على Tenant ID للمستخدم
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- الحصول على tenant_id من user_profiles
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = p_user_id
    LIMIT 1;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 6. Function للحصول على Company ID للمستخدم
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_company_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- الحصول على company_id من user_profiles
    SELECT company_id INTO v_company_id
    FROM user_profiles
    WHERE id = p_user_id
    LIMIT 1;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 7. RLS Policy Template للـ Super Admin
-- ═══════════════════════════════════════════════════════════════

-- مثال: Policy للـ customers
-- يمكن تطبيقه على أي جدول

CREATE OR REPLACE FUNCTION create_super_admin_policy(
    p_table_name TEXT,
    p_policy_name TEXT DEFAULT 'super_admin_access'
)
RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- حذف Policy القديم إن وجد
    v_sql := format('DROP POLICY IF EXISTS %I ON %I', p_policy_name, p_table_name);
    EXECUTE v_sql;
    
    -- إنشاء Policy جديد
    v_sql := format('
        CREATE POLICY %I ON %I
        FOR ALL
        USING (
            is_super_admin(auth.uid())
            OR (
                tenant_id = get_user_tenant_id(auth.uid())
                AND company_id = get_user_company_id(auth.uid())
            )
        )
    ', p_policy_name, p_table_name);
    
    EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 8. Function لإحصائيات Super Admin
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_statistics()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tenants', (SELECT COUNT(*) FROM tenants),
        'active_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
        'total_companies', (SELECT COUNT(*) FROM companies),
        'total_customers', (SELECT COUNT(*) FROM customers),
        'total_sales', (
            SELECT COALESCE(SUM(total_amount), 0) 
            FROM sales_invoices 
            WHERE status = 'posted'
        ),
        'total_users', (SELECT COUNT(*) FROM user_profiles)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 9. RLS Policies
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles: Super Admin يرى كل شيء، الباقي يرى roles الخاصة بهم
CREATE POLICY "Super admin sees all roles" ON roles
    FOR SELECT
    USING (
        is_super_admin(auth.uid())
        OR tenant_id = get_user_tenant_id(auth.uid())
    );

-- User Roles: Super Admin يرى كل شيء، الباقي يرى roles الخاصة بهم
CREATE POLICY "Super admin sees all user roles" ON user_roles
    FOR SELECT
    USING (
        is_super_admin(auth.uid())
        OR tenant_id = get_user_tenant_id(auth.uid())
        OR user_id = auth.uid()
    );

-- ═══════════════════════════════════════════════════════════════
-- 10. الفهارس
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_super_admin ON roles(is_super_admin);

-- ✅ تم! الآن لديك Super Admin System جاهز
-- ✅ Done! Super Admin system is now ready
--
-- 📝 ملاحظة: لتعيين Super Admin لمستخدم:
-- 📝 Note: To assign Super Admin to a user:
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT auth.uid(), id FROM roles WHERE code = 'super_admin';
