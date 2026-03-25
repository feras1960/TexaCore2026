-- =====================================================
-- APPLY_all_policies.sql
-- تطبيق السياسات على كل الجداول
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: التأكد من وجود الدوال المساعدة
-- ═══════════════════════════════════════════════════════════════

-- دالة إنشاء سياسات الشركة
CREATE OR REPLACE FUNCTION create_company_rls_policies(
    p_table_name TEXT,
    p_has_tenant_id BOOLEAN DEFAULT true,
    p_has_company_id BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_policy_exists BOOLEAN;
BEGIN
    -- تفعيل RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- حذف السياسات القديمة إن وجدت
    BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table_name || '_select_policy', p_table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table_name || '_insert_policy', p_table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table_name || '_update_policy', p_table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table_name || '_delete_policy', p_table_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- إنشاء السياسات حسب نوع الجدول
    IF p_has_tenant_id AND p_has_company_id THEN
        -- جدول شركة (tenant_id + company_id)
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
            USING (is_platform_admin() OR check_row_access(tenant_id, company_id))',
            p_table_name || '_select_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
            WITH CHECK (is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id)))',
            p_table_name || '_insert_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
            USING (is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id)))',
            p_table_name || '_update_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
            USING (is_platform_admin() OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id)))',
            p_table_name || '_delete_policy', p_table_name);
            
    ELSIF p_has_tenant_id THEN
        -- جدول تينانت (tenant_id فقط)
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
            USING (is_platform_admin() OR tenant_id = get_user_tenant_id())',
            p_table_name || '_select_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
            WITH CHECK (is_platform_admin() OR tenant_id = get_user_tenant_id())',
            p_table_name || '_insert_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
            USING (is_platform_admin() OR tenant_id = get_user_tenant_id())',
            p_table_name || '_update_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
            USING (is_platform_admin() OR tenant_id = get_user_tenant_id())',
            p_table_name || '_delete_policy', p_table_name);
            
    ELSE
        -- جدول منصة/lookup (للقراءة من الجميع)
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
            USING (true)',
            p_table_name || '_select_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
            WITH CHECK (is_platform_admin())',
            p_table_name || '_insert_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
            USING (is_platform_admin())',
            p_table_name || '_update_policy', p_table_name);
            
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
            USING (is_platform_admin())',
            p_table_name || '_delete_policy', p_table_name);
    END IF;
    
    RAISE NOTICE 'تم إنشاء سياسات لـ: %', p_table_name;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: تطبيق السياسات على كل الجداول
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    v_has_tenant BOOLEAN;
    v_has_company BOOLEAN;
    v_count INT := 0;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        -- التحقق من وجود الأعمدة
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = r.tablename 
              AND column_name = 'tenant_id'
        ) INTO v_has_tenant;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = r.tablename 
              AND column_name = 'company_id'
        ) INTO v_has_company;
        
        -- تطبيق السياسات
        BEGIN
            PERFORM create_company_rls_policies(r.tablename, v_has_tenant, v_has_company);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'تم تطبيق السياسات على % جدول', v_count;
    RAISE NOTICE '════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 3: التحقق من النتيجة
-- ═══════════════════════════════════════════════════════════════

SELECT 
    'الإجمالي' as status,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;
