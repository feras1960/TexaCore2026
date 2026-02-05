-- =====================================================
-- CREATE_policies_tenant.sql
-- المرحلة 5.3: سياسات جداول التينانت
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- المجموعة ج: جداول التينانت (Tenant Tables)
-- - Platform Admin يرى الكل
-- - Partner/Reseller يرى مشتركيه
-- - المستخدم يرى تينانته فقط
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. tenants (المشتركين)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_policy ON public.tenants;
DROP POLICY IF EXISTS tenants_insert_policy ON public.tenants;
DROP POLICY IF EXISTS tenants_update_policy ON public.tenants;
DROP POLICY IF EXISTS tenants_delete_policy ON public.tenants;

CREATE POLICY tenants_select_policy ON public.tenants
    FOR SELECT USING (
        is_platform_admin()
        OR (
            -- الوكيل يرى مشتركيه
            is_partner_or_reseller()
            AND id = ANY(get_partner_tenant_ids())
        )
        OR (
            -- المستخدم يرى تينانته فقط ضمن نفس البراند
            is_same_brand(id)
            AND id = get_user_tenant_id()
        )
    );

CREATE POLICY tenants_insert_policy ON public.tenants
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR is_partner_or_reseller()
    );

CREATE POLICY tenants_update_policy ON public.tenants
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND id = ANY(get_partner_tenant_ids())
        )
        OR (
            is_tenant_owner()
            AND id = get_user_tenant_id()
        )
    );

CREATE POLICY tenants_delete_policy ON public.tenants
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 2. subscriptions (الاشتراكات)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_policy ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_policy ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update_policy ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_delete_policy ON public.subscriptions;

CREATE POLICY subscriptions_select_policy ON public.subscriptions
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY subscriptions_insert_policy ON public.subscriptions
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
    );

CREATE POLICY subscriptions_update_policy ON public.subscriptions
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
    );

CREATE POLICY subscriptions_delete_policy ON public.subscriptions
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 3. tenant_modules (موديولات المشترك)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_modules_select_policy ON public.tenant_modules;
DROP POLICY IF EXISTS tenant_modules_insert_policy ON public.tenant_modules;
DROP POLICY IF EXISTS tenant_modules_update_policy ON public.tenant_modules;
DROP POLICY IF EXISTS tenant_modules_delete_policy ON public.tenant_modules;

CREATE POLICY tenant_modules_select_policy ON public.tenant_modules
    FOR SELECT USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
        OR tenant_id = get_user_tenant_id()
    );

CREATE POLICY tenant_modules_insert_policy ON public.tenant_modules
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
    );

CREATE POLICY tenant_modules_update_policy ON public.tenant_modules
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_partner_or_reseller()
            AND tenant_id = ANY(get_partner_tenant_ids())
        )
    );

CREATE POLICY tenant_modules_delete_policy ON public.tenant_modules
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 4. roles (الأدوار)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select_policy ON public.roles;
DROP POLICY IF EXISTS roles_insert_policy ON public.roles;
DROP POLICY IF EXISTS roles_update_policy ON public.roles;
DROP POLICY IF EXISTS roles_delete_policy ON public.roles;

CREATE POLICY roles_select_policy ON public.roles
    FOR SELECT USING (
        is_platform_admin()
        -- الأدوار العامة (بدون tenant_id) يراها الجميع
        OR tenant_id IS NULL
        -- الأدوار الخاصة بالتينانت
        OR (
            is_same_brand(tenant_id)
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY roles_insert_policy ON public.roles
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY roles_update_policy ON public.roles
    FOR UPDATE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY roles_delete_policy ON public.roles
    FOR DELETE USING (
        is_platform_admin()
        OR (
            is_tenant_admin()
            AND tenant_id = get_user_tenant_id()
            AND is_system_role = false
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- 5. announcements (الإعلانات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS announcements_select_policy ON public.announcements;
        DROP POLICY IF EXISTS announcements_insert_policy ON public.announcements;
        DROP POLICY IF EXISTS announcements_update_policy ON public.announcements;
        DROP POLICY IF EXISTS announcements_delete_policy ON public.announcements;
        
        CREATE POLICY announcements_select_policy ON public.announcements
            FOR SELECT USING (
                is_platform_admin()
                -- الإعلانات العامة
                OR (is_active = true AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id()))
            );
        
        CREATE POLICY announcements_insert_policy ON public.announcements
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY announcements_update_policy ON public.announcements
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY announcements_delete_policy ON public.announcements
            FOR DELETE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. audit_logs (سجلات التدقيق)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_update_policy ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_delete_policy ON public.audit_logs;
        
        CREATE POLICY audit_logs_select_policy ON public.audit_logs
            FOR SELECT USING (
                is_platform_admin()
                OR (
                    is_tenant_admin()
                    AND tenant_id = get_user_tenant_id()
                )
            );
        
        -- السماح بالإدراج للنظام (عبر triggers)
        CREATE POLICY audit_logs_insert_policy ON public.audit_logs
            FOR INSERT WITH CHECK (true);
        
        -- لا يمكن تعديل سجلات التدقيق
        CREATE POLICY audit_logs_update_policy ON public.audit_logs
            FOR UPDATE USING (false);
        
        -- فقط Platform Admin يحذف سجلات التدقيق
        CREATE POLICY audit_logs_delete_policy ON public.audit_logs
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. notifications (الإشعارات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
        
        CREATE POLICY notifications_select_policy ON public.notifications
            FOR SELECT USING (
                is_platform_admin()
                OR user_id = auth.uid()
            );
        
        CREATE POLICY notifications_insert_policy ON public.notifications
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR is_tenant_admin()
            );
        
        CREATE POLICY notifications_update_policy ON public.notifications
            FOR UPDATE USING (
                user_id = auth.uid()
            );
        
        CREATE POLICY notifications_delete_policy ON public.notifications
            FOR DELETE USING (
                is_platform_admin()
                OR user_id = auth.uid()
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. role_permissions (صلاحيات الأدوار)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
        ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS role_permissions_select_policy ON public.role_permissions;
        DROP POLICY IF EXISTS role_permissions_insert_policy ON public.role_permissions;
        DROP POLICY IF EXISTS role_permissions_update_policy ON public.role_permissions;
        DROP POLICY IF EXISTS role_permissions_delete_policy ON public.role_permissions;
        
        CREATE POLICY role_permissions_select_policy ON public.role_permissions
            FOR SELECT USING (
                is_platform_admin()
                OR role_id IN (
                    SELECT id FROM public.roles
                    WHERE tenant_id IS NULL OR tenant_id = get_user_tenant_id()
                )
            );
        
        CREATE POLICY role_permissions_insert_policy ON public.role_permissions
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (
                    is_tenant_admin()
                    AND role_id IN (SELECT id FROM public.roles WHERE tenant_id = get_user_tenant_id())
                )
            );
        
        CREATE POLICY role_permissions_update_policy ON public.role_permissions
            FOR UPDATE USING (
                is_platform_admin()
                OR (
                    is_tenant_admin()
                    AND role_id IN (SELECT id FROM public.roles WHERE tenant_id = get_user_tenant_id())
                )
            );
        
        CREATE POLICY role_permissions_delete_policy ON public.role_permissions
            FOR DELETE USING (
                is_platform_admin()
                OR (
                    is_tenant_admin()
                    AND role_id IN (SELECT id FROM public.roles WHERE tenant_id = get_user_tenant_id())
                )
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. permissions (الصلاحيات)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
        ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS permissions_select_policy ON public.permissions;
        DROP POLICY IF EXISTS permissions_insert_policy ON public.permissions;
        DROP POLICY IF EXISTS permissions_update_policy ON public.permissions;
        DROP POLICY IF EXISTS permissions_delete_policy ON public.permissions;
        
        -- الكل يقرأ الصلاحيات
        CREATE POLICY permissions_select_policy ON public.permissions
            FOR SELECT USING (true);
        
        CREATE POLICY permissions_insert_policy ON public.permissions
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY permissions_update_policy ON public.permissions
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY permissions_delete_policy ON public.permissions
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. tenant_settings (إعدادات المشترك)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_settings') THEN
        ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_settings_select_policy ON public.tenant_settings;
        DROP POLICY IF EXISTS tenant_settings_insert_policy ON public.tenant_settings;
        DROP POLICY IF EXISTS tenant_settings_update_policy ON public.tenant_settings;
        DROP POLICY IF EXISTS tenant_settings_delete_policy ON public.tenant_settings;
        
        CREATE POLICY tenant_settings_select_policy ON public.tenant_settings
            FOR SELECT USING (
                is_platform_admin()
                OR tenant_id = get_user_tenant_id()
            );
        
        CREATE POLICY tenant_settings_insert_policy ON public.tenant_settings
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY tenant_settings_update_policy ON public.tenant_settings
            FOR UPDATE USING (
                is_platform_admin()
                OR (is_tenant_admin() AND tenant_id = get_user_tenant_id())
            );
        
        CREATE POLICY tenant_settings_delete_policy ON public.tenant_settings
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق
-- ═══════════════════════════════════════════════════════════════
SELECT 'تم إنشاء سياسات جداول التينانت بنجاح!' as result;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'tenants', 
    'subscriptions',
    'tenant_modules',
    'roles',
    'announcements',
    'audit_logs',
    'notifications',
    'role_permissions',
    'permissions',
    'tenant_settings'
)
ORDER BY tablename, cmd;
