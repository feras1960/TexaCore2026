-- =====================================================
-- FIX_fabric_groups_rls_v2.sql  
-- إصلاح سياسات RLS لـ fabric_groups - الإصدار المحسن
-- السبب: المستخدم قد لا يملك user_profile، مما يجعل get_user_tenant_id() يعيد NULL
-- الحل: الاعتماد على JWT metadata أيضًا كاحتياط
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. تحديث سياسات fabric_groups
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.fabric_groups ENABLE ROW LEVEL SECURITY;

-- حذف السياسات السابقة
DROP POLICY IF EXISTS "fabric_groups_select_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_insert_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_update_policy" ON public.fabric_groups;
DROP POLICY IF EXISTS "fabric_groups_delete_policy" ON public.fabric_groups;

-- دالة مساعدة لاستخراج tenant_id من JWT بأمان
-- هذه الدالة ستستخدم داخل السياسات فقط
CREATE OR REPLACE FUNCTION get_current_tenant_id_fallback()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    -- 1. المحاولة الأولى: من دالة النظام المعتمدة (user_profiles)
    get_user_tenant_id(),
    -- 2. المحاولة الثانية: من JWT user_metadata
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );
$$;

-- إنشاء السياسات الجديدة المرنة

CREATE POLICY fabric_groups_select_policy ON public.fabric_groups
    FOR SELECT USING (
        is_platform_admin()
        OR tenant_id = get_current_tenant_id_fallback()
    );

CREATE POLICY fabric_groups_insert_policy ON public.fabric_groups
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR tenant_id = get_current_tenant_id_fallback()
    );

CREATE POLICY fabric_groups_update_policy ON public.fabric_groups
    FOR UPDATE USING (
        is_platform_admin()
        OR tenant_id = get_current_tenant_id_fallback()
    );

CREATE POLICY fabric_groups_delete_policy ON public.fabric_groups
    FOR DELETE USING (
        is_platform_admin()
        OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin())
    );

-- ═══════════════════════════════════════════════════════════════
-- 2. تحديث سياسات warehouse_settings (بنفس المنطق المحسن)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warehouse_settings') THEN
        
        DROP POLICY IF EXISTS "warehouse_settings_select_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_insert_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_update_policy" ON public.warehouse_settings;
        DROP POLICY IF EXISTS "warehouse_settings_delete_policy" ON public.warehouse_settings;

        -- إذا كان الجدول يعتمد على tenant_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouse_settings' AND column_name = 'tenant_id') THEN
            CREATE POLICY warehouse_settings_select_policy ON public.warehouse_settings
                FOR SELECT USING (
                    is_platform_admin()
                    OR tenant_id = get_current_tenant_id_fallback()
                );
            CREATE POLICY warehouse_settings_insert_policy ON public.warehouse_settings
                FOR INSERT WITH CHECK (
                    is_platform_admin()
                    OR tenant_id = get_current_tenant_id_fallback()
                );
            CREATE POLICY warehouse_settings_update_policy ON public.warehouse_settings
                FOR UPDATE USING (
                    is_platform_admin()
                    OR tenant_id = get_current_tenant_id_fallback()
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

SELECT 'تم تحديث السياسات لتكون أكثر مرونة (JWT Fallback)' as result;
