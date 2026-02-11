-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: تحسين بنود الكونتينر — ربط الفواتير والموردين
-- Enhancement: Link shipment_items to purchase invoices and suppliers
-- Date: 2026-02-11
-- Phase: 13B-1
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة أعمدة الربط لجدول shipment_items
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE shipment_items
  -- أعمدة أساسية قد تكون مفقودة من الهجرة الأصلية
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES fabric_materials(id),
  ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES fabric_colors(id),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS item_description VARCHAR(500),
  ADD COLUMN IF NOT EXISTS expected_rolls INT,
  ADD COLUMN IF NOT EXISTS received_rolls INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_quantity DECIMAL(15,3),
  ADD COLUMN IF NOT EXISTS received_quantity DECIMAL(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'meter',
  ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_quantity DECIMAL(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS provisional_unit_cost DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS final_unit_cost DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS allocated_costs DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_provisional_cost DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS total_final_cost DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  -- أعمدة جديدة (Phase 13B)
  ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS material_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_sell_price DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN shipment_items.purchase_invoice_id IS 'فاتورة المشتريات المرتبطة بالبند';
COMMENT ON COLUMN shipment_items.supplier_id IS 'المورد — يدعم كونتينرات متعددة الموردين';
COMMENT ON COLUMN shipment_items.supplier_name IS 'اسم المورد (denormalized للأداء)';
COMMENT ON COLUMN shipment_items.invoice_number IS 'رقم الفاتورة (denormalized للأداء)';
COMMENT ON COLUMN shipment_items.material_code IS 'كود المادة (denormalized للفلاتر)';
COMMENT ON COLUMN shipment_items.color_name IS 'اسم اللون (denormalized للفلاتر)';
COMMENT ON COLUMN shipment_items.weight_kg IS 'الوزن بالكيلوغرام — لتوزيع المصاريف حسب الوزن';
COMMENT ON COLUMN shipment_items.expected_sell_price IS 'السعر المتوقع للبيع — يراه فريق المبيعات فقط';

-- ═══════════════════════════════════════════════════════════════
-- 2. فهارس الأداء
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_shipment_items_invoice
  ON shipment_items(purchase_invoice_id);

CREATE INDEX IF NOT EXISTS idx_shipment_items_supplier
  ON shipment_items(supplier_id);

CREATE INDEX IF NOT EXISTS idx_shipment_items_material
  ON shipment_items(material_id);

CREATE INDEX IF NOT EXISTS idx_shipment_items_color
  ON shipment_items(color_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. View مساعد — بنود الكونتينر (بدون JOINs — يعتمد على الأعمدة المحلية)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_shipment_items_full AS
SELECT
    si.id,
    si.tenant_id,
    si.shipment_id,
    si.material_id,
    si.color_id,
    si.product_id,
    si.purchase_invoice_id,
    si.supplier_id,
    
    -- أسماء (denormalized)
    si.item_description AS item_name,
    si.material_code,
    si.color_name,
    si.supplier_name,
    COALESCE(si.invoice_number, '') AS invoice_number,
    
    -- الكميات
    si.expected_rolls,
    si.received_rolls,
    si.expected_quantity,
    si.received_quantity,
    si.unit,
    si.reserved_quantity,
    si.sold_quantity,
    (COALESCE(si.expected_quantity, 0) - COALESCE(si.reserved_quantity, 0) - COALESCE(si.sold_quantity, 0)) AS available_quantity,
    
    -- الأسعار والتكاليف
    si.unit_price,
    si.total_price,
    si.provisional_unit_cost,
    si.final_unit_cost,
    si.allocated_costs,
    si.total_provisional_cost,
    si.total_final_cost,
    si.expected_sell_price,
    si.weight_kg,
    
    si.notes,
    si.created_at

FROM shipment_items si;

COMMENT ON VIEW v_shipment_items_full IS 'عرض موحد لبنود الكونتينر — يعتمد على الأعمدة المحلية (denormalized) فقط';

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة مساعدة — إحصائيات بنود كونتينر
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_shipment_items_summary(p_shipment_id UUID)
RETURNS TABLE (
    total_items BIGINT,
    total_expected_quantity DECIMAL(15,3),
    total_received_quantity DECIMAL(15,3),
    total_reserved_quantity DECIMAL(15,3),
    total_available_quantity DECIMAL(15,3),
    total_goods_value DECIMAL(15,2),
    total_provisional_cost DECIMAL(15,2),
    total_final_cost DECIMAL(15,2),
    unique_suppliers BIGINT,
    unique_invoices BIGINT,
    unique_materials BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_items,
        COALESCE(SUM(si.expected_quantity), 0)::DECIMAL(15,3) AS total_expected_quantity,
        COALESCE(SUM(si.received_quantity), 0)::DECIMAL(15,3) AS total_received_quantity,
        COALESCE(SUM(si.reserved_quantity), 0)::DECIMAL(15,3) AS total_reserved_quantity,
        COALESCE(SUM(
            COALESCE(si.expected_quantity, 0) - COALESCE(si.reserved_quantity, 0) - COALESCE(si.sold_quantity, 0)
        ), 0)::DECIMAL(15,3) AS total_available_quantity,
        COALESCE(SUM(si.total_price), 0)::DECIMAL(15,2) AS total_goods_value,
        COALESCE(SUM(si.total_provisional_cost), 0)::DECIMAL(15,2) AS total_provisional_cost,
        COALESCE(SUM(si.total_final_cost), 0)::DECIMAL(15,2) AS total_final_cost,
        COUNT(DISTINCT si.supplier_id)::BIGINT AS unique_suppliers,
        COUNT(DISTINCT si.purchase_invoice_id)::BIGINT AS unique_invoices,
        COUNT(DISTINCT si.material_id)::BIGINT AS unique_materials
    FROM shipment_items si
    WHERE si.shipment_id = p_shipment_id;
END;
$$;

COMMENT ON FUNCTION get_shipment_items_summary IS 'إحصائيات بنود كونتينر: عدد المواد، الكميات، القيم، عدد الموردين والفواتير';

-- ═══════════════════════════════════════════════════════════════
-- 5. إضافة حقل sell_price_margin لحساب السعر المتوقع
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS default_margin_percent DECIMAL(5,2) DEFAULT 20.00;

COMMENT ON COLUMN shipments.default_margin_percent IS 'نسبة هامش الربح الافتراضية لحساب السعر المتوقع للعميل';

-- ═══════════════════════════════════════════════════════════════
-- 6. مواءمة سياسات RLS مع النمط الموحد
-- Align RLS policies with the unified pattern (auth.uid() IS NOT NULL)
-- ═══════════════════════════════════════════════════════════════

-- أولاً: shipment_items (مضمون الوجود)
DROP POLICY IF EXISTS "Enable all - shipment_items" ON shipment_items;
DROP POLICY IF EXISTS "shipment_items_read" ON shipment_items;
DROP POLICY IF EXISTS "shipment_items_write" ON shipment_items;

CREATE POLICY "shipment_items_read" ON shipment_items 
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "shipment_items_write" ON shipment_items 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ثانياً: shipments (مضمون الوجود)
DROP POLICY IF EXISTS "Enable all - shipments" ON shipments;
DROP POLICY IF EXISTS "shipments_read" ON shipments;
DROP POLICY IF EXISTS "shipments_write" ON shipments;

CREATE POLICY "shipments_read" ON shipments 
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "shipments_write" ON shipments 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ثالثاً: الجداول التي قد لا تكون موجودة
DO $$
BEGIN
    -- transit_reservations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transit_reservations') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Enable all - transit_reservations" ON transit_reservations';
        EXECUTE 'DROP POLICY IF EXISTS "transit_reservations_read" ON transit_reservations';
        EXECUTE 'DROP POLICY IF EXISTS "transit_reservations_write" ON transit_reservations';
        EXECUTE 'CREATE POLICY "transit_reservations_read" ON transit_reservations FOR SELECT USING (auth.uid() IS NOT NULL)';
        EXECUTE 'CREATE POLICY "transit_reservations_write" ON transit_reservations FOR ALL USING (auth.uid() IS NOT NULL)';
        RAISE NOTICE '  ✅ transit_reservations RLS aligned';
    ELSE
        RAISE NOTICE '  ⏭️ transit_reservations does not exist, skipping';
    END IF;

    -- shipment_costs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipment_costs') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Enable all - shipment_costs" ON shipment_costs';
        EXECUTE 'DROP POLICY IF EXISTS "shipment_costs_read" ON shipment_costs';
        EXECUTE 'DROP POLICY IF EXISTS "shipment_costs_write" ON shipment_costs';
        EXECUTE 'CREATE POLICY "shipment_costs_read" ON shipment_costs FOR SELECT USING (auth.uid() IS NOT NULL)';
        EXECUTE 'CREATE POLICY "shipment_costs_write" ON shipment_costs FOR ALL USING (auth.uid() IS NOT NULL)';
        RAISE NOTICE '  ✅ shipment_costs RLS aligned';
    ELSE
        RAISE NOTICE '  ⏭️ shipment_costs does not exist, skipping';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. تحديث PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
-- 8. إنهاء وتوثيق
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed: shipment_items enhancements';
    RAISE NOTICE '  • Added purchase_invoice_id, supplier_id, supplier_name, invoice_number';
    RAISE NOTICE '  • Added material_code, color_name, weight_kg, expected_sell_price';
    RAISE NOTICE '  • Created v_shipment_items_full view';
    RAISE NOTICE '  • Created get_shipment_items_summary function';
    RAISE NOTICE '  • Added default_margin_percent to shipments';
    RAISE NOTICE '  • Aligned RLS for shipment_items, shipments, transit_reservations, shipment_costs';
    RAISE NOTICE '  • Pattern: auth.uid() IS NOT NULL (unified)';
END $$;

