-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_52: Shopping Cart System
-- نظام سلة المشتريات
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يُنشئ:
-- 1. جدول shopping_carts (السلات)
-- 2. جدول shopping_cart_items (عناصر السلة)
-- 3. Functions للإضافة/التعديل/الحذف
-- 4. Functions للحساب والدمج
-- 5. RLS Policies
-- 6. Triggers للتحديث التلقائي
-- 
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🛒 Shopping Cart System';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول السلات (shopping_carts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- دعم الزوار والمسجلين
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- للزوار
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'active', -- active, abandoned, converted, expired
    
    -- المجاميع
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    -- كوبون الخصم
    promo_code VARCHAR(50),
    promo_discount DECIMAL(15,2) DEFAULT 0,
    
    -- العملة
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- التواريخ
    expires_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- يجب أن يكون إما customer_id أو session_id
    CHECK (
        (customer_id IS NOT NULL AND session_id IS NULL) OR
        (customer_id IS NULL AND session_id IS NOT NULL)
    ),
    
    -- Unique: عميل واحد = سلة واحدة نشطة
    UNIQUE(tenant_id, customer_id, status)
);

COMMENT ON TABLE shopping_carts IS 'سلات المشتريات للعملاء والزوار';
COMMENT ON COLUMN shopping_carts.session_id IS 'للزوار - من الـ Frontend';
COMMENT ON COLUMN shopping_carts.customer_id IS 'للمسجلين - من auth';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول عناصر السلة (shopping_cart_items)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shopping_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID, -- Optional: للمنتجات التي لها variants
    
    quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
    
    -- الأسعار (محفوظة عند الإضافة)
    unit_price DECIMAL(15,4) NOT NULL,
    original_price DECIMAL(15,4), -- السعر الأصلي قبل الخصم
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    
    -- الإجمالي
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- ملاحظات
    notes TEXT,
    custom_options JSONB DEFAULT '{}',
    
    -- تتبع التغييرات
    price_changed BOOLEAN DEFAULT false,
    availability_changed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique: منتج واحد مرة واحدة في السلة (مع دعم variants لاحقاً)
    UNIQUE(cart_id, product_id)
);

COMMENT ON TABLE shopping_cart_items IS 'عناصر السلة - المنتجات المضافة';
COMMENT ON COLUMN shopping_cart_items.unit_price IS 'السعر عند الإضافة - لا يتغير';
COMMENT ON COLUMN shopping_cart_items.price_changed IS 'تنبيه إذا تغير السعر';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Indexes للأداء
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_carts_tenant ON shopping_carts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carts_customer ON shopping_carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON shopping_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON shopping_carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_expires ON shopping_carts(expires_at);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON shopping_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON shopping_cart_items(product_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Trigger: تحديث updated_at تلقائياً
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_cart_timestamp ON shopping_carts;
CREATE TRIGGER trg_update_cart_timestamp
    BEFORE UPDATE ON shopping_carts
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

DROP TRIGGER IF EXISTS trg_update_cart_item_timestamp ON shopping_cart_items;
CREATE TRIGGER trg_update_cart_item_timestamp
    BEFORE UPDATE ON shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Function: الحصول على أو إنشاء سلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_or_create_cart(
    p_tenant_id UUID,
    p_company_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
BEGIN
    -- البحث عن سلة نشطة موجودة
    IF p_customer_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND customer_id = p_customer_id
          AND status = 'active'
        LIMIT 1;
    ELSIF p_session_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND session_id = p_session_id
          AND status = 'active'
        LIMIT 1;
    END IF;
    
    -- إنشاء سلة جديدة إذا لم توجد
    IF v_cart_id IS NULL THEN
        INSERT INTO shopping_carts (
            tenant_id,
            company_id,
            customer_id,
            session_id,
            status,
            expires_at
        )
        VALUES (
            p_tenant_id,
            p_company_id,
            p_customer_id,
            p_session_id,
            'active',
            NOW() + INTERVAL '30 days'
        )
        RETURNING id INTO v_cart_id;
    END IF;
    
    RETURN v_cart_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_cart IS 'الحصول على سلة نشطة أو إنشاء جديدة';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Function: إضافة منتج للسلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_to_cart(
    p_tenant_id UUID,
    p_company_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL DEFAULT 1,
    p_customer_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_product_variant_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
    v_item_id UUID;
    v_unit_price DECIMAL;
    v_original_price DECIMAL;
    v_discount_percent DECIMAL;
    v_product_name VARCHAR;
    v_available_qty DECIMAL;
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- 1. الحصول على أو إنشاء السلة
    -- ═══════════════════════════════════════════════════════════════
    v_cart_id := get_or_create_cart(p_tenant_id, p_company_id, p_customer_id, p_session_id);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. حساب السعر (حسب العميل)
    -- ═══════════════════════════════════════════════════════════════
    SELECT 
        customer_price,
        base_price,
        discount_percent,
        name_ar
    INTO 
        v_unit_price,
        v_original_price,
        v_discount_percent,
        v_product_name
    FROM get_products_for_store(
        p_tenant_id,
        p_customer_id,
        NULL, NULL, NULL, NULL, NULL,
        'created_at', 'DESC',
        999, 0
    )
    WHERE product_id = p_product_id
    LIMIT 1;
    
    IF v_unit_price IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'product_not_found',
            'message', 'المنتج غير متاح'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. التحقق من التوفر
    -- ═══════════════════════════════════════════════════════════════
    SELECT available_quantity INTO v_available_qty
    FROM get_products_for_store(
        p_tenant_id, p_customer_id, NULL, NULL, NULL, NULL, NULL,
        'created_at', 'DESC', 1, 0
    )
    WHERE product_id = p_product_id;
    
    IF v_available_qty < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_stock',
            'message', 'الكمية المتاحة: ' || v_available_qty,
            'available_quantity', v_available_qty
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. إضافة أو تحديث العنصر
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO shopping_cart_items (
        cart_id,
        product_id,
        product_variant_id,
        quantity,
        unit_price,
        original_price,
        discount_percent,
        notes
    )
    VALUES (
        v_cart_id,
        p_product_id,
        p_product_variant_id,
        p_quantity,
        v_unit_price,
        v_original_price,
        v_discount_percent,
        p_notes
    )
    ON CONFLICT (cart_id, product_id) 
    DO UPDATE SET
        quantity = shopping_cart_items.quantity + EXCLUDED.quantity,
        updated_at = NOW()
    RETURNING id INTO v_item_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. تحديث مجاميع السلة
    -- ═══════════════════════════════════════════════════════════════
    PERFORM update_cart_totals(v_cart_id);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'cart_id', v_cart_id,
        'item_id', v_item_id,
        'product_name', v_product_name,
        'quantity', p_quantity,
        'unit_price', v_unit_price,
        'message', 'تمت الإضافة للسلة'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'add_failed',
            'message', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION add_to_cart IS 'إضافة منتج للسلة مع التحقق من التوفر';

GRANT EXECUTE ON FUNCTION add_to_cart TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Function: تحديث كمية منتج في السلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_cart_item(
    p_item_id UUID,
    p_quantity DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
BEGIN
    -- تحديث الكمية
    UPDATE shopping_cart_items
    SET quantity = p_quantity,
        updated_at = NOW()
    WHERE id = p_item_id
    RETURNING cart_id INTO v_cart_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- تحديث المجاميع
    PERFORM update_cart_totals(v_cart_id);
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION update_cart_item IS 'تحديث كمية منتج في السلة';

GRANT EXECUTE ON FUNCTION update_cart_item TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Function: حذف منتج من السلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION remove_from_cart(
    p_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
BEGIN
    -- حذف العنصر
    DELETE FROM shopping_cart_items
    WHERE id = p_item_id
    RETURNING cart_id INTO v_cart_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- تحديث المجاميع
    PERFORM update_cart_totals(v_cart_id);
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION remove_from_cart IS 'حذف منتج من السلة';

GRANT EXECUTE ON FUNCTION remove_from_cart TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Function: جلب السلة الكاملة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_cart(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    cart_id UUID,
    item_id UUID,
    product_id UUID,
    product_code VARCHAR,
    product_name_ar VARCHAR,
    product_name_en VARCHAR,
    product_image TEXT,
    variant_id UUID,
    quantity DECIMAL,
    unit_price DECIMAL,
    original_price DECIMAL,
    discount_percent DECIMAL,
    subtotal DECIMAL,
    notes TEXT,
    available_quantity DECIMAL,
    in_stock BOOLEAN,
    price_changed BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
BEGIN
    -- الحصول على السلة
    IF p_customer_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND customer_id = p_customer_id
          AND status = 'active'
        LIMIT 1;
    ELSIF p_session_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND session_id = p_session_id
          AND status = 'active'
        LIMIT 1;
    END IF;
    
    IF v_cart_id IS NULL THEN
        RETURN;
    END IF;
    
    -- إرجاع العناصر
    RETURN QUERY
    SELECT 
        sci.cart_id,
        sci.id,
        sci.product_id,
        p.sku,
        p.name_ar,
        p.name_en,
        get_product_primary_image(p.id),
        sci.product_variant_id,
        sci.quantity,
        sci.unit_price,
        sci.original_price,
        sci.discount_percent,
        sci.subtotal,
        sci.notes,
        COALESCE(
            (SELECT SUM(quantity_on_hand) 
             FROM inventory_stock 
             WHERE product_id = p.id),
            0
        ) as available_quantity,
        CASE 
            WHEN COALESCE(
                (SELECT SUM(quantity_on_hand) 
                 FROM inventory_stock 
                 WHERE product_id = p.id),
                0
            ) >= sci.quantity THEN true
            ELSE false
        END as in_stock,
        sci.price_changed
    FROM shopping_cart_items sci
    JOIN products p ON p.id = sci.product_id
    WHERE sci.cart_id = v_cart_id
    ORDER BY sci.created_at;
END;
$$;

COMMENT ON FUNCTION get_cart IS 'جلب محتويات السلة الكاملة';

GRANT EXECUTE ON FUNCTION get_cart TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Function: حساب مجاميع السلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_cart_totals(p_cart_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subtotal DECIMAL;
BEGIN
    -- حساب المجموع الفرعي
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_subtotal
    FROM shopping_cart_items
    WHERE cart_id = p_cart_id;
    
    -- تحديث السلة
    UPDATE shopping_carts
    SET subtotal = v_subtotal,
        total_amount = v_subtotal - COALESCE(promo_discount, 0),
        updated_at = NOW()
    WHERE id = p_cart_id;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION update_cart_totals IS 'تحديث مجاميع السلة تلقائياً';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Function: دمج سلة الزائر مع سلة العميل المسجل
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION merge_carts(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_session_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guest_cart_id UUID;
    v_customer_cart_id UUID;
    v_merged_count INT := 0;
BEGIN
    -- الحصول على سلة الزائر
    SELECT id INTO v_guest_cart_id
    FROM shopping_carts
    WHERE tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND status = 'active'
    LIMIT 1;
    
    IF v_guest_cart_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'سلة الزائر غير موجودة'
        );
    END IF;
    
    -- الحصول على أو إنشاء سلة العميل
    v_customer_cart_id := get_or_create_cart(
        p_tenant_id,
        (SELECT company_id FROM shopping_carts WHERE id = v_guest_cart_id),
        p_customer_id,
        NULL
    );
    
    -- دمج العناصر
    WITH moved_items AS (
        INSERT INTO shopping_cart_items (
            cart_id,
            product_id,
            product_variant_id,
            quantity,
            unit_price,
            original_price,
            discount_percent,
            notes
        )
        SELECT 
            v_customer_cart_id,
            product_id,
            product_variant_id,
            quantity,
            unit_price,
            original_price,
            discount_percent,
            notes
        FROM shopping_cart_items
        WHERE cart_id = v_guest_cart_id
        ON CONFLICT (cart_id, product_id) 
        DO UPDATE SET
            quantity = shopping_cart_items.quantity + EXCLUDED.quantity
        RETURNING id
    )
    SELECT COUNT(*) INTO v_merged_count FROM moved_items;
    
    -- حذف سلة الزائر
    DELETE FROM shopping_carts WHERE id = v_guest_cart_id;
    
    -- تحديث المجاميع
    PERFORM update_cart_totals(v_customer_cart_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'customer_cart_id', v_customer_cart_id,
        'merged_items', v_merged_count,
        'message', 'تم دمج السلة بنجاح'
    );
END;
$$;

COMMENT ON FUNCTION merge_carts IS 'دمج سلة الزائر مع سلة العميل عند تسجيل الدخول';

GRANT EXECUTE ON FUNCTION merge_carts TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Function: إفراغ السلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION clear_cart(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
BEGIN
    -- الحصول على السلة
    IF p_customer_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND customer_id = p_customer_id
          AND status = 'active'
        LIMIT 1;
    ELSIF p_session_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND session_id = p_session_id
          AND status = 'active'
        LIMIT 1;
    END IF;
    
    IF v_cart_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- حذف جميع العناصر
    DELETE FROM shopping_cart_items WHERE cart_id = v_cart_id;
    
    -- تحديث المجاميع
    PERFORM update_cart_totals(v_cart_id);
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION clear_cart IS 'إفراغ السلة من جميع العناصر';

GRANT EXECUTE ON FUNCTION clear_cart TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. Function: الحصول على ملخص السلة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_cart_summary(
    p_tenant_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
    v_summary JSONB;
BEGIN
    -- الحصول على السلة
    IF p_customer_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND customer_id = p_customer_id
          AND status = 'active'
        LIMIT 1;
    ELSIF p_session_id IS NOT NULL THEN
        SELECT id INTO v_cart_id
        FROM shopping_carts
        WHERE tenant_id = p_tenant_id
          AND session_id = p_session_id
          AND status = 'active'
        LIMIT 1;
    END IF;
    
    IF v_cart_id IS NULL THEN
        RETURN jsonb_build_object(
            'cart_exists', false,
            'items_count', 0,
            'subtotal', 0,
            'total', 0
        );
    END IF;
    
    -- بناء الملخص
    SELECT jsonb_build_object(
        'cart_exists', true,
        'cart_id', sc.id,
        'items_count', (SELECT COUNT(*) FROM shopping_cart_items WHERE cart_id = sc.id),
        'total_quantity', (SELECT SUM(quantity) FROM shopping_cart_items WHERE cart_id = sc.id),
        'subtotal', sc.subtotal,
        'discount', sc.promo_discount,
        'total', sc.total_amount,
        'currency', sc.currency,
        'promo_code', sc.promo_code,
        'updated_at', sc.updated_at
    )
    INTO v_summary
    FROM shopping_carts sc
    WHERE sc.id = v_cart_id;
    
    RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION get_cart_summary IS 'ملخص السلة (عدد العناصر والمجاميع)';

GRANT EXECUTE ON FUNCTION get_cart_summary TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_cart_items ENABLE ROW LEVEL SECURITY;

-- السلات: الزوار والمسجلين
DROP POLICY IF EXISTS "Anyone can manage own cart" ON shopping_carts;
CREATE POLICY "Anyone can manage own cart" 
ON shopping_carts 
FOR ALL
USING (
    tenant_id = get_current_user_tenant_id()
    OR
    session_id IS NOT NULL -- الزوار
);

-- العناصر: من خلال السلة
DROP POLICY IF EXISTS "Anyone can manage own cart items" ON shopping_cart_items;
CREATE POLICY "Anyone can manage own cart items" 
ON shopping_cart_items 
FOR ALL
USING (
    cart_id IN (
        SELECT id FROM shopping_carts 
        WHERE tenant_id = get_current_user_tenant_id()
           OR session_id IS NOT NULL
    )
);

-- الإداريون يرون جميع السلات
DROP POLICY IF EXISTS "Admins see all carts" ON shopping_carts;
CREATE POLICY "Admins see all carts" 
ON shopping_carts 
FOR SELECT
TO authenticated
USING (
    tenant_id = get_current_user_tenant_id()
    AND
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
          AND role IN ('admin', 'user', 'accountant', 'super_admin')
    )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية STEP_52
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تثبيت نظام السلة بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'الجداول المُنشأة:';
    RAISE NOTICE '  1. shopping_carts - السلات';
    RAISE NOTICE '  2. shopping_cart_items - عناصر السلة';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions المُنشأة:';
    RAISE NOTICE '  1. get_or_create_cart() - الحصول/إنشاء سلة';
    RAISE NOTICE '  2. add_to_cart() - إضافة منتج';
    RAISE NOTICE '  3. update_cart_item() - تحديث كمية';
    RAISE NOTICE '  4. remove_from_cart() - حذف منتج';
    RAISE NOTICE '  5. get_cart() - جلب السلة';
    RAISE NOTICE '  6. update_cart_totals() - حساب المجاميع';
    RAISE NOTICE '  7. merge_carts() - دمج السلات';
    RAISE NOTICE '  8. clear_cart() - إفراغ السلة';
    RAISE NOTICE '  9. get_cart_summary() - ملخص السلة';
    RAISE NOTICE '';
    RAISE NOTICE 'الميزات:';
    RAISE NOTICE '  ✅ دعم الزوار (session_id)';
    RAISE NOTICE '  ✅ دعم المسجلين (customer_id)';
    RAISE NOTICE '  ✅ سلة دائمة (30 يوم)';
    RAISE NOTICE '  ✅ حفظ السعر عند الإضافة';
    RAISE NOTICE '  ✅ دمج تلقائي عند التسجيل';
    RAISE NOTICE '  ✅ تحديث مجاميع تلقائي';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الخطوة التالية:';
    RAISE NOTICE '  STEP_53: Guest Checkout';
    RAISE NOTICE '';
END $$;
