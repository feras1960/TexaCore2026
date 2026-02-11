-- ════════════════════════════════════════════════════════════════════════════
-- 🔄 SALES WORKFLOW — COMPLETE VERIFIED SETUP
-- سكربت شامل لنظام سير عمل المبيعات
-- 
-- 📅 2026-02-09
-- ✅ مُتحقق من البنية الفعلية للقاعدة:
--    - inventory_movements (NOT inventory_transactions)
--    - delivery_note_items uses delivery_note_id (NOT delivery_id)
--    - inventory_movements requires company_id, movement_number, created_by
--    - sales_invoices, sales_deliveries, sales_orders exist
--    - quotations, reservations exist
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PART 1: جداول نظام الحالات (Workflow Engine)               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1.1 مجموعات الحالات
CREATE TABLE IF NOT EXISTS status_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, doc_type, code)
);

-- 1.2 الحالات المخصصة
CREATE TABLE IF NOT EXISTS custom_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES status_groups(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  color VARCHAR(20) DEFAULT 'gray',
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_initial BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  time_norm_hours INT,
  can_view_roles TEXT[] DEFAULT ARRAY['admin', 'manager', 'user'],
  can_set_roles TEXT[] DEFAULT ARRAY['admin', 'manager'],
  auto_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, doc_type, code)
);

-- 1.3 انتقالات الحالات
CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  from_status_id UUID REFERENCES custom_statuses(id) ON DELETE CASCADE,
  to_status_id UUID REFERENCES custom_statuses(id) ON DELETE CASCADE,
  allowed_roles TEXT[] DEFAULT ARRAY['admin'],
  requires_comment BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approval_roles TEXT[] DEFAULT ARRAY['admin'],
  auto_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, doc_type, from_status_id, to_status_id)
);

-- 1.4 سجل تغيير الحالات
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  doc_id UUID NOT NULL,
  from_status_id UUID REFERENCES custom_statuses(id),
  to_status_id UUID REFERENCES custom_statuses(id) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 إعدادات الإشعارات (backend — يحل مكان localStorage)
CREATE TABLE IF NOT EXISTS workflow_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_id VARCHAR(100) NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT false,
  telegram BOOLEAN DEFAULT false,
  sms BOOLEAN DEFAULT false,
  recipients JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, event_id)
);

-- 1.6 حالة السيناريوهات (backend)
CREATE TABLE IF NOT EXISTS workflow_scenario_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  scenario_id VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  activated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, scenario_id)
);

-- 1.7 الفهارس
CREATE INDEX IF NOT EXISTS idx_status_groups_tenant_doc ON status_groups(tenant_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_custom_statuses_tenant_doc ON custom_statuses(tenant_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_status_transitions_from ON status_transitions(from_status_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_to ON status_transitions(to_status_id);
CREATE INDEX IF NOT EXISTS idx_status_history_doc ON status_history(tenant_id, doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_notif_tenant ON workflow_notification_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wf_scenario_tenant ON workflow_scenario_toggles(tenant_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PART 2: تفعيل RLS + السياسات                                ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE status_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_scenario_toggles ENABLE ROW LEVEL SECURITY;

-- ─── RLS Pattern (المعيار المعتمد في كل المشروع) ───
-- SELECT tenant_id FROM companies WHERE id IN (
--   SELECT company_id FROM user_profiles WHERE id = auth.uid()
-- )

-- ─── status_groups ───
DROP POLICY IF EXISTS "status_groups_select" ON status_groups;
CREATE POLICY "status_groups_select" ON status_groups
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

DROP POLICY IF EXISTS "status_groups_manage" ON status_groups;
DROP POLICY IF EXISTS "status_groups_insert" ON status_groups;
DROP POLICY IF EXISTS "status_groups_update" ON status_groups;
DROP POLICY IF EXISTS "status_groups_delete" ON status_groups;

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

-- ─── custom_statuses ───
DROP POLICY IF EXISTS "custom_statuses_select" ON custom_statuses;
CREATE POLICY "custom_statuses_select" ON custom_statuses
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

DROP POLICY IF EXISTS "custom_statuses_manage" ON custom_statuses;
DROP POLICY IF EXISTS "custom_statuses_insert" ON custom_statuses;
DROP POLICY IF EXISTS "custom_statuses_update" ON custom_statuses;
DROP POLICY IF EXISTS "custom_statuses_delete" ON custom_statuses;

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

-- ─── status_transitions ───
DROP POLICY IF EXISTS "status_transitions_select" ON status_transitions;
CREATE POLICY "status_transitions_select" ON status_transitions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR tenant_id IS NULL
  );

DROP POLICY IF EXISTS "status_transitions_manage" ON status_transitions;
DROP POLICY IF EXISTS "status_transitions_insert" ON status_transitions;
DROP POLICY IF EXISTS "status_transitions_update" ON status_transitions;
DROP POLICY IF EXISTS "status_transitions_delete" ON status_transitions;

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

-- ─── status_history ───
DROP POLICY IF EXISTS "status_history_select" ON status_history;
CREATE POLICY "status_history_select" ON status_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "status_history_insert" ON status_history;
CREATE POLICY "status_history_insert" ON status_history
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM companies WHERE id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ─── workflow_notification_settings ───
DROP POLICY IF EXISTS "wf_notif_select" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_notif_manage" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_notif_insert" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_notif_update" ON workflow_notification_settings;
DROP POLICY IF EXISTS "wf_notif_delete" ON workflow_notification_settings;

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

-- ─── workflow_scenario_toggles ───
DROP POLICY IF EXISTS "wf_scenario_select" ON workflow_scenario_toggles;
DROP POLICY IF EXISTS "wf_scenario_manage" ON workflow_scenario_toggles;
DROP POLICY IF EXISTS "wf_scenario_insert" ON workflow_scenario_toggles;
DROP POLICY IF EXISTS "wf_scenario_update" ON workflow_scenario_toggles;
DROP POLICY IF EXISTS "wf_scenario_delete" ON workflow_scenario_toggles;

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

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PART 3: الدوال                                              ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 3.1 تغيير حالة المستند
CREATE OR REPLACE FUNCTION change_document_status(
  p_tenant_id UUID,
  p_doc_type VARCHAR,
  p_doc_id UUID,
  p_new_status_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_old_status_id UUID;
BEGIN
  SELECT to_status_id INTO v_old_status_id
  FROM status_history
  WHERE tenant_id = p_tenant_id AND doc_type = p_doc_type AND doc_id = p_doc_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_old_status_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM status_transitions
      WHERE (tenant_id = p_tenant_id OR tenant_id IS NULL)
        AND doc_type = p_doc_type
        AND from_status_id = v_old_status_id
        AND to_status_id = p_new_status_id
    ) THEN
      RAISE EXCEPTION 'Transition not allowed from current status';
    END IF;
  END IF;

  INSERT INTO status_history (tenant_id, doc_type, doc_id, from_status_id, to_status_id, changed_by, comment)
  VALUES (p_tenant_id, p_doc_type, p_doc_id, v_old_status_id, p_new_status_id, auth.uid(), p_comment)
  RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 خصم المخزون (يستخدمها TradeService + n8n)
-- ✅ يتوافق مع أعمدة inventory_movements الفعلية:
--    company_id, movement_number, movement_type, created_by كلها NOT NULL
CREATE OR REPLACE FUNCTION deduct_inventory(
  p_warehouse_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID
) RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
  v_company_id UUID;
  v_user_id UUID;
  v_movement_number VARCHAR(50);
BEGIN
  v_user_id := auth.uid();

  -- النمط المعياري: user_profiles.id = auth.uid()
  SELECT c.tenant_id, up.company_id 
  INTO v_tenant_id, v_company_id
  FROM user_profiles up, companies c
  WHERE up.id = v_user_id 
    AND c.id = up.company_id
  LIMIT 1;

  v_movement_number := 'AUTO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTR(gen_random_uuid()::text, 1, 4);

  INSERT INTO inventory_movements (
    tenant_id, company_id, movement_number, movement_date,
    movement_type, product_id,
    from_warehouse_id, quantity,
    reference_type, reference_id,
    notes, created_by
  ) VALUES (
    v_tenant_id, v_company_id, v_movement_number, CURRENT_DATE,
    'out', p_product_id,
    p_warehouse_id, ABS(p_quantity),
    p_reference_type, p_reference_id,
    'Auto deduction: ' || p_reference_type, v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 تنفيذ بيع POS شامل
-- ✅ يستخدم delivery_notes (ليس sales_deliveries) + delivery_note_items
CREATE OR REPLACE FUNCTION execute_pos_delivery(
  p_invoice_id UUID,
  p_warehouse_id UUID,
  p_tenant_id UUID
) RETURNS jsonb AS $$
DECLARE
  v_delivery_id UUID;
  v_company_id UUID;
  v_user_id UUID;
  v_movement_number VARCHAR(50);
  v_note_number VARCHAR(50);
BEGIN
  v_user_id := auth.uid();
  
  SELECT up.company_id INTO v_company_id
  FROM user_profiles up WHERE up.id = v_user_id LIMIT 1;

  -- Generate delivery note number
  v_note_number := 'POS-DN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');

  -- 1. إنشاء إذن تسليم
  INSERT INTO delivery_notes (
    tenant_id, company_id, customer_id, warehouse_id,
    note_number, note_date, status, notes, created_by
  )
  SELECT 
    si.tenant_id, v_company_id, si.customer_id, p_warehouse_id,
    v_note_number, CURRENT_DATE, 'delivered',
    'POS Auto-Delivery for Invoice #' || si.invoice_number,
    v_user_id
  FROM sales_invoices si
  WHERE si.id = p_invoice_id
  RETURNING id INTO v_delivery_id;

  -- 2. نسخ بنود الفاتورة
  INSERT INTO delivery_note_items (
    tenant_id, delivery_note_id, product_id, 
    quantity_ordered, quantity_to_deliver, quantity_delivered
  )
  SELECT 
    p_tenant_id, v_delivery_id, sii.product_id,
    sii.quantity, sii.quantity, sii.quantity
  FROM sales_invoice_items sii
  WHERE sii.invoice_id = p_invoice_id;

  -- 3. تسجيل حركة مخزون (خصم)
  INSERT INTO inventory_movements (
    tenant_id, company_id, movement_number, movement_date,
    movement_type, product_id, from_warehouse_id,
    quantity, reference_type, reference_id,
    notes, created_by
  )
  SELECT 
    p_tenant_id, v_company_id,
    'POS-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || ROW_NUMBER() OVER (),
    CURRENT_DATE,
    'out', sii.product_id, p_warehouse_id,
    sii.quantity, 'pos_sale', p_invoice_id,
    'POS auto-deduction', v_user_id
  FROM sales_invoice_items sii
  WHERE sii.invoice_id = p_invoice_id;

  -- 4. تحديث حالة الفاتورة
  UPDATE sales_invoices SET status = 'posted' WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'delivery_id', v_delivery_id,
    'message', 'POS sale completed'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'invoice_id', p_invoice_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4 لون الحالة
CREATE OR REPLACE FUNCTION get_status_color_class(color VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE color
    WHEN 'gray' THEN 'bg-gray-100 text-gray-700'
    WHEN 'blue' THEN 'bg-blue-100 text-blue-700'
    WHEN 'green' THEN 'bg-green-100 text-green-700'
    WHEN 'red' THEN 'bg-red-100 text-red-700'
    WHEN 'yellow' THEN 'bg-yellow-100 text-yellow-700'
    WHEN 'orange' THEN 'bg-orange-100 text-orange-700'
    WHEN 'purple' THEN 'bg-purple-100 text-purple-700'
    WHEN 'indigo' THEN 'bg-indigo-100 text-indigo-700'
    WHEN 'cyan' THEN 'bg-cyan-100 text-cyan-700'
    WHEN 'teal' THEN 'bg-teal-100 text-teal-700'
    WHEN 'pink' THEN 'bg-pink-100 text-pink-700'
    ELSE 'bg-gray-100 text-gray-700'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PART 4: البيانات الافتراضية                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

INSERT INTO status_groups (tenant_id, doc_type, code, name_ar, name_en, sort_order, is_system) VALUES
  (NULL, 'invoice', 'invoice_group', 'فواتير', 'Invoices', 1, true),
  (NULL, 'order', 'order_group', 'أوامر', 'Orders', 2, true),
  (NULL, 'journal_entry', 'je_group', 'قيود يومية', 'Journal Entries', 3, true),
  (NULL, 'payment', 'payment_group', 'مدفوعات', 'Payments', 4, true)
ON CONFLICT (tenant_id, doc_type, code) DO NOTHING;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PART 5: التحقق النهائي + تعليقات                             ║
-- ╚══════════════════════════════════════════════════════════════╝

COMMENT ON TABLE status_groups IS 'مجموعات الحالات - Status Groups';
COMMENT ON TABLE custom_statuses IS 'الحالات المخصصة - Custom Statuses';
COMMENT ON TABLE status_transitions IS 'انتقالات الحالات - Status Transitions';
COMMENT ON TABLE status_history IS 'سجل تغيير الحالات - Status History';
COMMENT ON TABLE workflow_notification_settings IS 'إعدادات إشعارات سير العمل';
COMMENT ON TABLE workflow_scenario_toggles IS 'تفعيلات سيناريوهات الأتمتة';

-- ════════════════════════════════════════════════════════════════
-- 🔍 VERIFICATION — Run this after execution:
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_table TEXT;
  v_exists BOOLEAN;
  v_tables TEXT[] := ARRAY[
    'status_groups', 'custom_statuses', 'status_transitions', 
    'status_history', 'workflow_notification_settings', 'workflow_scenario_toggles'
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Sales Workflow Setup — Verification';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) INTO v_exists;
    
    IF v_exists THEN
      RAISE NOTICE '  ✅ %', v_table;
    ELSE
      RAISE NOTICE '  ❌ % — MISSING!', v_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;
