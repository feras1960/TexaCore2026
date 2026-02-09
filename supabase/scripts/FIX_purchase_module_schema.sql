-- FIX Purchase Module Schema
-- This script ensures that the purchase_orders and suppliers tables match the frontend requirements.

-- 1. Ensure purchase_orders has a 'type' column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'type') THEN
        ALTER TABLE purchase_orders ADD COLUMN type text DEFAULT 'order';
        RAISE NOTICE 'Added type column to purchase_orders';
    END IF;
END $$;

-- 2. Ensure purchase_orders has a 'status' column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'status') THEN
        ALTER TABLE purchase_orders ADD COLUMN status text DEFAULT 'draft';
        RAISE NOTICE 'Added status column to purchase_orders';
    END IF;
END $$;

-- 3. Ensure purchase_orders has 'order_number'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_number') THEN
        ALTER TABLE purchase_orders ADD COLUMN order_number text;
        -- Generate simple order numbers for existing rows
        UPDATE purchase_orders SET order_number = 'PO-' || id WHERE order_number IS NULL;
        RAISE NOTICE 'Added order_number column to purchase_orders';
    END IF;
END $$;


-- 4. Create an index on type for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_type ON purchase_orders(type);

-- 5. Update RLS policies (Optional but recommended)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_orders;
CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON purchase_orders;
CREATE POLICY "Enable insert for authenticated users only" ON purchase_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for users based on email" ON purchase_orders;
CREATE POLICY "Enable update for users based on email" ON purchase_orders FOR UPDATE USING (auth.role() = 'authenticated');
