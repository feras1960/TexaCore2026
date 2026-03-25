-- =====================================================
-- CREATE_policies_lookup.sql
-- المرحلة 5.5: سياسات جداول Lookup
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- المجموعة هـ: جداول Lookup (Reference Data)
-- للقراءة من الجميع، التعديل لـ Platform Admin فقط
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- دالة مساعدة لإنشاء سياسات Lookup
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_lookup_rls_policies(p_table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- حذف السياسات القديمة
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_policy ON public.%I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I', p_table_name, p_table_name);

    -- تفعيل RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);

    -- السماح بالقراءة للجميع
    EXECUTE format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING (true)', p_table_name, p_table_name);
    
    -- التعديل لـ Platform Admin فقط
    EXECUTE format('CREATE POLICY %I_insert_policy ON public.%I FOR INSERT WITH CHECK (is_platform_admin())', p_table_name, p_table_name);
    EXECUTE format('CREATE POLICY %I_update_policy ON public.%I FOR UPDATE USING (is_platform_admin())', p_table_name, p_table_name);
    EXECUTE format('CREATE POLICY %I_delete_policy ON public.%I FOR DELETE USING (is_platform_admin())', p_table_name, p_table_name);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. countries (الدول)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'countries') THEN
        PERFORM public.create_lookup_rls_policies('countries');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. currencies (العملات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'currencies') THEN
        PERFORM public.create_lookup_rls_policies('currencies');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. account_types (أنواع الحسابات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_types') THEN
        PERFORM public.create_lookup_rls_policies('account_types');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. uom (وحدات القياس)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uom') THEN
        PERFORM public.create_lookup_rls_policies('uom');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. system_languages (لغات النظام)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_languages') THEN
        PERFORM public.create_lookup_rls_policies('system_languages');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. ui_tabs (ألسنة الواجهة)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ui_tabs') THEN
        PERFORM public.create_lookup_rls_policies('ui_tabs');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. status_groups (مجموعات الحالات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'status_groups') THEN
        ALTER TABLE public.status_groups ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS status_groups_select_policy ON public.status_groups;
        DROP POLICY IF EXISTS status_groups_insert_policy ON public.status_groups;
        DROP POLICY IF EXISTS status_groups_update_policy ON public.status_groups;
        DROP POLICY IF EXISTS status_groups_delete_policy ON public.status_groups;
        
        -- القراءة: حالات النظام + حالات المشترك
        CREATE POLICY status_groups_select_policy ON public.status_groups
            FOR SELECT USING (
                tenant_id IS NULL
                OR is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        -- الإضافة: Platform Admin أو Tenant Admin
        CREATE POLICY status_groups_insert_policy ON public.status_groups
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY status_groups_update_policy ON public.status_groups
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY status_groups_delete_policy ON public.status_groups
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id() AND is_system = false)
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. custom_statuses (الحالات المخصصة)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_statuses') THEN
        ALTER TABLE public.custom_statuses ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS custom_statuses_select_policy ON public.custom_statuses;
        DROP POLICY IF EXISTS custom_statuses_insert_policy ON public.custom_statuses;
        DROP POLICY IF EXISTS custom_statuses_update_policy ON public.custom_statuses;
        DROP POLICY IF EXISTS custom_statuses_delete_policy ON public.custom_statuses;
        
        CREATE POLICY custom_statuses_select_policy ON public.custom_statuses
            FOR SELECT USING (
                tenant_id IS NULL
                OR is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY custom_statuses_insert_policy ON public.custom_statuses
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY custom_statuses_update_policy ON public.custom_statuses
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY custom_statuses_delete_policy ON public.custom_statuses
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id() AND is_system = false)
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. status_transitions (انتقالات الحالات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'status_transitions') THEN
        ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS status_transitions_select_policy ON public.status_transitions;
        DROP POLICY IF EXISTS status_transitions_insert_policy ON public.status_transitions;
        DROP POLICY IF EXISTS status_transitions_update_policy ON public.status_transitions;
        DROP POLICY IF EXISTS status_transitions_delete_policy ON public.status_transitions;
        
        CREATE POLICY status_transitions_select_policy ON public.status_transitions
            FOR SELECT USING (
                tenant_id IS NULL
                OR is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY status_transitions_insert_policy ON public.status_transitions
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY status_transitions_update_policy ON public.status_transitions
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY status_transitions_delete_policy ON public.status_transitions
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. industry_types (أنواع الصناعات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'industry_types') THEN
        PERFORM public.create_lookup_rls_policies('industry_types');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. payment_methods (طرق الدفع)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
        PERFORM public.create_lookup_rls_policies('payment_methods');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 12. document_types (أنواع المستندات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_types') THEN
        PERFORM public.create_lookup_rls_policies('document_types');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 13. number_sequences (تسلسلات الأرقام) - خاص بكل شركة
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'number_sequences') THEN
        ALTER TABLE public.number_sequences ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS number_sequences_select_policy ON public.number_sequences;
        DROP POLICY IF EXISTS number_sequences_insert_policy ON public.number_sequences;
        DROP POLICY IF EXISTS number_sequences_update_policy ON public.number_sequences;
        DROP POLICY IF EXISTS number_sequences_delete_policy ON public.number_sequences;
        
        CREATE POLICY number_sequences_select_policy ON public.number_sequences
            FOR SELECT USING (
                is_platform_admin()
                OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY number_sequences_insert_policy ON public.number_sequences
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY number_sequences_update_policy ON public.number_sequences
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY number_sequences_delete_policy ON public.number_sequences
            FOR DELETE USING (
                is_platform_admin()
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 14. report_templates (قوالب التقارير)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'report_templates') THEN
        ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS report_templates_select_policy ON public.report_templates;
        DROP POLICY IF EXISTS report_templates_insert_policy ON public.report_templates;
        DROP POLICY IF EXISTS report_templates_update_policy ON public.report_templates;
        DROP POLICY IF EXISTS report_templates_delete_policy ON public.report_templates;
        
        -- القراءة: القوالب العامة + قوالب المشترك
        CREATE POLICY report_templates_select_policy ON public.report_templates
            FOR SELECT USING (
                is_public = true
                OR is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY report_templates_insert_policy ON public.report_templates
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY report_templates_update_policy ON public.report_templates
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY report_templates_delete_policy ON public.report_templates
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id() AND is_system = false)
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 15. print_templates (قوالب الطباعة)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'print_templates') THEN
        ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS print_templates_select_policy ON public.print_templates;
        DROP POLICY IF EXISTS print_templates_insert_policy ON public.print_templates;
        DROP POLICY IF EXISTS print_templates_update_policy ON public.print_templates;
        DROP POLICY IF EXISTS print_templates_delete_policy ON public.print_templates;
        
        CREATE POLICY print_templates_select_policy ON public.print_templates
            FOR SELECT USING (
                is_default = true
                OR is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY print_templates_insert_policy ON public.print_templates
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY print_templates_update_policy ON public.print_templates
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY print_templates_delete_policy ON public.print_templates
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id() AND is_default = false)
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- حذف الدالة المساعدة (اختياري)
-- ═══════════════════════════════════════════════════════════════
-- DROP FUNCTION IF EXISTS public.create_lookup_rls_policies(TEXT);

-- ═══════════════════════════════════════════════════════════════
-- التحقق
-- ═══════════════════════════════════════════════════════════════
SELECT 'تم إنشاء سياسات جداول Lookup بنجاح!' as result;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'countries',
    'currencies',
    'account_types',
    'uom',
    'system_languages',
    'ui_tabs',
    'status_groups',
    'custom_statuses',
    'status_transitions',
    'industry_types',
    'payment_methods',
    'document_types',
    'number_sequences',
    'report_templates',
    'print_templates'
)
ORDER BY tablename, cmd;
