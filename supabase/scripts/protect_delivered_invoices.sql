-- ═══════════════════════════════════════════════════════════════════════
-- 🛡️ PROTECT DELIVERED SALES INVOICES FROM DELETION
-- ═══════════════════════════════════════════════════════════════════════
-- Purpose: Prevent deletion of sales_transactions that have:
--   1. Stage indicating delivery started (in_delivery, delivered, posted, etc.)
--   2. Linked inventory_movements (physical goods movement)
--   3. Linked delivery_notes
--
-- Date: 2026-03-31
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. Database Trigger: Block DELETE on sales_transactions with delivery activity ═══
CREATE OR REPLACE FUNCTION prevent_delivered_invoice_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_movement_count integer;
    v_delivery_note_count integer;
BEGIN
    -- Rule 1: Block deletion if stage indicates delivery or posting
    IF OLD.stage IN ('in_delivery', 'delivered', 'posted', 'completed', 'partial_delivered', 'invoiced') THEN
        RAISE EXCEPTION 'Cannot delete sales invoice (%) in stage "%". Use Sales Return to reverse this transaction.', 
            COALESCE(OLD.invoice_no, OLD.draft_no, OLD.id::text), OLD.stage;
    END IF;

    -- Rule 2: Even for confirmed/draft, check for physical inventory movements
    SELECT COUNT(*) INTO v_movement_count
    FROM inventory_movements
    WHERE reference_id = OLD.id
      AND movement_type IN ('sale', 'issue', 'delivery');

    IF v_movement_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete sales invoice (%) — % inventory movement(s) exist (goods already delivered). Use Sales Return instead.',
            COALESCE(OLD.invoice_no, OLD.draft_no, OLD.id::text), v_movement_count;
    END IF;

    -- Rule 3: Check for delivery notes
    SELECT COUNT(*) INTO v_delivery_note_count
    FROM delivery_notes
    WHERE sales_order_id = OLD.id;

    IF v_delivery_note_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete sales invoice (%) — % delivery note(s) are linked. Use Sales Return instead.',
            COALESCE(OLD.invoice_no, OLD.draft_no, OLD.id::text), v_delivery_note_count;
    END IF;

    -- Rule 4: Check for journal entries (accounting has been posted)
    IF OLD.journal_entry_id IS NOT NULL OR OLD.cogs_journal_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete sales invoice (%) — journal entries exist. Unpost first or use Sales Return.',
            COALESCE(OLD.invoice_no, OLD.draft_no, OLD.id::text);
    END IF;

    -- If none of the above, allow deletion (draft/cancelled with no activity)
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_protect_delivered_invoice ON sales_transactions;

-- Create the trigger BEFORE DELETE
CREATE TRIGGER trg_protect_delivered_invoice
    BEFORE DELETE ON sales_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delivered_invoice_deletion();

-- ═══ 2. Verify the trigger is active ═══
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'sales_transactions'::regclass
  AND tgname = 'trg_protect_delivered_invoice';
