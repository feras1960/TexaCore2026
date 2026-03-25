-- ═══════════════════════════════════════════════════════════════════════════
-- المرحلة ١: إصلاح العلاقات المفقودة (Foreign Keys) والروابط التسلسلية
-- Phase 1: Fix Missing Foreign Keys & Sequential Document Links
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-02-14
-- الغرض: ضمان Referential Integrity لكل جداول الدورة المالية
-- ⚠️ آمن للتنفيذ: يستخدم IF NOT EXISTS ولا يحذف بيانات
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  القسم ١: أعمدة الروابط التسلسلية المفقودة                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1.1 ربط أمر الشراء بعرض السعر
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_orders' AND column_name = 'quotation_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN quotation_id UUID;
        RAISE NOTICE '✅ Added quotation_id to purchase_orders';
    ELSE
        RAISE NOTICE '⏭️ quotation_id already exists on purchase_orders';
    END IF;
END $$;

-- 1.2 ربط فاتورة المشتريات بأمر الشراء
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_invoices' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE purchase_invoices ADD COLUMN order_id UUID;
        RAISE NOTICE '✅ Added order_id to purchase_invoices';
    ELSE
        RAISE NOTICE '⏭️ order_id already exists on purchase_invoices';
    END IF;
END $$;

-- 1.3 ربط سند الاستلام بالقيد المحاسبي
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_receipts' AND column_name = 'journal_entry_id'
    ) THEN
        ALTER TABLE purchase_receipts ADD COLUMN journal_entry_id UUID;
        RAISE NOTICE '✅ Added journal_entry_id to purchase_receipts';
    ELSE
        RAISE NOTICE '⏭️ journal_entry_id already exists on purchase_receipts';
    END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  القسم ٢: إضافة Foreign Key Constraints                     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────
-- 🔗 purchase_orders
-- ────────────────────────────────────────────────────────────────

-- purchase_orders.quotation_id → purchase_quotations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_orders_quotation_id_fkey'
        AND table_name = 'purchase_orders'
    ) THEN
        -- تحقق من وجود الجدول المرجعي أولاً
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_quotations') THEN
            ALTER TABLE purchase_orders
                ADD CONSTRAINT purchase_orders_quotation_id_fkey
                FOREIGN KEY (quotation_id) REFERENCES purchase_quotations(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_orders.quotation_id → purchase_quotations';
        ELSE
            RAISE NOTICE '⚠️ purchase_quotations table not found — skipping FK';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_orders_quotation_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 purchase_invoices
-- ────────────────────────────────────────────────────────────────

-- purchase_invoices.order_id → purchase_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_invoices_order_id_fkey'
        AND table_name = 'purchase_invoices'
    ) THEN
        ALTER TABLE purchase_invoices
            ADD CONSTRAINT purchase_invoices_order_id_fkey
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id)
            ON DELETE SET NULL;
        RAISE NOTICE '✅ FK: purchase_invoices.order_id → purchase_orders';
    ELSE
        RAISE NOTICE '⏭️ FK purchase_invoices_order_id_fkey already exists';
    END IF;
END $$;

-- purchase_invoices.supplier_id → suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_invoices_supplier_id_fkey'
        AND table_name = 'purchase_invoices'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
            ALTER TABLE purchase_invoices
                ADD CONSTRAINT purchase_invoices_supplier_id_fkey
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_invoices.supplier_id → suppliers';
        ELSE
            RAISE NOTICE '⚠️ suppliers table not found — skipping FK';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_invoices_supplier_id_fkey already exists';
    END IF;
END $$;

-- purchase_invoices.branch_id → branches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_invoices_branch_id_fkey'
        AND table_name = 'purchase_invoices'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_invoices' AND column_name = 'branch_id'
        ) THEN
            ALTER TABLE purchase_invoices
                ADD CONSTRAINT purchase_invoices_branch_id_fkey
                FOREIGN KEY (branch_id) REFERENCES branches(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_invoices.branch_id → branches';
        ELSE
            RAISE NOTICE '⚠️ branch_id column not found on purchase_invoices';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_invoices_branch_id_fkey already exists';
    END IF;
END $$;

-- purchase_invoices.journal_entry_id → journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_invoices_journal_entry_id_fkey'
        AND table_name = 'purchase_invoices'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_invoices' AND column_name = 'journal_entry_id'
        ) THEN
            ALTER TABLE purchase_invoices
                ADD CONSTRAINT purchase_invoices_journal_entry_id_fkey
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_invoices.journal_entry_id → journal_entries';
        ELSE
            RAISE NOTICE '⚠️ journal_entry_id column not found on purchase_invoices';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_invoices_journal_entry_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 purchase_receipts
-- ────────────────────────────────────────────────────────────────

-- purchase_receipts.journal_entry_id → journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_receipts_journal_entry_id_fkey'
        AND table_name = 'purchase_receipts'
    ) THEN
        ALTER TABLE purchase_receipts
            ADD CONSTRAINT purchase_receipts_journal_entry_id_fkey
            FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
            ON DELETE SET NULL;
        RAISE NOTICE '✅ FK: purchase_receipts.journal_entry_id → journal_entries';
    ELSE
        RAISE NOTICE '⏭️ FK purchase_receipts_journal_entry_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 purchase_order_items
-- ────────────────────────────────────────────────────────────────

-- purchase_order_items.material_id → fabric_materials
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_order_items_material_id_fkey'
        AND table_name = 'purchase_order_items'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_order_items' AND column_name = 'material_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'fabric_materials'
        ) THEN
            ALTER TABLE purchase_order_items
                ADD CONSTRAINT purchase_order_items_material_id_fkey
                FOREIGN KEY (material_id) REFERENCES fabric_materials(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_order_items.material_id → fabric_materials';
        ELSE
            RAISE NOTICE '⚠️ material_id or fabric_materials not found — skipping';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_order_items_material_id_fkey already exists';
    END IF;
END $$;

-- purchase_order_items.product_id → products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_order_items_product_id_fkey'
        AND table_name = 'purchase_order_items'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_order_items' AND column_name = 'product_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'products'
        ) THEN
            ALTER TABLE purchase_order_items
                ADD CONSTRAINT purchase_order_items_product_id_fkey
                FOREIGN KEY (product_id) REFERENCES products(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_order_items.product_id → products';
        ELSE
            RAISE NOTICE '⚠️ product_id or products not found — skipping';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_order_items_product_id_fkey already exists';
    END IF;
END $$;

-- purchase_order_items.variant_id → product_variants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_order_items_variant_id_fkey'
        AND table_name = 'purchase_order_items'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_order_items' AND column_name = 'variant_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants'
        ) THEN
            ALTER TABLE purchase_order_items
                ADD CONSTRAINT purchase_order_items_variant_id_fkey
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_order_items.variant_id → product_variants';
        ELSE
            RAISE NOTICE '⚠️ variant_id or product_variants not found — skipping';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_order_items_variant_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 purchase_receipt_items
-- ────────────────────────────────────────────────────────────────

-- purchase_receipt_items.material_id → fabric_materials
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_receipt_items_material_id_fkey'
        AND table_name = 'purchase_receipt_items'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'purchase_receipt_items' AND column_name = 'material_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'fabric_materials'
        ) THEN
            ALTER TABLE purchase_receipt_items
                ADD CONSTRAINT purchase_receipt_items_material_id_fkey
                FOREIGN KEY (material_id) REFERENCES fabric_materials(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: purchase_receipt_items.material_id → fabric_materials';
        ELSE
            RAISE NOTICE '⚠️ material_id or fabric_materials not found — skipping';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK purchase_receipt_items_material_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 sales_invoices
-- ────────────────────────────────────────────────────────────────

-- sales_invoices.customer_id → customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_invoices_customer_id_fkey'
        AND table_name = 'sales_invoices'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'sales_invoices' AND column_name = 'customer_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'customers'
        ) THEN
            ALTER TABLE sales_invoices
                ADD CONSTRAINT sales_invoices_customer_id_fkey
                FOREIGN KEY (customer_id) REFERENCES customers(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: sales_invoices.customer_id → customers';
        ELSE
            RAISE NOTICE '⚠️ customer_id or customers not found — skipping';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK sales_invoices_customer_id_fkey already exists';
    END IF;
END $$;

-- sales_invoices.journal_entry_id → journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_invoices_journal_entry_id_fkey'
        AND table_name = 'sales_invoices'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'sales_invoices' AND column_name = 'journal_entry_id'
        ) THEN
            ALTER TABLE sales_invoices
                ADD CONSTRAINT sales_invoices_journal_entry_id_fkey
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: sales_invoices.journal_entry_id → journal_entries';
        ELSE
            RAISE NOTICE '⚠️ journal_entry_id column not found on sales_invoices';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK sales_invoices_journal_entry_id_fkey already exists';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 🔗 payment_vouchers + payment_receipts
-- ────────────────────────────────────────────────────────────────

-- payment_vouchers.journal_entry_id → journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payment_vouchers_journal_entry_id_fkey'
        AND table_name = 'payment_vouchers'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payment_vouchers' AND column_name = 'journal_entry_id'
        ) THEN
            ALTER TABLE payment_vouchers
                ADD CONSTRAINT payment_vouchers_journal_entry_id_fkey
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: payment_vouchers.journal_entry_id → journal_entries';
        ELSE
            RAISE NOTICE '⚠️ journal_entry_id column not found on payment_vouchers';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK payment_vouchers_journal_entry_id_fkey already exists';
    END IF;
END $$;

-- payment_receipts.journal_entry_id → journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payment_receipts_journal_entry_id_fkey'
        AND table_name = 'payment_receipts'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payment_receipts' AND column_name = 'journal_entry_id'
        ) THEN
            ALTER TABLE payment_receipts
                ADD CONSTRAINT payment_receipts_journal_entry_id_fkey
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
                ON DELETE SET NULL;
            RAISE NOTICE '✅ FK: payment_receipts.journal_entry_id → journal_entries';
        ELSE
            RAISE NOTICE '⚠️ journal_entry_id column not found on payment_receipts';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ FK payment_receipts_journal_entry_id_fkey already exists';
    END IF;
END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  القسم ٣: إضافة Indexes للأعمدة الجديدة                     ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation ON purchase_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_order ON purchase_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_journal ON purchase_invoices(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_journal ON purchase_receipts(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_journal ON sales_invoices(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_journal ON payment_vouchers(journal_entry_id);

DO $$ BEGIN RAISE NOTICE '✅ All indexes created'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  القسم ٤: التحقق النهائي                                     ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 PHASE 1 VERIFICATION — Foreign Keys';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    
    -- Count FKs on key tables
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN (
        'purchase_orders', 'purchase_invoices', 'purchase_receipts',
        'purchase_order_items', 'purchase_receipt_items',
        'sales_invoices', 'payment_vouchers', 'payment_receipts'
    );
    
    RAISE NOTICE '  Total FKs on key tables: %', v_count;
    RAISE NOTICE '';
    
    -- Check each critical FK
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_orders_quotation_id_fkey') THEN
        RAISE NOTICE '  ✅ purchase_orders.quotation_id → purchase_quotations';
    ELSE
        RAISE NOTICE '  ❌ purchase_orders.quotation_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_invoices_order_id_fkey') THEN
        RAISE NOTICE '  ✅ purchase_invoices.order_id → purchase_orders';
    ELSE
        RAISE NOTICE '  ❌ purchase_invoices.order_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_invoices_supplier_id_fkey') THEN
        RAISE NOTICE '  ✅ purchase_invoices.supplier_id → suppliers';
    ELSE
        RAISE NOTICE '  ❌ purchase_invoices.supplier_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_invoices_journal_entry_id_fkey') THEN
        RAISE NOTICE '  ✅ purchase_invoices.journal_entry_id → journal_entries';
    ELSE
        RAISE NOTICE '  ❌ purchase_invoices.journal_entry_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_invoices_customer_id_fkey') THEN
        RAISE NOTICE '  ✅ sales_invoices.customer_id → customers';
    ELSE
        RAISE NOTICE '  ❌ sales_invoices.customer_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_invoices_journal_entry_id_fkey') THEN
        RAISE NOTICE '  ✅ sales_invoices.journal_entry_id → journal_entries';
    ELSE
        RAISE NOTICE '  ❌ sales_invoices.journal_entry_id FK MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_receipts_journal_entry_id_fkey') THEN
        RAISE NOTICE '  ✅ purchase_receipts.journal_entry_id → journal_entries';
    ELSE
        RAISE NOTICE '  ❌ purchase_receipts.journal_entry_id FK MISSING';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Phase 1 Complete!';
    RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;

COMMIT;
