-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ إصلاحات أمنية شاملة - Security Fixes
-- ═══════════════════════════════════════════════════════════════════════════
-- 📅 التاريخ: 3 فبراير 2026
-- 🚨 الخطورة: حرجة
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 🔴 إصلاح 1: tenant_users - الثغرة الأخطر
-- المشكلة: أي مستخدم يمكنه إضافة نفسه لأي tenant
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسة الخطيرة
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tenant_users;

-- إنشاء سياسات آمنة
CREATE POLICY "tenant_users_select_own" ON tenant_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tenant_users_insert_super_admin" ON tenant_users
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "tenant_users_update_super_admin" ON tenant_users
    FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "tenant_users_delete_super_admin" ON tenant_users
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 🟠 إصلاح 2: user_profiles - منع تغيير الحقول الحساسة
-- المشكلة: المستخدم يمكنه تغيير role, tenant_id, company_id
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- إنشاء سياسة محدودة (فقط الحقول الآمنة)
-- ملاحظة: PostgreSQL RLS لا يدعم تقييد الأعمدة مباشرة
-- الحل: استخدام trigger أو function

-- إنشاء trigger لحماية الحقول الحساسة
CREATE OR REPLACE FUNCTION protect_user_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- فقط Super Admin يمكنه تغيير هذه الحقول
    IF NOT is_super_admin(auth.uid()) THEN
        -- منع تغيير role
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            RAISE EXCEPTION 'Cannot change role field';
        END IF;
        
        -- منع تغيير tenant_id
        IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
            RAISE EXCEPTION 'Cannot change tenant_id field';
        END IF;
        
        -- منع تغيير company_id
        IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
            RAISE EXCEPTION 'Cannot change company_id field';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إزالة الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS protect_user_profile_trigger ON user_profiles;

-- إنشاء الـ trigger
CREATE TRIGGER protect_user_profile_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_user_profile_fields();

-- إعادة إنشاء سياسة UPDATE
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- 🟠 إصلاح 3: user_role_assignments - تقييد إدارة الأدوار
-- المشكلة: المستخدم يمكنه منح أدوار لنفسه
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can manage role assignments in their tenant" ON user_role_assignments;

-- سياسة القراءة: المستخدم يرى أدواره فقط
CREATE POLICY "user_role_assignments_select_own" ON user_role_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR is_super_admin(auth.uid())
    );

-- سياسة الإضافة: Super Admin فقط
CREATE POLICY "user_role_assignments_insert_admin" ON user_role_assignments
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- سياسة التعديل: Super Admin فقط
CREATE POLICY "user_role_assignments_update_admin" ON user_role_assignments
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- سياسة الحذف: Super Admin فقط
CREATE POLICY "user_role_assignments_delete_admin" ON user_role_assignments
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 🟠 إصلاح 4: user_roles - تقييد إنشاء الأدوار
-- المشكلة: المستخدم يمكنه إنشاء أدوار جديدة
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Users can manage roles in their tenant" ON user_roles;

-- سياسة القراءة: المستخدم يرى أدوار tenant الخاص به
CREATE POLICY "user_roles_select_tenant" ON user_roles
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- سياسة الإضافة: Super Admin فقط
CREATE POLICY "user_roles_insert_admin" ON user_roles
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- سياسة التعديل: Super Admin فقط
CREATE POLICY "user_roles_update_admin" ON user_roles
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- سياسة الحذف: Super Admin فقط
CREATE POLICY "user_roles_delete_admin" ON user_roles
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 🟡 إصلاح 5: roles - تقييد الوصول
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسات القديمة وإنشاء سياسات آمنة
DROP POLICY IF EXISTS "roles_tenant_isolation_insert" ON roles;

CREATE POLICY "roles_insert_super_admin" ON roles
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- ✅ التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    tablename,
    policyname,
    cmd,
    'تم الإصلاح' as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tenant_users', 'user_profiles', 'user_role_assignments', 'user_roles')
ORDER BY tablename, cmd;
