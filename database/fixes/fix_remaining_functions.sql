-- ═══════════════════════════════════════════════════════════════════════════
-- إصلاح الدوال المتبقية (نسخ مبسطة للاختبار)
-- Fix Remaining Functions (Simplified Versions for Testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. get_available_categories_for_customer
DROP FUNCTION IF EXISTS get_available_categories_for_customer CASCADE;

CREATE OR REPLACE FUNCTION get_available_categories_for_customer(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    description TEXT,
    image_url TEXT,
    slug VARCHAR,
    parent_id UUID,
    display_order INT,
    products_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- نسخة بسيطة - ترجع جميع الفئات (استعلام ديناميكي آمن)
    RETURN QUERY
    SELECT 
        pc.id,
        COALESCE(pc.code, '') as code,
        COALESCE(pc.name_en, '') as name_ar,
        COALESCE(pc.name_en, '') as name_en,
        ''::TEXT as description,
        NULL::TEXT as image_url,
        NULL::VARCHAR as slug,
        pc.parent_id,
        0 as display_order,
        0::BIGINT as products_count
    FROM product_categories pc
    ORDER BY pc.name_en;
END;
$$;

-- 2. can_customer_access_category
DROP FUNCTION IF EXISTS can_customer_access_category CASCADE;

CREATE OR REPLACE FUNCTION can_customer_access_category(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- نسخة بسيطة - دائماً true
    RETURN true;
END;
$$;

-- 3. can_customer_access_product
DROP FUNCTION IF EXISTS can_customer_access_product CASCADE;

CREATE OR REPLACE FUNCTION can_customer_access_product(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- نسخة بسيطة - دائماً true
    RETURN true;
END;
$$;

-- 4. calculate_product_price (إذا كانت مفقودة)
DROP FUNCTION IF EXISTS calculate_product_price CASCADE;

CREATE OR REPLACE FUNCTION calculate_product_price(
    p_tenant_id UUID,
    p_product_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_base_price DECIMAL;
    v_result JSONB;
BEGIN
    -- الحصول على السعر الأساسي
    SELECT COALESCE(default_price, 0) INTO v_base_price
    FROM products
    WHERE id = p_product_id;
    
    -- إرجاع نتيجة بسيطة
    v_result := jsonb_build_object(
        'base_price', v_base_price,
        'customer_price', v_base_price,
        'discount_percent', 0,
        'discount_amount', 0,
        'total_price', v_base_price * p_quantity,
        'price_source', 'base_price'
    );
    
    RETURN v_result;
END;
$$;

-- 5. get_customer_special_products (إذا كانت مفقودة)
DROP FUNCTION IF EXISTS get_customer_special_products CASCADE;

CREATE OR REPLACE FUNCTION get_customer_special_products(
    p_tenant_id UUID,
    p_customer_id UUID
)
RETURNS TABLE (
    product_id UUID,
    special_price DECIMAL,
    discount_percent DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- نسخة بسيطة - ترجع 0 صفوف
    RETURN;
END;
$$;

-- 6. check_product_availability (إذا كانت مفقودة)
DROP FUNCTION IF EXISTS check_product_availability CASCADE;

CREATE OR REPLACE FUNCTION check_product_availability(
    p_tenant_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- نسخة بسيطة - دائماً متاح
    RETURN jsonb_build_object(
        'available', true,
        'quantity_available', 999999,
        'status', 'in_stock'
    );
END;
$$;

-- التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء جميع الدوال المساعدة (نسخ بسيطة)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ get_available_categories_for_customer';
    RAISE NOTICE '✅ can_customer_access_category';
    RAISE NOTICE '✅ can_customer_access_product';
    RAISE NOTICE '✅ calculate_product_price';
    RAISE NOTICE '✅ get_customer_special_products';
    RAISE NOTICE '✅ check_product_availability';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 جميع الدوال جاهزة للاختبار!';
    RAISE NOTICE '';
END $$;
