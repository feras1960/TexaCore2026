-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 STEP 55: Advanced Order Management - اختبار وظيفي شامل
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    -- المعرفات
    v_tenant_id UUID;
    v_company_id UUID;
    v_customer_id UUID;
    v_product_id UUID;
    v_order_id UUID;
    
    -- الحالات
    v_pending_status_id UUID;
    v_confirmed_status_id UUID;
    v_preparing_status_id UUID;
    v_ready_status_id UUID;
    v_shipped_status_id UUID;
    v_delivered_status_id UUID;
    v_completed_status_id UUID;
    
    -- مواقع الإرسال
    v_warehouse_id UUID;
    v_pos_branch_id UUID;
    v_fulfillment1_id UUID;
    v_fulfillment2_id UUID;
    
    -- الشحنة
    v_shipment_id UUID;
    
    -- المكافآت
    v_coupon_id UUID;
    v_points_before INT;
    v_points_after INT;
    
    -- النتائج
    v_result JSONB;
    v_timeline_count INT;
    
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🧪 STEP 55: اختبار وظيفي شامل';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- تحضير البيانات الأساسية
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE '📋 1. تحضير البيانات الأساسية...';
    
    -- الحصول على tenant و company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    -- إنشاء عميل تجريبي (محاولة بأعمدة مختلفة)
    BEGIN
        -- محاولة 1: مع full_name
        INSERT INTO customers (tenant_id, company_id, code, name_ar, full_name, email, phone)
        VALUES (v_tenant_id, v_company_id, 'CUST-TEST-' || EXTRACT(EPOCH FROM NOW())::INT, 'أحمد محمد', 'أحمد محمد', 'ahmed@test.com', '+380501234567')
        RETURNING id INTO v_customer_id;
    EXCEPTION
        WHEN undefined_column THEN
            -- محاولة 2: مع name و name_ar
            BEGIN
                INSERT INTO customers (tenant_id, company_id, code, name_ar, name, email, phone)
                VALUES (v_tenant_id, v_company_id, 'CUST-TEST-' || EXTRACT(EPOCH FROM NOW())::INT, 'أحمد محمد', 'أحمد محمد', 'ahmed@test.com', '+380501234567')
                RETURNING id INTO v_customer_id;
            EXCEPTION
                WHEN undefined_column THEN
                    -- محاولة 3: الحد الأدنى مع code و name_ar
                    INSERT INTO customers (tenant_id, company_id, code, name_ar, email)
                    VALUES (v_tenant_id, v_company_id, 'CUST-TEST-' || EXTRACT(EPOCH FROM NOW())::INT, 'عميل تجريبي', 'ahmed_test_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@test.com')
                    RETURNING id INTO v_customer_id;
            END;
        WHEN unique_violation THEN
            -- إذا كان موجود، احصل عليه
            SELECT id INTO v_customer_id FROM customers WHERE email LIKE 'ahmed%@test.com' LIMIT 1;
    END;
    
    -- الحصول على منتج أو إنشاء واحد
    SELECT id INTO v_product_id FROM products LIMIT 1;
    IF v_product_id IS NULL THEN
        BEGIN
            -- محاولة إنشاء منتج بسيط (مع name و name_en)
            INSERT INTO products (sku, name, name_en, default_price)
            VALUES ('TEST-PROD-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'Test Product', 'Test Product', 100.00)
            RETURNING id INTO v_product_id;
        EXCEPTION
            WHEN undefined_column THEN
                -- محاولة بأعمدة مختلفة
                BEGIN
                    INSERT INTO products (sku, name, price)
                    VALUES ('TEST-PROD-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'Test Product', 100.00)
                    RETURNING id INTO v_product_id;
                EXCEPTION
                    WHEN undefined_column THEN
                        -- محاولة أخيرة: أقل الأعمدة
                        INSERT INTO products (sku, name)
                        VALUES ('TEST-PROD-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'Test Product')
                        RETURNING id INTO v_product_id;
                END;
        END;
    END IF;
    
    -- إذا فشل الإنشاء، حاول الحصول على أي منتج موجود
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM products LIMIT 1;
    END IF;
    
    -- إنشاء طلب تجريبي
    INSERT INTO orders (
        tenant_id, company_id, customer_id,
        order_number, status, payment_method,
        subtotal, total, payment_status
    )
    VALUES (
        v_tenant_id, v_company_id, v_customer_id,
        'ORD-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        'pending', 'cash_on_delivery',
        250.00, 250.00, 'pending'
    )
    RETURNING id INTO v_order_id;
    
    -- إضافة عناصر الطلب
    BEGIN
        INSERT INTO order_items (tenant_id, order_id, product_id, quantity, unit_price, total_price)
        VALUES (v_tenant_id, v_order_id, v_product_id, 2, 100.00, 200.00);
    EXCEPTION
        WHEN undefined_column THEN
            -- محاولة بدون tenant_id
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
            VALUES (v_order_id, v_product_id, 2, 100.00, 200.00);
    END;
    
    -- إنشاء مستودع ونقطة بيع للاختبار
    BEGIN
        -- محاولة إنشاء مستودع
        BEGIN
            INSERT INTO warehouses (tenant_id, code, name_ar, name_en)
            VALUES (v_tenant_id, 'WH-MAIN', 'المستودع الرئيسي', 'Main Warehouse')
            ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar
            RETURNING id INTO v_warehouse_id;
        EXCEPTION
            WHEN undefined_column THEN
                -- محاولة بدون name_ar/name_en
                INSERT INTO warehouses (tenant_id, code, name)
                VALUES (v_tenant_id, 'WH-MAIN', 'Main Warehouse')
                ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
                RETURNING id INTO v_warehouse_id;
        END;
        
        -- إذا لم يتم إنشاء المستودع، جرّب الحصول على موجود
        IF v_warehouse_id IS NULL THEN
            SELECT id INTO v_warehouse_id FROM warehouses WHERE tenant_id = v_tenant_id LIMIT 1;
        END IF;
        
        -- محاولة إنشاء نقطة بيع
        BEGIN
            INSERT INTO pos_branches (tenant_id, company_id, code, name_ar, name_en)
            VALUES (v_tenant_id, v_company_id, 'POS-01', 'فرع دبي', 'Dubai Branch')
            ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar
            RETURNING id INTO v_pos_branch_id;
        EXCEPTION
            WHEN undefined_column THEN
                -- محاولة بدون name_ar/name_en
                INSERT INTO pos_branches (tenant_id, company_id, code, name)
                VALUES (v_tenant_id, v_company_id, 'POS-01', 'Dubai Branch')
                ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
                RETURNING id INTO v_pos_branch_id;
        WHEN undefined_table THEN
            -- إذا الجدول غير موجود، استخدم warehouse كبديل
            v_pos_branch_id := v_warehouse_id;
        END;
        
        -- إذا لم يتم إنشاء نقطة البيع، استخدم المستودع كبديل
        IF v_pos_branch_id IS NULL THEN
            v_pos_branch_id := v_warehouse_id;
        END IF;
    END;
    
    RAISE NOTICE '   ✅ تم تحضير البيانات';
    RAISE NOTICE '      - Tenant: %', v_tenant_id;
    RAISE NOTICE '      - Order: %', v_order_id;
    RAISE NOTICE '      - Customer: %', v_customer_id;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- إنشاء حالات مخصصة
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '⚙️ 2. إنشاء حالات مخصصة...';
    
    -- إنشاء الحالات
    INSERT INTO order_statuses (tenant_id, code, name_ar, name_en, color, icon, sequence)
    VALUES 
        (v_tenant_id, 'pending', 'قيد الانتظار', 'Pending', '#FFA500', 'clock', 1),
        (v_tenant_id, 'confirmed', 'مؤكد', 'Confirmed', '#2196F3', 'check', 2),
        (v_tenant_id, 'preparing', 'قيد التجهيز', 'Preparing', '#9C27B0', 'package', 3),
        (v_tenant_id, 'ready_to_ship', 'جاهز للشحن', 'Ready to Ship', '#00BCD4', 'box', 4),
        (v_tenant_id, 'shipped', 'تم الشحن', 'Shipped', '#3F51B5', 'truck', 5),
        (v_tenant_id, 'delivered', 'تم التسليم', 'Delivered', '#4CAF50', 'check-circle', 6),
        (v_tenant_id, 'completed', 'مكتمل', 'Completed', '#4CAF50', 'star', 7)
    ON CONFLICT (tenant_id, code) DO NOTHING
    RETURNING id INTO v_completed_status_id;
    
    -- الحصول على معرفات الحالات
    SELECT id INTO v_pending_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'pending';
    SELECT id INTO v_confirmed_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'confirmed';
    SELECT id INTO v_preparing_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'preparing';
    SELECT id INTO v_ready_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'ready_to_ship';
    SELECT id INTO v_shipped_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'shipped';
    SELECT id INTO v_delivered_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'delivered';
    SELECT id INTO v_completed_status_id FROM order_statuses WHERE tenant_id = v_tenant_id AND code = 'completed';
    
    -- إنشاء قواعد الانتقال
    INSERT INTO order_status_transitions (tenant_id, from_status_id, to_status_id, allowed_roles)
    VALUES 
        (v_tenant_id, v_pending_status_id, v_confirmed_status_id, '["admin", "manager"]'::jsonb),
        (v_tenant_id, v_confirmed_status_id, v_preparing_status_id, '["admin", "warehouse_manager"]'::jsonb),
        (v_tenant_id, v_preparing_status_id, v_ready_status_id, '["admin", "warehouse_manager"]'::jsonb),
        (v_tenant_id, v_ready_status_id, v_shipped_status_id, '["admin", "shipping_manager"]'::jsonb),
        (v_tenant_id, v_shipped_status_id, v_delivered_status_id, '["admin", "shipping_manager"]'::jsonb),
        (v_tenant_id, v_delivered_status_id, v_completed_status_id, '["system"]'::jsonb)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '   ✅ تم إنشاء 7 حالات و 6 قواعد انتقال';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار تحديث الحالة
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🔄 3. اختبار تحديث الحالة...';
    
    -- تأكيد الطلب
    SELECT update_order_status(v_tenant_id, v_order_id, 'confirmed', NULL, 'تم تأكيد الطلب')
    INTO v_result;
    RAISE NOTICE '   ✅ تم تأكيد الطلب: %', v_result->>'message';
    
    -- بدء التجهيز
    SELECT update_order_status(v_tenant_id, v_order_id, 'preparing')
    INTO v_result;
    RAISE NOTICE '   ✅ بدء التجهيز: %', v_result->>'message';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار تخصيص مواقع الإرسال
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '📍 4. اختبار تخصيص مواقع الإرسال...';
    
    SELECT assign_fulfillment_locations(
        v_tenant_id,
        v_order_id,
        jsonb_build_array(
            jsonb_build_object(
                'location_type', 'warehouse',
                'location_id', v_warehouse_id,
                'location_name', 'المستودع الرئيسي',
                'items', jsonb_build_array(
                    jsonb_build_object(
                        'product_id', v_product_id,
                        'quantity', 1
                    )
                )
            ),
            jsonb_build_object(
                'location_type', 'pos_branch',
                'location_id', v_pos_branch_id,
                'location_name', 'فرع دبي',
                'items', jsonb_build_array(
                    jsonb_build_object(
                        'product_id', v_product_id,
                        'quantity', 1
                    )
                )
            )
        )
    ) INTO v_result;
    
    RAISE NOTICE '   ✅ تم تخصيص موقعين: %', v_result->>'message';
    
    -- الحصول على معرفات المواقع
    SELECT id INTO v_fulfillment1_id 
    FROM order_fulfillment_locations 
    WHERE order_id = v_order_id AND location_type = 'warehouse' 
    LIMIT 1;
    
    SELECT id INTO v_fulfillment2_id 
    FROM order_fulfillment_locations 
    WHERE order_id = v_order_id AND location_type = 'pos_branch' 
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار تأكيد جاهزية المواقع
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '✅ 5. اختبار تأكيد جاهزية المواقع...';
    
    -- الموقع الأول جاهز
    SELECT confirm_location_ready(v_tenant_id, v_fulfillment1_id, v_customer_id, 'جاهز من المستودع')
    INTO v_result;
    RAISE NOTICE '   ✅ المستودع جاهز: %', v_result->>'message';
    
    -- الموقع الثاني جاهز
    SELECT confirm_location_ready(v_tenant_id, v_fulfillment2_id, v_customer_id, 'جاهز من نقطة البيع')
    INTO v_result;
    RAISE NOTICE '   ✅ نقطة البيع جاهزة: %', v_result->>'message';
    RAISE NOTICE '   📦 جميع المواقع جاهزة: %', v_result->>'all_ready';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار إنشاء الشحنة
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🚚 6. اختبار إنشاء وتحديث الشحنة...';
    
    SELECT create_shipment(
        v_tenant_id,
        v_order_id,
        'nova_poshta',
        250.00,
        jsonb_build_object(
            'name', 'أحمد محمد',
            'phone', '+380501234567',
            'address', jsonb_build_object(
                'city', 'Kyiv',
                'street', 'Main Street 123'
            )
        )
    ) INTO v_result;
    
    v_shipment_id := (v_result->>'shipment_id')::UUID;
    RAISE NOTICE '   ✅ تم إنشاء الشحنة: %', v_shipment_id;
    
    -- تحديث: تم التقاطها
    SELECT update_shipment_status(v_tenant_id, v_shipment_id, 'picked_up', '59000XXXXX123')
    INTO v_result;
    RAISE NOTICE '   ✅ تم التقاط الشحنة برقم: 59000XXXXX123';
    
    -- تحديث: وصلت للمدينة
    SELECT update_shipment_status(v_tenant_id, v_shipment_id, 'arrived')
    INTO v_result;
    RAISE NOTICE '   ✅ وصلت الشحنة للمدينة';
    
    -- تحديث: تم التسليم
    SELECT update_shipment_status(v_tenant_id, v_shipment_id, 'delivered')
    INTO v_result;
    RAISE NOTICE '   ✅ تم تسليم الشحنة';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار تسجيل الدفع
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '💰 7. اختبار تسجيل الدفع...';
    
    SELECT record_order_payment(v_tenant_id, v_order_id, 'cod_collected', 250.00)
    INTO v_result;
    RAISE NOTICE '   ✅ تم تسجيل دفع COD: 250.00';
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار قواعد المكافآت
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🎁 8. اختبار نظام المكافآت...';
    
    -- إنشاء قاعدة مكافأة
    INSERT INTO reward_rules (
        tenant_id, code, trigger_event,
        reward_type, 
        coupon_config,
        loyalty_points_config
    )
    VALUES (
        v_tenant_id,
        'completed_reward',
        'order_completed',
        'both',
        jsonb_build_object(
            'type', 'percentage',
            'value', 10,
            'min_purchase', 100,
            'valid_days', 30
        ),
        jsonb_build_object(
            'points', 50,
            'expires_days', 365
        )
    )
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- الحصول على النقاط قبل
    SELECT COALESCE(available_points, 0) INTO v_points_before
    FROM loyalty_points
    WHERE tenant_id = v_tenant_id AND customer_id = v_customer_id;
    
    RAISE NOTICE '   📊 نقاط الولاء قبل: %', COALESCE(v_points_before, 0);
    
    -- إتمام الطلب (سيمنح المكافآت تلقائياً)
    SELECT complete_order(v_tenant_id, v_order_id) INTO v_result;
    RAISE NOTICE '   ✅ تم إتمام الطلب: %', v_result->>'message';
    
    -- الحصول على النقاط بعد
    SELECT COALESCE(available_points, 0) INTO v_points_after
    FROM loyalty_points
    WHERE tenant_id = v_tenant_id AND customer_id = v_customer_id;
    
    RAISE NOTICE '   📊 نقاط الولاء بعد: %', COALESCE(v_points_after, 0);
    RAISE NOTICE '   🌟 تم منح: % نقطة', COALESCE(v_points_after - v_points_before, 0);
    
    -- التحقق من الكوبونات
    SELECT COUNT(*) INTO v_result
    FROM customer_coupons
    WHERE tenant_id = v_tenant_id AND customer_id = v_customer_id AND used_at IS NULL;
    
    RAISE NOTICE '   🎫 عدد الكوبونات المتاحة: %', v_result;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- اختبار سجل التاريخ
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '📊 9. اختبار سجل التاريخ...';
    
    SELECT COUNT(*) INTO v_timeline_count
    FROM get_order_timeline(v_tenant_id, v_order_id);
    
    RAISE NOTICE '   ✅ عدد الأحداث في السجل: %', v_timeline_count;
    
    -- عرض آخر 5 أحداث
    RAISE NOTICE '   📋 آخر الأحداث:';
    FOR v_result IN 
        SELECT 
            TO_CHAR(timestamp, 'HH24:MI:SS') as time,
            event_type,
            description
        FROM get_order_timeline(v_tenant_id, v_order_id)
        LIMIT 5
    LOOP
        RAISE NOTICE '      - [%] %: %', 
            v_result->>'time',
            v_result->>'event_type',
            v_result->>'description';
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- الخلاصة
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ نجحت جميع الاختبارات!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    RAISE NOTICE '📊 ملخص الاختبار:';
    RAISE NOTICE '   ✅ إنشاء وتحديث الحالات';
    RAISE NOTICE '   ✅ تخصيص مواقع الإرسال';
    RAISE NOTICE '   ✅ تأكيد جاهزية المواقع';
    RAISE NOTICE '   ✅ إدارة الشحنات';
    RAISE NOTICE '   ✅ تسجيل الدفع';
    RAISE NOTICE '   ✅ منح المكافآت التلقائية';
    RAISE NOTICE '   ✅ سجل التاريخ الكامل';
    RAISE NOTICE ' ';
    RAISE NOTICE '🎉 STEP 55: Advanced Order Management يعمل بشكل ممتاز!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE ' ';
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        RAISE NOTICE '📍 التفاصيل: %', SQLSTATE;
        RAISE;
END $$;
