-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_48: E-Commerce Functions للمتجر الإلكتروني
-- E-Commerce & Online Store Backend Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على جميع Functions المطلوبة للمتجر الإلكتروني:
-- 1. عرض المنتجات حسب العميل
-- 2. حساب الأسعار الديناميكية
-- 3. المنتجات الخاصة والعروض
-- 4. Shopping Cart System
-- 5. Product Availability Check
-- 
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🛒 E-Commerce Functions Installation';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. دالة عرض المنتجات للمتجر الإلكتروني
-- Get Products for Online Store with Customer-Specific Pricing
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_products_for_store(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_is_featured BOOLEAN DEFAULT NULL,
    p_sort_by VARCHAR DEFAULT 'created_at',
    p_sort_order VARCHAR DEFAULT 'DESC',
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    barcode VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    description TEXT,
    category_id UUID,
    category_name_ar VARCHAR,
    brand_id UUID,
    brand_name VARCHAR,
    images JSONB,
    slug VARCHAR,
    base_price DECIMAL,
    customer_price DECIMAL,
    discount_percent DECIMAL,
    discount_amount DECIMAL,
    price_source VARCHAR,
    is_on_sale BOOLEAN,
    stock_status VARCHAR,
    available_quantity DECIMAL,
    is_featured BOOLEAN,
    rating DECIMAL,
    reviews_count INT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_group_id UUID;
    v_customer_price_list_id UUID;
    v_group_discount DECIMAL := 0;
BEGIN
    -- 1. الحصول على معلومات العميل إذا كان مسجلاً
    IF p_customer_id IS NOT NULL THEN
        SELECT c.group_id, c.price_list_id
        INTO v_customer_group_id, v_customer_price_list_id
        FROM customers c
        WHERE c.id = p_customer_id AND c.tenant_id = p_tenant_id;
        
        -- 2. الحصول على خصم المجموعة
        IF v_customer_group_id IS NOT NULL THEN
            SELECT COALESCE(default_discount_percent, 0)
            INTO v_group_discount
            FROM customer_groups
            WHERE id = v_customer_group_id;
        END IF;
    END IF;
    
    -- 3. إرجاع المنتجات
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.barcode,
        p.name_ar,
        p.name_en,
        p.description,
        p.category_id,
        pc.name_ar as category_name_ar,
        p.brand_id,
        b.name as brand_name,
        p.images,
        p.slug,
        
        -- السعر الأساسي
        p.default_price as base_price,
        
        -- السعر للعميل (مع الخصومات)
        CASE 
            -- قائمة أسعار خاصة
            WHEN v_customer_price_list_id IS NOT NULL THEN
                COALESCE(
                    (SELECT pli.price 
                     FROM price_list_items pli 
                     WHERE pli.price_list_id = v_customer_price_list_id 
                       AND pli.product_id = p.id
                       AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
                       AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
                     ORDER BY pli.min_quantity DESC
                     LIMIT 1),
                    p.default_price
                )
            -- خصم المجموعة
            WHEN v_group_discount > 0 THEN
                p.default_price * (1 - v_group_discount / 100)
            -- السعر العادي
            ELSE p.default_price
        END as customer_price,
        
        -- نسبة الخصم
        CASE 
            WHEN v_customer_price_list_id IS NOT NULL THEN
                GREATEST(0, (p.default_price - COALESCE(
                    (SELECT pli.price 
                     FROM price_list_items pli 
                     WHERE pli.price_list_id = v_customer_price_list_id 
                       AND pli.product_id = p.id
                       AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
                       AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
                     LIMIT 1),
                    p.default_price
                )) / NULLIF(p.default_price, 0) * 100)
            ELSE v_group_discount
        END as discount_percent,
        
        -- مبلغ الخصم
        p.default_price - CASE 
            WHEN v_customer_price_list_id IS NOT NULL THEN
                COALESCE(
                    (SELECT pli.price 
                     FROM price_list_items pli 
                     WHERE pli.price_list_id = v_customer_price_list_id 
                       AND pli.product_id = p.id
                       AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
                       AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
                     LIMIT 1),
                    p.default_price
                )
            WHEN v_group_discount > 0 THEN
                p.default_price * (1 - v_group_discount / 100)
            ELSE p.default_price
        END as discount_amount,
        
        -- مصدر السعر
        CASE 
            WHEN v_customer_price_list_id IS NOT NULL AND EXISTS(
                SELECT 1 FROM price_list_items pli 
                WHERE pli.price_list_id = v_customer_price_list_id 
                  AND pli.product_id = p.id
            ) THEN 'special_price_list'
            WHEN v_group_discount > 0 THEN 'group_discount'
            ELSE 'base_price'
        END as price_source,
        
        -- في تخفيضات؟ (TODO: ربط بجدول العروض)
        false as is_on_sale,
        
        -- حالة المخزون
        CASE 
            WHEN p.product_type = 'service' THEN 'unlimited'
            WHEN COALESCE(
                (SELECT SUM(quantity_on_hand) 
                 FROM inventory_stock 
                 WHERE product_id = p.id AND tenant_id = p_tenant_id),
                0
            ) > 0 THEN 'in_stock'
            ELSE 'out_of_stock'
        END as stock_status,
        
        -- الكمية المتاحة
        COALESCE(
            (SELECT SUM(quantity_on_hand) 
             FROM inventory_stock 
             WHERE product_id = p.id AND tenant_id = p_tenant_id),
            0
        ) as available_quantity,
        
        p.is_featured,
        
        -- التقييم (TODO: ربط بجدول التقييمات)
        0.0 as rating,
        0 as reviews_count,
        
        p.created_at
        
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    
    WHERE p.tenant_id = p_tenant_id
      AND p.is_visible_online = true
      AND p.status = 'active'
      
      -- الفلاتر
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_is_featured IS NULL OR p.is_featured = p_is_featured)
      AND (p_search_term IS NULL OR 
           p.name_ar ILIKE '%' || p_search_term || '%' OR
           p.name_en ILIKE '%' || p_search_term || '%' OR
           p.description ILIKE '%' || p_search_term || '%')
      
      -- فلتر السعر
      AND (p_min_price IS NULL OR p.default_price >= p_min_price)
      AND (p_max_price IS NULL OR p.default_price <= p_max_price)
    
    ORDER BY
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'DESC' THEN p.created_at END DESC,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'ASC' THEN p.created_at END ASC,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'ASC' THEN p.default_price END ASC,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'DESC' THEN p.default_price END DESC,
        CASE WHEN p_sort_by = 'name' THEN p.name_ar END ASC
    
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_products_for_store IS 'عرض المنتجات للمتجر الإلكتروني مع الأسعار حسب العميل';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. دالة حساب سعر المنتج للعميل بالتفصيل
-- Calculate Detailed Product Price for Customer
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_product_price(
    p_tenant_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT 1
)
RETURNS TABLE (
    base_price DECIMAL,
    customer_price DECIMAL,
    discount_amount DECIMAL,
    discount_percent DECIMAL,
    final_price DECIMAL,
    total_price DECIMAL,
    price_source VARCHAR,
    price_source_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_price DECIMAL;
    v_customer_price DECIMAL;
    v_price_source VARCHAR;
    v_price_source_name VARCHAR;
    v_discount_percent DECIMAL := 0;
BEGIN
    -- 1. السعر الأساسي
    IF p_variant_id IS NOT NULL THEN
        -- سعر الـ variant إذا وجد override
        SELECT 
            COALESCE(pv.price_override, p.default_price)
        INTO v_base_price
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = p_variant_id 
          AND pv.tenant_id = p_tenant_id;
    ELSE
        -- السعر الأساسي للمنتج
        SELECT default_price INTO v_base_price
        FROM products 
        WHERE id = p_product_id 
          AND tenant_id = p_tenant_id;
    END IF;
    
    -- 2. التحقق من قائمة أسعار خاصة
    IF p_customer_id IS NOT NULL THEN
        SELECT 
            pli.price,
            'special_price_list',
            'قائمة أسعار خاصة'
        INTO 
            v_customer_price, 
            v_price_source, 
            v_price_source_name
        FROM price_list_items pli
        JOIN customers c ON c.price_list_id = pli.price_list_id
        WHERE c.id = p_customer_id
          AND c.tenant_id = p_tenant_id
          AND pli.product_id = p_product_id
          AND (pli.variant_id IS NULL OR pli.variant_id = p_variant_id)
          AND pli.min_quantity <= p_quantity
          AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
          AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
        ORDER BY pli.min_quantity DESC
        LIMIT 1;
        
        IF v_customer_price IS NOT NULL THEN
            v_discount_percent := ((v_base_price - v_customer_price) / NULLIF(v_base_price, 0) * 100);
        END IF;
    END IF;
    
    -- 3. خصم المجموعة
    IF v_customer_price IS NULL AND p_customer_id IS NOT NULL THEN
        SELECT 
            v_base_price * (1 - COALESCE(cg.default_discount_percent, 0) / 100),
            'group_discount',
            'خصم مجموعة ' || cg.name_ar,
            COALESCE(cg.default_discount_percent, 0)
        INTO 
            v_customer_price, 
            v_price_source, 
            v_price_source_name,
            v_discount_percent
        FROM customers c
        JOIN customer_groups cg ON cg.id = c.group_id
        WHERE c.id = p_customer_id
          AND c.tenant_id = p_tenant_id;
    END IF;
    
    -- 4. السعر العادي
    IF v_customer_price IS NULL THEN
        v_customer_price := v_base_price;
        v_price_source := 'base_price';
        v_price_source_name := 'السعر الأساسي';
    END IF;
    
    -- 5. إرجاع النتائج
    RETURN QUERY
    SELECT 
        v_base_price,
        v_customer_price,
        v_base_price - v_customer_price as discount_amount,
        v_discount_percent,
        v_customer_price as final_price,
        v_customer_price * p_quantity as total_price,
        v_price_source,
        v_price_source_name;
END;
$$;

COMMENT ON FUNCTION calculate_product_price IS 'حساب سعر المنتج التفصيلي للعميل مع جميع الخصومات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. دالة المنتجات الخاصة بالعميل
-- Get Customer Special/Exclusive Products
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_customer_special_products(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    images JSONB,
    base_price DECIMAL,
    special_price DECIMAL,
    discount_percent DECIMAL,
    discount_amount DECIMAL,
    valid_from DATE,
    valid_until DATE,
    days_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.name_ar,
        p.name_en,
        p.images,
        p.default_price as base_price,
        pli.price as special_price,
        ((p.default_price - pli.price) / NULLIF(p.default_price, 0) * 100) as discount_percent,
        (p.default_price - pli.price) as discount_amount,
        pli.valid_from,
        pli.valid_to as valid_until,
        CASE 
            WHEN pli.valid_to IS NOT NULL 
            THEN (pli.valid_to - CURRENT_DATE)
            ELSE NULL
        END as days_remaining
    FROM price_list_items pli
    JOIN products p ON p.id = pli.product_id
    JOIN customers c ON c.price_list_id = pli.price_list_id
    WHERE c.id = p_customer_id
      AND c.tenant_id = p_tenant_id
      AND p.tenant_id = p_tenant_id
      AND p.is_visible_online = true
      AND p.status = 'active'
      AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
      AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
      AND pli.price < p.default_price -- فقط المنتجات ذات الخصم
    ORDER BY discount_percent DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_customer_special_products IS 'المنتجات الخاصة والعروض الحصرية للعميل';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. دالة التحقق من توفر المنتج
-- Check Product Availability
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_product_availability(
    p_tenant_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT 1,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    stock_status VARCHAR,
    available_quantity DECIMAL,
    requested_quantity DECIMAL,
    shortage_quantity DECIMAL,
    estimated_availability_date DATE,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_type VARCHAR;
    v_available_qty DECIMAL := 0;
BEGIN
    -- 1. التحقق من نوع المنتج
    SELECT product_type INTO v_product_type
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- 2. المنتجات الخدمية (غير محدودة)
    IF v_product_type = 'service' THEN
        RETURN QUERY
        SELECT 
            true as is_available,
            'unlimited'::VARCHAR as stock_status,
            999999.0 as available_quantity,
            p_quantity as requested_quantity,
            0.0 as shortage_quantity,
            NULL::DATE as estimated_availability_date,
            'المنتج متوفر (خدمة)' as message;
        RETURN;
    END IF;
    
    -- 3. حساب الكمية المتاحة
    SELECT COALESCE(SUM(
        CASE 
            WHEN p_variant_id IS NULL THEN ist.quantity_on_hand
            WHEN ist.variant_id = p_variant_id THEN ist.quantity_on_hand
            ELSE 0
        END
    ), 0)
    INTO v_available_qty
    FROM inventory_stock ist
    WHERE ist.product_id = p_product_id
      AND ist.tenant_id = p_tenant_id
      AND (p_warehouse_id IS NULL OR ist.warehouse_id = p_warehouse_id);
    
    -- 4. التحقق من التوفر
    RETURN QUERY
    SELECT 
        (v_available_qty >= p_quantity) as is_available,
        CASE 
            WHEN v_available_qty >= p_quantity THEN 'in_stock'
            WHEN v_available_qty > 0 THEN 'low_stock'
            ELSE 'out_of_stock'
        END::VARCHAR as stock_status,
        v_available_qty as available_quantity,
        p_quantity as requested_quantity,
        GREATEST(0, p_quantity - v_available_qty) as shortage_quantity,
        NULL::DATE as estimated_availability_date, -- TODO: حساب من أوامر الشراء
        CASE 
            WHEN v_available_qty >= p_quantity THEN 'المنتج متوفر'
            WHEN v_available_qty > 0 THEN 'الكمية المتاحة: ' || v_available_qty::TEXT
            ELSE 'المنتج غير متوفر حالياً'
        END as message;
END;
$$;

COMMENT ON FUNCTION check_product_availability IS 'التحقق من توفر المنتج والكمية المتاحة';

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية STEP_48
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تثبيت E-Commerce Functions بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions المُثبتة:';
    RAISE NOTICE '  1. get_products_for_store() - عرض المنتجات';
    RAISE NOTICE '  2. calculate_product_price() - حساب السعر';
    RAISE NOTICE '  3. get_customer_special_products() - المنتجات الخاصة';
    RAISE NOTICE '  4. check_product_availability() - التحقق من التوفر';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '  • تطبيق STEP_49 لجداول Shopping Cart';
    RAISE NOTICE '  • بناء Frontend Components';
    RAISE NOTICE '';
END $$;
