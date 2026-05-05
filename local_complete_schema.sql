-- ═══════════════════════════════════════════════════════════════
-- TEXACORE LOCAL DESKTOP: COMPLETE MISSING SCHEMA
-- Apply this to fill in all tables the frontend requires
-- ═══════════════════════════════════════════════════════════════

-- 1. WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  name TEXT, name_ar TEXT, name_en TEXT,
  location TEXT, address TEXT,
  keeper_name TEXT, keeper_phone TEXT,
  is_active BOOLEAN DEFAULT true, is_main BOOLEAN DEFAULT false,
  warehouse_type TEXT DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 2. BIN_LOCATIONS
CREATE TABLE IF NOT EXISTS public.bin_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. WAREHOUSE_KEEPERS
CREATE TABLE IF NOT EXISTS public.warehouse_keepers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id UUID, name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CONTAINERS
CREATE TABLE IF NOT EXISTS public.containers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  container_number TEXT, reference_number TEXT,
  status TEXT DEFAULT 'pending',
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID,
  arrival_date DATE, expected_date DATE,
  shipping_cost NUMERIC DEFAULT 0, customs_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  closed_at TIMESTAMPTZ, closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 5. CONTAINER_ITEMS
CREATE TABLE IF NOT EXISTS public.container_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  received_quantity NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INVENTORY_MOVEMENTS
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  product_id UUID REFERENCES products(id),
  material_id UUID,
  warehouse_id UUID,
  from_warehouse_id UUID,
  to_warehouse_id UUID,
  movement_type TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  description TEXT, reference_type TEXT, reference_id UUID,
  movement_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 7. STOCK_TRANSFERS
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  transfer_number TEXT,
  from_warehouse_id UUID,
  to_warehouse_id UUID,
  status TEXT DEFAULT 'pending',
  transfer_date DATE DEFAULT CURRENT_DATE,
  notes TEXT, shipping_notes TEXT,
  driver_name TEXT, vehicle_number TEXT,
  received_by TEXT, received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 8. STOCK_COUNTS
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  warehouse_id UUID,
  count_number TEXT, status TEXT DEFAULT 'draft',
  count_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 9. STOCK_COUNT_ITEMS
CREATE TABLE IF NOT EXISTS public.stock_count_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_count_id UUID REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  system_quantity NUMERIC DEFAULT 0,
  counted_quantity NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SALES_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.sales_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  transaction_number TEXT,
  stage TEXT NOT NULL DEFAULT 'quotation',
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  currency TEXT DEFAULT 'USD', exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0, discount_amount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  tax_amount NUMERIC DEFAULT 0, total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0, balance_due NUMERIC DEFAULT 0,
  notes TEXT, internal_notes TEXT,
  reference_number TEXT, po_number TEXT,
  due_date DATE, delivery_date DATE,
  payment_terms TEXT, payment_method TEXT,
  salesperson_id UUID, branch_id UUID,
  warehouse_id UUID,
  delivery_status TEXT, shipping_address TEXT,
  driver_id UUID, vehicle_number TEXT,
  is_delivered BOOLEAN DEFAULT false, delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ,
  converted_from_id UUID, converted_from_stage TEXT
);

-- 11. SALES_TRANSACTION_ITEMS
CREATE TABLE IF NOT EXISTS public.sales_transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  product_id UUID REFERENCES products(id),
  description TEXT, unit TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  warehouse_id UUID,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. PURCHASE_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.purchase_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  transaction_number TEXT,
  stage TEXT NOT NULL DEFAULT 'order',
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  currency TEXT DEFAULT 'USD', exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0, discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0, total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0, balance_due NUMERIC DEFAULT 0,
  notes TEXT, internal_notes TEXT,
  reference_number TEXT,
  due_date DATE, expected_delivery DATE,
  payment_terms TEXT,
  warehouse_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 13. PURCHASE_TRANSACTION_ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES purchase_transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  product_id UUID REFERENCES products(id),
  description TEXT, unit TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  warehouse_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. FABRIC_ROLLS
CREATE TABLE IF NOT EXISTS public.fabric_rolls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  roll_number TEXT,
  material_id UUID,
  color_id UUID,
  group_id UUID,
  initial_length NUMERIC DEFAULT 0,
  current_length NUMERIC DEFAULT 0,
  width NUMERIC, weight NUMERIC, gsm NUMERIC,
  status TEXT DEFAULT 'in_stock',
  warehouse_id UUID,
  container_id UUID,
  supplier_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  batch_number TEXT, lot_number TEXT,
  barcode TEXT, qr_code TEXT,
  marker_color TEXT,
  notes TEXT,
  received_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 15. ROLL_RESERVATIONS
CREATE TABLE IF NOT EXISTS public.roll_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  tenant_id UUID,
  roll_id UUID REFERENCES fabric_rolls(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  sales_transaction_id UUID,
  reserved_length NUMERIC, cut_length NUMERIC,
  status TEXT DEFAULT 'active',
  notes TEXT, reserved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Missing RPC functions
CREATE OR REPLACE FUNCTION public.refresh_company_insights(p_company_id UUID DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN NULL; END; $fn$;

CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql AS $fn$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'tenant_id', c.tenant_id))
  INTO result FROM companies c;
  RETURN COALESCE(result, '[]'::jsonb);
END; $fn$;

-- 17. DISABLE RLS on ALL public tables
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
  RAISE NOTICE 'RLS disabled on all public tables';
END $do$;

-- 18. Grant access to anon and authenticated
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', r.tablename);
  END LOOP;
  RAISE NOTICE 'Granted access on all tables';
END $do$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
