-- ════════════════════════════════════════════════════════════════
-- Enable Supabase Realtime on warehouse-related tables
-- This is required for real-time updates in the Stock Movements page
-- ════════════════════════════════════════════════════════════════

-- Enable Realtime for key warehouse tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE containers;
ALTER PUBLICATION supabase_realtime ADD TABLE warehouses;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_transactions;
