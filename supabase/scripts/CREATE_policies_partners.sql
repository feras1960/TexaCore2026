-- =====================================================
-- CREATE_policies_partners.sql
-- المرحلة 5.2: سياسات جداول الوكلاء
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- المجموعة ب: جداول الوكلاء (Partner Tables)
-- Platform Admin يرى الكل، الوكيل يرى بياناته فقط
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. partners (الوكلاء)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partners_select_policy ON public.partners;
DROP POLICY IF EXISTS partners_insert_policy ON public.partners;
DROP POLICY IF EXISTS partners_update_policy ON public.partners;
DROP POLICY IF EXISTS partners_delete_policy ON public.partners;

CREATE POLICY partners_select_policy ON public.partners
    FOR SELECT USING (
        is_platform_admin()
        OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
    );

CREATE POLICY partners_insert_policy ON public.partners
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY partners_update_policy ON public.partners
    FOR UPDATE USING (
        is_platform_admin()
        OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
    );

CREATE POLICY partners_delete_policy ON public.partners
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 2. partner_allowed_products (البراندات المسموح للوكيل بيعها)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.partner_allowed_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_allowed_products_select_policy ON public.partner_allowed_products;
DROP POLICY IF EXISTS partner_allowed_products_insert_policy ON public.partner_allowed_products;
DROP POLICY IF EXISTS partner_allowed_products_update_policy ON public.partner_allowed_products;
DROP POLICY IF EXISTS partner_allowed_products_delete_policy ON public.partner_allowed_products;

CREATE POLICY partner_allowed_products_select_policy ON public.partner_allowed_products
    FOR SELECT USING (
        is_platform_admin()
        OR partner_id IN (
            SELECT p.id FROM public.partners p
            JOIN public.user_profiles up ON up.email = p.email
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY partner_allowed_products_insert_policy ON public.partner_allowed_products
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY partner_allowed_products_update_policy ON public.partner_allowed_products
    FOR UPDATE USING (is_platform_admin());

CREATE POLICY partner_allowed_products_delete_policy ON public.partner_allowed_products
    FOR DELETE USING (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════
-- 3. agents (الوكلاء - جدول قديم إن وجد)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
        ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS agents_select_policy ON public.agents;
        DROP POLICY IF EXISTS agents_insert_policy ON public.agents;
        DROP POLICY IF EXISTS agents_update_policy ON public.agents;
        DROP POLICY IF EXISTS agents_delete_policy ON public.agents;
        
        CREATE POLICY agents_select_policy ON public.agents
            FOR SELECT USING (
                is_platform_admin()
                OR user_id = auth.uid()
                OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
            );
        
        CREATE POLICY agents_insert_policy ON public.agents
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY agents_update_policy ON public.agents
            FOR UPDATE USING (
                is_platform_admin()
                OR user_id = auth.uid()
            );
        
        CREATE POLICY agents_delete_policy ON public.agents
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. agent_commissions (عمولات الوكلاء)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_commissions') THEN
        ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS agent_commissions_select_policy ON public.agent_commissions;
        DROP POLICY IF EXISTS agent_commissions_insert_policy ON public.agent_commissions;
        DROP POLICY IF EXISTS agent_commissions_update_policy ON public.agent_commissions;
        DROP POLICY IF EXISTS agent_commissions_delete_policy ON public.agent_commissions;
        
        CREATE POLICY agent_commissions_select_policy ON public.agent_commissions
            FOR SELECT USING (
                is_platform_admin()
                OR agent_id IN (
                    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()
                )
            );
        
        CREATE POLICY agent_commissions_insert_policy ON public.agent_commissions
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY agent_commissions_update_policy ON public.agent_commissions
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY agent_commissions_delete_policy ON public.agent_commissions
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. agent_bonuses (مكافآت الوكلاء)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_bonuses') THEN
        ALTER TABLE public.agent_bonuses ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS agent_bonuses_select_policy ON public.agent_bonuses;
        DROP POLICY IF EXISTS agent_bonuses_insert_policy ON public.agent_bonuses;
        DROP POLICY IF EXISTS agent_bonuses_update_policy ON public.agent_bonuses;
        DROP POLICY IF EXISTS agent_bonuses_delete_policy ON public.agent_bonuses;
        
        CREATE POLICY agent_bonuses_select_policy ON public.agent_bonuses
            FOR SELECT USING (
                is_platform_admin()
                OR agent_id IN (
                    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()
                )
            );
        
        CREATE POLICY agent_bonuses_insert_policy ON public.agent_bonuses
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY agent_bonuses_update_policy ON public.agent_bonuses
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY agent_bonuses_delete_policy ON public.agent_bonuses
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. partner_referrals (إحالات الوكلاء)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_referrals') THEN
        ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS partner_referrals_select_policy ON public.partner_referrals;
        DROP POLICY IF EXISTS partner_referrals_insert_policy ON public.partner_referrals;
        DROP POLICY IF EXISTS partner_referrals_update_policy ON public.partner_referrals;
        DROP POLICY IF EXISTS partner_referrals_delete_policy ON public.partner_referrals;
        
        CREATE POLICY partner_referrals_select_policy ON public.partner_referrals
            FOR SELECT USING (
                is_platform_admin()
                OR partner_id IN (
                    SELECT p.id FROM public.partners p
                    JOIN public.user_profiles up ON up.email = p.email
                    WHERE up.id = auth.uid()
                )
            );
        
        CREATE POLICY partner_referrals_insert_policy ON public.partner_referrals
            FOR INSERT WITH CHECK (
                is_platform_admin()
                OR partner_id IN (
                    SELECT p.id FROM public.partners p
                    JOIN public.user_profiles up ON up.email = p.email
                    WHERE up.id = auth.uid()
                )
            );
        
        CREATE POLICY partner_referrals_update_policy ON public.partner_referrals
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY partner_referrals_delete_policy ON public.partner_referrals
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. partner_payouts (مدفوعات الوكلاء)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_payouts') THEN
        ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS partner_payouts_select_policy ON public.partner_payouts;
        DROP POLICY IF EXISTS partner_payouts_insert_policy ON public.partner_payouts;
        DROP POLICY IF EXISTS partner_payouts_update_policy ON public.partner_payouts;
        DROP POLICY IF EXISTS partner_payouts_delete_policy ON public.partner_payouts;
        
        CREATE POLICY partner_payouts_select_policy ON public.partner_payouts
            FOR SELECT USING (
                is_platform_admin()
                OR partner_id IN (
                    SELECT p.id FROM public.partners p
                    JOIN public.user_profiles up ON up.email = p.email
                    WHERE up.id = auth.uid()
                )
            );
        
        CREATE POLICY partner_payouts_insert_policy ON public.partner_payouts
            FOR INSERT WITH CHECK (is_platform_admin());
        
        CREATE POLICY partner_payouts_update_policy ON public.partner_payouts
            FOR UPDATE USING (is_platform_admin());
        
        CREATE POLICY partner_payouts_delete_policy ON public.partner_payouts
            FOR DELETE USING (is_platform_admin());
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق
-- ═══════════════════════════════════════════════════════════════
SELECT 'تم إنشاء سياسات جداول الوكلاء بنجاح!' as result;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'partners', 
    'partner_allowed_products',
    'agents',
    'agent_commissions',
    'agent_bonuses',
    'partner_referrals',
    'partner_payouts'
)
ORDER BY tablename, cmd;
