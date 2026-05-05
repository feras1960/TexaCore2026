-- ═══════════════════════════════════════════════════════════════
-- 🔄 Legacy → Unified Sync Triggers
-- ═══════════════════════════════════════════════════════════════
-- ينقل البيانات تلقائياً من الجداول القديمة (الرشيد/backup) للجداول الموحدة
-- يعمل تلقائياً عند أي INSERT في الجداول القديمة
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Purchase Invoices → Purchase Transactions ───────────────

CREATE OR REPLACE FUNCTION sync_purchase_invoice_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_name text;
    v_subtotal numeric;
BEGIN
    -- Get supplier name if missing
    IF NEW.supplier_name IS NULL OR NEW.supplier_name = '' THEN
        SELECT COALESCE(name_ar, name_en) INTO v_supplier_name
        FROM suppliers WHERE id = NEW.supplier_id;
    ELSE
        v_supplier_name := NEW.supplier_name;
    END IF;

    -- Calculate subtotal
    v_subtotal := COALESCE(NEW.subtotal, 0);
    IF v_subtotal = 0 AND COALESCE(NEW.total_amount, 0) > 0 THEN
        v_subtotal := COALESCE(NEW.total_amount, 0);
    END IF;

    INSERT INTO purchase_transactions (
        id, tenant_id, company_id, branch_id, stage, invoice_no,
        supplier_id, supplier_name, doc_date, invoice_date, due_date,
        warehouse_id, receipt_mode, shipment_id,
        currency, exchange_rate, 
        subtotal, discount_amount, tax_amount, expenses_total, total_amount,
        paid_amount, balance,
        is_posted, is_active, 
        journal_entry_id, notes, supplier_invoice_number, supplier_invoice_date,
        supplier_notes, confirmation_status,
        created_by, created_at, updated_at,
        expenses, attachments
    ) VALUES (
        NEW.id, NEW.tenant_id, NEW.company_id, NEW.branch_id,
        -- الرشيد: posted = مستلمة ومرحّلة مباشرة
        CASE 
            WHEN NEW.status IN ('posted','paid','completed') THEN 'received'
            WHEN NEW.document_stage IN ('request','quotation','draft','confirmed','received','posted','cancelled') THEN NEW.document_stage
            WHEN NEW.document_stage = 'invoice' THEN 'confirmed'
            ELSE 'draft'
        END,
        NEW.invoice_number,
        NEW.supplier_id, v_supplier_name,
        NEW.invoice_date, NEW.invoice_date, NEW.due_date,
        NEW.warehouse_id, NEW.receipt_mode, NEW.shipment_id,
        NEW.currency, COALESCE(NEW.exchange_rate, 1),
        v_subtotal, COALESCE(NEW.discount_amount, 0),
        COALESCE(NEW.tax_amount, 0), COALESCE(NEW.expenses_total, 0),
        COALESCE(NEW.total_amount, 0),
        0, COALESCE(NEW.total_amount, 0),
        CASE WHEN NEW.status IN ('posted','paid','completed') THEN true ELSE COALESCE(NEW.is_posted, false) END,
        true,
        NEW.journal_entry_id, NEW.notes, NEW.supplier_invoice_number, NEW.supplier_invoice_date,
        NEW.supplier_notes,
        CASE WHEN NEW.confirmation_status IN ('pending','confirmed','rejected') THEN NEW.confirmation_status ELSE 'pending' END,
        NEW.created_by, NEW.created_at, NEW.updated_at,
        COALESCE(NEW.expenses, '[]'::jsonb), COALESCE(NEW.attachments, '[]'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
        stage = EXCLUDED.stage,
        invoice_no = EXCLUDED.invoice_no,
        supplier_id = EXCLUDED.supplier_id,
        supplier_name = EXCLUDED.supplier_name,
        subtotal = EXCLUDED.subtotal,
        total_amount = EXCLUDED.total_amount,
        tax_amount = EXCLUDED.tax_amount,
        currency = EXCLUDED.currency,
        is_posted = EXCLUDED.is_posted,
        updated_at = now();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_purchase_invoice_to_transaction failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_to_purchase_transactions ON purchase_invoices;
CREATE TRIGGER trg_sync_to_purchase_transactions
    AFTER INSERT ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_purchase_invoice_to_transaction();


-- ─── 2. Purchase Invoice Items → Purchase Transaction Items ────

CREATE OR REPLACE FUNCTION sync_purchase_invoice_item_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_material_name text;
    v_material_code text;
    v_invoice_status text;
BEGIN
    -- Get material name for better description
    IF NEW.material_id IS NOT NULL THEN
        SELECT name_ar, code INTO v_material_name, v_material_code
        FROM fabric_materials WHERE id = NEW.material_id;
    END IF;

    -- Check if parent invoice is posted (= fully received)
    SELECT status INTO v_invoice_status
    FROM purchase_invoices WHERE id = NEW.invoice_id;

    INSERT INTO purchase_transaction_items (
        id, transaction_id, line_number, product_id, material_id,
        item_code, description, description_ar, quantity, received_qty, unit,
        unit_price, discount_amount, discount_percent,
        tax_rate, tax_amount, subtotal, total,
        color_id, color_name, warehouse_id,
        created_at, updated_at
    ) VALUES (
        NEW.id, NEW.invoice_id, NEW.line_number,
        NEW.product_id, NEW.material_id,
        COALESCE(v_material_code, NEW.description),
        COALESCE(v_material_name, NEW.description),
        COALESCE(v_material_name, NEW.description),
        NEW.quantity,
        -- الرشيد: posted = fully received
        CASE WHEN v_invoice_status IN ('posted','completed','paid') THEN NEW.quantity ELSE 0 END,
        'piece',
        NEW.unit_price,
        COALESCE(NEW.discount_amount, 0),
        COALESCE(NEW.discount_percentage, 0),
        COALESCE(NEW.tax_rate, COALESCE(NEW.tax_percentage, 0)),
        COALESCE(NEW.tax_amount, 0),
        COALESCE(NEW.subtotal, 0),
        COALESCE(NEW.total, 0),
        NEW.color_id, NEW.color_name, NEW.warehouse_id,
        NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        quantity = EXCLUDED.quantity,
        received_qty = EXCLUDED.received_qty,
        unit_price = EXCLUDED.unit_price,
        subtotal = EXCLUDED.subtotal,
        total = EXCLUDED.total,
        updated_at = now();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_purchase_invoice_item failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_to_purchase_transaction_items ON purchase_invoice_items;
CREATE TRIGGER trg_sync_to_purchase_transaction_items
    AFTER INSERT ON purchase_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_purchase_invoice_item_to_transaction();


-- ─── 3. Sales Invoices → Sales Transactions ────────────────────

CREATE OR REPLACE FUNCTION sync_sales_invoice_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name text;
    v_subtotal numeric;
BEGIN
    -- Get customer name if missing
    IF NEW.customer_name IS NULL OR NEW.customer_name = '' THEN
        SELECT COALESCE(name_ar, name_en) INTO v_customer_name
        FROM customers WHERE id = NEW.customer_id;
    ELSE
        v_customer_name := NEW.customer_name;
    END IF;

    v_subtotal := COALESCE(NEW.subtotal, 0);
    IF v_subtotal = 0 AND COALESCE(NEW.total_amount, 0) > 0 THEN
        v_subtotal := COALESCE(NEW.total_amount, 0);
    END IF;

    INSERT INTO sales_transactions (
        id, tenant_id, company_id, branch_id, stage, invoice_no,
        customer_id, customer_name, salesperson_id,
        doc_date, invoice_date, due_date,
        warehouse_id,
        currency, exchange_rate, 
        subtotal, discount_amount, discount_percent, tax_amount, total_amount,
        paid_amount, balance,
        is_posted, is_active, 
        journal_entry_id, notes,
        created_by, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.tenant_id, NEW.company_id, NEW.branch_id,
        CASE 
            WHEN NEW.status IN ('posted','paid','completed') THEN 'delivered'
            WHEN NEW.document_stage IN ('draft','quotation','reservation','confirmed','order','delivery','invoice','posted','cancelled','paid') THEN NEW.document_stage
            ELSE 'draft'
        END,
        NEW.invoice_number,
        NEW.customer_id, v_customer_name, NEW.salesperson_id,
        NEW.invoice_date, NEW.invoice_date, NEW.due_date,
        NEW.warehouse_id,
        NEW.currency, COALESCE(NEW.exchange_rate, 1),
        v_subtotal, COALESCE(NEW.discount_amount, 0),
        COALESCE(NEW.discount_percent, 0), COALESCE(NEW.tax_amount, 0),
        COALESCE(NEW.total_amount, 0),
        0, COALESCE(NEW.total_amount, 0),
        CASE WHEN NEW.status IN ('posted','paid','completed') THEN true ELSE COALESCE(NEW.is_posted, false) END,
        true,
        NEW.journal_entry_id, NEW.notes,
        NEW.created_by, NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        stage = EXCLUDED.stage,
        invoice_no = EXCLUDED.invoice_no,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        subtotal = EXCLUDED.subtotal,
        total_amount = EXCLUDED.total_amount,
        tax_amount = EXCLUDED.tax_amount,
        currency = EXCLUDED.currency,
        is_posted = EXCLUDED.is_posted,
        updated_at = now();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_sales_invoice_to_transaction failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_to_sales_transactions ON sales_invoices;
CREATE TRIGGER trg_sync_to_sales_transactions
    AFTER INSERT ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_invoice_to_transaction();


-- ─── 4. Sales Invoice Items → Sales Transaction Items ──────────

CREATE OR REPLACE FUNCTION sync_sales_invoice_item_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_material_name text;
    v_material_code text;
    v_invoice_status text;
BEGIN
    -- Get product/material name
    IF NEW.product_id IS NOT NULL THEN
        SELECT name_ar, code INTO v_material_name, v_material_code
        FROM fabric_materials WHERE id = NEW.product_id;
    END IF;

    -- Check parent invoice status
    SELECT status INTO v_invoice_status
    FROM sales_invoices WHERE id = NEW.invoice_id;

    INSERT INTO sales_transaction_items (
        id, transaction_id, line_number, product_id,
        item_code, description, description_ar, quantity, delivered_qty, unit,
        unit_price, discount_amount, discount_percent,
        tax_rate, tax_amount, subtotal, total,
        warehouse_id, cost_price,
        created_at, updated_at
    ) VALUES (
        NEW.id, NEW.invoice_id, NEW.line_number, NEW.product_id,
        COALESCE(v_material_code, NEW.description),
        COALESCE(v_material_name, NEW.description),
        COALESCE(v_material_name, NEW.description),
        NEW.quantity,
        CASE WHEN v_invoice_status IN ('posted','completed','paid') THEN NEW.quantity ELSE 0 END,
        'piece',
        NEW.unit_price,
        COALESCE(NEW.discount_amount, 0),
        COALESCE(NEW.discount_percent, 0),
        COALESCE(NEW.tax_rate, COALESCE(NEW.tax_percent, 0)),
        COALESCE(NEW.tax_amount, 0),
        COALESCE(NEW.subtotal, 0),
        COALESCE(NEW.total, 0),
        NEW.warehouse_id,
        NEW.unit_cost,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        quantity = EXCLUDED.quantity,
        delivered_qty = EXCLUDED.delivered_qty,
        unit_price = EXCLUDED.unit_price,
        subtotal = EXCLUDED.subtotal,
        total = EXCLUDED.total,
        updated_at = now();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_sales_invoice_item failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_to_sales_transaction_items ON sales_invoice_items;
CREATE TRIGGER trg_sync_to_sales_transaction_items
    AFTER INSERT ON sales_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_invoice_item_to_transaction();
