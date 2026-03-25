-- Fix Payment Vouchers Schema to support Container and Invoice links

-- 1. Add missing columns for linking
ALTER TABLE payment_vouchers 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id),
ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID REFERENCES purchase_invoices(id),
ADD COLUMN IF NOT EXISTS payment_number VARCHAR(50);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_shipment_id ON payment_vouchers(shipment_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_purchase_invoice_id ON payment_vouchers(purchase_invoice_id);

-- 3. Verify company_id exists (it implies tenant isolation)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'company_id') THEN
        ALTER TABLE payment_vouchers ADD COLUMN company_id UUID REFERENCES companies(id);
        CREATE INDEX IF NOT EXISTS idx_payment_vouchers_company_id ON payment_vouchers(company_id);
    END IF;
END $$;

-- 4. Enable RLS if not enabled
ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users based on company_id" ON payment_vouchers;

CREATE POLICY "Enable all access for authenticated users based on company_id" ON payment_vouchers
    FOR ALL
    USING (can_access_company(company_id))
    WITH CHECK (can_access_company(company_id));

NOTIFY pgrst, 'reload schema';
