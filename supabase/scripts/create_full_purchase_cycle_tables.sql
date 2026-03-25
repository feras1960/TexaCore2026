-- ═══════════════════════════════════════════════════════════════════════════
-- سكربت إنشاء جداول دورة المشتريات الكاملة + البنية التحتية الأساسية (Bootstrap)
-- Version 5 (Zero-to-Hero Fix)
-- يحل مشكلة نقص الجداول الأساسية: الوحدات، المنتجات، الشحنات، ودورة الشراء
-- متوافق مع معايير TexaCore المحدثة (Smart RLS V2)
-- ═══════════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------------
-- 1. التأكد من وجود الدالة المساعدة لسياسات الأمان (V2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_tenant_id_fallback()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    get_user_tenant_id(), -- المحاولة الأولى 
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid -- المحاولة الثانية (Fallback)
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. جدول وحدات القياس (Units of Measure)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    type VARCHAR(20) DEFAULT 'count', -- count, length, weight, volume, time
    
    base_unit_id UUID REFERENCES units_of_measure(id),
    conversion_factor DECIMAL(15,6) DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- RLS for Units
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY unit_select_policy ON units_of_measure FOR SELECT USING (true); -- Public read common
CREATE POLICY unit_write_policy ON units_of_measure FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 3. جدول المنتجات (Products) - الحد الأدنى للعمل
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    sku VARCHAR(100) NOT NULL,
    name_ar VARCHAR(300) NOT NULL,
    name_en VARCHAR(300),
    
    base_unit_id UUID REFERENCES units_of_measure(id),
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, sku)
);

-- RLS for Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_select_policy ON products FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY product_write_policy ON products FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 4. جدول المتغيرات (Product Variants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    sku VARCHAR(100) NOT NULL,
    name_ar VARCHAR(300),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, sku)
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY variant_read ON product_variants FOR SELECT USING (true);
CREATE POLICY variant_write ON product_variants FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 5. جدول الشحنات (Shipments / Containers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    shipment_number VARCHAR(50) NOT NULL,
    container_number VARCHAR(50), 
    bill_of_lading VARCHAR(100), 
    
    supplier_id UUID REFERENCES suppliers(id),
    
    status VARCHAR(30) DEFAULT 'ordered', 
    
    total_goods_cost DECIMAL(15,2) DEFAULT 0,
    total_landed_cost DECIMAL(15,2) DEFAULT 0,
    
    notes TEXT,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, shipment_number)
);

-- ----------------------------------------------------------------------------
-- 6. جدول بنود الشحنة (Shipment Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id),
    material_id UUID, 
    
    expected_quantity DECIMAL(15,3),
    received_quantity DECIMAL(15,3) DEFAULT 0,
    unit_id UUID REFERENCES units_of_measure(id),
    
    unit_price DECIMAL(15,4),
    total_price DECIMAL(15,2),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. جدول طلبات الشراء (Purchase Requests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    request_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    requested_by UUID REFERENCES user_profiles(id),
    department VARCHAR(100),
    
    priority VARCHAR(20) DEFAULT 'normal',
    required_date DATE,
    
    status VARCHAR(20) DEFAULT 'pending',
    
    notes TEXT,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, request_number)
);

-- ----------------------------------------------------------------------------
-- 8. جدول عروض الأسعار (Purchase Quotations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    quotation_number VARCHAR(50) NOT NULL,
    supplier_quotation_number VARCHAR(100),
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    
    request_id UUID REFERENCES purchase_requests(id),
    
    valid_until DATE,
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(18,8) DEFAULT 1,
    
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'draft',
    
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, quotation_number)
);

-- ----------------------------------------------------------------------------
-- 9. جدول استلام البضائع (Purchase Receipts / GRN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- نوع الاستلام: 'direct' أو 'shipment'
    receipt_type VARCHAR(20) DEFAULT 'direct',

    shipment_id UUID REFERENCES shipments(id),
    order_id UUID REFERENCES purchase_orders(id), 
    invoice_id UUID REFERENCES purchase_invoices(id),
    
    supplier_id UUID REFERENCES suppliers(id), 
    warehouse_id UUID REFERENCES warehouses(id), 
    
    delivery_note_number VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'draft',
    
    notes TEXT,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, receipt_number)
);

-- ----------------------------------------------------------------------------
-- 10. جدول بنود الاستلام (Receipt Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    shipment_item_id UUID REFERENCES shipment_items(id),
    
    quantity_received DECIMAL(15,3) NOT NULL,
    quantity_accepted DECIMAL(15,3) DEFAULT 0,
    quantity_rejected DECIMAL(15,3) DEFAULT 0,
    
    unit_id UUID REFERENCES units_of_measure(id),
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. جدول المرتجعات (Purchase Returns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    return_number VARCHAR(50) NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    receipt_id UUID REFERENCES purchase_receipts(id),
    invoice_id UUID REFERENCES purchase_invoices(id),
    supplier_id UUID REFERENCES suppliers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    
    reason TEXT,
    
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SAR',
    
    status VARCHAR(20) DEFAULT 'draft',
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, return_number)
);

-- ----------------------------------------------------------------------------
-- 12. تفعيل سياسات الأمان (Final Apply RLS V2 Policies)
-- ----------------------------------------------------------------------------

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;

-- Shipments RLS
CREATE POLICY shipment_select_policy ON shipments FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_insert_policy ON shipments FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_update_policy ON shipments FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_delete_policy ON shipments FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Shipment Items RLS
CREATE POLICY shipment_item_select_policy ON shipment_items FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_item_insert_policy ON shipment_items FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_item_update_policy ON shipment_items FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY shipment_item_delete_policy ON shipment_items FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Purchase Requests RLS
CREATE POLICY request_select_policy ON purchase_requests FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY request_insert_policy ON purchase_requests FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY request_update_policy ON purchase_requests FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY request_delete_policy ON purchase_requests FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Purchase Quotations RLS
CREATE POLICY quotation_select_policy ON purchase_quotations FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY quotation_insert_policy ON purchase_quotations FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY quotation_update_policy ON purchase_quotations FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY quotation_delete_policy ON purchase_quotations FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Purchase Receipts RLS
CREATE POLICY receipt_select_policy ON purchase_receipts FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_insert_policy ON purchase_receipts FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_update_policy ON purchase_receipts FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_delete_policy ON purchase_receipts FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Purchase Receipt Items RLS
CREATE POLICY receipt_item_select_policy ON purchase_receipt_items FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_item_insert_policy ON purchase_receipt_items FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_item_update_policy ON purchase_receipt_items FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY receipt_item_delete_policy ON purchase_receipt_items FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));

-- Purchase Returns RLS
CREATE POLICY return_select_policy ON purchase_returns FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY return_insert_policy ON purchase_returns FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY return_update_policy ON purchase_returns FOR UPDATE USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY return_delete_policy ON purchase_returns FOR DELETE USING (is_platform_admin() OR (tenant_id = get_current_tenant_id_fallback() AND is_tenant_admin()));
