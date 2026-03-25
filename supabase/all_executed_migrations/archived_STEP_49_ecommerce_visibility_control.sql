-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_49: E-Commerce Product & Category Visibility Control
-- التحكم في ظهور المنتجات والمجموعات للعملاء
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يضيف:
-- 1. جداول التحكم في ظهور الفئات للعملاء
-- 2. جداول التحكم في ظهور المنتجات للعملاء
-- 3. Functions للتحقق من الصلاحيات
-- 4. Functions لعرض المنتجات المتاحة حسب العميل
-- 
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🛒 E-Commerce Visibility Control System';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول إتاحة الفئات للعملاء/المجموعات
-- Category Visibility for Customers/Groups
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS category_customer_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    
    -- إما عميل محدد أو مجموعة عملاء
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_group_id UUID REFERENCES customer_groups(id) ON DELETE CASCADE,
    
    -- نوع الصلاحية
    access_type VARCHAR(20) DEFAULT 'allow', -- allow, deny
    
    -- السبب
    notes TEXT,
    
    -- التواريخ
    valid_from DATE,
    valid_to DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- يجب أن يكون إما customer_id أو customer_group_id
    CHECK (
        (customer_id IS NOT NULL AND customer_group_id IS NULL) OR
        (customer_id IS NULL AND customer_group_id IS NOT NULL)
    ),
    
    -- فريدة لكل عميل/مجموعة مع فئة
    UNIQUE(tenant_id, category_id, customer_id),
    UNIQUE(tenant_id, category_id, customer_group_id)
);

COMMENT ON TABLE category_customer_access IS 'التحكم في إتاحة الفئات لعملاء أو مجموعات محددة';
COMMENT ON COLUMN category_customer_access.access_type IS 'allow = إتاحة، deny = منع';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول إتاحة المنتجات للعملاء/المجموعات
-- Product Visibility for Customers/Groups
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_customer_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- إما عميل محدد أو مجموعة عملاء
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_group_id UUID REFERENCES customer_groups(id) ON DELETE CASCADE,
    
    -- نوع الصلاحية
    access_type VARCHAR(20) DEFAULT 'allow', -- allow, deny
    
    -- السبب
    notes TEXT,
    
    -- التواريخ
    valid_from DATE,
    valid_to DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- يجب أن يكون إما customer_id أو customer_group_id
    CHECK (
        (customer_id IS NOT NULL AND customer_group_id IS NULL) OR
        (customer_id IS NULL AND customer_group_id IS NOT NULL)
    ),
    
    -- فريدة لكل عميل/مجموعة مع منتج
    UNIQUE(tenant_id, product_id, customer_id),
    UNIQUE(tenant_id, product_id, customer_group_id)
);

COMMENT ON TABLE product_customer_access IS 'التحكم في إتاحة المنتجات لعملاء أو مجموعات محددة';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. الفهارس لتحسين الأداء
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_category_access_tenant ON category_customer_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_category_access_category ON category_customer_access(category_id);
CREATE INDEX IF NOT EXISTS idx_category_access_customer ON category_customer_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_category_access_group ON category_customer_access(customer_group_id);

CREATE INDEX IF NOT EXISTS idx_product_access_tenant ON product_customer_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_access_product ON product_customer_access(product_id);
CREATE INDEX IF NOT EXISTS idx_product_access_customer ON product_customer_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_access_group ON product_customer_access(customer_group_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. دالة التحقق من صلاحية الوصول للفئة
-- Check if customer has access to category
-- ═══════════════════════════════════════════════════════════════════════════

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
DECLARE
    v_customer_group_id UUID;
    v_direct_access VARCHAR;
    v_group_access VARCHAR;
    v_category_visible BOOLEAN;
BEGIN
    -- 1. التحقق من أن الفئة مرئية online
    SELECT is_visible_online INTO v_category_visible
    FROM product_categories
    WHERE id = p_category_id AND tenant_id = p_tenant_id;
    
    IF NOT v_category_visible THEN
        RETURN false;
    END IF;
    
    -- 2. إذا لم يكن هناك عميل (زائر) - فقط الفئات العامة
    IF p_customer_id IS NULL THEN
        -- تحقق من عدم وجود قيود خاصة على الفئة
        RETURN NOT EXISTS (
            SELECT 1 FROM category_customer_access
            WHERE category_id = p_category_id
              AND tenant_id = p_tenant_id
              AND is_active = true
              AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
              AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        );
    END IF;
    
    -- 3. الحصول على مجموعة العميل
    SELECT group_id INTO v_customer_group_id
    FROM customers
    WHERE id = p_customer_id AND tenant_id = p_tenant_id;
    
    -- 4. التحقق من صلاحية مباشرة للعميل
    SELECT access_type INTO v_direct_access
    FROM category_customer_access
    WHERE category_id = p_category_id
      AND tenant_id = p_tenant_id
      AND customer_id = p_customer_id
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    LIMIT 1;
    
    -- إذا كان هناك منع مباشر
    IF v_direct_access = 'deny' THEN
        RETURN false;
    END IF;
    
    -- إذا كان هناك سماح مباشر
    IF v_direct_access = 'allow' THEN
        RETURN true;
    END IF;
    
    -- 5. التحقق من صلاحية المجموعة
    IF v_customer_group_id IS NOT NULL THEN
        SELECT access_type INTO v_group_access
        FROM category_customer_access
        WHERE category_id = p_category_id
          AND tenant_id = p_tenant_id
          AND customer_group_id = v_customer_group_id
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        LIMIT 1;
        
        -- إذا كان هناك منع للمجموعة
        IF v_group_access = 'deny' THEN
            RETURN false;
        END IF;
        
        -- إذا كان هناك سماح للمجموعة
        IF v_group_access = 'allow' THEN
            RETURN true;
        END IF;
    END IF;
    
    -- 6. الافتراضي: السماح إذا لم يكن هناك قيود
    RETURN true;
END;
$$;

COMMENT ON FUNCTION can_customer_access_category IS 'التحقق من صلاحية العميل للوصول للفئة';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة التحقق من صلاحية الوصول للمنتج
-- Check if customer has access to product
-- ═══════════════════════════════════════════════════════════════════════════

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
DECLARE
    v_customer_group_id UUID;
    v_product_category_id UUID;
    v_direct_access VARCHAR;
    v_group_access VARCHAR;
    v_product_visible BOOLEAN;
BEGIN
    -- 1. التحقق من أن المنتج مرئي online
    SELECT is_visible_online, category_id 
    INTO v_product_visible, v_product_category_id
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    IF NOT v_product_visible THEN
        RETURN false;
    END IF;
    
    -- 2. التحقق من صلاحية الفئة أولاً
    IF v_product_category_id IS NOT NULL THEN
        IF NOT can_customer_access_category(p_tenant_id, p_customer_id, v_product_category_id) THEN
            RETURN false;
        END IF;
    END IF;
    
    -- 3. إذا لم يكن هناك عميل (زائر)
    IF p_customer_id IS NULL THEN
        -- تحقق من عدم وجود قيود خاصة على المنتج
        RETURN NOT EXISTS (
            SELECT 1 FROM product_customer_access
            WHERE product_id = p_product_id
              AND tenant_id = p_tenant_id
              AND is_active = true
              AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
              AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        );
    END IF;
    
    -- 4. الحصول على مجموعة العميل
    SELECT group_id INTO v_customer_group_id
    FROM customers
    WHERE id = p_customer_id AND tenant_id = p_tenant_id;
    
    -- 5. التحقق من صلاحية مباشرة للعميل
    SELECT access_type INTO v_direct_access
    FROM product_customer_access
    WHERE product_id = p_product_id
      AND tenant_id = p_tenant_id
      AND customer_id = p_customer_id
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    LIMIT 1;
    
    -- إذا كان هناك منع مباشر
    IF v_direct_access = 'deny' THEN
        RETURN false;
    END IF;
    
    -- إذا كان هناك سماح مباشر
    IF v_direct_access = 'allow' THEN
        RETURN true;
    END IF;
    
    -- 6. التحقق من صلاحية المجموعة
    IF v_customer_group_id IS NOT NULL THEN
        SELECT access_type INTO v_group_access
        FROM product_customer_access
        WHERE product_id = p_product_id
          AND tenant_id = p_tenant_id
          AND customer_group_id = v_customer_group_id
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        LIMIT 1;
        
        -- إذا كان هناك منع للمجموعة
        IF v_group_access = 'deny' THEN
            RETURN false;
        END IF;
        
        -- إذا كان هناك سماح للمجموعة
        IF v_group_access = 'allow' THEN
            RETURN true;
        END IF;
    END IF;
    
    -- 7. الافتراضي: السماح إذا لم يكن هناك قيود
    RETURN true;
END;
$$;

COMMENT ON FUNCTION can_customer_access_product IS 'التحقق من صلاحية العميل للوصول للمنتج';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة عرض الفئات المتاحة للعميل
-- Get Available Categories for Customer
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_available_categories_for_customer(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    category_id UUID,
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
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.code,
        pc.name_ar,
        pc.name_en,
        pc.description,
        pc.image_url,
        pc.slug,
        pc.parent_id,
        pc.display_order,
        COUNT(DISTINCT p.id) as products_count
    FROM product_categories pc
    LEFT JOIN products p ON p.category_id = pc.id 
        AND p.tenant_id = pc.tenant_id
        AND p.is_visible_online = true
        AND p.status = 'active'
        AND can_customer_access_product(p_tenant_id, p_customer_id, p.id)
    WHERE pc.tenant_id = p_tenant_id
      AND pc.is_visible_online = true
      AND pc.is_active = true
      AND can_customer_access_category(p_tenant_id, p_customer_id, pc.id)
    GROUP BY pc.id, pc.code, pc.name_ar, pc.name_en, pc.description, 
             pc.image_url, pc.slug, pc.parent_id, pc.display_order
    ORDER BY pc.display_order, pc.name_ar;
END;
$$;

COMMENT ON FUNCTION get_available_categories_for_customer IS 'عرض الفئات المتاحة للعميل مع عدد المنتجات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. تحديث دالة get_products_for_store لتشمل التحقق من الصلاحيات
-- Update get_products_for_store to include access control
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_products_for_store(UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN, VARCHAR, VARCHAR, INT, INT);

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
        
        IF v_customer_group_id IS NOT NULL THEN
            SELECT COALESCE(default_discount_percent, 0)
            INTO v_group_discount
            FROM customer_groups
            WHERE id = v_customer_group_id;
        END IF;
    END IF;
    
    -- 2. إرجاع المنتجات مع التحقق من الصلاحيات
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
        
        p.default_price as base_price,
        
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
            ELSE p.default_price
        END as customer_price,
        
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
        0.0 as rating,
        0 as reviews_count,
        p.created_at
        
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    
    WHERE p.tenant_id = p_tenant_id
      AND p.is_visible_online = true
      AND p.status = 'active'
      
      -- ✅ التحقق من صلاحية الوصول للمنتج
      AND can_customer_access_product(p_tenant_id, p_customer_id, p.id)
      
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_is_featured IS NULL OR p.is_featured = p_is_featured)
      AND (p_search_term IS NULL OR 
           p.name_ar ILIKE '%' || p_search_term || '%' OR
           p.name_en ILIKE '%' || p_search_term || '%' OR
           p.description ILIKE '%' || p_search_term || '%')
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

COMMENT ON FUNCTION get_products_for_store IS 'عرض المنتجات للمتجر الإلكتروني مع التحقق من الصلاحيات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE category_customer_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_customer_access ENABLE ROW LEVEL SECURITY;

-- Tenant isolation
CREATE POLICY tenant_isolation_select ON category_customer_access
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON category_customer_access
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON category_customer_access
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON category_customer_access
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- Product access policies
CREATE POLICY tenant_isolation_select ON product_customer_access
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_insert ON product_customer_access
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_update ON product_customer_access
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation_delete ON product_customer_access
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية STEP_49
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تثبيت نظام التحكم في الظهور بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'الجداول المُنشأة:';
    RAISE NOTICE '  1. category_customer_access - صلاحيات الفئات';
    RAISE NOTICE '  2. product_customer_access - صلاحيات المنتجات';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions المُنشأة:';
    RAISE NOTICE '  1. can_customer_access_category() - تحقق فئة';
    RAISE NOTICE '  2. can_customer_access_product() - تحقق منتج';
    RAISE NOTICE '  3. get_available_categories_for_customer() - فئات متاحة';
    RAISE NOTICE '  4. get_products_for_store() - محدّثة بالصلاحيات';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الآن يمكنك:';
    RAISE NOTICE '  • تحديد فئات خاصة لعملاء معينين';
    RAISE NOTICE '  • تحديد منتجات خاصة لعملاء معينين';
    RAISE NOTICE '  • تحديد فئات/منتجات لمجموعات عملاء';
    RAISE NOTICE '  • منع وصول عملاء لفئات/منتجات معينة';
    RAISE NOTICE '';
END $$;
