-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add Multitenancy Support to Core Tables
-- Description: Add tenant_id and name_ar to warehouses, products, uom
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. WAREHOUSES: Add tenant_id and name_ar
-- ───────────────────────────────────────────────────────────────────────────

-- Add tenant_id (nullable first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Fill tenant_id from company
UPDATE warehouses w
SET tenant_id = c.tenant_id
FROM companies c
WHERE w.company_id = c.id
  AND w.tenant_id IS NULL;

-- Make it NOT NULL
ALTER TABLE warehouses ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_warehouses_tenant'
    ) THEN
        ALTER TABLE warehouses 
        ADD CONSTRAINT fk_warehouses_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add name_ar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN name_ar VARCHAR(200);
    END IF;
END $$;

-- Copy name to name_ar if empty
UPDATE warehouses SET name_ar = name WHERE name_ar IS NULL;

-- Make branch_id NOT NULL (warehouses must belong to a branch)
ALTER TABLE warehouses ALTER COLUMN branch_id SET NOT NULL;

-- Add check constraint for warehouse_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_warehouse_type'
    ) THEN
        ALTER TABLE warehouses 
        ADD CONSTRAINT chk_warehouse_type 
        CHECK (warehouse_type IN ('regular', 'offline_market', 'van'));
    END IF;
END $$;

-- Update NULL warehouse_type to 'regular'
UPDATE warehouses SET warehouse_type = 'regular' WHERE warehouse_type IS NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. PRODUCTS: Add tenant_id
-- ───────────────────────────────────────────────────────────────────────────

-- Add tenant_id (nullable first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE products ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Fill tenant_id from company
UPDATE products p
SET tenant_id = c.tenant_id
FROM companies c
WHERE p.company_id = c.id
  AND p.tenant_id IS NULL;

-- Make it NOT NULL
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_tenant'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. UOM: Add tenant_id (UOM might be shared, so we handle differently)
-- ───────────────────────────────────────────────────────────────────────────

-- Note: UOM table doesn't have company_id, so we'll make it system-wide
-- We'll add tenant_id but allow NULL for system-wide units
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uom' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE uom ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Update RLS Policies
-- ───────────────────────────────────────────────────────────────────────────

-- Warehouses RLS
DROP POLICY IF EXISTS tenant_isolation_select ON warehouses;
DROP POLICY IF EXISTS tenant_isolation_insert ON warehouses;
DROP POLICY IF EXISTS tenant_isolation_update ON warehouses;
DROP POLICY IF EXISTS tenant_isolation_delete ON warehouses;

CREATE POLICY tenant_isolation_select ON warehouses FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON warehouses FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON warehouses FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON warehouses FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- Products RLS
DROP POLICY IF EXISTS tenant_isolation_select ON products;
DROP POLICY IF EXISTS tenant_isolation_insert ON products;
DROP POLICY IF EXISTS tenant_isolation_update ON products;
DROP POLICY IF EXISTS tenant_isolation_delete ON products;

CREATE POLICY tenant_isolation_select ON products FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON products FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON products FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON products FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- UOM RLS (allow NULL tenant_id for system-wide units)
DROP POLICY IF EXISTS tenant_isolation_select ON uom;
DROP POLICY IF EXISTS tenant_isolation_insert ON uom;
DROP POLICY IF EXISTS tenant_isolation_update ON uom;
DROP POLICY IF EXISTS tenant_isolation_delete ON uom;

CREATE POLICY tenant_isolation_select ON uom FOR SELECT
    USING (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON uom FOR INSERT
    WITH CHECK (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON uom FOR UPDATE
    USING (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON uom FOR DELETE
    USING (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Add Indexes
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch_type ON warehouses(branch_id, warehouse_type);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uom_tenant ON uom(tenant_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Comments
-- ───────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN warehouses.tenant_id IS 'Tenant isolation for multitenancy';
COMMENT ON COLUMN warehouses.name_ar IS 'Arabic name for warehouse';
COMMENT ON COLUMN warehouses.warehouse_type IS 'Type: regular, offline_market, van';
COMMENT ON COLUMN products.tenant_id IS 'Tenant isolation for multitenancy';
COMMENT ON COLUMN uom.tenant_id IS 'Tenant isolation (NULL = system-wide unit)';

COMMIT;
