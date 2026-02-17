-- ═══════════════════════════════════════════════════════════════
-- Migration: Create purchase_order_items table (if not exists)
-- Date: 2026-02-12
-- Purpose: purchase_orders exists but doesn't have an items table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_number INT DEFAULT 1,
    
    product_id UUID,
    material_id UUID,
    variant_id UUID,
    
    description TEXT NOT NULL DEFAULT '',
    
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit VARCHAR(20),
    unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    received_quantity DECIMAL(18,4) DEFAULT 0,
    warehouse_id UUID REFERENCES warehouses(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant ON purchase_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material ON purchase_order_items(material_id);

-- Enable RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_order_items' 
        AND policyname = 'purchase_order_items_tenant_isolation'
    ) THEN
        CREATE POLICY purchase_order_items_tenant_isolation ON purchase_order_items
            FOR ALL
            USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid)
            WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
    END IF;
END $$;

COMMENT ON TABLE purchase_order_items IS 'بنود أوامر الشراء - Purchase Order Line Items';
