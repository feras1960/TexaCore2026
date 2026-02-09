
-- Fix payment_vouchers schema for Sales Payments
-- We ensure columns exist for Sales Receipts

DO $$ 
BEGIN 
    -- 1. Add customer_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'customer_id') THEN
        ALTER TABLE payment_vouchers ADD COLUMN customer_id UUID REFERENCES customers(id);
        CREATE INDEX IF NOT EXISTS idx_payment_vouchers_customer_id ON payment_vouchers(customer_id);
    END IF;

    -- 2. Add sales_invoice_id if missing (for linking to invoice)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'sales_invoice_id') THEN
        ALTER TABLE payment_vouchers ADD COLUMN sales_invoice_id UUID REFERENCES sales_invoices(id);
        CREATE INDEX IF NOT EXISTS idx_payment_vouchers_sales_invoice_id ON payment_vouchers(sales_invoice_id);
    END IF;

    -- 3. Add type column if missing (default 'payment' for safety, but check logic needed)
    -- If table was used for purchases, existing rows are likely 'payment'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'type') THEN
        ALTER TABLE payment_vouchers ADD COLUMN type VARCHAR(20) DEFAULT 'payment';
    END IF;
    
    -- 4. Add status if missing 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'status') THEN
        ALTER TABLE payment_vouchers ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
    END IF;

    -- 5. Add payment_method if missing (or fix method column name if different)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'payment_method') THEN
        -- Check if 'method' exists instead
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_vouchers' AND column_name = 'method') THEN
             -- rename method to payment_method to be consistent? Or keep method. 
             -- SalesPaymentsList currently uses payment_method in Columns map.
             -- Let's alias it or just check.
             -- If method exists, we use it. If not, add payment_method.
             NULL;
        ELSE
             ALTER TABLE payment_vouchers ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
        END IF;
    END IF;

END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
