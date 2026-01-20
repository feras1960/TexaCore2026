-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 15: إعداد Super Users ومجموعات الدعم الفني
-- STEP 15: Setup Super Users and Support Groups
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ ملاحظة: يجب إنشاء المستخدمين في Supabase Auth أولاً
-- ⚠️ Note: Users must be created in Supabase Auth first

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء Roles للدعم الفني
-- ═══════════════════════════════════════════════════════════════

-- Super Admin Role (موجود مسبقاً)
-- Support Role (دعم فني)
INSERT INTO roles (code, name_ar, name_en, is_super_admin, is_system, permissions)
VALUES 
    (
        'support',
        'دعم فني',
        'Support',
        false,
        true,
        '{
            "view_customers": true,
            "view_orders": true,
            "view_invoices": true,
            "view_products": false,
            "view_accounting": false,
            "edit_limited": true
        }'::jsonb
    ),
    (
        'support_senior',
        'دعم فني أول',
        'Senior Support',
        false,
        true,
        '{
            "view_customers": true,
            "view_orders": true,
            "view_invoices": true,
            "view_products": true,
            "view_accounting": false,
            "edit_limited": true,
            "view_all_tenants": true
        }'::jsonb
    )
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. Function لإعداد Super User بعد إنشائه في Auth
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_super_user_by_email(p_user_email VARCHAR(200))
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_result JSONB;
BEGIN
    -- البحث عن المستخدم بالبريد الإلكتروني
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود في Auth. يرجى إنشاء المستخدم أولاً من Supabase Dashboard',
            'email', p_user_email
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- الحصول على Super Admin Role
    SELECT id INTO v_role_id
    FROM roles
    WHERE code = 'super_admin'
    LIMIT 1;
    
    IF v_role_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'Super Admin Role غير موجود. يرجى تطبيق STEP_12 أولاً'
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- ربط المستخدم بالـ Role
    INSERT INTO user_roles (user_id, role_id, is_active)
    VALUES (v_user_id, v_role_id, true)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET is_active = true;
    
    -- إرجاع النتيجة
    SELECT jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_user_email,
        'role', 'super_admin',
        'message', 'تم تعيين Super Admin بنجاح'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 3. Function لإعداد Support User
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_support_user(
    p_user_email VARCHAR(200),
    p_support_level VARCHAR(20) DEFAULT 'support'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_role_code VARCHAR(50);
    v_result JSONB;
BEGIN
    -- تحديد Role Code
    IF p_support_level = 'senior' THEN
        v_role_code := 'support_senior';
    ELSE
        v_role_code := 'support';
    END IF;
    
    -- البحث عن المستخدم
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود في Auth',
            'email', p_user_email
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- الحصول على Support Role
    SELECT id INTO v_role_id
    FROM roles
    WHERE code = v_role_code
    LIMIT 1;
    
    IF v_role_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'Support Role غير موجود'
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- ربط المستخدم بالـ Role
    INSERT INTO user_roles (user_id, role_id, is_active)
    VALUES (v_user_id, v_role_id, true)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET is_active = true;
    
    -- إرجاع النتيجة
    SELECT jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_user_email,
        'role', v_role_code,
        'message', 'تم تعيين Support User بنجاح'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 4. محاولة إعداد Super Users (بعد إنشائهم في Auth)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_result JSONB;
    v_emails TEXT[] := ARRAY[
        'feras1960@gmail.com',
        'nextrev360@gmail.com'
    ];
    v_email TEXT;
BEGIN
    FOR v_email IN SELECT unnest(v_emails) LOOP
        SELECT setup_super_user_by_email(v_email) INTO v_result;
        
        IF (v_result->>'success')::boolean THEN
            RAISE NOTICE '✅ تم إعداد Super User: %', v_email;
        ELSE
            RAISE WARNING '⚠️ %: %', v_email, v_result->>'error';
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS Policies للدعم الفني
-- ═══════════════════════════════════════════════════════════════

-- Policy للـ customers (الدعم الفني يرى بيانات محددة)
CREATE OR REPLACE FUNCTION create_support_policy_for_table(p_table_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- حذف Policy القديم
    v_sql := format('DROP POLICY IF EXISTS support_access ON %I', p_table_name);
    EXECUTE v_sql;
    
    -- إنشاء Policy جديد
    v_sql := format('
        CREATE POLICY support_access ON %I
        FOR SELECT
        USING (
            -- Super Admin يرى كل شيء
            is_super_admin(auth.uid())
            OR
            -- Support Senior يرى جميع Tenants
            (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                      AND r.code = ''support_senior''
                      AND ur.is_active = true
                )
            )
            OR
            -- Support العادي يرى بيانات محددة فقط
            (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                      AND r.code = ''support''
                      AND ur.is_active = true
                )
                AND tenant_id IN (
                    SELECT tenant_id FROM tenants WHERE status = ''active''
                )
            )
            OR
            -- المستخدم العادي يرى بياناته فقط
            (
                tenant_id = get_user_tenant_id(auth.uid())
                AND company_id = get_user_company_id(auth.uid())
            )
        )
    ', p_table_name);
    
    EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- تطبيق Policies على الجداول الرئيسية
SELECT create_support_policy_for_table('customers');
SELECT create_support_policy_for_table('sales_invoices');
SELECT create_support_policy_for_table('sales_orders');
SELECT create_support_policy_for_table('products');

-- ═══════════════════════════════════════════════════════════════
-- 6. Function للتحقق من صلاحيات المستخدم
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
    v_permissions JSONB;
    v_roles JSONB;
BEGIN
    -- الحصول على Roles والصلاحيات
    SELECT jsonb_agg(
        jsonb_build_object(
            'role_code', r.code,
            'role_name', r.name_ar,
            'is_super_admin', r.is_super_admin,
            'permissions', r.permissions
        )
    ) INTO v_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true;
    
    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'is_super_admin', is_super_admin(p_user_id),
        'roles', COALESCE(v_roles, '[]'::jsonb)
    ) INTO v_permissions;
    
    RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 7. Function لإضافة مستخدم جديد (لـ Super Admin)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_user_by_super_admin(
    p_user_email VARCHAR(200),
    p_user_name VARCHAR(200),
    p_role_code VARCHAR(50),
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_result JSONB;
BEGIN
    -- التحقق من أن المستخدم الحالي Super Admin
    IF NOT is_super_admin(auth.uid()) THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'غير مصرح - يجب أن تكون Super Admin'
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- البحث عن المستخدم في Auth
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود في Auth. يرجى إنشاء المستخدم أولاً'
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- الحصول على Role
    SELECT id INTO v_role_id
    FROM roles
    WHERE code = p_role_code
    LIMIT 1;
    
    IF v_role_id IS NULL THEN
        SELECT jsonb_build_object(
            'success', false,
            'error', 'Role غير موجود: ' || p_role_code
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- ربط المستخدم بالـ Role
    INSERT INTO user_roles (user_id, role_id, tenant_id, is_active)
    VALUES (v_user_id, v_role_id, p_tenant_id, true)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET is_active = true, tenant_id = p_tenant_id;
    
    -- إرجاع النتيجة
    SELECT jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_user_email,
        'role', p_role_code,
        'message', 'تم إضافة المستخدم بنجاح'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ تم! الآن لديك نظام Super Users و Support جاهز
-- ✅ Done! Super Users and Support system is ready
--
-- 📝 ملاحظة: يجب إنشاء المستخدمين في Supabase Auth أولاً
-- 📝 Note: Users must be created in Supabase Auth first
