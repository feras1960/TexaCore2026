-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: توحيد الكونتينرات وأرشفة جداول Shipments
-- Date: 2026-02-17
-- ═══════════════════════════════════════════════════════════════════════════
--
-- الهدف: توحيد النظام ليعمل على containers فقط
--   - إضافة container_id للجداول التي كانت مرتبطة بـ shipments
--   - إنشاء جدول container_reservations (بديل transit_reservations)
--   - أرشفة جداول shipments (إعادة تسمية + تعطيل RLS)
--   - توثيق كامل للتغييرات
--
-- ⚠️ ملاحظة: لا يوجد بيانات فعلية - الأرشفة آمنة
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════
-- القسم 1: إضافة container_id للجداول المرتبطة
-- ═══════════════════════════════════════

-- 1.1 purchase_invoices: إضافة container_id
ALTER TABLE purchase_invoices
ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES containers(id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_container 
ON purchase_invoices(container_id) WHERE container_id IS NOT NULL;

COMMENT ON COLUMN purchase_invoices.container_id IS 'ربط الفاتورة بالكونتينر (يحل محل shipment_id)';

-- 1.2 purchase_receipts: إضافة container_id
ALTER TABLE purchase_receipts
ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES containers(id);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_container 
ON purchase_receipts(container_id) WHERE container_id IS NOT NULL;

COMMENT ON COLUMN purchase_receipts.container_id IS 'ربط الاستلام بالكونتينر (يحل محل shipment_id)';

-- 1.3 purchase_receipt_items: إضافة container_item_id
ALTER TABLE purchase_receipt_items
ADD COLUMN IF NOT EXISTS container_item_id UUID REFERENCES container_items(id);

CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_container_item
ON purchase_receipt_items(container_item_id) WHERE container_item_id IS NOT NULL;

COMMENT ON COLUMN purchase_receipt_items.container_item_id IS 'ربط بند الاستلام ببند الكونتينر (يحل محل shipment_item_id)';

-- 1.4 payment_vouchers: إضافة container_id
ALTER TABLE payment_vouchers
ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES containers(id);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_container 
ON payment_vouchers(container_id) WHERE container_id IS NOT NULL;

COMMENT ON COLUMN payment_vouchers.container_id IS 'ربط سند الصرف بالكونتينر (يحل محل shipment_id)';


-- ═══════════════════════════════════════
-- القسم 2: نقل البيانات الموجودة (shipment_id → container_id)
-- ═══════════════════════════════════════

-- نقل الربط من shipment_id الى container_id عبر containers.shipment_id
UPDATE purchase_invoices pi
SET container_id = c.id
FROM containers c 
WHERE c.shipment_id = pi.shipment_id 
  AND pi.shipment_id IS NOT NULL
  AND pi.container_id IS NULL;

UPDATE purchase_receipts pr
SET container_id = c.id
FROM containers c 
WHERE c.shipment_id = pr.shipment_id 
  AND pr.shipment_id IS NOT NULL
  AND pr.container_id IS NULL;

UPDATE payment_vouchers pv
SET container_id = c.id
FROM containers c 
WHERE c.shipment_id = pv.shipment_id 
  AND pv.shipment_id IS NOT NULL
  AND pv.container_id IS NULL;


-- ═══════════════════════════════════════
-- القسم 3: إنشاء جدول container_reservations
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS container_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    reservation_number VARCHAR(50) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- العميل
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    
    -- مصدر البضاعة (كونتينر بدل shipment)
    container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    container_item_id UUID REFERENCES container_items(id),
    
    -- المادة والكمية
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    product_id UUID REFERENCES products(id),
    
    reserved_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'meter',
    
    -- السعر
    unit_price DECIMAL(15,4),
    total_amount DECIMAL(15,2),
    
    -- الدفعة المقدمة
    advance_amount DECIMAL(15,2) DEFAULT 0,
    advance_received BOOLEAN DEFAULT false,
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: معلق
    -- confirmed: مؤكد (دفعة مقدمة)
    -- ready: جاهز (وصلت البضاعة)
    -- delivered: تم التسليم
    -- cancelled: ملغي
    
    notes TEXT,
    
    -- عنوان الشحن (اختياري)
    shipping_address_id UUID,
    sales_order_id UUID,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, reservation_number)
);

CREATE INDEX IF NOT EXISTS idx_container_reservations_tenant ON container_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_container_reservations_container ON container_reservations(container_id);
CREATE INDEX IF NOT EXISTS idx_container_reservations_customer ON container_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_container_reservations_status ON container_reservations(status);

COMMENT ON TABLE container_reservations IS 'حجوزات البضائع بالطريق - يحل محل transit_reservations';

-- نقل بيانات الحجوزات الموجودة (إن وجدت)
INSERT INTO container_reservations (
    tenant_id, company_id, branch_id,
    reservation_number, reservation_date,
    customer_id, customer_name,
    container_id, container_item_id,
    material_id, color_id, product_id,
    reserved_quantity, unit,
    unit_price, total_amount,
    advance_amount, advance_received,
    status, notes, shipping_address_id, sales_order_id,
    created_by, created_at, updated_at
)
SELECT 
    tr.tenant_id, tr.company_id, tr.branch_id,
    tr.reservation_number, tr.reservation_date,
    tr.customer_id, tr.customer_name,
    c.id AS container_id,  -- تحويل من shipment_id
    NULL AS container_item_id,  -- لا يمكن تحويل تلقائيا
    tr.material_id, tr.color_id, tr.product_id,
    tr.reserved_quantity, tr.unit,
    tr.unit_price, tr.total_amount,
    tr.advance_amount, tr.advance_received,
    tr.status::VARCHAR, tr.notes, tr.shipping_address_id, tr.sales_order_id,
    tr.created_by, tr.created_at, tr.updated_at
FROM transit_reservations tr
JOIN containers c ON c.shipment_id = tr.shipment_id
WHERE NOT EXISTS (
    SELECT 1 FROM container_reservations cr 
    WHERE cr.reservation_number = tr.reservation_number 
      AND cr.tenant_id = tr.tenant_id
);


-- ═══════════════════════════════════════
-- القسم 4: تطبيق RLS على container_reservations
-- ═══════════════════════════════════════

ALTER TABLE container_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON container_reservations
    FOR SELECT USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY tenant_isolation_insert ON container_reservations
    FOR INSERT WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY tenant_isolation_update ON container_reservations
    FOR UPDATE USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY tenant_isolation_delete ON container_reservations
    FOR DELETE USING (tenant_id = (SELECT get_user_tenant_id()));


-- ═══════════════════════════════════════
-- القسم 5: إضافة أعمدة container_expenses الناقصة
-- ═══════════════════════════════════════

-- أعمدة إضافية للقيد المحاسبي
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS container_account_id UUID,
ADD COLUMN IF NOT EXISTS journal_description TEXT;

COMMENT ON COLUMN container_expenses.container_account_id IS 'حساب الكونتينر (بضاعة بالطريق) - يختاره المستخدم';
COMMENT ON COLUMN container_expenses.journal_description IS 'بيان القيد المحاسبي - يكتبه المستخدم';

-- إضافة أعمدة التكلفة التقريبية لبنود الكونتينر
ALTER TABLE container_items
ADD COLUMN IF NOT EXISTS estimated_unit_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS estimated_total_cost DECIMAL(15,2);

COMMENT ON COLUMN container_items.estimated_unit_cost IS 'تكلفة الوحدة التقديرية (سعر المورد + مصاريف تقديرية موزعة)';
COMMENT ON COLUMN container_items.estimated_total_cost IS 'إجمالي التكلفة التقديرية';


-- ═══════════════════════════════════════
-- القسم 6: أرشفة الجداول القديمة
-- ═══════════════════════════════════════

-- 6.1 إزالة FK الذي يربط containers بـ shipments
ALTER TABLE containers DROP CONSTRAINT IF EXISTS containers_shipment_id_fkey;

-- 6.2 إعادة تسمية الجداول (أرشفة بدون حذف)
ALTER TABLE IF EXISTS transit_reservations RENAME TO _archived_transit_reservations;
ALTER TABLE IF EXISTS shipment_documents RENAME TO _archived_shipment_documents;
ALTER TABLE IF EXISTS shipments_tracking RENAME TO _archived_shipments_tracking;
ALTER TABLE IF EXISTS shipment_items RENAME TO _archived_shipment_items;
ALTER TABLE IF EXISTS shipments RENAME TO _archived_shipments;

-- 6.3 تعطيل RLS على الجداول المؤرشفة (لمنع أي وصول)
-- ملاحظة: الجداول المؤرشفة لن تُستخدم، لكن نبقيها كاحتياط

-- 6.4 إضافة تعليقات توثيقية
COMMENT ON TABLE _archived_shipments IS '⚠️ مؤرشف 2026-02-17 — تم توحيد مع containers. لا تستخدم هذا الجدول.';
COMMENT ON TABLE _archived_shipment_items IS '⚠️ مؤرشف 2026-02-17 — تم توحيد مع container_items. لا تستخدم هذا الجدول.';
COMMENT ON TABLE _archived_transit_reservations IS '⚠️ مؤرشف 2026-02-17 — تم استبداله بـ container_reservations. لا تستخدم هذا الجدول.';
COMMENT ON TABLE _archived_shipment_documents IS '⚠️ مؤرشف 2026-02-17 — لا تستخدم هذا الجدول.';
COMMENT ON TABLE _archived_shipments_tracking IS '⚠️ مؤرشف 2026-02-17 — لا تستخدم هذا الجدول.';

-- 6.5 حذف عمود shipment_id من containers (لم يعد مطلوبا)
ALTER TABLE containers DROP COLUMN IF EXISTS shipment_id;


-- ═══════════════════════════════════════
-- القسم 7: توثيق التغييرات
-- ═══════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم توحيد نظام الكونتينرات بنجاح';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 التغييرات المنفذة:';
    RAISE NOTICE '  1. إضافة container_id لـ: purchase_invoices, purchase_receipts, payment_vouchers';
    RAISE NOTICE '  2. إضافة container_item_id لـ: purchase_receipt_items';
    RAISE NOTICE '  3. إنشاء جدول container_reservations (بديل transit_reservations)';
    RAISE NOTICE '  4. تطبيق RLS على container_reservations';
    RAISE NOTICE '  5. إضافة أعمدة المصاريف والتكلفة التقريبية';
    RAISE NOTICE '  6. أرشفة: shipments → _archived_shipments';
    RAISE NOTICE '  7. أرشفة: shipment_items → _archived_shipment_items';
    RAISE NOTICE '  8. أرشفة: shipment_documents → _archived_shipment_documents';
    RAISE NOTICE '  9. أرشفة: shipments_tracking → _archived_shipments_tracking';
    RAISE NOTICE ' 10. أرشفة: transit_reservations → _archived_transit_reservations';
    RAISE NOTICE ' 11. حذف containers.shipment_id';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الجداول النشطة الآن:';
    RAISE NOTICE '  ✅ containers — الكونتينرات';
    RAISE NOTICE '  ✅ container_items — بنود الكونتينر';
    RAISE NOTICE '  ✅ container_expenses — مصاريف الكونتينر';
    RAISE NOTICE '  ✅ container_reservations — حجوزات بضائع الطريق (جديد)';
    RAISE NOTICE '';
    RAISE NOTICE '🗄️ الجداول المؤرشفة (لا تستخدم):';
    RAISE NOTICE '  ⚠️ _archived_shipments';
    RAISE NOTICE '  ⚠️ _archived_shipment_items';
    RAISE NOTICE '  ⚠️ _archived_shipment_documents';
    RAISE NOTICE '  ⚠️ _archived_shipments_tracking';
    RAISE NOTICE '  ⚠️ _archived_transit_reservations';
    RAISE NOTICE '';
END $$;
