-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Create Purchase Module Tables
-- Description: Create purchase_orders, purchase_invoices, and purchase_invoice_items
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Table: purchase_orders
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'received', 'cancelled')),
    
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate NUMERIC(18,8) DEFAULT 1,
    
    notes TEXT,
    terms_and_conditions TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, company_id, order_number)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Table: purchase_invoices
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    supplier_invoice_number VARCHAR(50),
    
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'paid', 'cancelled')),
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    taxable_amount NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate NUMERIC(18,8) DEFAULT 1,
    
    journal_entry_id UUID,
    
    notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, company_id, invoice_number)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Table: purchase_invoice_items
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    
    line_number INTEGER,
    
    product_id UUID REFERENCES products(id),
    variant_id UUID,
    description TEXT,
    
    quantity NUMERIC(18,4) NOT NULL,
    unit_id UUID,
    
    unit_price NUMERIC(18,4) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    
    subtotal NUMERIC(15,2) DEFAULT 0,
    tax_percentage NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    
    unit_cost NUMERIC(18,4),
    total_cost NUMERIC(15,2),
    
    warehouse_id UUID REFERENCES warehouses(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company ON purchase_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_posted ON purchase_invoices(is_posted);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_tenant ON purchase_invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_product ON purchase_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_warehouse ON purchase_invoice_items(warehouse_id);

-- ───────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- Purchase Orders Policies
CREATE POLICY tenant_isolation_select ON purchase_orders FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON purchase_orders FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON purchase_orders FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON purchase_orders FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- Purchase Invoices Policies
CREATE POLICY tenant_isolation_select ON purchase_invoices FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON purchase_invoices FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON purchase_invoices FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON purchase_invoices FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- Purchase Invoice Items Policies
CREATE POLICY tenant_isolation_select ON purchase_invoice_items FOR SELECT
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON purchase_invoice_items FOR INSERT
    WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON purchase_invoice_items FOR UPDATE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON purchase_invoice_items FOR DELETE
    USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- Trigger: Create Journal Entry on Purchase Invoice Posting
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_purchase_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_entry_id UUID;
    v_entry_number VARCHAR(50);
    v_payable_account_id UUID;
    v_expense_account_id UUID;
    v_item RECORD;
BEGIN
    -- Only process when status changes to 'posted'
    IF NEW.status != 'posted' OR NEW.is_posted != true THEN
        RETURN NEW;
    END IF;

    -- Don't reprocess if already posted
    IF OLD.status = 'posted' AND OLD.is_posted = true THEN
        RETURN NEW;
    END IF;

    -- Get supplier's payable account
    SELECT payable_account_id INTO v_payable_account_id
    FROM suppliers
    WHERE id = NEW.supplier_id;

    -- Get default expense account (you may want to get this from company settings)
    SELECT id INTO v_expense_account_id
    FROM accounts
    WHERE company_id = NEW.company_id
      AND account_type = 'expense'
      AND is_active = true
    LIMIT 1;

    -- Create journal entry
    v_entry_number := 'PI-' || NEW.invoice_number;

    INSERT INTO journal_entries (
        tenant_id, company_id, branch_id,
        entry_number, entry_date,
        description, entry_type, status,
        reference_type, reference_id,
        created_by
    )
    VALUES (
        NEW.tenant_id, NEW.company_id, NEW.branch_id,
        v_entry_number, NEW.invoice_date,
        'قيد فاتورة مشتريات ' || NEW.invoice_number,
        'PURCHASE_INVOICE', 'POSTED',
        'purchase_invoice', NEW.id,
        NEW.created_by
    )
    RETURNING id INTO v_entry_id;

    -- Debit: Expense Account
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, account_id,
        description, debit, credit
    )
    VALUES (
        NEW.tenant_id, v_entry_id, v_expense_account_id,
        'مشتريات - ' || COALESCE(NEW.supplier_name, ''),
        NEW.total_amount, 0
    );

    -- Credit: Accounts Payable
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, account_id,
        description, debit, credit
    )
    VALUES (
        NEW.tenant_id, v_entry_id, v_payable_account_id,
        'دائنون - ' || COALESCE(NEW.supplier_name, ''),
        0, NEW.total_amount
    );

    -- Link journal entry to invoice
    UPDATE purchase_invoices
    SET journal_entry_id = v_entry_id
    WHERE id = NEW.id;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_purchase_journal_entry ON purchase_invoices;
CREATE TRIGGER trg_create_purchase_journal_entry
    AFTER UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'posted' AND NEW.is_posted = true AND (OLD.status <> 'posted' OR OLD.is_posted <> true))
    EXECUTE FUNCTION create_purchase_journal_entry();

-- ───────────────────────────────────────────────────────────────────────────
-- Comments
-- ───────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE purchase_orders IS 'Purchase orders from suppliers';
COMMENT ON TABLE purchase_invoices IS 'Purchase invoices (bills) from suppliers';
COMMENT ON TABLE purchase_invoice_items IS 'Line items for purchase invoices';
COMMENT ON FUNCTION create_purchase_journal_entry() IS 'Creates accounting journal entry when purchase invoice is posted';
