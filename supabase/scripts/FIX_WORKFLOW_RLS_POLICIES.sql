-- ══════════════════════════════════════════════════════════════
-- 🔧 FIX: إعادة بناء سياسات RLS للوورك فلو
-- المشكلة: 403 Forbidden عند الوصول لـ status_groups
-- السبب: يجب استخدام نفس النمط المعتمد في المشروع
-- النمط: SELECT tenant_id FROM companies WHERE id IN (
--            SELECT company_id FROM user_profiles WHERE id = auth.uid()
--        )
-- ══════════════════════════════════════════════════════════════

-- ─── إزالة كل السياسات القديمة ───
DROP POLICY IF EXISTS "status_groups_select" ON status_groups;
DROP POLICY IF EXISTS "status_groups_manage" ON status_groups;
DROP POLICY IF EXISTS "custom_statuses_select" ON custom_statuses;
DROP POLICY IF EXISTS "custom_statuses_manage" ON custom_statuses;
DROP POLICY IF EXISTS "status_transitions_select" ON status_transitions;
DROP POLICY IF EXISTS "status_transitions_manage" ON status_transitions;
DROP POLICY IF EXISTS "status_history_select" ON status_history;
DROP POLICY IF EXISTS "status_history_insert" ON status_history;
DROP POLICY IF EXISTS "wf_notif_select" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_notif_manage" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_scenario_select" ON workflow_scenario_toggles;
DROP POLICY IF EXISTS "wf_scenario_manage" ON workflow_scenario_toggles;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  status_groups                                                ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "status_groups_select" ON status_groups
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

CREATE POLICY "status_groups_insert" ON status_groups
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "status_groups_update" ON status_groups
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "status_groups_delete" ON status_groups
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    AND is_system = false
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  custom_statuses                                              ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "custom_statuses_select" ON custom_statuses
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

CREATE POLICY "custom_statuses_insert" ON custom_statuses
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "custom_statuses_update" ON custom_statuses
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "custom_statuses_delete" ON custom_statuses
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    AND is_system = false
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  status_transitions                                           ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "status_transitions_select" ON status_transitions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

CREATE POLICY "status_transitions_insert" ON status_transitions
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "status_transitions_update" ON status_transitions
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "status_transitions_delete" ON status_transitions
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  status_history                                               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "status_history_select" ON status_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "status_history_insert" ON status_history
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  workflow_notification_settings                               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "wf_notif_select" ON workflow_notification_settings
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_notif_insert" ON workflow_notification_settings
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_notif_update" ON workflow_notification_settings
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_notif_delete" ON workflow_notification_settings
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  workflow_scenario_toggles                                    ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE POLICY "wf_scenario_select" ON workflow_scenario_toggles
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_scenario_insert" ON workflow_scenario_toggles
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_scenario_update" ON workflow_scenario_toggles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "wf_scenario_delete" ON workflow_scenario_toggles
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ══════════════════════════════════════════════════════════════
-- ✅ VERIFICATION
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename IN ('status_groups', 'custom_statuses', 'status_transitions', 
                       'status_history', 'workflow_notification_settings', 'workflow_scenario_toggles')
    AND schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS Policies Fixed — Total: % policies', v_count;
  RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;
