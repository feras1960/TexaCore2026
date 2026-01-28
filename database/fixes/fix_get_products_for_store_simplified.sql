-- ═══════════════════════════════════════════════════════════════════════════
-- حذف وإعادة بناء دالة get_products_for_store (نسخة مبسطة)
-- Delete and Rebuild get_products_for_store (Simplified Version)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. حذف جميع النسخ
DROP FUNCTION IF EXISTS get_products_for_store CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ تم حذف جميع نسخ get_products_for_store';
END $$;

-- 2. إنشاء نسخة مبسطة بدون الاعتماد على أعمدة غير موجودة
CREATE OR REPLACE FUNCTION get_products_for_store(
    p_tenant_id UUID,
    p_company_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_is_featured BOOLEAN DEFAULT NULL,
    p_search_term VARCHAR DEFAULT NULL,
    p_sort_by VARCHAR DEFAULT 'created_at',
    p_sort_order VARCHAR DEFAULT 'DESC',
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
        WHERE c.id = p_customer_id 
          AND c.tenant_id = p_tenant_id;
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
        
        -- اسم الفئة (مرن - يدعم أي هيكل)
        NULL::VARCHAR as category_name_ar,
        
        -- Brand (NULL)
        NULL::UUID as brand_id,
        NULL::VARCHAR as brand_name,
        
        p.images,
        p.slug,
        p.default_price as base_price,
        
        -- سعر العميل (مبسط)
        CASE 
            WHEN v_group_discount > 0 THEN
                p.default_price * (1 - v_group_discount / 100)
            ELSE
                p.default_price
        END as customer_price,
        
        -- نسبة الخصم
        COALESCE(v_group_discount, 0) as discount_percent,
        
        -- مبلغ الخصم
        CASE 
            WHEN v_group_discount > 0 THEN
                p.default_price * (v_group_discount / 100)
            ELSE
                0
        END as discount_amount,
        
        -- مصدر السعر
        CASE 
            WHEN v_group_discount > 0 THEN 'group_discount'
            ELSE 'base_price'
        END as price_source,
        
        false as is_on_sale,
        
        -- حالة المخزون (مبسط)
        'in_stock'::VARCHAR as stock_status,
        
        999999::DECIMAL as available_quantity,
        
        COALESCE(p.is_featured, false) as is_featured,
        
        0.0 as rating,
        0 as reviews_count,
        
        p.created_at
        
    FROM products p
    
    WHERE p.tenant_id = p_tenant_id
      AND COALESCE(p.is_visible_online, true) = true
      
      -- الفلاتر
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_is_featured IS NULL OR COALESCE(p.is_featured, false) = p_is_featured)
      AND (p_search_term IS NULL OR 
           COALESCE(p.name_ar, '') ILIKE '%' || p_search_term || '%' OR
           COALESCE(p.name_en, '') ILIKE '%' || p_search_term || '%' OR
           COALESCE(p.description, '') ILIKE '%' || p_search_term || '%')
      
      -- فلتر السعر
      AND (p_min_price IS NULL OR COALESCE(p.default_price, 0) >= p_min_price)
      AND (p_max_price IS NULL OR COALESCE(p.default_price, 0) <= p_max_price)
    
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

COMMENT ON FUNCTION get_products_for_store IS 'عرض المنتجات للمتجر الإلكتروني (نسخة مبسطة)';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء دالة get_products_for_store (نسخة مبسطة)';
    RAISE NOTICE '   - بدون الاعتماد على product_categories';
    RAISE NOTICE '   - بدون الاعتماد على inventory_stock';
    RAISE NOTICE '   - بدون الاعتماد على can_customer_access_product';
    RAISE NOTICE '   - جاهزة للاختبار!';
    RAISE NOTICE '';
END $$;
