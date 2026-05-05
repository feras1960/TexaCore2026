-- ═══════════════════════════════════════════════════════════════
-- TEXACORE: Fix ALL missing columns, tables, FKs
-- ═══════════════════════════════════════════════════════════════

-- sales_transactions
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS doc_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS draft_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS quotation_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS reservation_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS order_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS delivery_no TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT false;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS delivery_draft JSONB;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS delivery_method VARCHAR;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS receiving_branch_id UUID;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS receiving_branch_name TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS driver_name TEXT;

-- purchase_transactions
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS doc_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS draft_no TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS order_no TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS quotation_no TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS receipt_no TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT false;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS container_id UUID;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS container_number TEXT;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS receipt_date DATE;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS quotation_date DATE;
ALTER TABLE purchase_transactions ADD COLUMN IF NOT EXISTS receipt_mode TEXT DEFAULT 'direct';

-- purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';

-- purchase_invoices
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS document_stage TEXT DEFAULT 'draft';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS receipt_status TEXT DEFAULT 'pending';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS receipt_mode TEXT;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS container_id UUID;

-- purchase_receipts
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS receipt_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS container_id UUID;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS branch_id UUID;

-- containers
ALTER TABLE containers ADD COLUMN IF NOT EXISTS container_name TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS total_purchase_value NUMERIC DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS receiving_warehouse_id UUID;

-- branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_type TEXT DEFAULT 'branch';

-- warehouses
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id UUID;

-- fabric_materials
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS default_warehouse_id UUID;
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS season TEXT;

-- fabric_colors
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS hex_code TEXT;
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS company_id UUID;

-- fabric_groups
ALTER TABLE fabric_groups ADD COLUMN IF NOT EXISTS company_id UUID;

-- journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS description_en TEXT;

-- journal_entry_lines
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS debit_fc NUMERIC DEFAULT 0;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS credit_fc NUMERIC DEFAULT 0;

-- payment_vouchers
ALTER TABLE payment_vouchers ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID;

-- company_accounting_settings
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_cash_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_bank_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_receivable_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_payable_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_revenue_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_sales_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_expense_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_purchase_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_cogs_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_inventory_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_tax_input_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_tax_output_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_fx_gain_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_fx_loss_account_id UUID;
ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS default_freight_in_account_id UUID;

-- Update branches.name_ar
UPDATE branches SET name_ar = name WHERE name_ar IS NULL AND name IS NOT NULL;

-- ═══════ CREATE MISSING TABLES ═══════
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, company_id UUID,
  name TEXT, name_ar TEXT, name_en TEXT,
  fiscal_year_id UUID, period_type TEXT DEFAULT 'monthly',
  total_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'draft',
  notes TEXT, created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, budget_id UUID REFERENCES budgets(id),
  account_id UUID, cost_center_id UUID,
  period TEXT, period_start DATE, period_end DATE,
  budgeted_amount NUMERIC DEFAULT 0, actual_amount NUMERIC DEFAULT 0,
  committed_amount NUMERIC DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, budget_id UUID REFERENCES budgets(id),
  budget_line_id UUID, alert_type TEXT, severity TEXT DEFAULT 'warning',
  threshold_percent NUMERIC, current_percent NUMERIC,
  budgeted_amount NUMERIC, actual_amount NUMERIC,
  message_ar TEXT, message_en TEXT,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_by UUID, acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, company_id UUID,
  batch_number TEXT, product_id UUID, material_id UUID,
  quantity NUMERIC DEFAULT 0, expiry_date DATE,
  status TEXT DEFAULT 'active', notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, company_id UUID, branch_id UUID,
  return_number TEXT, return_date DATE DEFAULT CURRENT_DATE,
  receipt_id UUID, invoice_id UUID, supplier_id UUID, warehouse_id UUID,
  reason TEXT, total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR', status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS container_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, company_id UUID,
  container_id UUID REFERENCES containers(id),
  expense_type TEXT, description TEXT,
  amount NUMERIC DEFAULT 0, currency TEXT DEFAULT 'USD',
  vendor_name TEXT, vendor_account_id UUID,
  tax_amount NUMERIC DEFAULT 0, is_allocated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════ FK CONSTRAINTS ═══════
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_receivable_account_fkey
    FOREIGN KEY (receivable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE suppliers ADD CONSTRAINT suppliers_payable_account_fkey
    FOREIGN KEY (payable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE fabric_rolls ADD CONSTRAINT fabric_rolls_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════ DISABLE RLS + GRANTS ═══════
DO $g$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', r.tablename);
  END LOOP;
END $g$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
