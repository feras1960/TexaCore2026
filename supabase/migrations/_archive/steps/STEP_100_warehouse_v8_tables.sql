-- ═══════════════════════════════════════════════════════════════
-- WAREHOUSE V8 - SCHEMA ADDITIONS
-- ═══════════════════════════════════════════════════════════════
-- 
-- يضيف:
-- 1. عمود status لجدول inventory_movements
-- 2. عمود warehouse_id لجدول inventory_movements
-- 3. جدول containers (الكونتينرات)
-- 4. جدول stock_counts (الجرد المخزني)
-- 5. جدول stock_count_items (بنود الجرد)
-- 6. جدول sample_requests (طلبات العينات)
-- 
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. ADD STATUS COLUMN TO INVENTORY_MOVEMENTS
-- ═══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_movements' AND column_name = 'status') THEN
        ALTER TABLE inventory_movements ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
        RAISE NOTICE 'Added status column to inventory_movements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_movements' AND column_name = 'warehouse_id') THEN
        ALTER TABLE inventory_movements ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
        RAISE NOTICE 'Added warehouse_id column to inventory_movements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_movements' AND column_name = 'material_id') THEN
        ALTER TABLE inventory_movements ADD COLUMN material_id UUID REFERENCES fabric_materials(id);
        RAISE NOTICE 'Added material_id column to inventory_movements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_movements' AND column_name = 'roll_id') THEN
        ALTER TABLE inventory_movements ADD COLUMN roll_id UUID REFERENCES fabric_rolls(id);
        RAISE NOTICE 'Added roll_id column to inventory_movements';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. CONTAINERS TABLE (الكونتينرات)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    container_number VARCHAR(100) NOT NULL,
    description TEXT,
    
    origin_country VARCHAR(100),
    shipping_line VARCHAR(200),
    bill_of_lading VARCHAR(100),
    
    departure_date DATE,
    arrival_date DATE,
    received_date DATE,
    
    total_rolls INT DEFAULT 0,
    received_rolls INT DEFAULT 0,
    total_value DECIMAL(15,2),
    
    status VARCHAR(30) DEFAULT 'ordered',
    -- ordered, in_transit, arrived, receiving, completed, cancelled
    
    warehouse_id UUID REFERENCES warehouses(id),
    
    notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, container_number)
);

CREATE INDEX IF NOT EXISTS idx_containers_tenant ON containers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_arrival ON containers(arrival_date);

-- ═══════════════════════════════════════════════════════════════
-- 3. STOCK COUNTS TABLE (الجرد المخزني)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    count_number VARCHAR(50) NOT NULL,
    
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    planned_date DATE,
    completed_date DATE,
    
    count_type VARCHAR(30) DEFAULT 'full',
    -- full, partial, cycle, random
    
    status VARCHAR(20) DEFAULT 'planned',
    -- planned, in_progress, completed, cancelled
    
    total_items INT DEFAULT 0,
    counted_items INT DEFAULT 0,
    match_count INT DEFAULT 0,
    variance_count INT DEFAULT 0,
    
    notes TEXT,
    
    created_by UUID,
    completed_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, count_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_tenant ON stock_counts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_warehouse ON stock_counts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date);

-- ═══════════════════════════════════════════════════════════════
-- 4. STOCK COUNT ITEMS TABLE (بنود الجرد)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    
    roll_id UUID REFERENCES fabric_rolls(id),
    product_id UUID REFERENCES products(id),
    material_id UUID REFERENCES fabric_materials(id),
    
    location_id UUID REFERENCES warehouse_locations(id),
    
    system_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    actual_quantity DECIMAL(15,3),
    variance DECIMAL(15,3) GENERATED ALWAYS AS (COALESCE(actual_quantity, 0) - system_quantity) STORED,
    
    is_counted BOOLEAN DEFAULT FALSE,
    counted_at TIMESTAMPTZ,
    counted_by UUID,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stock_count_items(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_roll ON stock_count_items(roll_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. SAMPLE REQUESTS TABLE (طلبات العينات)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sample_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    request_number VARCHAR(50) NOT NULL,
    
    roll_id UUID REFERENCES fabric_rolls(id),
    material_id UUID REFERENCES fabric_materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    requested_length DECIMAL(10,2) NOT NULL,
    actual_length DECIMAL(10,2),
    
    requested_by VARCHAR(200),
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    branch_id UUID REFERENCES branches(id),
    
    purpose TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    -- low, normal, high, urgent
    
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, cutting, ready, distributed, cancelled
    
    cut_by UUID,
    cut_at TIMESTAMPTZ,
    distributed_by UUID,
    distributed_at TIMESTAMPTZ,
    
    notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_sample_requests_tenant ON sample_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status ON sample_requests(status);
CREATE INDEX IF NOT EXISTS idx_sample_requests_roll ON sample_requests(roll_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_date ON sample_requests(request_date);

-- ═══════════════════════════════════════════════════════════════
-- 6. ADD MISSING COLUMNS TO WAREHOUSES
-- ═══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'warehouses' AND column_name = 'is_main') THEN
        ALTER TABLE warehouses ADD COLUMN is_main BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'warehouses' AND column_name = 'capacity') THEN
        ALTER TABLE warehouses ADD COLUMN capacity INT DEFAULT 1000;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. ADD MISSING COLUMNS TO WAREHOUSE_LOCATIONS
-- ═══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'warehouse_locations' AND column_name = 'company_id') THEN
        ALTER TABLE warehouse_locations ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'warehouse_locations' AND column_name = 'location_type') THEN
        ALTER TABLE warehouse_locations ADD COLUMN location_type VARCHAR(30) DEFAULT 'shelf';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;

-- Containers policies
DROP POLICY IF EXISTS containers_tenant_policy ON containers;
CREATE POLICY containers_tenant_policy ON containers
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Stock counts policies
DROP POLICY IF EXISTS stock_counts_tenant_policy ON stock_counts;
CREATE POLICY stock_counts_tenant_policy ON stock_counts
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Stock count items policies  
DROP POLICY IF EXISTS stock_count_items_access ON stock_count_items;
CREATE POLICY stock_count_items_access ON stock_count_items
    FOR ALL USING (
        stock_count_id IN (SELECT id FROM stock_counts WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
    );

-- Sample requests policies
DROP POLICY IF EXISTS sample_requests_tenant_policy ON sample_requests;
CREATE POLICY sample_requests_tenant_policy ON sample_requests
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

RAISE NOTICE '✅ Schema additions completed successfully!';
