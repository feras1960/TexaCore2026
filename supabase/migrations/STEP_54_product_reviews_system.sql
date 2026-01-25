-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 54: Product Reviews System
-- نظام تقييمات المنتجات
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 25 يناير 2026
-- الوصف: نظام تقييمات شامل مع تحقق من الشراء، إحصائيات، وردود البائع
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول التقييمات
-- Product Reviews Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- المنتج والعميل
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- التقييم
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200) NOT NULL,
    review_text TEXT NOT NULL,
    
    -- الصور المرفقة
    images JSONB DEFAULT '[]'::jsonb, -- [{url, caption}]
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    is_verified_purchase BOOLEAN DEFAULT false,
    
    -- التفاعل
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    
    -- رد البائع
    seller_response TEXT,
    seller_response_at TIMESTAMPTZ,
    
    -- الإبلاغ عن مشكلة
    is_reported BOOLEAN DEFAULT false,
    report_reason TEXT,
    reported_at TIMESTAMPTZ,
    
    -- التواريخ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, product_id, customer_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product 
    ON product_reviews(product_id, status) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_product_reviews_customer 
    ON product_reviews(customer_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_rating 
    ON product_reviews(product_id, rating) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_product_reviews_verified 
    ON product_reviews(product_id, is_verified_purchase) 
    WHERE status = 'approved' AND is_verified_purchase = true;

CREATE INDEX IF NOT EXISTS idx_product_reviews_helpful 
    ON product_reviews(product_id, helpful_count DESC) WHERE status = 'approved';

COMMENT ON TABLE product_reviews IS 'تقييمات المنتجات من العملاء';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول التفاعلات مع التقييمات
-- Review Helpfulness Votes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- نوع التصويت
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_votes_review 
    ON review_votes(review_id);

CREATE INDEX IF NOT EXISTS idx_review_votes_customer 
    ON review_votes(customer_id);

COMMENT ON TABLE review_votes IS 'تصويتات العملاء على مدى فائدة التقييمات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول إحصائيات تقييمات المنتجات
-- Product Review Statistics (للأداء)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_review_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- الإحصائيات
    total_reviews INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    
    -- توزيع النجوم
    rating_5_count INT DEFAULT 0,
    rating_4_count INT DEFAULT 0,
    rating_3_count INT DEFAULT 0,
    rating_2_count INT DEFAULT 0,
    rating_1_count INT DEFAULT 0,
    
    -- تقييمات موثوقة
    verified_reviews_count INT DEFAULT 0,
    verified_average_rating DECIMAL(3, 2) DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, product_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_product_review_stats_product 
    ON product_review_stats(product_id);

COMMENT ON TABLE product_review_stats IS 'إحصائيات تقييمات المنتجات (محسوبة مسبقاً للأداء)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON product_reviews;
CREATE POLICY tenant_isolation ON product_reviews
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- review_votes
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON review_votes;
CREATE POLICY tenant_isolation ON review_votes
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- product_review_stats
ALTER TABLE product_review_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON product_review_stats;
CREATE POLICY tenant_isolation ON product_review_stats
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة إضافة تقييم
-- Add Product Review
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_product_review(
    p_tenant_id UUID,
    p_company_id UUID,
    p_product_id UUID,
    p_customer_id UUID,
    p_order_id UUID DEFAULT NULL,
    p_rating INT,
    p_title VARCHAR,
    p_review_text TEXT,
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة الموافقة على التقييم
-- Approve Review
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION approve_review(
    p_tenant_id UUID,
    p_review_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_result JSONB;
BEGIN
    -- تحديث حالة التقييم
    UPDATE product_reviews
    SET status = 'approved',
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_review_id
      AND tenant_id = p_tenant_id
    RETURNING product_id INTO v_product_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'التقييم غير موجود');
    END IF;
    
    -- تحديث إحصائيات المنتج
    PERFORM update_product_review_stats(p_tenant_id, v_product_id);
    
    RETURN jsonb_build_object('success', true, 'message', 'تمت الموافقة على التقييم');
END;
$$;

COMMENT ON FUNCTION approve_review IS 'الموافقة على تقييم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة رفض التقييم
-- Reject Review
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reject_review(
    p_tenant_id UUID,
    p_review_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE product_reviews
    SET status = 'rejected',
        report_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_review_id
      AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'التقييم غير موجود');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'تم رفض التقييم');
END;
$$;

COMMENT ON FUNCTION reject_review IS 'رفض تقييم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. دالة إضافة رد البائع
-- Add Seller Response
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_seller_response(
    p_tenant_id UUID,
    p_review_id UUID,
    p_response TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE product_reviews
    SET seller_response = p_response,
        seller_response_at = NOW(),
        updated_at = NOW()
    WHERE id = p_review_id
      AND tenant_id = p_tenant_id
      AND status = 'approved';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'التقييم غير موجود أو غير موافق عليه');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'تم إضافة الرد');
END;
$$;

COMMENT ON FUNCTION add_seller_response IS 'إضافة رد البائع على التقييم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. دالة التصويت على التقييم
-- Vote on Review (Helpful/Not Helpful)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION vote_on_review(
    p_tenant_id UUID,
    p_review_id UUID,
    p_customer_id UUID,
    p_vote_type VARCHAR -- 'helpful' or 'not_helpful'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_vote VARCHAR;
BEGIN
    -- التحقق من التقييم
    IF NOT EXISTS (
        SELECT 1 FROM product_reviews 
        WHERE id = p_review_id AND tenant_id = p_tenant_id AND status = 'approved'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'التقييم غير موجود');
    END IF;
    
    -- التحقق من التصويت السابق
    SELECT vote_type INTO v_existing_vote
    FROM review_votes
    WHERE review_id = p_review_id AND customer_id = p_customer_id;
    
    IF v_existing_vote IS NOT NULL THEN
        -- تحديث التصويت
        IF v_existing_vote = 'helpful' THEN
            UPDATE product_reviews SET helpful_count = helpful_count - 1 WHERE id = p_review_id;
        ELSE
            UPDATE product_reviews SET not_helpful_count = not_helpful_count - 1 WHERE id = p_review_id;
        END IF;
        
        DELETE FROM review_votes WHERE review_id = p_review_id AND customer_id = p_customer_id;
    END IF;
    
    -- إضافة التصويت الجديد
    INSERT INTO review_votes (tenant_id, review_id, customer_id, vote_type)
    VALUES (p_tenant_id, p_review_id, p_customer_id, p_vote_type);
    
    -- تحديث العدادات
    IF p_vote_type = 'helpful' THEN
        UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    ELSE
        UPDATE product_reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = p_review_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'تم التصويت');
END;
$$;

COMMENT ON FUNCTION vote_on_review IS 'التصويت على مدى فائدة التقييم';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. دالة تحديث إحصائيات التقييمات
-- Update Product Review Statistics
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_product_review_stats(
    p_tenant_id UUID,
    p_product_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats RECORD;
BEGIN
    -- حساب الإحصائيات
    SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(*) FILTER (WHERE rating = 5) as rating_5_count,
        COUNT(*) FILTER (WHERE rating = 4) as rating_4_count,
        COUNT(*) FILTER (WHERE rating = 3) as rating_3_count,
        COUNT(*) FILTER (WHERE rating = 2) as rating_2_count,
        COUNT(*) FILTER (WHERE rating = 1) as rating_1_count,
        COUNT(*) FILTER (WHERE is_verified_purchase = true) as verified_reviews_count,
        COALESCE(AVG(rating) FILTER (WHERE is_verified_purchase = true), 0) as verified_average_rating
    INTO v_stats
    FROM product_reviews
    WHERE tenant_id = p_tenant_id
      AND product_id = p_product_id
      AND status = 'approved';
    
    -- حفظ أو تحديث الإحصائيات
    INSERT INTO product_review_stats (
        tenant_id, product_id,
        total_reviews, average_rating,
        rating_5_count, rating_4_count, rating_3_count, rating_2_count, rating_1_count,
        verified_reviews_count, verified_average_rating
    )
    VALUES (
        p_tenant_id, p_product_id,
        v_stats.total_reviews, v_stats.average_rating,
        v_stats.rating_5_count, v_stats.rating_4_count, v_stats.rating_3_count,
        v_stats.rating_2_count, v_stats.rating_1_count,
        v_stats.verified_reviews_count, v_stats.verified_average_rating
    )
    ON CONFLICT (tenant_id, product_id)
    DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        rating_5_count = EXCLUDED.rating_5_count,
        rating_4_count = EXCLUDED.rating_4_count,
        rating_3_count = EXCLUDED.rating_3_count,
        rating_2_count = EXCLUDED.rating_2_count,
        rating_1_count = EXCLUDED.rating_1_count,
        verified_reviews_count = EXCLUDED.verified_reviews_count,
        verified_average_rating = EXCLUDED.verified_average_rating,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION update_product_review_stats IS 'تحديث إحصائيات تقييمات المنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. دالة الحصول على تقييمات المنتج
-- Get Product Reviews
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_product_reviews(
    p_tenant_id UUID,
    p_product_id UUID,
    p_rating_filter INT DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT false,
    p_sort_by VARCHAR DEFAULT 'recent', -- recent, helpful, rating_high, rating_low
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. دالة الحصول على إحصائيات التقييمات
-- Get Product Review Statistics
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_product_review_statistics(
    p_tenant_id UUID,
    p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_stats RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_stats
    FROM product_review_stats
    WHERE tenant_id = p_tenant_id
      AND product_id = p_product_id;
    
    IF NOT FOUND THEN
        -- إذا لم توجد إحصائيات، حسابها الآن
        PERFORM update_product_review_stats(p_tenant_id, p_product_id);
        
        SELECT * INTO v_stats
        FROM product_review_stats
        WHERE tenant_id = p_tenant_id AND product_id = p_product_id;
    END IF;
    
    v_result := jsonb_build_object(
        'total_reviews', COALESCE(v_stats.total_reviews, 0),
        'average_rating', COALESCE(v_stats.average_rating, 0),
        'rating_distribution', jsonb_build_object(
            '5', COALESCE(v_stats.rating_5_count, 0),
            '4', COALESCE(v_stats.rating_4_count, 0),
            '3', COALESCE(v_stats.rating_3_count, 0),
            '2', COALESCE(v_stats.rating_2_count, 0),
            '1', COALESCE(v_stats.rating_1_count, 0)
        ),
        'verified_reviews', jsonb_build_object(
            'count', COALESCE(v_stats.verified_reviews_count, 0),
            'average_rating', COALESCE(v_stats.verified_average_rating, 0)
        )
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_product_review_statistics IS 'الحصول على إحصائيات تقييمات المنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- الخلاصة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 54: Product Reviews System - اكتمل بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    RAISE NOTICE '📦 الجداول المُنشأة:';
    RAISE NOTICE '   ✅ product_reviews (التقييمات)';
    RAISE NOTICE '   ✅ review_votes (التصويتات)';
    RAISE NOTICE '   ✅ product_review_stats (الإحصائيات)';
    RAISE NOTICE ' ';
    RAISE NOTICE '⚡ الدوال المُنشأة:';
    RAISE NOTICE '   ✅ add_product_review() - إضافة تقييم';
    RAISE NOTICE '   ✅ approve_review() - الموافقة على تقييم';
    RAISE NOTICE '   ✅ reject_review() - رفض تقييم';
    RAISE NOTICE '   ✅ add_seller_response() - رد البائع';
    RAISE NOTICE '   ✅ vote_on_review() - التصويت (مفيد/غير مفيد)';
    RAISE NOTICE '   ✅ update_product_review_stats() - تحديث الإحصائيات';
    RAISE NOTICE '   ✅ get_product_reviews() - عرض التقييمات';
    RAISE NOTICE '   ✅ get_product_review_statistics() - الإحصائيات';
    RAISE NOTICE ' ';
    RAISE NOTICE '🔒 RLS Policies: مُطبّقة على جميع الجداول';
    RAISE NOTICE ' ';
    RAISE NOTICE '🌟 الميزات:';
    RAISE NOTICE '   ⭐ تقييم من 1-5 نجوم';
    RAISE NOTICE '   ✅ تحقق من الشراء (Verified Purchase)';
    RAISE NOTICE '   📸 إرفاق صور مع التقييم';
    RAISE NOTICE '   👍 تصويت مفيد/غير مفيد';
    RAISE NOTICE '   💬 رد البائع على التقييم';
    RAISE NOTICE '   📊 إحصائيات محسوبة مسبقاً';
    RAISE NOTICE '   🔍 فلاتر متقدمة (تقييم، موثوق، الأحدث، الأكثر فائدة)';
    RAISE NOTICE ' ';
    RAISE NOTICE '🚀 النظام جاهز لاستقبال التقييمات!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;