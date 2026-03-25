-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY FIX: إصلاح سياسات tenants لـ Super Admin
-- تاريخ: 2026-02-03
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ حذف السياسات القديمة المتضاربة
DROP POLICY IF EXISTS "tenants_read_own" ON tenants;
DROP POLICY IF EXISTS "tenant_isolation_select" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Anyone can view default tenant" ON tenants;

-- 2️⃣ إنشاء سياسة SELECT موحدة
-- Super Admin يرى كل الـ tenants
-- المستخدم العادي يرى فقط الـ tenant الخاص به
CREATE POLICY "tenants_select_policy" ON tenants
    FOR SELECT USING (
        is_super_admin(auth.uid())  -- Super Admin يرى الكل
        OR id IN (  -- أو يرى الـ tenant المرتبط به
            SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
        )
        OR id IN (  -- أو يرى الـ tenants التي هو عضو فيها
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 3️⃣ سياسة INSERT - Super Admin فقط
DROP POLICY IF EXISTS "tenant_isolation_insert" ON tenants;
CREATE POLICY "tenants_insert_super_admin" ON tenants
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- 4️⃣ سياسة UPDATE - Super Admin فقط
DROP POLICY IF EXISTS "tenant_isolation_update" ON tenants;
CREATE POLICY "tenants_update_super_admin" ON tenants
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- 5️⃣ سياسة DELETE - Super Admin فقط
DROP POLICY IF EXISTS "tenant_isolation_delete" ON tenants;
CREATE POLICY "tenants_delete_super_admin" ON tenants
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق من الإصلاح
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    policyname,
    cmd,
    '✅ تم الإصلاح' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenants'
ORDER BY cmd;
