-- ═══════════════════════════════════════════════════════════════════════════
-- سكربت إصلاح شامل لدورة المشتريات والمبيعات والجداول المرتبطة
-- يحل مشاكل العلاقات (suppliers vs parties) ويضمن وجود الأعمدة المطلوبة
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. التأكد من جدول الموردين (suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID DEFAULT get_user_tenant_id()
);

-- 2. التأكد من جدول العملاء (customers)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID DEFAULT get_user_tenant_id()
);

-- 3. إصلاح جدول فواتير المشتريات (purchase_invoices)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    supplier_id UUID REFERENCES suppliers(id), -- Fix relation
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID DEFAULT get_user_tenant_id(),
    currency VARCHAR(10) DEFAULT 'SAR'
);

-- 4. إصلاح جدول استلام المشتريات (purchase_receipts)
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    receipt_number VARCHAR(50),
    receipt_date DATE,
    supplier_id UUID REFERENCES suppliers(id),
    shipment_id UUID REFERENCES shipments(id), -- Ensure shipment relation
    receipt_type VARCHAR(20) DEFAULT 'direct', -- direct / shipment
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID DEFAULT get_user_tenant_id()
);

-- 5. إصلاح أي نقص في الأعمدة (Idempotent)
DO $$ 
BEGIN 
    -- Add shipment_id to purchase_receipts if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_receipts' AND column_name='shipment_id') THEN
        ALTER TABLE purchase_receipts ADD COLUMN shipment_id UUID REFERENCES shipments(id);
    END IF;
    
    -- Add receipt_type to purchase_receipts if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_receipts' AND column_name='receipt_type') THEN
        ALTER TABLE purchase_receipts ADD COLUMN receipt_type VARCHAR(20) DEFAULT 'direct';
    END IF;

    -- Add container_number to shipments if missing (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='container_number') THEN
        ALTER TABLE shipments ADD COLUMN container_number VARCHAR(50);
    END IF;
END $$;

-- 6. تفعيل RLS (To be safe)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;

-- 7. سياسات عامة متساهلة للتطوير (Skip if strict needed)
DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
CREATE POLICY "Enable read access for all users" ON suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_invoices;
CREATE POLICY "Enable read access for all users" ON purchase_invoices FOR SELECT USING (true);
