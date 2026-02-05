-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Fix Sales Inventory Trigger
-- Description: Fix deduct_inventory_on_sale to work without warehouse_id on sales_invoices
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_item RECORD;
    v_movement_number VARCHAR(50);
    v_warehouse_id UUID;
    v_default_warehouse_id UUID;
BEGIN
    -- Only process when status changes to 'posted'
    IF NEW.status != 'posted' THEN
        RETURN NEW;
    END IF;

    -- Don't reprocess if already posted
    IF OLD.status = 'posted' THEN
        RETURN NEW;
    END IF;

    -- Get default warehouse from branch if exists
    SELECT default_warehouse_id INTO v_default_warehouse_id
    FROM branches
    WHERE id = NEW.branch_id;

    -- If no branch default, get first active warehouse for company
    IF v_default_warehouse_id IS NULL THEN
        SELECT id INTO v_default_warehouse_id
        FROM warehouses
        WHERE company_id = NEW.company_id
          AND is_active = true
        ORDER BY created_at
        LIMIT 1;
    END IF;

    -- Process each invoice item
    FOR v_item IN
        SELECT * FROM sales_invoice_items
        WHERE invoice_id = NEW.id
          AND product_id IS NOT NULL
    LOOP
        -- Determine warehouse: item warehouse > branch default > company default
        v_warehouse_id := COALESCE(v_item.warehouse_id, v_default_warehouse_id);
        
        -- Skip if no warehouse found
        IF v_warehouse_id IS NULL THEN
            CONTINUE;
        END IF;

        v_movement_number := 'MV-SI-' || NEW.invoice_number || '-' || COALESCE(v_item.line_number, 0);

        -- Create inventory movement
        INSERT INTO inventory_movements (
            tenant_id, company_id,
            movement_number, movement_date,
            movement_type,
            product_id, variant_id,
            from_warehouse_id,
            quantity, unit_id,
            unit_cost, total_cost,
            reference_type, reference_id, reference_number,
            notes,
            created_by
        )
        VALUES (
            NEW.tenant_id, NEW.company_id,
            v_movement_number, NEW.invoice_date,
            'sale',
            v_item.product_id, v_item.variant_id,
            v_warehouse_id,
            v_item.quantity, v_item.unit_id,
            v_item.unit_cost, v_item.total_cost,
            'sales_invoice', NEW.id, NEW.invoice_number,
            'خصم مخزون - فاتورة مبيعات ' || NEW.invoice_number,
            NEW.created_by
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- Recreate trigger (in case it needs refresh)
DROP TRIGGER IF EXISTS trg_deduct_inventory_on_sale ON sales_invoices;
CREATE TRIGGER trg_deduct_inventory_on_sale
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'posted' AND OLD.status <> 'posted')
    EXECUTE FUNCTION deduct_inventory_on_sale();

COMMENT ON FUNCTION deduct_inventory_on_sale() IS 'Creates inventory movements when sales invoice is posted. Gets warehouse from: 1) item warehouse_id, 2) branch default, 3) first active warehouse';
