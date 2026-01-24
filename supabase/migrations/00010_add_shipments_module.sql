-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: إضافة موديول الشحنات والكونتينرات (Shipments & Landed Cost)
-- Migration: Add Shipments Module with Landed Cost Calculation
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. تعديل جدول الموردين - إضافة تصنيف المورد
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS vendor_category VARCHAR(30) DEFAULT 'goods_supplier';
-- goods_supplier: مورد بضائع
-- shipping_company: شركة شحن
-- customs_agent: مخلص جمركي
-- transport_company: شركة نقل
-- insurance_company: شركة تأمين
-- inspection_company: شركة فحص
-- other: أخرى

COMMENT ON COLUMN suppliers.vendor_category IS 'تصنيف المورد: goods_supplier, shipping_company, customs_agent, transport_company, insurance_company, inspection_company, other';

-- ═══════════════════════════════════════════════════════════════
-- 2. جدول الشحنات/الكونتينرات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    -- معلومات الشحنة
    shipment_number VARCHAR(50) NOT NULL,
    container_number VARCHAR(50),
    bill_of_lading VARCHAR(100),
    
    -- المورد والمصدر
    supplier_id UUID REFERENCES suppliers(id),
    origin_country VARCHAR(100),
    origin_port VARCHAR(100),
    destination_port VARCHAR(100),
    
    -- التواريخ
    order_date DATE,
    shipping_date DATE,
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    customs_clearance_date DATE,
    delivery_date DATE,
    received_date DATE,
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'ordered',
    -- ordered: تم الطلب
    -- loading: جاري التحميل
    -- shipped: تم الشحن
    -- in_transit: بالطريق
    -- arrived_port: وصل الميناء
    -- customs: في الجمارك
    -- inspection: فحص
    -- cleared: تم التخليص
    -- delivery: جاري التوصيل
    -- received: تم الاستلام
    
    -- التكاليف
    goods_currency VARCHAR(3) DEFAULT 'USD',
    goods_exchange_rate DECIMAL(18,8) DEFAULT 1,
    provisional_goods_cost DECIMAL(15,2) DEFAULT 0,
    final_goods_cost DECIMAL(15,2) DEFAULT 0,
    total_expected_costs DECIMAL(15,2) DEFAULT 0,
    total_actual_costs DECIMAL(15,2) DEFAULT 0,
    total_landed_cost DECIMAL(15,2) DEFAULT 0,
    
    -- طريقة توزيع المصاريف
    cost_allocation_method VARCHAR(20) DEFAULT 'by_value',
    -- by_value: حسب القيمة
    -- by_quantity: حسب الكمية
    -- by_weight: حسب الوزن
    -- manual: يدوي
    
    -- حالة التكلفة
    is_cost_finalized BOOLEAN DEFAULT false,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES user_profiles(id),
    
    -- قيود التسوية
    provisional_journal_entry_id UUID REFERENCES journal_entries(id),
    final_journal_entry_id UUID REFERENCES journal_entries(id),
    
    -- أمر الشراء المرتبط
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, shipment_number)
);

COMMENT ON TABLE shipments IS 'الشحنات والكونتينرات - Shipments/Containers for Landed Cost';

-- ═══════════════════════════════════════════════════════════════
-- 3. جدول بنود الشحنة (المواد المتوقعة)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- المادة
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    product_id UUID REFERENCES products(id),
    
    -- الوصف
    item_description VARCHAR(500),
    
    -- الكميات
    expected_rolls INT,
    received_rolls INT DEFAULT 0,
    expected_quantity DECIMAL(15,3),
    received_quantity DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'meter',
    
    -- الكميات المحجوزة والمتاحة
    reserved_quantity DECIMAL(15,3) DEFAULT 0,
    sold_quantity DECIMAL(15,3) DEFAULT 0,
    
    -- السعر من المورد
    unit_price DECIMAL(15,4),
    total_price DECIMAL(15,2),
    
    -- التكاليف
    provisional_unit_cost DECIMAL(15,4),
    final_unit_cost DECIMAL(15,4),
    allocated_costs DECIMAL(15,2) DEFAULT 0,
    total_provisional_cost DECIMAL(15,2),
    total_final_cost DECIMAL(15,2),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE shipment_items IS 'بنود الشحنة - المواد المتوقعة في كل شحنة';

-- ═══════════════════════════════════════════════════════════════
-- 4. جدول مصاريف الشحنة (متوقع + فعلي)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shipment_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- نوع المصروف
    cost_type VARCHAR(30) NOT NULL,
    -- freight: شحن بحري/جوي
    -- customs_duty: رسوم جمركية
    -- taxes: ضرائب
    -- insurance: تأمين
    -- clearance: تخليص جمركي
    -- transport: نقل داخلي
    -- storage: تخزين
    -- demurrage: غرامات تأخير
    -- inspection: فحص
    -- other: أخرى
    
    -- الشركة/الحساب (مثل ساشا للشحن)
    vendor_id UUID REFERENCES suppliers(id),
    vendor_account_id UUID REFERENCES chart_of_accounts(id),
    vendor_name VARCHAR(200),
    
    description TEXT,
    
    -- المبلغ المتوقع (تقديري/شفهي)
    expected_amount DECIMAL(15,2),
    expected_currency VARCHAR(3) DEFAULT 'USD',
    expected_exchange_rate DECIMAL(18,8) DEFAULT 1,
    expected_amount_in_base DECIMAL(15,2),
    expected_notes TEXT,
    
    -- المبلغ الفعلي (من الفاتورة)
    actual_amount DECIMAL(15,2),
    actual_currency VARCHAR(3) DEFAULT 'USD',
    actual_exchange_rate DECIMAL(18,8) DEFAULT 1,
    actual_amount_in_base DECIMAL(15,2),
    
    -- حالة الفاتورة
    invoice_status VARCHAR(20) DEFAULT 'expected',
    -- expected: متوقع (لم تصل الفاتورة)
    -- invoiced: مُفوتر (وصلت الفاتورة)
    -- cancelled: ملغي
    
    invoice_number VARCHAR(100),
    invoice_date DATE,
    
    -- حالة الدفع
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    -- unpaid: غير مدفوع
    -- partial: مدفوع جزئياً
    -- paid: مدفوع بالكامل
    
    payment_voucher_id UUID REFERENCES payment_vouchers(id),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    paid_date DATE,
    
    -- القيد المحاسبي
    journal_entry_id UUID REFERENCES journal_entries(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE shipment_costs IS 'مصاريف الشحنة - المصاريف المتوقعة والفعلية لحساب التكلفة';

-- ═══════════════════════════════════════════════════════════════
-- 5. جدول الحجوزات على البضائع بالطريق
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transit_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    reservation_number VARCHAR(50) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- العميل
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(200),
    
    -- مصدر البضاعة
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    shipment_item_id UUID REFERENCES shipment_items(id),
    
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
    advance_receipt_id UUID REFERENCES payment_receipts(id),
    advance_journal_entry_id UUID REFERENCES journal_entries(id),
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في الانتظار
    -- confirmed: مؤكد (استلمنا الدفعة)
    -- ready: جاهز للتسليم (وصلت البضاعة)
    -- delivered: تم التسليم
    -- cancelled: ملغي
    
    -- التسليم
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    sales_invoice_id UUID REFERENCES sales_invoices(id),
    
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, reservation_number)
);

COMMENT ON TABLE transit_reservations IS 'الحجوزات على البضائع بالطريق - ملزمة وتنقص الكمية المتاحة';

-- ═══════════════════════════════════════════════════════════════
-- 6. تعديل جدول الرولونات - إضافة حقول الشحنة والتكلفة
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE fabric_rolls 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id),
ADD COLUMN IF NOT EXISTS shipment_item_id UUID REFERENCES shipment_items(id),
ADD COLUMN IF NOT EXISTS supplier_unit_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS estimated_landed_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS final_landed_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS cost_status VARCHAR(20) DEFAULT 'estimated';
-- estimated: تقريبي (الكونتينر مفتوح)
-- finalized: نهائي (الكونتينر مُغلق)

COMMENT ON COLUMN fabric_rolls.shipment_id IS 'الشحنة/الكونتينر الذي وصل فيه الرولون';
COMMENT ON COLUMN fabric_rolls.estimated_landed_cost IS 'سعر رأس المال التقريبي للوحدة';
COMMENT ON COLUMN fabric_rolls.final_landed_cost IS 'سعر رأس المال النهائي للوحدة';
COMMENT ON COLUMN fabric_rolls.cost_status IS 'حالة التكلفة: estimated أو finalized';

-- ═══════════════════════════════════════════════════════════════
-- 7. تعديل جدول سندات الصرف - إضافة حقول الشحنة
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE payment_vouchers 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id),
ADD COLUMN IF NOT EXISTS shipment_cost_id UUID REFERENCES shipment_costs(id);

COMMENT ON COLUMN payment_vouchers.shipment_id IS 'الشحنة المرتبطة بالدفعة';
COMMENT ON COLUMN payment_vouchers.shipment_cost_id IS 'مصروف الشحنة المدفوع';

-- ═══════════════════════════════════════════════════════════════
-- 8. الفهارس (Indexes)
-- ═══════════════════════════════════════════════════════════════

-- Shipments indexes
CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_number ON shipments(tenant_id, shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipments_container ON shipments(container_number);
CREATE INDEX IF NOT EXISTS idx_shipments_cost_finalized ON shipments(is_cost_finalized);

-- Shipment items indexes
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_material ON shipment_items(material_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_product ON shipment_items(product_id);

-- Shipment costs indexes
CREATE INDEX IF NOT EXISTS idx_shipment_costs_shipment ON shipment_costs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_costs_vendor ON shipment_costs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipment_costs_type ON shipment_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_shipment_costs_invoice_status ON shipment_costs(invoice_status);
CREATE INDEX IF NOT EXISTS idx_shipment_costs_payment_status ON shipment_costs(payment_status);

-- Transit reservations indexes
CREATE INDEX IF NOT EXISTS idx_transit_reservations_tenant ON transit_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transit_reservations_shipment ON transit_reservations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_transit_reservations_customer ON transit_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_transit_reservations_status ON transit_reservations(status);

-- Fabric rolls shipment index
CREATE INDEX IF NOT EXISTS idx_fabric_rolls_shipment ON fabric_rolls(shipment_id);
CREATE INDEX IF NOT EXISTS idx_fabric_rolls_cost_status ON fabric_rolls(cost_status);

-- ═══════════════════════════════════════════════════════════════
-- 9. سياسات RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_reservations ENABLE ROW LEVEL SECURITY;

-- Shipments policies
DROP POLICY IF EXISTS "Enable all - shipments" ON shipments;
CREATE POLICY "Enable all - shipments" ON shipments FOR ALL USING (true) WITH CHECK (true);

-- Shipment items policies
DROP POLICY IF EXISTS "Enable all - shipment_items" ON shipment_items;
CREATE POLICY "Enable all - shipment_items" ON shipment_items FOR ALL USING (true) WITH CHECK (true);

-- Shipment costs policies
DROP POLICY IF EXISTS "Enable all - shipment_costs" ON shipment_costs;
CREATE POLICY "Enable all - shipment_costs" ON shipment_costs FOR ALL USING (true) WITH CHECK (true);

-- Transit reservations policies
DROP POLICY IF EXISTS "Enable all - transit_reservations" ON transit_reservations;
CREATE POLICY "Enable all - transit_reservations" ON transit_reservations FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 10. دالة حساب الكمية المتاحة للحجز
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_shipment_item_available_quantity(p_shipment_item_id UUID)
RETURNS DECIMAL(15,3)
LANGUAGE plpgsql
AS $$
DECLARE
    v_expected_quantity DECIMAL(15,3);
    v_reserved_quantity DECIMAL(15,3);
    v_sold_quantity DECIMAL(15,3);
BEGIN
    SELECT 
        COALESCE(expected_quantity, 0),
        COALESCE(reserved_quantity, 0),
        COALESCE(sold_quantity, 0)
    INTO v_expected_quantity, v_reserved_quantity, v_sold_quantity
    FROM shipment_items
    WHERE id = p_shipment_item_id;
    
    RETURN v_expected_quantity - v_reserved_quantity - v_sold_quantity;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 11. دالة حساب التكلفة المتوقعة للوحدة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_estimated_unit_cost(p_shipment_id UUID)
RETURNS TABLE (
    item_id UUID,
    material_id UUID,
    unit VARCHAR(20),
    supplier_unit_cost DECIMAL(15,4),
    allocated_cost_per_unit DECIMAL(15,4),
    estimated_landed_cost DECIMAL(15,4)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_goods_cost DECIMAL(15,2);
    v_total_expected_costs DECIMAL(15,2);
    v_allocation_method VARCHAR(20);
BEGIN
    -- Get shipment info
    SELECT 
        COALESCE(provisional_goods_cost, 0),
        COALESCE(total_expected_costs, 0),
        cost_allocation_method
    INTO v_total_goods_cost, v_total_expected_costs, v_allocation_method
    FROM shipments
    WHERE id = p_shipment_id;
    
    -- Calculate and return
    RETURN QUERY
    SELECT 
        si.id AS item_id,
        si.material_id,
        si.unit,
        si.unit_price AS supplier_unit_cost,
        CASE 
            WHEN v_allocation_method = 'by_value' AND v_total_goods_cost > 0 THEN
                (si.total_price / v_total_goods_cost) * v_total_expected_costs / NULLIF(si.expected_quantity, 0)
            WHEN v_allocation_method = 'by_quantity' THEN
                v_total_expected_costs / NULLIF((SELECT SUM(expected_quantity) FROM shipment_items WHERE shipment_id = p_shipment_id), 0)
            ELSE
                0
        END AS allocated_cost_per_unit,
        si.unit_price + CASE 
            WHEN v_allocation_method = 'by_value' AND v_total_goods_cost > 0 THEN
                (si.total_price / v_total_goods_cost) * v_total_expected_costs / NULLIF(si.expected_quantity, 0)
            WHEN v_allocation_method = 'by_quantity' THEN
                v_total_expected_costs / NULLIF((SELECT SUM(expected_quantity) FROM shipment_items WHERE shipment_id = p_shipment_id), 0)
            ELSE
                0
        END AS estimated_landed_cost
    FROM shipment_items si
    WHERE si.shipment_id = p_shipment_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 12. Trigger لتحديث الكميات عند الحجز
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_shipment_item_reserved_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE shipment_items
        SET reserved_quantity = COALESCE(reserved_quantity, 0) + NEW.reserved_quantity
        WHERE id = NEW.shipment_item_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE shipment_items
        SET reserved_quantity = COALESCE(reserved_quantity, 0) - OLD.reserved_quantity + NEW.reserved_quantity
        WHERE id = NEW.shipment_item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE shipment_items
        SET reserved_quantity = COALESCE(reserved_quantity, 0) - OLD.reserved_quantity
        WHERE id = OLD.shipment_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_reserved_quantity ON transit_reservations;
CREATE TRIGGER trg_update_reserved_quantity
    AFTER INSERT OR UPDATE OR DELETE ON transit_reservations
    FOR EACH ROW EXECUTE FUNCTION update_shipment_item_reserved_quantity();

-- ═══════════════════════════════════════════════════════════════
-- 13. Trigger لتحديث إجمالي المصاريف في الشحنة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_shipment_total_costs()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shipments
    SET 
        total_expected_costs = (
            SELECT COALESCE(SUM(COALESCE(expected_amount_in_base, expected_amount, 0)), 0)
            FROM shipment_costs
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
            AND invoice_status != 'cancelled'
        ),
        total_actual_costs = (
            SELECT COALESCE(SUM(COALESCE(actual_amount_in_base, actual_amount, 0)), 0)
            FROM shipment_costs
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
            AND invoice_status = 'invoiced'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.shipment_id, OLD.shipment_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_shipment_costs ON shipment_costs;
CREATE TRIGGER trg_update_shipment_costs
    AFTER INSERT OR UPDATE OR DELETE ON shipment_costs
    FOR EACH ROW EXECUTE FUNCTION update_shipment_total_costs();

-- ═══════════════════════════════════════════════════════════════
-- إنهاء
-- ═══════════════════════════════════════════════════════════════

COMMENT ON SCHEMA public IS 'Textile ERP with Shipments & Landed Cost Module - v1.0';
