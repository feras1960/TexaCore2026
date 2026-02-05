-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_50: Product Images Storage System
-- نظام تخزين صور المنتجات
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يُنشئ:
-- 1. Storage Bucket للصور
-- 2. RLS Policies للصور
-- 3. Functions لرفع/حذف الصور
-- 4. Integration مع جدول products
-- 
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📸 Product Images Storage System';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. إنشاء Storage Bucket للصور
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- التحقق من وجود schema storage
    IF EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'storage'
    ) THEN
        -- إنشاء bucket للصور
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'product-images',
            'product-images',
            true,  -- public للصور في المتجر
            5242880,  -- 5MB max per image
            ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        
        RAISE NOTICE '✅ تم إنشاء/تحديث Storage Bucket: product-images';
    ELSE
        RAISE NOTICE '⚠️ storage schema غير موجود - سيتم إنشاؤه من Supabase Dashboard';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل إنشاء Storage Bucket: %', SQLERRM;
        RAISE NOTICE 'ℹ️ قم بإنشائه يدوياً من Supabase Dashboard';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS Policies للصور
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        -- السماح للجميع بقراءة الصور (public)
        DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
        CREATE POLICY "Public read product images" ON storage.objects
            FOR SELECT
            USING (bucket_id = 'product-images');
        
        -- السماح للمستخدمين المصادقين برفع الصور لـ tenant الخاص بهم
        DROP POLICY IF EXISTS "Authenticated users upload product images" ON storage.objects;
        CREATE POLICY "Authenticated users upload product images" ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'product-images' AND
                (storage.foldername(name))[1] = get_current_tenant_id()::text
            );
        
        -- السماح بالتحديث
        DROP POLICY IF EXISTS "Authenticated users update product images" ON storage.objects;
        CREATE POLICY "Authenticated users update product images" ON storage.objects
            FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'product-images' AND
                (storage.foldername(name))[1] = get_current_tenant_id()::text
            );
        
        -- السماح بالحذف
        DROP POLICY IF EXISTS "Authenticated users delete product images" ON storage.objects;
        CREATE POLICY "Authenticated users delete product images" ON storage.objects
            FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'product-images' AND
                (storage.foldername(name))[1] = get_current_tenant_id()::text
            );
        
        RAISE NOTICE '✅ تم تطبيق Storage RLS Policies';
    ELSE
        RAISE NOTICE '⚠️ storage.objects غير موجود';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل تطبيق Storage Policies: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. دالة إضافة صورة للمنتج
-- Add image to product
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_product_image(
    p_tenant_id UUID,
    p_product_id UUID,
    p_image_url TEXT,
    p_is_primary BOOLEAN DEFAULT false,
    p_alt_text TEXT DEFAULT NULL,
    p_display_order INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_images JSONB;
    v_new_image JSONB;
    v_updated_images JSONB;
    v_max_order INT;
BEGIN
    -- 1. الحصول على الصور الحالية
    SELECT COALESCE(images, '[]'::jsonb)
    INTO v_current_images
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- 2. تحديد display_order إذا لم يُحدد
    IF p_display_order IS NULL THEN
        SELECT COALESCE(MAX((img->>'display_order')::int), 0) + 1
        INTO v_max_order
        FROM jsonb_array_elements(v_current_images) AS img;
        
        p_display_order := v_max_order;
    END IF;
    
    -- 3. إنشاء كائن الصورة الجديدة
    v_new_image := jsonb_build_object(
        'url', p_image_url,
        'is_primary', p_is_primary,
        'alt_text', COALESCE(p_alt_text, ''),
        'display_order', p_display_order,
        'uploaded_at', NOW()
    );
    
    -- 4. إذا كانت primary، اجعل الصور الأخرى غير primary
    IF p_is_primary THEN
        v_updated_images := (
            SELECT jsonb_agg(
                jsonb_set(img, '{is_primary}', 'false'::jsonb)
            )
            FROM jsonb_array_elements(v_current_images) AS img
        );
        v_current_images := COALESCE(v_updated_images, '[]'::jsonb);
    END IF;
    
    -- 5. إضافة الصورة الجديدة
    v_updated_images := v_current_images || v_new_image;
    
    -- 6. تحديث المنتج
    UPDATE products
    SET images = v_updated_images,
        updated_at = NOW()
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    RETURN v_new_image;
END;
$$;

COMMENT ON FUNCTION add_product_image IS 'إضافة صورة جديدة للمنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. دالة حذف صورة من المنتج
-- Remove image from product
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION remove_product_image(
    p_tenant_id UUID,
    p_product_id UUID,
    p_image_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_images JSONB;
    v_updated_images JSONB;
BEGIN
    -- 1. الحصول على الصور الحالية
    SELECT COALESCE(images, '[]'::jsonb)
    INTO v_current_images
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- 2. حذف الصورة المحددة
    v_updated_images := (
        SELECT jsonb_agg(img)
        FROM jsonb_array_elements(v_current_images) AS img
        WHERE img->>'url' != p_image_url
    );
    
    -- 3. تحديث المنتج
    UPDATE products
    SET images = COALESCE(v_updated_images, '[]'::jsonb),
        updated_at = NOW()
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION remove_product_image IS 'حذف صورة من المنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة تعيين صورة رئيسية
-- Set primary image
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_primary_product_image(
    p_tenant_id UUID,
    p_product_id UUID,
    p_image_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_images JSONB;
    v_updated_images JSONB;
BEGIN
    -- 1. الحصول على الصور الحالية
    SELECT COALESCE(images, '[]'::jsonb)
    INTO v_current_images
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- 2. تحديث جميع الصور
    v_updated_images := (
        SELECT jsonb_agg(
            CASE 
                WHEN img->>'url' = p_image_url THEN
                    jsonb_set(img, '{is_primary}', 'true'::jsonb)
                ELSE
                    jsonb_set(img, '{is_primary}', 'false'::jsonb)
            END
        )
        FROM jsonb_array_elements(v_current_images) AS img
    );
    
    -- 3. تحديث المنتج
    UPDATE products
    SET images = v_updated_images,
        updated_at = NOW()
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION set_primary_product_image IS 'تعيين صورة كصورة رئيسية';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة إعادة ترتيب الصور
-- Reorder images
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reorder_product_images(
    p_tenant_id UUID,
    p_product_id UUID,
    p_image_orders JSONB  -- [{"url": "...", "display_order": 1}, ...]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_images JSONB;
    v_updated_images JSONB;
    v_order_item JSONB;
BEGIN
    -- 1. الحصول على الصور الحالية
    SELECT COALESCE(images, '[]'::jsonb)
    INTO v_current_images
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- 2. تحديث display_order لكل صورة
    v_updated_images := (
        SELECT jsonb_agg(
            jsonb_set(
                img, 
                '{display_order}', 
                to_jsonb(
                    COALESCE(
                        (
                            SELECT (order_item->>'display_order')::int
                            FROM jsonb_array_elements(p_image_orders) AS order_item
                            WHERE order_item->>'url' = img->>'url'
                        ),
                        (img->>'display_order')::int
                    )
                )
            )
            ORDER BY 
                COALESCE(
                    (
                        SELECT (order_item->>'display_order')::int
                        FROM jsonb_array_elements(p_image_orders) AS order_item
                        WHERE order_item->>'url' = img->>'url'
                    ),
                    (img->>'display_order')::int
                )
        )
        FROM jsonb_array_elements(v_current_images) AS img
    );
    
    -- 3. تحديث المنتج
    UPDATE products
    SET images = v_updated_images,
        updated_at = NOW()
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION reorder_product_images IS 'إعادة ترتيب صور المنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة الحصول على الصورة الرئيسية
-- Get primary image
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_product_primary_image(
    p_product_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_primary_image TEXT;
BEGIN
    SELECT img->>'url'
    INTO v_primary_image
    FROM products p,
         jsonb_array_elements(p.images) AS img
    WHERE p.id = p_product_id
      AND (img->>'is_primary')::boolean = true
    LIMIT 1;
    
    -- إذا لم توجد صورة primary، أرجع أول صورة
    IF v_primary_image IS NULL THEN
        SELECT img->>'url'
        INTO v_primary_image
        FROM products p,
             jsonb_array_elements(p.images) AS img
        WHERE p.id = p_product_id
        ORDER BY (img->>'display_order')::int
        LIMIT 1;
    END IF;
    
    RETURN v_primary_image;
END;
$$;

COMMENT ON FUNCTION get_product_primary_image IS 'الحصول على الصورة الرئيسية للمنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية STEP_50
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تثبيت نظام الصور بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage Bucket:';
    RAISE NOTICE '  • product-images (public, 5MB max)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions المُنشأة:';
    RAISE NOTICE '  1. add_product_image() - إضافة صورة';
    RAISE NOTICE '  2. remove_product_image() - حذف صورة';
    RAISE NOTICE '  3. set_primary_product_image() - تعيين رئيسية';
    RAISE NOTICE '  4. reorder_product_images() - إعادة ترتيب';
    RAISE NOTICE '  5. get_product_primary_image() - جلب الرئيسية';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 JSONB Structure في products.images:';
    RAISE NOTICE '  [';
    RAISE NOTICE '    {';
    RAISE NOTICE '      "url": "tenant_id/product_id/image.jpg",';
    RAISE NOTICE '      "is_primary": true,';
    RAISE NOTICE '      "alt_text": "Product Image",';
    RAISE NOTICE '      "display_order": 1,';
    RAISE NOTICE '      "uploaded_at": "2026-01-25T..."';
    RAISE NOTICE '    }';
    RAISE NOTICE '  ]';
    RAISE NOTICE '';
END $$;
