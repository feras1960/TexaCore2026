-- ═══════════════════════════════════════════════════════════════
-- FIX WAREHOUSE SCHEMA & MISSING TABLES
-- إصلاح جداول المستودعات المفقودة
-- ═══════════════════════════════════════════════════════════════

-- 1. FIX inventory_movements COLUMNS
DO $$ 
BEGIN
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'status') THEN
        ALTER TABLE inventory_movements ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;

    -- Add warehouse_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'warehouse_id') THEN
        ALTER TABLE inventory_movements ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;
    
    -- Add material_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'material_id') THEN
        ALTER TABLE inventory_movements ADD COLUMN material_id UUID; -- REFERENCES fabric_materials(id) REMOVED constraint to avoid error if table missing
    END IF;
END $$;

-- 2. ENSURE roll_reservations EXISTS
CREATE TABLE IF NOT EXISTS roll_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    roll_id UUID NOT NULL, 
    customer_id UUID,
    reservation_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled, fulfilled
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENSURE stock_counts EXISTS
CREATE TABLE IF NOT EXISTS stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    count_number VARCHAR(50) NOT NULL,
    warehouse_id UUID NOT NULL,
    count_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    total_items INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENSURE stock_count_items EXISTS
CREATE TABLE IF NOT EXISTS stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    roll_id UUID,
    product_id UUID,
    material_id UUID,
    system_quantity DECIMAL(15,3) DEFAULT 0,
    actual_quantity DECIMAL(15,3),
    is_counted BOOLEAN DEFAULT FALSE,
    counted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENSURE sample_requests EXISTS
CREATE TABLE IF NOT EXISTS sample_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    request_number VARCHAR(50) NOT NULL,
    roll_id UUID,
    request_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENSURE materials TABLE (OR VIEW) EXISTS
-- The frontend expects 'materials' table, but backend might use 'fabric_materials' or 'products'
-- Let's check if fabric_materials exists, if so create a view, otherwise create the table.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabric_materials') THEN
        -- Create a view 'materials' pointing to 'fabric_materials' if it doesn't exist
        -- Note: Views are tricky with RLS, so simple pointer might be better
        NULL; -- Do nothing for now to avoid conflicts if view exists
    ELSE
        -- Create materials table if neither exists
        CREATE TABLE IF NOT EXISTS materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            company_id UUID NOT NULL,
            code VARCHAR(50),
            name_ar VARCHAR(200),
            name_en VARCHAR(200),
            description TEXT,
            category_id UUID,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE roll_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (permissive for now for development)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON roll_reservations;
CREATE POLICY "Enable all access for authenticated users" ON roll_reservations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stock_counts;
CREATE POLICY "Enable all access for authenticated users" ON stock_counts FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stock_count_items;
CREATE POLICY "Enable all access for authenticated users" ON stock_count_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sample_requests;
CREATE POLICY "Enable all access for authenticated users" ON sample_requests FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON materials;
CREATE POLICY "Enable all access for authenticated users" ON materials FOR ALL USING (auth.role() = 'authenticated');
