-- ════════════════════════════════════════════════════════════════
-- 🔔 Supabase Database Webhook for n8n
-- 
-- This creates a trigger + function that sends events to n8n
-- whenever journal entries are created or updated.
--
-- ✅ v2.0 — Enhanced with tenant_id in payload for isolation
-- ════════════════════════════════════════════════════════════════

-- Step 1: Create the webhook function (Enhanced)
CREATE OR REPLACE FUNCTION notify_n8n_webhook()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  webhook_url text;
BEGIN
  -- ⚠️ IMPORTANT: Replace with your actual n8n webhook URL
  -- When running locally: http://localhost:5678/webhook/texacore-erp-events
  -- When on server: https://your-n8n-domain.com/webhook/texacore-erp-events
  webhook_url := 'http://localhost:5678/webhook/texacore-erp-events';
  
  -- Build the payload with tenant isolation data
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'timestamp', now()::text,
    'tenant_id', CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.tenant_id::text
      ELSE NEW.tenant_id::text
    END,
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    'old_record', CASE 
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END
  );

  -- Send HTTP request to n8n (using pg_net extension)
  -- Note: pg_net must be enabled in Supabase Dashboard → Database → Extensions
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Webhook-Secret', 'texacore-n8n-secret-2026'
      ),
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the transaction if webhook fails
    RAISE WARNING 'n8n webhook failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create triggers on journal_entries table
DROP TRIGGER IF EXISTS trg_journal_entries_n8n ON journal_entries;
CREATE TRIGGER trg_journal_entries_n8n
  AFTER INSERT OR UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Step 3: (Optional) Create triggers on other tables
-- Uncomment to enable for purchase_orders, sales_orders, etc.

-- DROP TRIGGER IF EXISTS trg_purchase_orders_n8n ON purchase_orders;
-- CREATE TRIGGER trg_purchase_orders_n8n
--   AFTER INSERT OR UPDATE ON purchase_orders
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_n8n_webhook();

-- DROP TRIGGER IF EXISTS trg_sales_orders_n8n ON sales_orders;
-- CREATE TRIGGER trg_sales_orders_n8n
--   AFTER INSERT OR UPDATE ON sales_orders
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_n8n_webhook();

-- ════════════════════════════════════════════════════════════════
-- 📋 NOTES:
-- 
-- 1. Enable pg_net extension in Supabase:
--    Dashboard → Database → Extensions → Search "pg_net" → Enable
--
-- 2. The webhook URL should be:
--    - Local: http://localhost:5678/webhook/texacore-erp-events
--    - Server: https://n8n.yourdomain.com/webhook/texacore-erp-events
--
-- 3. Alternative: Use Supabase Dashboard → Database → Webhooks
--    to create webhooks without SQL (GUI method)
--
-- 4. The EXCEPTION block ensures that if n8n is down,
--    the database transaction still succeeds (no data loss)
-- ════════════════════════════════════════════════════════════════
