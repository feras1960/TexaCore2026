-- ═══════════════════════════════════════════════════════════════════════════
-- إضافة أعمدة الظهور في المتجر الإلكتروني (إذا لم تكن موجودة)
-- Add E-Commerce Visibility Columns (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. إضافة is_visible_online للمنتجات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_visible_online'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN is_visible_online BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ تمت إضافة عمود is_visible_online لجدول products';
    ELSE
        RAISE NOTICE '⏭️ عمود is_visible_online موجود بالفعل في products';
    END IF;
END $$;

-- 2. إضافة is_featured للمنتجات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN is_featured BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ تمت إضافة عمود is_featured لجدول products';
    ELSE
        RAISE NOTICE '⏭️ عمود is_featured موجود بالفعل في products';
    END IF;
END $$;

-- 3. إضافة is_visible_online لفئات المنتجات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_categories' AND column_name = 'is_visible_online'
    ) THEN
        ALTER TABLE product_categories 
        ADD COLUMN is_visible_online BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ تمت إضافة عمود is_visible_online لجدول product_categories';
    ELSE
        RAISE NOTICE '⏭️ عمود is_visible_online موجود بالفعل في product_categories';
    END IF;
END $$;

-- 4. إضافة display_order لفئات المنتجات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_categories' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE product_categories 
        ADD COLUMN display_order INT DEFAULT 0;
        
        RAISE NOTICE '✅ تمت إضافة عمود display_order لجدول product_categories';
    ELSE
        RAISE NOTICE '⏭️ عمود display_order موجود بالفعل في product_categories';
    END IF;
END $$;

-- 5. إضافة images للمنتجات (إذا لم يكن موجوداً)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'images'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
        
        RAISE NOTICE '✅ تمت إضافة عمود images لجدول products';
    ELSE
        RAISE NOTICE '⏭️ عمود images موجود بالفعل في products';
    END IF;
END $$;

-- 6. التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل التحقق من الأعمدة المطلوبة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- عرض الأعمدة الحالية في products
SELECT 
    'products' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('is_visible_online', 'is_featured', 'images')
ORDER BY column_name;

-- عرض الأعمدة الحالية في product_categories
SELECT 
    'product_categories' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'product_categories'
  AND column_name IN ('is_visible_online', 'display_order')
ORDER BY column_name;
