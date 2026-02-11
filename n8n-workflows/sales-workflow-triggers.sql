-- ════════════════════════════════════════════════════════════════
-- 🔄 Sales Workflow Triggers for n8n Integration
-- 
-- Sends events to n8n when:
-- 1. Status changes in status_history (any sales document)
-- 2. Delivery note is marked as delivered → auto-creates invoice + deducts stock
--
-- ✅ Uses the existing notify_n8n_webhook() function 
-- ✅ Or can use Supabase Realtime as alternative
-- ════════════════════════════════════════════════════════════════

-- 1. Trigger on status_history changes (captures ALL status transitions)
DROP TRIGGER IF EXISTS trg_status_history_n8n ON status_history;
CREATE TRIGGER trg_status_history_n8n
  AFTER INSERT ON status_history
  FOR EACH ROW
  WHEN (
    NEW.doc_type IN ('sales_quotation', 'sales_reservation', 'sales_order', 'sales_delivery', 'sales_invoice')
  )
  EXECUTE FUNCTION notify_n8n_webhook();

-- 2. Optional: Direct triggers on sales tables for INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_sales_orders_n8n ON sales_orders;
CREATE TRIGGER trg_sales_orders_n8n
  AFTER INSERT OR UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS trg_sales_deliveries_n8n ON sales_deliveries;
CREATE TRIGGER trg_sales_deliveries_n8n
  AFTER INSERT OR UPDATE ON sales_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS trg_sales_invoices_status_n8n ON sales_invoices;
CREATE TRIGGER trg_sales_invoices_status_n8n
  AFTER INSERT OR UPDATE OF status ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- ════════════════════════════════════════════════════════════════
-- 🏪 POS Auto-Delivery Function
-- Called when a POS invoice is created to auto-execute delivery
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION execute_pos_delivery(
  p_invoice_id UUID,
  p_warehouse_id UUID,
  p_tenant_id UUID
) RETURNS jsonb AS $$
DECLARE
  v_delivery_id UUID;
  v_result jsonb;
BEGIN
  -- 1. Create auto delivery note
  INSERT INTO sales_deliveries (
    tenant_id, customer_id, warehouse_id, delivery_date,
    currency, status, source_invoice_id, notes
  )
  SELECT 
    si.tenant_id, si.customer_id, si.warehouse_id, NOW(),
    si.currency, 'delivered', si.id, 
    'POS Auto-Delivery for Invoice #' || si.invoice_number
  FROM sales_invoices si
  WHERE si.id = p_invoice_id
  RETURNING id INTO v_delivery_id;

  -- 2. Copy invoice items to delivery items
  INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price, total)
  SELECT v_delivery_id, sii.product_id, sii.quantity, sii.unit_price, sii.total
  FROM sales_invoice_items sii
  WHERE sii.invoice_id = p_invoice_id;

  -- 3. Deduct inventory
  INSERT INTO inventory_transactions (
    tenant_id, warehouse_id, product_id, quantity,
    transaction_type, reference_type, reference_id
  )
  SELECT 
    p_tenant_id, p_warehouse_id, sii.product_id, -sii.quantity,
    'pos_sale', 'sales_invoice', p_invoice_id
  FROM sales_invoice_items sii
  WHERE sii.invoice_id = p_invoice_id;

  -- 4. Update invoice status to posted
  UPDATE sales_invoices 
  SET status = 'posted'
  WHERE id = p_invoice_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'delivery_id', v_delivery_id,
    'message', 'POS sale completed: delivery executed + inventory deducted'
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'invoice_id', p_invoice_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- 📦 Inventory Deduction Function (for TradeService)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION deduct_inventory(
  p_warehouse_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID
) RETURNS void AS $$
BEGIN
  -- Insert negative inventory transaction
  INSERT INTO inventory_transactions (
    tenant_id, warehouse_id, product_id, quantity,
    transaction_type, reference_type, reference_id
  )
  SELECT 
    auth.uid()::text::uuid, -- or from context
    p_warehouse_id,
    p_product_id,
    -ABS(p_quantity), -- always negative for deduction
    p_reference_type,
    p_reference_type,
    p_reference_id;
    
  -- Optionally update a stock_levels / inventory_items cache table
  -- UPDATE inventory_items 
  -- SET quantity = quantity - ABS(p_quantity)
  -- WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- 📋 USAGE:
-- 
-- From n8n:
--   Import 04-sales-workflow-automation.json
--   Configure Supabase DB credentials
--   Activate workflow
--
-- From Frontend (POS mode):
--   TradeService.createPOSSale() calls deduct_inventory RPC
--   Or calls execute_pos_delivery() for one-shot operation
--
-- From Workflow Settings UI:
--   Companies customize status_groups / custom_statuses / status_transitions
--   n8n reacts to status_history changes automatically
-- ════════════════════════════════════════════════════════════════
