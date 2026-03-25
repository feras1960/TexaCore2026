-- =====================================================
-- CREATE_policies_platform.sql
-- المرحلة 5.1: سياسات جداول المنصة
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- المجموعة أ: جداول المنصة (Platform Tables)
-- هذه الجداول للقراءة من الجميع والتعديل من Platform Admin فقط
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. saas_products (البراندات/المنتجات)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_products_select_policy ON public.saas_products;
DROP POLICY IF EXISTS saas_products_insert_policy ON public.saas_products;
DROP POLICY IF EXISTS saas_products_update_policy ON public.saas_products;
DROP POLICY IF EXISTS saas_products_delete_policy ON public.saas_products;

CREATE POLICY saas_products_select_policy ON public.saas_products
    FOR SELECT USING (is_active = true OR is_platform_admin());

CREATE POLICY saas_products_insert_policy ON public.saas_products
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY saas_products_update_policy ON public.saas_products
    FOR UPDATE USING (is_platform_admin());

CREATE POLICY saas_products_delete_policy ON public.saas_products
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 2. subscription_plans (خطط الاشتراك)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_select_policy ON public.subscription_plans;
DROP POLICY IF EXISTS subscription_plans_insert_policy ON public.subscription_plans;
DROP POLICY IF EXISTS subscription_plans_update_policy ON public.subscription_plans;
DROP POLICY IF EXISTS subscription_plans_delete_policy ON public.subscription_plans;

CREATE POLICY subscription_plans_select_policy ON public.subscription_plans
    FOR SELECT USING (
        is_active = true 
        OR is_platform_admin()
        OR (
            -- الوكيل يرى خطط البراندات المسموح له بها
            is_partner_or_reseller() 
            AND product_id = ANY(get_partner_allowed_brand_ids())
        )
    );

CREATE POLICY subscription_plans_insert_policy ON public.subscription_plans
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY subscription_plans_update_policy ON public.subscription_plans
    FOR UPDATE USING (is_platform_admin());

CREATE POLICY subscription_plans_delete_policy ON public.subscription_plans
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 3. system_modules (الموديولات)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_modules_select_policy ON public.system_modules;
DROP POLICY IF EXISTS system_modules_insert_policy ON public.system_modules;
DROP POLICY IF EXISTS system_modules_update_policy ON public.system_modules;
DROP POLICY IF EXISTS system_modules_delete_policy ON public.system_modules;

CREATE POLICY system_modules_select_policy ON public.system_modules
    FOR SELECT USING (is_active = true OR is_platform_admin());

CREATE POLICY system_modules_insert_policy ON public.system_modules
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY system_modules_update_policy ON public.system_modules
    FOR UPDATE USING (is_platform_admin());

CREATE POLICY system_modules_delete_policy ON public.system_modules
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 4. super_admins (مديرو المنصة)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS super_admins_select_policy ON public.super_admins;
DROP POLICY IF EXISTS super_admins_insert_policy ON public.super_admins;
DROP POLICY IF EXISTS super_admins_update_policy ON public.super_admins;
DROP POLICY IF EXISTS super_admins_delete_policy ON public.super_admins;

-- فقط Platform Owner الحالي يرى القائمة
CREATE POLICY super_admins_select_policy ON public.super_admins
    FOR SELECT USING (is_platform_owner());

CREATE POLICY super_admins_insert_policy ON public.super_admins
    FOR INSERT WITH CHECK (is_platform_owner());

CREATE POLICY super_admins_update_policy ON public.super_admins
    FOR UPDATE USING (is_platform_owner());

CREATE POLICY super_admins_delete_policy ON public.super_admins
    FOR DELETE USING (is_platform_owner());

-- ═══════════════════════════════════════════════════════════════
-- 5. coa_templates (قوالب الحسابات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coa_templates') THEN
        ALTER TABLE public.coa_templates ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS coa_templates_select_policy ON public.coa_templates;
        DROP POLICY IF EXISTS coa_templates_insert_policy ON public.coa_templates;
        DROP POLICY IF EXISTS coa_templates_update_policy ON public.coa_templates;
        DROP POLICY IF EXISTS coa_templates_delete_policy ON public.coa_templates;
        
        CREATE POLICY coa_templates_select_policy ON public.coa_templates
            FOR SELECT USING (is_active = true OR is_platform_admin());
        
        CREATE POLICY coa_templates_insert_policy ON public.coa_templates
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY coa_templates_update_policy ON public.coa_templates
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY coa_templates_delete_policy ON public.coa_templates
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. coa_template_accounts (حسابات القوالب)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coa_template_accounts') THEN
        ALTER TABLE public.coa_template_accounts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS coa_template_accounts_select_policy ON public.coa_template_accounts;
        DROP POLICY IF EXISTS coa_template_accounts_insert_policy ON public.coa_template_accounts;
        DROP POLICY IF EXISTS coa_template_accounts_update_policy ON public.coa_template_accounts;
        DROP POLICY IF EXISTS coa_template_accounts_delete_policy ON public.coa_template_accounts;
        
        CREATE POLICY coa_template_accounts_select_policy ON public.coa_template_accounts
            FOR SELECT USING (true);
        
        CREATE POLICY coa_template_accounts_insert_policy ON public.coa_template_accounts
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY coa_template_accounts_update_policy ON public.coa_template_accounts
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY coa_template_accounts_delete_policy ON public.coa_template_accounts
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. white_label_configs (إعدادات الوايت ليبل)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'white_label_configs') THEN
        ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS white_label_configs_select_policy ON public.white_label_configs;
        DROP POLICY IF EXISTS white_label_configs_insert_policy ON public.white_label_configs;
        DROP POLICY IF EXISTS white_label_configs_update_policy ON public.white_label_configs;
        DROP POLICY IF EXISTS white_label_configs_delete_policy ON public.white_label_configs;
        
        CREATE POLICY white_label_configs_select_policy ON public.white_label_configs
            FOR SELECT USING (
                is_platform_admin()
                OR (
                    is_whitelabel_partner()
                    AND partner_id IN (
                        SELECT p.id FROM public.partners p
                        JOIN public.user_profiles up ON up.email = p.email
                        WHERE up.id = auth.uid()
                    )
                )
            );
        
        CREATE POLICY white_label_configs_insert_policy ON public.white_label_configs
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY white_label_configs_update_policy ON public.white_label_configs
            FOR UPDATE USING (
                is_platform_admin()
                OR (
                    is_whitelabel_partner()
                    AND partner_id IN (
                        SELECT p.id FROM public.partners p
                        JOIN public.user_profiles up ON up.email = p.email
                        WHERE up.id = auth.uid()
                    )
                )
            );
        
        CREATE POLICY white_label_configs_delete_policy ON public.white_label_configs
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. saas_payments (المدفوعات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saas_payments') THEN
        ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS saas_payments_select_policy ON public.saas_payments;
        DROP POLICY IF EXISTS saas_payments_insert_policy ON public.saas_payments;
        DROP POLICY IF EXISTS saas_payments_update_policy ON public.saas_payments;
        DROP POLICY IF EXISTS saas_payments_delete_policy ON public.saas_payments;
        
        CREATE POLICY saas_payments_select_policy ON public.saas_payments
            FOR SELECT USING (
                is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY saas_payments_insert_policy ON public.saas_payments
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY saas_payments_update_policy ON public.saas_payments
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY saas_payments_delete_policy ON public.saas_payments
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. saas_events (الأحداث)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saas_events') THEN
        ALTER TABLE public.saas_events ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS saas_events_select_policy ON public.saas_events;
        DROP POLICY IF EXISTS saas_events_insert_policy ON public.saas_events;
        DROP POLICY IF EXISTS saas_events_update_policy ON public.saas_events;
        DROP POLICY IF EXISTS saas_events_delete_policy ON public.saas_events;
        
        CREATE POLICY saas_events_select_policy ON public.saas_events
            FOR SELECT USING (is_platform_admin());
        
        CREATE POLICY saas_events_insert_policy ON public.saas_events
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY saas_events_update_policy ON public.saas_events
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY saas_events_delete_policy ON public.saas_events
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. usage_metrics (إحصائيات الاستخدام)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_metrics') THEN
        ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS usage_metrics_select_policy ON public.usage_metrics;
        DROP POLICY IF EXISTS usage_metrics_insert_policy ON public.usage_metrics;
        DROP POLICY IF EXISTS usage_metrics_update_policy ON public.usage_metrics;
        DROP POLICY IF EXISTS usage_metrics_delete_policy ON public.usage_metrics;
        
        CREATE POLICY usage_metrics_select_policy ON public.usage_metrics
            FOR SELECT USING (
                is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY usage_metrics_insert_policy ON public.usage_metrics
            FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_user_tenant_id());
        
        CREATE POLICY usage_metrics_update_policy ON public.usage_metrics
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY usage_metrics_delete_policy ON public.usage_metrics
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق
-- ═══════════════════════════════════════════════════════════════
SELECT 'تم إنشاء سياسات جداول المنصة بنجاح!' as result;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'saas_products', 
    'subscription_plans', 
    'system_modules', 
    'super_admins',
    'coa_templates',
    'coa_template_accounts',
    'white_label_configs',
    'saas_payments',
    'saas_events',
    'usage_metrics'
)
ORDER BY tablename, cmd;
