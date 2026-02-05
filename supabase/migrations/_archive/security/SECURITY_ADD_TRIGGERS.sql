-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 إضافة Triggers الحماية للحقول الحساسة
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ دالة حماية الحقول الحساسة في user_profiles
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_sensitive_user_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- السماح لـ Super Admin فقط بتغيير هذه الحقول
    IF NOT COALESCE(
        (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()), 
        false
    ) THEN
        -- منع تغيير is_super_admin
        IF OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin THEN
            RAISE EXCEPTION 'غير مسموح بتغيير حقل is_super_admin';
        END IF;
        
        -- منع تغيير tenant_id
        IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
            RAISE EXCEPTION 'غير مسموح بتغيير حقل tenant_id';
        END IF;
        
        -- منع تغيير brand_id
        IF OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
            RAISE EXCEPTION 'غير مسموح بتغيير حقل brand_id';
        END IF;
        
        -- منع تغيير company_id
        IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
            RAISE EXCEPTION 'غير مسموح بتغيير حقل company_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ تطبيق Trigger على user_profiles
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS protect_user_profiles_sensitive ON user_profiles;

CREATE TRIGGER protect_user_profiles_sensitive
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_sensitive_user_fields();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ حماية user_role_assignments
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_role_assignments()
RETURNS TRIGGER AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_is_tenant_admin BOOLEAN;
BEGIN
    -- التحقق من صلاحيات المستخدم الحالي
    SELECT 
        COALESCE(is_super_admin, false),
        COALESCE(is_tenant_admin, false)
    INTO v_is_super_admin, v_is_tenant_admin
    FROM user_profiles 
    WHERE id = auth.uid();
    
    -- فقط Super Admin أو Tenant Admin يمكنهم تعديل الأدوار
    IF NOT (v_is_super_admin OR v_is_tenant_admin) THEN
        RAISE EXCEPTION 'غير مسموح بتعديل صلاحيات المستخدمين';
    END IF;
    
    -- منع المستخدم من تعديل صلاحياته الخاصة
    IF NEW.user_id = auth.uid() AND NOT v_is_super_admin THEN
        RAISE EXCEPTION 'لا يمكنك تعديل صلاحياتك الخاصة';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_role_assignments_trigger ON user_role_assignments;

CREATE TRIGGER protect_role_assignments_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON user_role_assignments
    FOR EACH ROW
    EXECUTE FUNCTION protect_role_assignments();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ حماية جدول tenants
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_tenant_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- فقط Super Admin يمكنه تعديل الـ tenants
    IF NOT COALESCE(
        (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()), 
        false
    ) THEN
        -- منع تغيير brand_id
        IF TG_OP = 'UPDATE' AND OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
            RAISE EXCEPTION 'غير مسموح بتغيير العلامة التجارية للمستأجر';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_tenant_sensitive ON tenants;

CREATE TRIGGER protect_tenant_sensitive
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION protect_tenant_fields();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ حماية جدول companies
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_company_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- منع تغيير tenant_id
    IF TG_OP = 'UPDATE' THEN
        IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
            -- فقط Super Admin
            IF NOT COALESCE(
                (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()), 
                false
            ) THEN
                RAISE EXCEPTION 'غير مسموح بنقل الشركة لمستأجر آخر';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_company_sensitive ON companies;

CREATE TRIGGER protect_company_sensitive
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION protect_company_fields();

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ التحقق من التطبيق
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ PROTECTION TRIGGERS CREATED' as status,
    tgname as "Trigger",
    tgrelid::regclass as "الجدول"
FROM pg_trigger 
WHERE tgname IN (
    'protect_user_profiles_sensitive',
    'protect_role_assignments_trigger',
    'protect_tenant_sensitive',
    'protect_company_sensitive'
);
