-- Fix missing FK constraint on payment_vouchers.supplier_id

DO $$ 
BEGIN 
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'payment_vouchers_supplier_id_fkey' 
        AND table_name = 'payment_vouchers'
    ) THEN
        -- Add FK constraint
        ALTER TABLE payment_vouchers 
        ADD CONSTRAINT payment_vouchers_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
    END IF;
END $$;

-- Also verify customer_id just in case
DO $$ 
BEGIN 
    -- Check if customer_id exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_vouchers' 
        AND column_name = 'customer_id'
    ) THEN
        -- Check if constraint exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'payment_vouchers_customer_id_fkey' 
            AND table_name = 'payment_vouchers'
        ) THEN
            ALTER TABLE payment_vouchers 
            ADD CONSTRAINT payment_vouchers_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
