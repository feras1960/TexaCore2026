-- Create Payments System and Parties View

-- 1. Create Parties View (Unified Lookup)
CREATE OR REPLACE VIEW parties AS
SELECT 
    id, 
    name_ar, 
    name_en, 
    'supplier'::text as type, 
    company_id 
FROM suppliers
UNION ALL
SELECT 
    id, 
    name_ar, 
    name_en, 
    'customer'::text as type, 
    company_id 
FROM customers;

-- 2. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID REFERENCES companies(id),
    
    payment_number VARCHAR(50),
    reference_number VARCHAR(50),
    date DATE DEFAULT CURRENT_DATE,
    
    type VARCHAR(20) CHECK (type IN ('payment', 'receipt')), -- 'payment' = Outgoing, 'receipt' = Incoming
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled', 'void')),
    
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate NUMERIC(10, 4) DEFAULT 1,
    
    method VARCHAR(50) DEFAULT 'cash', -- 'cash', 'bank_transfer', 'check'
    
    -- Specific FKs for joining (PostgREST best practice)
    supplier_id UUID REFERENCES suppliers(id),
    customer_id UUID REFERENCES customers(id),
    
    description TEXT,
    notes TEXT,
    
    -- Links to specific entities
    shipment_id UUID REFERENCES shipments(id), -- For Container Account Payments
    purchase_invoice_id UUID REFERENCES purchase_invoices(id), -- Direct Invoice Payment
    sales_invoice_id UUID REFERENCES sales_invoices(id) -- Direct Sales Receipt
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_shipment_id ON payments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);

-- 4. RLS for Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users based on company_id" ON payments;

CREATE POLICY "Enable all access for authenticated users based on company_id" ON payments
    FOR ALL
    USING (can_access_company(company_id))
    WITH CHECK (can_access_company(company_id));

-- 5. Helper Function to trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
