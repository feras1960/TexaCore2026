-- ═══════════════════════════════════════════════════════════════════════════
-- إصلاح: بنود الاستلام وحركات المخزون — إزالة FK المعطلة وإضافة material_id
-- Fix: Receipt Items & Inventory Movements — Drop broken FK, add material_id
-- ═══════════════════════════════════════════════════════════════════════════
-- المشكلة: product_id يشير إلى جدول products لكن نحن نستخدم materials
-- الحل: إضافة عمود material_id UUID بدون FK constraint

-- ════════════════════════════════════════════════════════════════
-- 1. purchase_receipt_items — إضافة material_id
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    -- Add material_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_receipt_items' AND column_name = 'material_id'
    ) THEN
        ALTER TABLE purchase_receipt_items ADD COLUMN material_id UUID;
        RAISE NOTICE 'Added material_id column to purchase_receipt_items';
    END IF;

    -- Drop the FK constraint on product_id if it exists (it references products table)
    -- This allows us to store material IDs in product_id without FK violation
    BEGIN
        ALTER TABLE purchase_receipt_items DROP CONSTRAINT IF EXISTS purchase_receipt_items_product_id_fkey;
        RAISE NOTICE 'Dropped product_id FK constraint from purchase_receipt_items';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No FK constraint to drop on purchase_receipt_items.product_id: %', SQLERRM;
    END;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 2. inventory_movements — إضافة material_id وإزالة FK
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    -- Add material_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_movements' AND column_name = 'material_id'
    ) THEN
        ALTER TABLE inventory_movements ADD COLUMN material_id UUID;
        RAISE NOTICE 'Added material_id column to inventory_movements';
    END IF;

    -- Drop the FK constraint on product_id if it exists
    BEGIN
        ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;
        RAISE NOTICE 'Dropped product_id FK constraint from inventory_movements';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No FK constraint to drop on inventory_movements.product_id: %', SQLERRM;
    END;

    -- Make created_by nullable (it was NOT NULL but sometimes we don't have user context)
    BEGIN
        ALTER TABLE inventory_movements ALTER COLUMN created_by DROP NOT NULL;
        RAISE NOTICE 'Made created_by nullable in inventory_movements';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'created_by already nullable or error: %', SQLERRM;
    END;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 3. إضافة index على material_id الجديد
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_receipt_items_material ON purchase_receipt_items(material_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON purchase_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_movements_material ON inventory_movements(material_id);

-- ════════════════════════════════════════════════════════════════
-- Verify
-- ════════════════════════════════════════════════════════════════
SELECT 'purchase_receipt_items columns:' AS info, 
       string_agg(column_name, ', ') AS columns
FROM information_schema.columns 
WHERE table_name = 'purchase_receipt_items';

SELECT 'inventory_movements columns:' AS info, 
       string_agg(column_name, ', ') AS columns
FROM information_schema.columns 
WHERE table_name = 'inventory_movements';
