-- ═══════════════════════════════════════════════════════════════════════════
-- إصلاح دالة get_products_for_store (إزالة الاعتماد على brands)
-- Fix get_products_for_store function (remove brands dependency)
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف جميع النسخ الموجودة من الدالة
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_products_for_store'
          AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
        RAISE NOTICE '🗑️ تم حذف: %', r.func_signature;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️ لم يتم العثور على نسخ سابقة من get_products_for_store';
    END IF;
END $$;

-- إنشاء الدالة الجديدة
CREATE OR REPLACE FUNCTION get_products_for_store(
    p_tenant_id UUID,
    p_company_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_is_featured BOOLEAN DEFAULT NULL,
    p_search_term VARCHAR DEFAULT NULL,
    p_sort_by VARCHAR DEFAULT 'created_at', -- created_at, price, name
    p_sort_order VARCHAR DEFAULT 'DESC', -- ASC, DESC
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
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
STABLE
AS $$
DECLARE
    v_customer_group_id UUID;
    v_customer_price_list_id UUID;
    v_group_discount DECIMAL := 0;
BEGIN
    -- الحصول على معلومات العميل
    IF p_customer_id IS NOT NULL THEN
        SELECT cg.id, cg.discount_percent, COALESCE(c.price_list_id, cg.price_list_id)
        INTO v_customer_group_id, v_group_discount, v_customer_price_list_id
        FROM customers c
        LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id
        WHERE c.id = p_customer_id AND c.tenant_id = p_tenant_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.barcode,
        p.name_ar,
        p.name_en,
        p.description,
        p.category_id,
        COALESCE(pc.name_ar, pc.name_en, pc.name) as category_name_ar,
        
        -- إزالة brand_id و brand_name (NULL)
        NULL::UUID as brand_id,
        NULL::VARCHAR as brand_name,
        
        p.images,
        p.slug,
        p.default_price as base_price,
        
        -- حساب سعر العميل
        CASE 
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
            WHEN v_group_discount > 0 THEN
                p.default_price * (1 - v_group_discount / 100)
            ELSE
                p.default_price
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
            ELSE
                v_group_discount
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
            ELSE
                p.default_price
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
    -- إزالة LEFT JOIN brands
    
    WHERE p.tenant_id = p_tenant_id
      AND p.is_visible_online = true
      AND (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status')
           OR p.status = 'active')
      
      -- ✅ التحقق من صلاحية الوصول للمنتج
      AND can_customer_access_product(p_tenant_id, p_customer_id, p.id)
      
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

COMMENT ON FUNCTION get_products_for_store IS 'عرض المنتجات للمتجر الإلكتروني مع الأسعار حسب العميل (بدون brands)';

-- التحقق
DO $$
BEGIN
    RAISE NOTICE '✅ تم تحديث دالة get_products_for_store';
    RAISE NOTICE '   - إزالة الاعتماد على جدول brands';
    RAISE NOTICE '   - إزالة التحقق من عمود status (مع دعم اختياري)';
    RAISE NOTICE '';
END $$;
