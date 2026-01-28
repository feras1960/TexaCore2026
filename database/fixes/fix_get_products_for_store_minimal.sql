-- ═══════════════════════════════════════════════════════════════════════════
-- دالة get_products_for_store بدون فلاتر (للاختبار فقط)
-- get_products_for_store without filters (for testing only)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_products_for_store CASCADE;

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
BEGIN
    -- نسخة بسيطة جداً - ترجع كل المنتجات بدون فلاتر
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.sku, '') as sku,
        COALESCE(p.barcode, '') as barcode,
        COALESCE(p.name_ar, '') as name_ar,
        COALESCE(p.name_en, '') as name_en,
        COALESCE(p.description, '') as description,
        p.category_id,
        NULL::VARCHAR as category_name_ar,
        NULL::UUID as brand_id,
        NULL::VARCHAR as brand_name,
        COALESCE(p.images, '[]'::jsonb) as images,
        COALESCE(p.slug, '') as slug,
        COALESCE(p.default_price, 0) as base_price,
        COALESCE(p.default_price, 0) as customer_price,
        0::DECIMAL as discount_percent,
        0::DECIMAL as discount_amount,
        'base_price'::VARCHAR as price_source,
        false as is_on_sale,
        'in_stock'::VARCHAR as stock_status,
        999999::DECIMAL as available_quantity,
        COALESCE(p.is_featured, false) as is_featured,
        0.0 as rating,
        0 as reviews_count,
        COALESCE(p.created_at, NOW()) as created_at
    FROM products p
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_products_for_store IS 'عرض المنتجات للمتجر الإلكتروني (نسخة الاختبار - بدون فلاتر)';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء دالة get_products_for_store (نسخة اختبار بسيطة)';
    RAISE NOTICE '   - بدون أي فلاتر';
    RAISE NOTICE '   - ترجع جميع المنتجات';
    RAISE NOTICE '   - تعمل بغض النظر عن بنية الجدول';
    RAISE NOTICE '';
END $$;
