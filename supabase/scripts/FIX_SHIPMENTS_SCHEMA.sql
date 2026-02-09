-- Comprehensive Fix for Shipments Schema and Relationships

-- 1. Ensure shipments table exists with ALL necessary columns
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID REFERENCES companies(id), -- Ensure company link
    status VARCHAR(50) DEFAULT 'ordered',
    shipment_number VARCHAR(50) UNIQUE,
    container_number VARCHAR(50),
    bill_of_lading VARCHAR(50), 
    supplier_id UUID REFERENCES suppliers(id), -- Ensure supplier link via FK
    origin_country VARCHAR(100),
    port_of_loading VARCHAR(100),
    port_of_discharge VARCHAR(100),
    shipping_line VARCHAR(100),
    vessel_name VARCHAR(100),
    etd DATE,
    eta DATE,
    container_size VARCHAR(20),
    container_type VARCHAR(20),
    customs_declaration_number VARCHAR(50),
    clearance_date DATE,
    notes TEXT
);

-- 2. If table existed but missed columns or FKs, add them:

-- Add supplier_id FK if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='supplier_id') THEN
        ALTER TABLE shipments ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
    ELSE
        -- Verify FK exists, if column exists but no FK, add constraint? (Complex in pure SQL without checking constraints by name)
        -- Assuming minimal risk, we can try adding constraint if not exists by a known name or just rely on column definition being correct if created fresh.
        -- For robustness, let's explicitly add the FK constraint if it might be missing
        NULL; -- Placeholder
    END IF;
END $$;

-- Explicitly add FK constraint for supplier_id if it doesn't exist (Handling existing column case)
-- Note: This might fail if constraint exists with different name, but safe to try if we use unique name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_shipments_supplier' AND table_name = 'shipments'
    ) THEN
        BEGIN
            ALTER TABLE shipments ADD CONSTRAINT fk_shipments_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
        EXCEPTION WHEN duplicate_object THEN 
            NULL; 
        WHEN undefined_column THEN
            -- Should not happen if column added above
            NULL;
        END;
    END IF;
END $$;


-- 3. Ensure purchase_invoices has FK to shipments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_invoices' AND column_name='shipment_id') THEN
        ALTER TABLE purchase_invoices ADD COLUMN shipment_id UUID REFERENCES shipments(id);
    END IF;
END $$;

-- Add index on FKs for performance
CREATE INDEX IF NOT EXISTS idx_shipments_supplier_id ON shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_shipment_id ON purchase_invoices(shipment_id);

-- 4. Enable RLS on shipments if not enabled
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to refresh
DROP POLICY IF EXISTS "Enable read access for all users" ON shipments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON shipments;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON shipments;

-- 6. Re-create policies (Using unified approach)
CREATE POLICY "Enable all access for authenticated users based on company_id" ON shipments
    FOR ALL
    USING (can_access_company(company_id))
    WITH CHECK (can_access_company(company_id));
    
-- Allow initial insert (if needed, but usually linked to company via trigger or direct check)
-- Actually, the USING clause checks existing row. For INSERT, we need WITH CHECK.
-- If new row has company_id X, user must belong to company X.
