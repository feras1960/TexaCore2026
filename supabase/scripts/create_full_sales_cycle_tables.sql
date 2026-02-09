-- ═══════════════════════════════════════════════════════════════════════════
-- سكربت إنشاء جداول دورة المبيعات الكاملة (Sales Bootstrap)
-- Version 2 (Zero-to-Hero Fix)
-- يحل مشكلة نقص جداول المبيعات الأساسية (العملاء، الأوامر، الفواتير) ويكمل الدورة
-- متوافق مع معايير TexaCore المحدثة (Smart RLS V2)
-- ═══════════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------------
-- 1. التأكد من وجود الدالة المساعدة لسياسات الأمان
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_tenant_id_fallback()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    get_user_tenant_id(),
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. جدول العملاء (Customers) - الحد الأدنى للعمل
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    code VARCHAR(50),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    email VARCHAR(200),
    phone VARCHAR(50),
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_select_policy ON customers FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY customer_write_policy ON customers FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 3. جدول عروض الأسعار (Sales Quotations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    quotation_number VARCHAR(50) NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, quotation_number)
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_select_policy ON quotations FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY quote_write_policy ON quotations FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 4. جدول أوامر البيع (Sales Orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    quotation_id UUID REFERENCES quotations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(200),
    
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, order_number)
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_select_policy ON sales_orders FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY so_write_policy ON sales_orders FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 5. جدول فواتير المبيعات (Sales Invoices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    order_id UUID REFERENCES sales_orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    is_posted BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, invoice_number)
);

ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY si_select_policy ON sales_invoices FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY si_write_policy ON sales_invoices FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 6. جدول بنود الفاتورة (Invoice Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    order_id UUID REFERENCES sales_orders(id),
    
    product_id UUID REFERENCES products(id),
    
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY sii_select_policy ON sales_invoice_items FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY sii_write_policy ON sales_invoice_items FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 7. جدول أذونات التسليم (Sales Deliveries)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    delivery_number VARCHAR(50) NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    order_id UUID REFERENCES sales_orders(id),
    invoice_id UUID REFERENCES sales_invoices(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    
    status VARCHAR(20) DEFAULT 'draft',
    
    driver_name VARCHAR(100),
    vehicle_plate VARCHAR(50),
    notes TEXT,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, delivery_number)
);

ALTER TABLE sales_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_select_policy ON sales_deliveries FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY delivery_write_policy ON sales_deliveries FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 8. جدول بنود التسليم (Delivery Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    delivery_id UUID NOT NULL REFERENCES sales_deliveries(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    quantity_delivered DECIMAL(15,3) NOT NULL,
    unit_id UUID REFERENCES units_of_measure(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_delivery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY di_select_policy ON sales_delivery_items FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY di_write_policy ON sales_delivery_items FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 9. جدول مرتجعات المبيعات (Sales Returns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    return_number VARCHAR(50) NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    invoice_id UUID REFERENCES sales_invoices(id),
    delivery_id UUID REFERENCES sales_deliveries(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
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

ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_select_policy ON sales_returns FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY sr_write_policy ON sales_returns FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- ----------------------------------------------------------------------------
-- 10. جدول الحجوزات على البضائع بالطريق (Transit Reservations) - Link Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transit_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    reservation_number VARCHAR(50) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    customer_id UUID REFERENCES customers(id),
    sales_order_id UUID REFERENCES sales_orders(id),
    
    shipment_id UUID REFERENCES shipments(id),
    shipment_item_id UUID REFERENCES shipment_items(id),
    
    product_id UUID REFERENCES products(id),
    reserved_quantity DECIMAL(15,3) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, reservation_number)
);

ALTER TABLE transit_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tr_select_policy ON transit_reservations FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
CREATE POLICY tr_write_policy ON transit_reservations FOR ALL USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());
