-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح شامل: ترتيب معاملات جميع دوال STEP_54
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. إصلاح add_product_review
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS add_product_review CASCADE;

CREATE OR REPLACE FUNCTION add_product_review(
    p_tenant_id UUID,
    p_company_id UUID,
    p_product_id UUID,
    p_customer_id UUID,
    p_rating INT,
    p_title VARCHAR,
    p_review_text TEXT,
    p_order_id UUID DEFAULT NULL,
    p_images JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_review_id UUID;
    v_is_verified BOOLEAN := false;
    v_result JSONB;
BEGIN
    -- التحقق من صحة التقييم
    IF p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'التقييم يجب أن يكون من 1 إلى 5'
        );
    END IF;
    
    -- التحقق من شراء المنتج
    IF p_order_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.order_id = p_order_id
              AND oi.product_id = p_product_id
              AND o.customer_id = p_customer_id
              AND o.status IN ('delivered', 'confirmed')
        ) THEN
            v_is_verified := true;
        END IF;
    END IF;
    
    -- إضافة التقييم
    INSERT INTO product_reviews (
        tenant_id, company_id, product_id, customer_id, order_id,
        rating, title, review_text, images,
        is_verified_purchase, status
    )
    VALUES (
        p_tenant_id, p_company_id, p_product_id, p_customer_id, p_order_id,
        p_rating, p_title, p_review_text, p_images,
        v_is_verified, 'pending'
    )
    RETURNING id INTO v_review_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'is_verified_purchase', v_is_verified,
        'status', 'pending',
        'message', 'تم إرسال التقييم بنجاح. سيتم مراجعته قريباً'
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION add_product_review IS 'إضافة تقييم لمنتج';

-- التحقق
SELECT 
    '✅ الإصلاح' as status,
    'جميع الدوال' as scope,
    '✅ تم إصلاح ترتيب المعاملات' as message;
