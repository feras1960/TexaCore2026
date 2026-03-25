-- ═══════════════════════════════════════════════════════════════════════════
-- إضافة الأعمدة المفقودة لجدول products
-- Add Missing Columns to products table
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. barcode
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE products ADD COLUMN barcode VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
        RAISE NOTICE '✅ تمت إضافة عمود barcode';
    ELSE
        RAISE NOTICE '⏭️ عمود barcode موجود بالفعل';
    END IF;
END $$;

-- 2. slug
DO $$
DECLARE
    v_has_tenant_id BOOLEAN;
BEGIN
    -- التحقق من وجود tenant_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tenant_id'
    ) INTO v_has_tenant_id;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'slug'
    ) THEN
        ALTER TABLE products ADD COLUMN slug VARCHAR(200);
        
        -- إنشاء index بناءً على وجود tenant_id
        IF v_has_tenant_id THEN
            CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(tenant_id, slug) WHERE slug IS NOT NULL;
        ELSE
            CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
        END IF;
        
        RAISE NOTICE '✅ تمت إضافة عمود slug';
    ELSE
        RAISE NOTICE '⏭️ عمود slug موجود بالفعل';
    END IF;
END $$;

-- 3. default_price
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'default_price'
    ) THEN
        ALTER TABLE products ADD COLUMN default_price DECIMAL(18, 4) DEFAULT 0;
        RAISE NOTICE '✅ تمت إضافة عمود default_price';
        
        -- نسخ القيم من price إذا كان موجوداً
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price') THEN
            UPDATE products SET default_price = price WHERE price IS NOT NULL;
            RAISE NOTICE '   ✅ تم نسخ القيم من price إلى default_price';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ عمود default_price موجود بالفعل';
    END IF;
END $$;

-- 4. product_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'physical';
        RAISE NOTICE '✅ تمت إضافة عمود product_type';
    ELSE
        RAISE NOTICE '⏭️ عمود product_type موجود بالفعل';
    END IF;
END $$;

-- 5. status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'status'
    ) THEN
        ALTER TABLE products ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
        RAISE NOTICE '✅ تمت إضافة عمود status';
    ELSE
        RAISE NOTICE '⏭️ عمود status موجود بالفعل';
    END IF;
END $$;

-- 6. brand_id (اختياري - للاستخدام المستقبلي)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'brand_id'
    ) THEN
        ALTER TABLE products ADD COLUMN brand_id UUID;
        RAISE NOTICE '✅ تمت إضافة عمود brand_id';
    ELSE
        RAISE NOTICE '⏭️ عمود brand_id موجود بالفعل';
    END IF;
END $$;

-- 7. التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم التحقق من جميع الأعمدة المطلوبة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- عرض الأعمدة الحالية
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('barcode', 'slug', 'default_price', 'product_type', 'status', 'brand_id', 'images', 'is_visible_online', 'is_featured')
ORDER BY column_name;

-- إحصائيات المنتجات
SELECT 
    'إجمالي المنتجات' as metric,
    COUNT(*) as count
FROM products
UNION ALL
SELECT 
    'منتجات لها barcode' as metric,
    COUNT(*) as count
FROM products
WHERE barcode IS NOT NULL
UNION ALL
SELECT 
    'منتجات لها slug' as metric,
    COUNT(*) as count
FROM products
WHERE slug IS NOT NULL
UNION ALL
SELECT 
    'منتجات نشطة (status=active)' as metric,
    COUNT(*) as count
FROM products
WHERE status = 'active'
UNION ALL
SELECT 
    'منتجات مرئية online' as metric,
    COUNT(*) as count
FROM products
WHERE is_visible_online = true;
