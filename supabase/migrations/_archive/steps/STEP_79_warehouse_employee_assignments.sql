-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Warehouse Employee Assignments
-- Description: Create warehouse_assignments table to link employees to warehouses
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Table: warehouse_assignments
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'staff', 'cashier', 'supervisor')),
    is_active BOOLEAN DEFAULT true,
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES user_profiles(id),
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(warehouse_id, user_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_tenant ON warehouse_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse ON warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user ON warehouse_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_active ON warehouse_assignments(is_active) WHERE is_active = true;

-- ───────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON warehouse_assignments FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON warehouse_assignments FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON warehouse_assignments FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON warehouse_assignments FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- Helper View: User Warehouses
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW user_warehouses AS
SELECT 
    wa.user_id,
    wa.warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    w.name_en AS warehouse_name_en,
    w.name_ar AS warehouse_name_ar,
    w.warehouse_type,
    wa.role,
    wa.is_active,
    b.id AS branch_id,
    b.code AS branch_code,
    b.name AS branch_name,
    b.city,
    b.country
FROM warehouse_assignments wa
JOIN warehouses w ON wa.warehouse_id = w.id
JOIN branches b ON w.branch_id = b.id
WHERE wa.is_active = true;

-- ───────────────────────────────────────────────────────────────────────────
-- Comments
-- ───────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE warehouse_assignments IS 'Links employees (users) to warehouses with specific roles';
COMMENT ON COLUMN warehouse_assignments.role IS 'Employee role: manager, staff, cashier, supervisor';
COMMENT ON VIEW user_warehouses IS 'Shows active warehouse assignments with branch and location details';
