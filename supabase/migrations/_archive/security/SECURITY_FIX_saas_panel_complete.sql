-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY FIX: إصلاح شامل لسياسات لوحة التحكم (SaaS Admin Panel)
-- تاريخ: 2026-02-03
-- الهدف: Super Admin يرى كل البيانات في لوحة الإدارة
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ جدول companies
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "company_isolation_select" ON companies;
DROP POLICY IF EXISTS "Companies are viewable by tenant members" ON companies;
DROP POLICY IF EXISTS "Users can view companies in their tenant" ON companies;
DROP POLICY IF EXISTS "company_select_own" ON companies;

-- إنشاء سياسة SELECT موحدة
CREATE POLICY "companies_select_policy" ON companies
    FOR SELECT USING (
        is_super_admin(auth.uid())  -- Super Admin يرى الكل
        OR tenant_id IN (  -- أو يرى شركات الـ tenant الخاص به
            SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- سياسات INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "company_isolation_insert" ON companies;
DROP POLICY IF EXISTS "company_isolation_update" ON companies;
DROP POLICY IF EXISTS "company_isolation_delete" ON companies;

CREATE POLICY "companies_insert_super_admin" ON companies
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "companies_update_super_admin" ON companies
    FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "companies_delete_super_admin" ON companies
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ جدول subscription_plans (الباقات)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "subscription_plans_select_policy" ON subscription_plans;
DROP POLICY IF EXISTS "plans_are_viewable_by_all" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;

-- الباقات متاحة للجميع للقراءة (عامة)
CREATE POLICY "subscription_plans_select_all" ON subscription_plans
    FOR SELECT USING (true);

-- التعديل Super Admin فقط
DROP POLICY IF EXISTS "subscription_plans_insert" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_update" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_delete" ON subscription_plans;

CREATE POLICY "subscription_plans_insert_admin" ON subscription_plans
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "subscription_plans_update_admin" ON subscription_plans
    FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "subscription_plans_delete_admin" ON subscription_plans
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ جدول tenant_subscriptions (اشتراكات المستأجرين)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "tenant_subscriptions_select_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "tenant_subscriptions_select_own" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Users can view their tenant subscriptions" ON tenant_subscriptions;

CREATE POLICY "tenant_subscriptions_select_policy" ON tenant_subscriptions
    FOR SELECT USING (
        is_super_admin(auth.uid())
        OR tenant_id IN (
            SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_subscriptions_insert" ON tenant_subscriptions;
DROP POLICY IF EXISTS "tenant_subscriptions_update" ON tenant_subscriptions;
DROP POLICY IF EXISTS "tenant_subscriptions_delete" ON tenant_subscriptions;

CREATE POLICY "tenant_subscriptions_insert_admin" ON tenant_subscriptions
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "tenant_subscriptions_update_admin" ON tenant_subscriptions
    FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "tenant_subscriptions_delete_admin" ON tenant_subscriptions
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ جدول agents (الوكلاء)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "agents_select_policy" ON agents;
DROP POLICY IF EXISTS "agents_select_own" ON agents;

CREATE POLICY "agents_select_policy" ON agents
    FOR SELECT USING (
        is_super_admin(auth.uid())
        OR user_id = auth.uid()  -- الوكيل يرى بياناته
    );

DROP POLICY IF EXISTS "agents_insert" ON agents;
DROP POLICY IF EXISTS "agents_update" ON agents;
DROP POLICY IF EXISTS "agents_delete" ON agents;

CREATE POLICY "agents_insert_admin" ON agents
    FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "agents_update_policy" ON agents
    FOR UPDATE USING (
        is_super_admin(auth.uid())
        OR user_id = auth.uid()  -- الوكيل يعدل بياناته
    );

CREATE POLICY "agents_delete_admin" ON agents
    FOR DELETE USING (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    tablename,
    COUNT(*) as policy_count,
    '✅ تم الإصلاح' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'companies', 'subscription_plans', 'tenant_subscriptions', 'agents')
GROUP BY tablename
ORDER BY tablename;
