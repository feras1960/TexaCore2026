-- =====================================================
-- FIX_fabric_groups_rls.sql  
-- إصلاح سياسات RLS المفقودة لـ fabric_groups و warehouse_settings
-- تاريخ: 2026-02-07
-- =====================================================
-- 
-- المشكلة: بعد إعادة هيكلة RLS في 2026-02-05
-- لم يتم إدراج fabric_groups في أي من سكربتات السياسات
-- مما يمنع SELECT/INSERT/UPDATE/DELETE
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. fabric_groups - سياسات بسيطة tenant_id
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.fabric_groups ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.fabric_groups;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.fabric_groups;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.fabric_groups;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.fabric_groups;
DROP POLICY IF EXISTS "Enable all for authenticated - fabric_groups" ON public.fabric_groups;
DROP POLICY IF EXISTS "Enable all - fabric_groups" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_select_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_insert_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_update_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_delete_policy" ON public.fabric_groups;

-- إنشاء سياسات جديدة
-- ملاحظة: نستخدم tenant_id = get_user_tenant_id() بدون is_same_brand
-- لأن البراند قد لا يكون مُعداً بعد

CREATE POLICY fabric_groups_select_policy ON public.fabric_groups
    FOR SELECT USING (
        is_platform_admin()
        OR tenant_id = get_user_tenant_id()
    );

CREATE POLICY fabric_groups_insert_policy ON public.fabric_groups
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR tenant_id = get_user_tenant_id()
    );

CREATE POLICY fabric_groups_update_policy ON public.fabric_groups
    FOR UPDATE USING (
        is_platform_admin()
        OR tenant_id = get_user_tenant_id()
    );

CREATE POLICY fabric_groups_delete_policy ON public.fabric_groups
    FOR DELETE USING (
        is_platform_admin()
        OR (tenant_id = get_user_tenant_id() AND is_tenant_admin())
    );

-- ═══════════════════════════════════════════════════════════════
-- 2. warehouse_settings - إصلاح (إذا كانت موجودة)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warehouse_settings') THEN
        ALTER TABLE public.warehouse_settings ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "warehouse_settings_select_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_insert_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_update_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_delete_policy" ON public.warehouse_settings;

        -- تحقق: هل الجدول يحتوي tenant_id أو company_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouse_settings' AND column_name = 'company_id') THEN
            CREATE POLICY warehouse_settings_select_policy ON public.warehouse_settings
                FOR SELECT USING (
                    is_platform_admin()
                    OR can_access_company(company_id)
                );
            CREATE POLICY warehouse_settings_insert_policy ON public.warehouse_settings
                FOR INSERT WITH CHECK (
                    is_platform_admin()
                    OR can_access_company(company_id)
                );
            CREATE POLICY warehouse_settings_update_policy ON public.warehouse_settings
                FOR UPDATE USING (
                    is_platform_admin()
                    OR can_access_company(company_id)
                );
            CREATE POLICY warehouse_settings_delete_policy ON public.warehouse_settings
                FOR DELETE USING (
                    is_platform_admin()
                );
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouse_settings' AND column_name = 'tenant_id') THEN
            CREATE POLICY warehouse_settings_select_policy ON public.warehouse_settings
                FOR SELECT USING (
                    is_platform_admin()
                    OR tenant_id = get_user_tenant_id()
                );
            CREATE POLICY warehouse_settings_insert_policy ON public.warehouse_settings
                FOR INSERT WITH CHECK (
                    is_platform_admin()
                    OR tenant_id = get_user_tenant_id()
                );
            CREATE POLICY warehouse_settings_update_policy ON public.warehouse_settings
                FOR UPDATE USING (
                    is_platform_admin()
                    OR tenant_id = get_user_tenant_id()
                );
            CREATE POLICY warehouse_settings_delete_policy ON public.warehouse_settings
                FOR DELETE USING (
                    is_platform_admin()
                );
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق
-- ═══════════════════════════════════════════════════════════════

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('fabric_groups', 'warehouse_settings')
ORDER BY tablename, cmd;
