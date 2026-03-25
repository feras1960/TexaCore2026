-- ═══════════════════════════════════════════════════════════════════════════
-- إضافة أعمدة الأسماء متعددة اللغات لجدول products
-- Add Multi-language Name Columns to products table
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. name_ar (العربية)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE products ADD COLUMN name_ar VARCHAR(200);
        
        -- نسخ من name_en إذا كان موجوداً
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name_en') THEN
            UPDATE products SET name_ar = name_en WHERE name_en IS NOT NULL AND name_ar IS NULL;
            RAISE NOTICE '✅ تمت إضافة عمود name_ar ونسخ القيم من name_en';
        ELSE
            RAISE NOTICE '✅ تمت إضافة عمود name_ar';
        END IF;
    ELSE
        RAISE NOTICE '⏭️ عمود name_ar موجود بالفعل';
    END IF;
END $$;

-- 2. name_en (English) - إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_en'
    ) THEN
        ALTER TABLE products ADD COLUMN name_en VARCHAR(200);
        RAISE NOTICE '✅ تمت إضافة عمود name_en';
    ELSE
        RAISE NOTICE '⏭️ عمود name_en موجود بالفعل';
    END IF;
END $$;

-- 3. إضافة بقية اللغات
DO $$
DECLARE
    v_columns TEXT[] := ARRAY['name_de', 'name_tr', 'name_ru', 'name_uk', 'name_it', 'name_pl', 'name_ro'];
    v_col TEXT;
BEGIN
    FOREACH v_col IN ARRAY v_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = v_col
        ) THEN
            EXECUTE format('ALTER TABLE products ADD COLUMN %I VARCHAR(200)', v_col);
            RAISE NOTICE '✅ تمت إضافة عمود %', v_col;
        END IF;
    END LOOP;
END $$;

-- 4. description - إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'description'
    ) THEN
        ALTER TABLE products ADD COLUMN description TEXT;
        RAISE NOTICE '✅ تمت إضافة عمود description';
    ELSE
        RAISE NOTICE '⏭️ عمود description موجود بالفعل';
    END IF;
END $$;

-- 5. sku - إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'sku'
    ) THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
        RAISE NOTICE '✅ تمت إضافة عمود sku';
    ELSE
        RAISE NOTICE '⏭️ عمود sku موجود بالفعل';
    END IF;
END $$;

-- 6. التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم التحقق من جميع أعمدة الأسماء واللغات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- عرض الأعمدة المتعلقة بالأسماء
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND (column_name LIKE 'name_%' OR column_name IN ('sku', 'description'))
ORDER BY column_name;

-- دالة مساعدة للحصول على الاسم المترجم
CREATE OR REPLACE FUNCTION get_product_name(
    p_product_id UUID,
    p_language VARCHAR DEFAULT 'en'
) RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_name VARCHAR;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(name_%s, name_en, name_ar) FROM products WHERE id = $1',
        p_language
    ) INTO v_name USING p_product_id;
    
    RETURN v_name;
EXCEPTION
    WHEN OTHERS THEN
        -- إذا فشل، نرجع name_en أو name_ar
        SELECT COALESCE(name_en, name_ar) INTO v_name FROM products WHERE id = p_product_id;
        RETURN v_name;
END;
$$;

COMMENT ON FUNCTION get_product_name IS 'الحصول على اسم المنتج بلغة محددة';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء دالة get_product_name()';
    RAISE NOTICE '';
END $$;
