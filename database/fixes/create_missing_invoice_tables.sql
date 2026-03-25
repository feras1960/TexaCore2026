-- ═══════════════════════════════════════════════════════════════════════════
-- إنشاء جداول الفواتير المفقودة فقط
-- Create Missing Invoice Tables Only
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يُنشئ فقط الجداول المفقودة التي يحتاجها fix_accounting_triggers.sql
-- 
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '⚡ إنشاء جداول الفواتير المفقودة';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. جدول فواتير المبيعات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    branch_id UUID,
    
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    customer_id UUID,
    customer_name VARCHAR(200),
    
    status VARCHAR(20) DEFAULT 'draft',
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(18,8) DEFAULT 1,
    
    journal_entry_id UUID,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, company_id, invoice_number)
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: sales_invoices'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. جدول فواتير المشتريات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    branch_id UUID,
    
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    supplier_id UUID,
    supplier_name VARCHAR(200),
    
    status VARCHAR(20) DEFAULT 'draft',
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(18,8) DEFAULT 1,
    
    journal_entry_id UUID,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_purchase_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, company_id, invoice_number)
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: purchase_invoices'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. جدول سندات القبض
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    branch_id UUID,
    
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    customer_id UUID,
    customer_name VARCHAR(200),
    
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    
    status VARCHAR(20) DEFAULT 'draft',
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(18,8) DEFAULT 1,
    
    journal_entry_id UUID,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_receipt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_receipt_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, company_id, receipt_number)
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: payment_receipts'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. جدول سندات الصرف
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    branch_id UUID,
    
    voucher_number VARCHAR(50) NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    supplier_id UUID,
    supplier_name VARCHAR(200),
    
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    
    status VARCHAR(20) DEFAULT 'draft',
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(18,8) DEFAULT 1,
    
    journal_entry_id UUID,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_voucher_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_voucher_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, company_id, voucher_number)
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: payment_vouchers'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. جدول بنود فواتير المبيعات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    line_number INT DEFAULT 1,
    
    product_id UUID,
    variant_id UUID,
    warehouse_id UUID,
    unit_id UUID,
    
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    
    subtotal DECIMAL(15,2),
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2),
    
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sales_item_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: sales_invoice_items'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. جدول حركات المخزون (للـ Trigger)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    
    movement_number VARCHAR(50) NOT NULL,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    movement_type VARCHAR(50) NOT NULL,
    
    product_id UUID,
    variant_id UUID,
    
    from_warehouse_id UUID,
    to_warehouse_id UUID,
    
    quantity DECIMAL(15,3) NOT NULL,
    unit_id UUID,
    
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(50),
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_movement_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_movement_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: inventory_movements'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. جدول المستودعات (للـ Trigger)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    
    location TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_warehouse_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_warehouse_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, company_id, code)
);

DO $$ BEGIN RAISE NOTICE '✅ تم إنشاء: warehouses'; END $$;

-- ═══════════════════════════════════════════════════════════════
-- النتيجة النهائية
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم إنشاء جميع الجداول المطلوبة بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ الجداول المُنشأة:';
    RAISE NOTICE '   1. sales_invoices';
    RAISE NOTICE '   2. purchase_invoices';
    RAISE NOTICE '   3. payment_receipts';
    RAISE NOTICE '   4. payment_vouchers';
    RAISE NOTICE '   5. sales_invoice_items';
    RAISE NOTICE '   6. inventory_movements';
    RAISE NOTICE '   7. warehouses';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '   • شغّل: fix_accounting_triggers.sql';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
