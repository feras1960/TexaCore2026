-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 53: Guest Checkout System
-- نظام الدفع للزوار (بدون تسجيل)
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 25 يناير 2026
-- الوصف: السماح للزوار بإتمام الطلبات بدون تسجيل حساب
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول معلومات الزوار المؤقتة
-- Guest Information Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS guest_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- معلومات الزائر
    session_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- عنوان الشحن
    shipping_address JSONB NOT NULL, -- {country, city, street, postal_code, notes}
    
    -- عنوان الفاتورة (اختياري)
    billing_address JSONB, -- {country, city, street, postal_code}
    same_as_shipping BOOLEAN DEFAULT true,
    
    -- معلومات إضافية
    notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, converted_to_customer
    converted_to_customer_id UUID REFERENCES customers(id),
    converted_at TIMESTAMPTZ,
    
    -- التواريخ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    UNIQUE(tenant_id, session_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_checkouts_tenant 
    ON guest_checkouts(tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_guest_checkouts_session 
    ON guest_checkouts(session_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_guest_checkouts_email 
    ON guest_checkouts(email) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_guest_checkouts_expires 
    ON guest_checkouts(expires_at) WHERE status = 'pending';

COMMENT ON TABLE guest_checkouts IS 'معلومات الزوار المؤقتة لإتمام الطلبات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول الطلبات (Orders)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- رقم الطلب
    order_number VARCHAR(50) NOT NULL,
    
    -- العميل (مسجل أو زائر)
    customer_id UUID REFERENCES customers(id),
    guest_checkout_id UUID REFERENCES guest_checkouts(id),
    
    -- السلة
    cart_id UUID REFERENCES shopping_carts(id),
    
    -- المبالغ
    subtotal DECIMAL(18, 4) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(18, 4) DEFAULT 0,
    tax_amount DECIMAL(18, 4) DEFAULT 0,
    shipping_amount DECIMAL(18, 4) DEFAULT 0,
    total_amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
    
    -- العملة
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, confirmed, shipped, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    
    -- معلومات الدفع
    payment_method VARCHAR(50), -- stripe, paypal, cash_on_delivery
    payment_transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    
    -- معلومات الشحن
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(255),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- ملاحظات
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- التواريخ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, company_id, order_number),
    CHECK (customer_id IS NOT NULL OR guest_checkout_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant 
    ON orders(tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer 
    ON orders(customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest 
    ON orders(guest_checkout_id) WHERE guest_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON orders(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_number 
    ON orders(order_number);

COMMENT ON TABLE orders IS 'طلبات العملاء والزوار';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول عناصر الطلب
-- Order Items Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- معلومات المنتج (نسخة من وقت الطلب)
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(100),
    product_image_url TEXT,
    
    -- الكمية والسعر
    quantity DECIMAL(18, 4) NOT NULL,
    unit_price DECIMAL(18, 4) NOT NULL,
    discount_amount DECIMAL(18, 4) DEFAULT 0,
    tax_amount DECIMAL(18, 4) DEFAULT 0,
    total_price DECIMAL(18, 4) NOT NULL,
    
    -- ملاحظات
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(order_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order 
    ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product 
    ON order_items(product_id);

COMMENT ON TABLE order_items IS 'عناصر الطلبات';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- guest_checkouts
ALTER TABLE guest_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON guest_checkouts;
CREATE POLICY tenant_isolation ON guest_checkouts
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON orders;
CREATE POLICY tenant_isolation ON orders
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON order_items;
CREATE POLICY tenant_isolation ON order_items
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة توليد رقم الطلب
-- Generate Order Number Function
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_order_number(
    p_tenant_id UUID,
    p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
    v_order_number VARCHAR;
    v_date_part VARCHAR;
BEGIN
    -- تنسيق التاريخ: YYYYMMDD
    v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- عدد الطلبات اليوم
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND (p_company_id IS NULL OR company_id = p_company_id)
      AND DATE(created_at) = CURRENT_DATE;
    
    -- رقم الطلب: ORD-YYYYMMDD-XXXX
    v_order_number := 'ORD-' || v_date_part || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$;

COMMENT ON FUNCTION generate_order_number IS 'توليد رقم طلب فريد';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة حفظ معلومات الزائر
-- Save Guest Checkout Information
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION save_guest_checkout(
    p_tenant_id UUID,
    p_company_id UUID,
    p_session_id VARCHAR,
    p_email VARCHAR,
    p_full_name VARCHAR,
    p_phone VARCHAR,
    p_shipping_address JSONB,
    p_billing_address JSONB DEFAULT NULL,
    p_same_as_shipping BOOLEAN DEFAULT true,
    p_notes TEXT DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guest_checkout_id UUID;
    v_result JSONB;
BEGIN
    -- حفظ أو تحديث معلومات الزائر
    INSERT INTO guest_checkouts (
        tenant_id, company_id, session_id, email, full_name, phone,
        shipping_address, billing_address, same_as_shipping,
        notes, ip_address, user_agent
    )
    VALUES (
        p_tenant_id, p_company_id, p_session_id, p_email, p_full_name, p_phone,
        p_shipping_address, p_billing_address, p_same_as_shipping,
        p_notes, p_ip_address, p_user_agent
    )
    ON CONFLICT (tenant_id, session_id, email)
    DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        shipping_address = EXCLUDED.shipping_address,
        billing_address = EXCLUDED.billing_address,
        same_as_shipping = EXCLUDED.same_as_shipping,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    RETURNING id INTO v_guest_checkout_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'guest_checkout_id', v_guest_checkout_id,
        'message', 'تم حفظ معلومات الزائر بنجاح'
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION save_guest_checkout IS 'حفظ معلومات الزائر للدفع';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة إنشاء طلب من السلة
-- Create Order from Cart
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_order_from_cart(
    p_tenant_id UUID,
    p_company_id UUID,
    p_cart_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_guest_checkout_id UUID DEFAULT NULL,
    p_payment_method VARCHAR DEFAULT 'cash_on_delivery',
    p_shipping_method VARCHAR DEFAULT 'standard',
    p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR;
    v_cart RECORD;
    v_item RECORD;
    v_result JSONB;
BEGIN
    -- التحقق من وجود السلة
    SELECT * INTO v_cart
    FROM shopping_carts
    WHERE id = p_cart_id
      AND tenant_id = p_tenant_id
      AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'السلة غير موجودة أو غير نشطة'
        );
    END IF;
    
    -- التحقق من وجود عناصر في السلة
    IF v_cart.items_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'السلة فارغة'
        );
    END IF;
    
    -- توليد رقم الطلب
    v_order_number := generate_order_number(p_tenant_id, p_company_id);
    
    -- إنشاء الطلب
    INSERT INTO orders (
        tenant_id, company_id, order_number,
        customer_id, guest_checkout_id, cart_id,
        subtotal, discount_amount, tax_amount, total_amount,
        currency, payment_method, shipping_method, customer_notes,
        status, payment_status
    )
    VALUES (
        p_tenant_id, p_company_id, v_order_number,
        p_customer_id, p_guest_checkout_id, p_cart_id,
        v_cart.subtotal, v_cart.discount_amount, v_cart.tax_amount, v_cart.total_amount,
        v_cart.currency, p_payment_method, p_shipping_method, p_customer_notes,
        'pending', 'pending'
    )
    RETURNING id INTO v_order_id;
    
    -- نسخ عناصر السلة إلى الطلب
    INSERT INTO order_items (
        tenant_id, company_id, order_id, product_id,
        product_name, product_sku, product_image_url,
        quantity, unit_price, discount_amount, tax_amount, total_price
    )
    SELECT
        p_tenant_id, p_company_id, v_order_id, sci.product_id,
        COALESCE(p.name_ar, p.name_en, 'Unknown') as product_name,
        p.sku,
        (p.images->0->>'url')::TEXT as product_image_url,
        sci.quantity,
        sci.unit_price,
        0, -- discount per item
        0, -- tax per item
        sci.total_price
    FROM shopping_cart_items sci
    LEFT JOIN products p ON p.id = sci.product_id
    WHERE sci.cart_id = p_cart_id;
    
    -- تحديث حالة السلة
    UPDATE shopping_carts
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_cart_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_cart.total_amount,
        'currency', v_cart.currency,
        'message', 'تم إنشاء الطلب بنجاح'
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_order_from_cart IS 'إنشاء طلب من السلة';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. دالة تحويل طلب الزائر إلى عميل مسجل
-- Convert Guest Order to Customer
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION convert_guest_order_to_customer(
    p_tenant_id UUID,
    p_guest_checkout_id UUID,
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_orders_updated INT;
    v_result JSONB;
BEGIN
    -- تحديث الطلبات المرتبطة بالزائر
    UPDATE orders
    SET customer_id = p_customer_id,
        guest_checkout_id = NULL,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND guest_checkout_id = p_guest_checkout_id
      AND customer_id IS NULL;
    
    GET DIAGNOSTICS v_orders_updated = ROW_COUNT;
    
    -- تحديث حالة guest_checkout
    UPDATE guest_checkouts
    SET status = 'converted_to_customer',
        converted_to_customer_id = p_customer_id,
        converted_at = NOW()
    WHERE id = p_guest_checkout_id
      AND tenant_id = p_tenant_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'orders_converted', v_orders_updated,
        'customer_id', p_customer_id,
        'message', 'تم تحويل الطلبات إلى العميل المسجل'
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION convert_guest_order_to_customer IS 'تحويل طلبات الزائر إلى عميل مسجل';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. دالة الحصول على طلبات الزائر
-- Get Guest Orders
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_guest_orders(
    p_tenant_id UUID,
    p_email VARCHAR,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR,
    total_amount DECIMAL,
    currency VARCHAR,
    status VARCHAR,
    payment_status VARCHAR,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        o.total_amount,
        o.currency,
        o.status,
        o.payment_status,
        o.created_at
    FROM orders o
    INNER JOIN guest_checkouts gc ON gc.id = o.guest_checkout_id
    WHERE o.tenant_id = p_tenant_id
      AND gc.email = p_email
      AND (p_session_id IS NULL OR gc.session_id = p_session_id)
    ORDER BY o.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_guest_orders IS 'الحصول على طلبات الزائر بالبريد الإلكتروني';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. دالة الحصول على تفاصيل الطلب
-- Get Order Details
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_order_details(
    p_tenant_id UUID,
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_order RECORD;
    v_items JSONB;
    v_customer JSONB;
    v_guest JSONB;
    v_result JSONB;
BEGIN
    -- الحصول على الطلب
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
      AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
    END IF;
    
    -- الحصول على عناصر الطلب
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_sku', oi.product_sku,
            'product_image_url', oi.product_image_url,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
        )
    ) INTO v_items
    FROM order_items oi
    WHERE oi.order_id = p_order_id;
    
    -- الحصول على معلومات العميل أو الزائر
    IF v_order.customer_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'type', 'customer',
            'id', c.id,
            'code', c.code,
            'full_name', c.full_name,
            'email', c.email,
            'phone', c.phone
        ) INTO v_customer
        FROM customers c
        WHERE c.id = v_order.customer_id;
    ELSIF v_order.guest_checkout_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'type', 'guest',
            'email', gc.email,
            'full_name', gc.full_name,
            'phone', gc.phone,
            'shipping_address', gc.shipping_address,
            'billing_address', gc.billing_address
        ) INTO v_guest
        FROM guest_checkouts gc
        WHERE gc.id = v_order.guest_checkout_id;
    END IF;
    
    -- بناء النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'subtotal', v_order.subtotal,
            'discount_amount', v_order.discount_amount,
            'tax_amount', v_order.tax_amount,
            'shipping_amount', v_order.shipping_amount,
            'total_amount', v_order.total_amount,
            'currency', v_order.currency,
            'status', v_order.status,
            'payment_status', v_order.payment_status,
            'payment_method', v_order.payment_method,
            'shipping_method', v_order.shipping_method,
            'tracking_number', v_order.tracking_number,
            'customer_notes', v_order.customer_notes,
            'created_at', v_order.created_at,
            'items', COALESCE(v_items, '[]'::jsonb),
            'customer', COALESCE(v_customer, v_guest, '{}'::jsonb)
        )
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_order_details IS 'الحصول على تفاصيل الطلب الكاملة';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. دالة تنظيف بيانات الزوار المنتهية
-- Cleanup Expired Guest Checkouts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_expired_guest_checkouts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    -- حذف guest_checkouts المنتهية والتي لم يتم استخدامها
    DELETE FROM guest_checkouts
    WHERE expires_at < NOW()
      AND status = 'pending'
      AND NOT EXISTS (
          SELECT 1 FROM orders 
          WHERE orders.guest_checkout_id = guest_checkouts.id
      );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_guest_checkouts IS 'تنظيف بيانات الزوار المنتهية';

-- ═══════════════════════════════════════════════════════════════════════════
-- الخلاصة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 53: Guest Checkout System - اكتمل بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    RAISE NOTICE '📦 الجداول المُنشأة:';
    RAISE NOTICE '   ✅ guest_checkouts (معلومات الزوار)';
    RAISE NOTICE '   ✅ orders (الطلبات)';
    RAISE NOTICE '   ✅ order_items (عناصر الطلبات)';
    RAISE NOTICE ' ';
    RAISE NOTICE '⚡ الدوال المُنشأة:';
    RAISE NOTICE '   ✅ generate_order_number() - توليد رقم طلب';
    RAISE NOTICE '   ✅ save_guest_checkout() - حفظ معلومات الزائر';
    RAISE NOTICE '   ✅ create_order_from_cart() - إنشاء طلب من السلة';
    RAISE NOTICE '   ✅ convert_guest_order_to_customer() - تحويل لعميل';
    RAISE NOTICE '   ✅ get_guest_orders() - طلبات الزائر';
    RAISE NOTICE '   ✅ get_order_details() - تفاصيل الطلب';
    RAISE NOTICE '   ✅ cleanup_expired_guest_checkouts() - التنظيف';
    RAISE NOTICE ' ';
    RAISE NOTICE '🔒 RLS Policies: مُطبّقة على جميع الجداول';
    RAISE NOTICE ' ';
    RAISE NOTICE '🚀 النظام جاهز لاستقبال طلبات الزوار!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;
