-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: الحجوزات على البضائع بالطريق
-- Seed: Transit Reservations (Reservations on In-Transit Goods)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    
    -- الشحنات
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    
    -- بنود الشحنات
    v_item_turkey_silk_white_id UUID;
    v_item_turkey_silk_cream_id UUID;
    v_item_turkey_poly_red_id UUID;
    v_item_india_linen_beige_id UUID;
    
    -- العملاء
    v_customer_golden_id UUID;
    v_customer_elegance_id UUID;
    v_customer_premium_id UUID;
    
    -- المواد
    v_mat_silk_natural_id UUID;
    v_mat_poly_satin_id UUID;
    v_mat_linen_100_id UUID;
    
    -- الألوان
    v_color_white_id UUID;
    v_color_cream_id UUID;
    v_color_red_id UUID;
    v_color_beige_id UUID;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على المعرفات الأساسية
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_branch_id FROM branches WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant أو company. قم بتشغيل البيانات الأساسية أولاً';
    END IF;
    
    -- الشحنات
    SELECT id INTO v_shipment_turkey_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-002';
    SELECT id INTO v_shipment_india_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-003';
    
    -- العملاء
    SELECT id INTO v_customer_golden_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-001'; -- شركة النسيج الذهبي
    SELECT id INTO v_customer_elegance_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-005'; -- بوتيك الأناقة
    SELECT id INTO v_customer_premium_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-007'; -- مجموعة الأزياء الراقية
    
    -- المواد
    SELECT id INTO v_mat_silk_natural_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'SILK-NATURAL';
    SELECT id INTO v_mat_poly_satin_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'POLY-SATIN';
    SELECT id INTO v_mat_linen_100_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'LINEN-100';
    
    -- الألوان
    SELECT id INTO v_color_white_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'WHITE';
    SELECT id INTO v_color_cream_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'CREAM';
    SELECT id INTO v_color_red_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'RED';
    SELECT id INTO v_color_beige_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BEIGE';
    
    -- بنود الشحنات
    SELECT id INTO v_item_turkey_silk_white_id FROM shipment_items WHERE shipment_id = v_shipment_turkey_id AND material_id = v_mat_silk_natural_id AND color_id = v_color_white_id LIMIT 1;
    SELECT id INTO v_item_turkey_silk_cream_id FROM shipment_items WHERE shipment_id = v_shipment_turkey_id AND material_id = v_mat_silk_natural_id AND color_id = v_color_cream_id LIMIT 1;
    SELECT id INTO v_item_turkey_poly_red_id FROM shipment_items WHERE shipment_id = v_shipment_turkey_id AND material_id = v_mat_poly_satin_id AND color_id = v_color_red_id LIMIT 1;
    SELECT id INTO v_item_india_linen_beige_id FROM shipment_items WHERE shipment_id = v_shipment_india_id AND material_id = v_mat_linen_100_id AND color_id = v_color_beige_id LIMIT 1;
    
    RAISE NOTICE 'Using tenant_id: %, company_id: %', v_tenant_id, v_company_id;
    RAISE NOTICE 'Turkey shipment: %, India shipment: %', v_shipment_turkey_id, v_shipment_india_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. حجز على شحنة تركيا (بالطريق) - حرير أبيض
    -- شركة النسيج الذهبي - 100 متر - دفعة مقدمة مستلمة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO transit_reservations (
        tenant_id, company_id, branch_id,
        reservation_number, reservation_date,
        customer_id, customer_name,
        shipment_id, shipment_item_id,
        material_id, color_id,
        reserved_quantity, unit,
        unit_price, total_amount,
        advance_amount, advance_received,
        status, expected_delivery_date,
        notes
    )
    VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'RES-2024-001', '2024-02-10',
        v_customer_golden_id, 'شركة النسيج الذهبي',
        v_shipment_turkey_id, v_item_turkey_silk_white_id,
        v_mat_silk_natural_id, v_color_white_id,
        100, 'meter',
        65.00, 6500.00,
        2000.00, true,
        'confirmed', '2024-02-25',
        'حجز حرير أبيض فاخر - دفعة مقدمة 2000$ مستلمة'
    )
    ON CONFLICT (tenant_id, reservation_number) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. حجز على شحنة تركيا (بالطريق) - حرير كريمي
    -- بوتيك الأناقة - 50 متر - دفعة مقدمة مستلمة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO transit_reservations (
        tenant_id, company_id, branch_id,
        reservation_number, reservation_date,
        customer_id, customer_name,
        shipment_id, shipment_item_id,
        material_id, color_id,
        reserved_quantity, unit,
        unit_price, total_amount,
        advance_amount, advance_received,
        status, expected_delivery_date,
        notes
    )
    VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'RES-2024-002', '2024-02-12',
        v_customer_elegance_id, 'بوتيك الأناقة',
        v_shipment_turkey_id, v_item_turkey_silk_cream_id,
        v_mat_silk_natural_id, v_color_cream_id,
        50, 'meter',
        65.00, 3250.00,
        1000.00, true,
        'confirmed', '2024-02-25',
        'حجز حرير كريمي للفساتين الراقية'
    )
    ON CONFLICT (tenant_id, reservation_number) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. حجز على شحنة تركيا (بالطريق) - بوليستر أحمر
    -- مجموعة الأزياء الراقية - 200 متر - في الانتظار (بدون دفعة)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO transit_reservations (
        tenant_id, company_id, branch_id,
        reservation_number, reservation_date,
        customer_id, customer_name,
        shipment_id, shipment_item_id,
        material_id, color_id,
        reserved_quantity, unit,
        unit_price, total_amount,
        advance_amount, advance_received,
        status, expected_delivery_date,
        notes
    )
    VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'RES-2024-003', '2024-02-14',
        v_customer_premium_id, 'مجموعة الأزياء الراقية',
        v_shipment_turkey_id, v_item_turkey_poly_red_id,
        v_mat_poly_satin_id, v_color_red_id,
        200, 'meter',
        18.00, 3600.00,
        1000.00, false,
        'pending', '2024-02-28',
        'حجز بوليستر أحمر - بانتظار الدفعة المقدمة'
    )
    ON CONFLICT (tenant_id, reservation_number) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. حجز على شحنة الهند (في الجمارك) - كتان بيج
    -- شركة النسيج الذهبي - 300 متر - دفعة مقدمة مستلمة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO transit_reservations (
        tenant_id, company_id, branch_id,
        reservation_number, reservation_date,
        customer_id, customer_name,
        shipment_id, shipment_item_id,
        material_id, color_id,
        reserved_quantity, unit,
        unit_price, total_amount,
        advance_amount, advance_received,
        status, expected_delivery_date,
        notes
    )
    VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'RES-2024-004', '2024-02-08',
        v_customer_golden_id, 'شركة النسيج الذهبي',
        v_shipment_india_id, v_item_india_linen_beige_id,
        v_mat_linen_100_id, v_color_beige_id,
        300, 'meter',
        16.00, 4800.00,
        1500.00, true,
        'confirmed', '2024-02-22',
        'حجز كتان بيج للصيف - الكونتينر في الجمارك'
    )
    ON CONFLICT (tenant_id, reservation_number) DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- تحديث الكميات المحجوزة في بنود الشحنات
    -- ═══════════════════════════════════════════════════════════════
    
    -- تحديث Turkey shipment items
    UPDATE shipment_items SET reserved_quantity = (
        SELECT COALESCE(SUM(reserved_quantity), 0)
        FROM transit_reservations tr
        WHERE tr.shipment_item_id = shipment_items.id
        AND tr.status IN ('pending', 'confirmed')
    )
    WHERE shipment_id = v_shipment_turkey_id;
    
    -- تحديث India shipment items
    UPDATE shipment_items SET reserved_quantity = (
        SELECT COALESCE(SUM(reserved_quantity), 0)
        FROM transit_reservations tr
        WHERE tr.shipment_item_id = shipment_items.id
        AND tr.status IN ('pending', 'confirmed')
    )
    WHERE shipment_id = v_shipment_india_id;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Transit reservations created successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - RES-2024-001: حرير أبيض 100م - شركة النسيج الذهبي (confirmed)';
    RAISE NOTICE '   - RES-2024-002: حرير كريمي 50م - بوتيك الأناقة (confirmed)';
    RAISE NOTICE '   - RES-2024-003: بوليستر أحمر 200م - مجموعة الأزياء (pending)';
    RAISE NOTICE '   - RES-2024-004: كتان بيج 300م - شركة النسيج الذهبي (confirmed)';
    RAISE NOTICE '   - Total reserved: 650 meters';
    RAISE NOTICE '   - Total advance received: 4,500$';
    
END $$;
