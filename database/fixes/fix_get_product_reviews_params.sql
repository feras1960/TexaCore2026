-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح: ترتيب معاملات دالة get_product_reviews
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف النسخة القديمة
DROP FUNCTION IF EXISTS get_product_reviews CASCADE;

-- إعادة إنشاء الدالة بالترتيب الصحيح
CREATE OR REPLACE FUNCTION get_product_reviews(
    p_tenant_id UUID,
    p_product_id UUID,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0,
    p_rating_filter INT DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT false,
    p_sort_by VARCHAR DEFAULT 'recent' -- recent, helpful, rating_high, rating_low
)
RETURNS TABLE (
    review_id UUID,
    customer_name VARCHAR,
    rating INT,
    title VARCHAR,
    review_text TEXT,
    images JSONB,
    is_verified_purchase BOOLEAN,
    helpful_count INT,
    not_helpful_count INT,
    seller_response TEXT,
    seller_response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id as review_id,
        COALESCE(c.full_name, 'عميل') as customer_name,
        pr.rating,
        pr.title,
        pr.review_text,
        pr.images,
        pr.is_verified_purchase,
        pr.helpful_count,
        pr.not_helpful_count,
        pr.seller_response,
        pr.seller_response_at,
        pr.created_at
    FROM product_reviews pr
    LEFT JOIN customers c ON c.id = pr.customer_id
    WHERE pr.tenant_id = p_tenant_id
      AND pr.product_id = p_product_id
      AND pr.status = 'approved'
      AND (p_rating_filter IS NULL OR pr.rating = p_rating_filter)
      AND (p_verified_only = false OR pr.is_verified_purchase = true)
    ORDER BY
        CASE WHEN p_sort_by = 'recent' THEN pr.created_at END DESC,
        CASE WHEN p_sort_by = 'helpful' THEN pr.helpful_count END DESC,
        CASE WHEN p_sort_by = 'rating_high' THEN pr.rating END DESC,
        CASE WHEN p_sort_by = 'rating_low' THEN pr.rating END ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_product_reviews IS 'الحصول على تقييمات المنتج مع الفلاتر';

-- التحقق
SELECT 
    '✅ الإصلاح' as status,
    'get_product_reviews' as function_name,
    '✅ تم إعادة إنشاء الدالة بترتيب صحيح' as message;
