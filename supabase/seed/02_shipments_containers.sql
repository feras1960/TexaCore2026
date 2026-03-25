-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: الكونتينرات والشحنات مع المصاريف
-- Seed: Shipments/Containers with Costs (Expected & Actual)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    v_warehouse_id UUID;
    
    -- الموردين
    v_supplier_china_id UUID;
    v_supplier_turkey_id UUID;
    v_supplier_india_id UUID;
    
    -- شركات الخدمات
    v_shipping_company_id UUID;
    v_customs_agent_id UUID;
    v_transport_company_id UUID;
    v_insurance_company_id UUID;
    
    -- المواد
    v_mat_cotton_plain_id UUID;
    v_mat_cotton_twill_id UUID;
    v_mat_poly_satin_id UUID;
    v_mat_poly_crepe_id UUID;
    v_mat_silk_natural_id UUID;
    v_mat_linen_100_id UUID;
    
    -- الألوان
    v_color_white_id UUID;
    v_color_black_id UUID;
    v_color_beige_id UUID;
    v_color_navy_id UUID;
    v_color_red_id UUID;
    v_color_cream_id UUID;
    v_color_burgundy_id UUID;
    v_color_gray_id UUID;
    
    -- الشحنات IDs
    v_shipment_china_id UUID;
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    
    -- بنود الشحنات IDs
    v_item_china_cotton_white_id UUID;
    v_item_china_cotton_black_id UUID;
    v_item_china_cotton_beige_id UUID;
    v_item_turkey_silk_white_id UUID;
    v_item_turkey_silk_cream_id UUID;
    v_item_turkey_poly_red_id UUID;
    v_item_turkey_poly_navy_id UUID;
    v_item_india_linen_beige_id UUID;
    v_item_india_linen_gray_id UUID;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على المعرفات الأساسية
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_branch_id FROM branches WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    SELECT id INTO v_warehouse_id FROM warehouses WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant أو company. قم بتشغيل البيانات الأساسية أولاً';
    END IF;
    
    -- الموردين
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005'; -- مصانع قوانغدونغ
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003'; -- مصانع بورصة
    SELECT id INTO v_supplier_india_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-006'; -- مصانع مومباي
    
    -- شركات الخدمات
    SELECT id INTO v_shipping_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-SHIP-001';
    SELECT id INTO v_customs_agent_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-CUST-001';
    SELECT id INTO v_transport_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-TRANS-001';
    SELECT id INTO v_insurance_company_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SVC-INS-001';
    
    -- المواد
    SELECT id INTO v_mat_cotton_plain_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'COT-100-PLAIN';
    SELECT id INTO v_mat_cotton_twill_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'COT-100-TWILL';
    SELECT id INTO v_mat_poly_satin_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'POLY-SATIN';
    SELECT id INTO v_mat_poly_crepe_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'POLY-CREPE';
    SELECT id INTO v_mat_silk_natural_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'SILK-NATURAL';
    SELECT id INTO v_mat_linen_100_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'LINEN-100';
    
    -- الألوان
    SELECT id INTO v_color_white_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'WHITE';
    SELECT id INTO v_color_black_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLACK';
    SELECT id INTO v_color_beige_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BEIGE';
    SELECT id INTO v_color_navy_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'NAVY';
    SELECT id INTO v_color_red_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'RED';
    SELECT id INTO v_color_cream_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'CREAM';
    SELECT id INTO v_color_burgundy_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BURGUNDY';
    SELECT id INTO v_color_gray_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'GRAY';
    
    RAISE NOTICE 'Using tenant_id: %, company_id: %', v_tenant_id, v_company_id;
    RAISE NOTICE 'Shipping company: %, Customs: %, Transport: %', v_shipping_company_id, v_customs_agent_id, v_transport_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. الكونتينر الأول: من الصين - مُستلم ومُغلق
    -- CONT-2024-001 - قطن سادة (وصل وتم إغلاقه)
    -- ═══════════════════════════════════════════════════════════════
    
    v_shipment_china_id := gen_random_uuid();
    
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, origin_port, destination_port,
        order_date, shipping_date, expected_arrival_date, actual_arrival_date,
        customs_clearance_date, delivery_date, received_date,
        status,
        goods_currency, goods_exchange_rate,
        provisional_goods_cost, final_goods_cost,
        total_expected_costs, total_actual_costs, total_landed_cost,
        cost_allocation_method, is_cost_finalized, finalized_at,
        notes
    )
    VALUES (
        v_shipment_china_id, v_tenant_id, v_company_id, v_branch_id,
        'SHIP-2024-001', 'CONT-2024-001', 'BL-CHN-2024-001',
        v_supplier_china_id, 'China', 'Guangzhou Port', 'Odesa Port',
        '2024-01-05', '2024-01-10', '2024-02-05', '2024-02-03',
        '2024-02-06', '2024-02-08', '2024-02-08',
        'received',
        'USD', 1,
        25000.00, 25000.00,
        9800.00, 9850.00, 34850.00,
        'by_value', true, '2024-02-10 14:00:00+00',
        'كونتينر قطن سادة من الصين - تم الاستلام والإغلاق'
    )
    ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'received';
    
    -- بنود الكونتينر الأول
    v_item_china_cotton_white_id := gen_random_uuid();
    v_item_china_cotton_black_id := gen_random_uuid();
    v_item_china_cotton_beige_id := gen_random_uuid();
    
    INSERT INTO shipment_items (id, tenant_id, shipment_id, material_id, color_id, item_description, expected_rolls, received_rolls, expected_quantity, received_quantity, unit, unit_price, total_price, provisional_unit_cost, final_unit_cost, allocated_costs, total_provisional_cost, total_final_cost)
    VALUES 
        (v_item_china_cotton_white_id, v_tenant_id, v_shipment_china_id, v_mat_cotton_plain_id, v_color_white_id, 'قطن سادة 100% - أبيض', 10, 10, 1000, 980, 'meter', 10.00, 10000.00, 13.92, 14.22, 3936.00, 13920.00, 13935.60),
        (v_item_china_cotton_black_id, v_tenant_id, v_shipment_china_id, v_mat_cotton_plain_id, v_color_black_id, 'قطن سادة 100% - أسود', 8, 8, 800, 800, 'meter', 10.00, 8000.00, 13.92, 14.22, 3148.80, 11136.00, 11376.00),
        (v_item_china_cotton_beige_id, v_tenant_id, v_shipment_china_id, v_mat_cotton_plain_id, v_color_beige_id, 'قطن سادة 100% - بيج', 7, 7, 700, 720, 'meter', 10.00, 7000.00, 13.92, 14.22, 2755.20, 9744.00, 10238.40)
    ON CONFLICT DO NOTHING;
    
    -- مصاريف الكونتينر الأول (كلها فعلية - مُغلق)
    INSERT INTO shipment_costs (tenant_id, company_id, shipment_id, cost_type, vendor_id, vendor_name, description, expected_amount, expected_currency, actual_amount, actual_currency, actual_amount_in_base, invoice_status, invoice_number, invoice_date, payment_status, paid_amount, paid_date)
    VALUES 
        (v_tenant_id, v_company_id, v_shipment_china_id, 'freight', v_shipping_company_id, 'ساشا للشحن البحري', 'شحن بحري من قوانغدونغ إلى أوديسا', 5000.00, 'USD', 5200.00, 'USD', 5200.00, 'invoiced', 'INV-SASHA-2024-001', '2024-02-05', 'paid', 5200.00, '2024-02-07'),
        (v_tenant_id, v_company_id, v_shipment_china_id, 'customs_duty', v_customs_agent_id, 'شركة التخليص الجمركي الموحدة', 'رسوم جمركية 10%', 2500.00, 'UAH', 2350.00, 'UAH', 2350.00, 'invoiced', 'INV-UCC-2024-001', '2024-02-06', 'paid', 2350.00, '2024-02-08'),
        (v_tenant_id, v_company_id, v_shipment_china_id, 'taxes', NULL, 'ضرائب الاستيراد', 'ضريبة VAT 6%', 1500.00, 'UAH', 1480.00, 'UAH', 1480.00, 'invoiced', 'TAX-2024-001', '2024-02-06', 'paid', 1480.00, '2024-02-08'),
        (v_tenant_id, v_company_id, v_shipment_china_id, 'insurance', v_insurance_company_id, 'شركة التأمين الدولية للشحن', 'تأمين بحري', 300.00, 'USD', 300.00, 'USD', 300.00, 'invoiced', 'INV-ICI-2024-001', '2024-01-10', 'paid', 300.00, '2024-01-12'),
        (v_tenant_id, v_company_id, v_shipment_china_id, 'transport', v_transport_company_id, 'شركة النقل السريع', 'نقل من الميناء للمستودع', 500.00, 'UAH', 520.00, 'UAH', 520.00, 'invoiced', 'INV-FT-2024-001', '2024-02-08', 'paid', 520.00, '2024-02-09')
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. الكونتينر الثاني: من تركيا - بالطريق
    -- CONT-2024-002 - حرير + بوليستر (في البحر)
    -- ═══════════════════════════════════════════════════════════════
    
    v_shipment_turkey_id := gen_random_uuid();
    
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, origin_port, destination_port,
        order_date, shipping_date, expected_arrival_date,
        status,
        goods_currency, goods_exchange_rate,
        provisional_goods_cost,
        total_expected_costs,
        cost_allocation_method, is_cost_finalized,
        notes
    )
    VALUES (
        v_shipment_turkey_id, v_tenant_id, v_company_id, v_branch_id,
        'SHIP-2024-002', 'CONT-2024-002', 'BL-TUR-2024-002',
        v_supplier_turkey_id, 'Turkey', 'Mersin Port', 'Odesa Port',
        '2024-02-01', '2024-02-05', '2024-02-20',
        'in_transit',
        'USD', 1,
        35000.00,
        7500.00,
        'by_value', false,
        'كونتينر حرير وبوليستر من تركيا - بالطريق 🚢'
    )
    ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'in_transit';
    
    -- بنود الكونتينر الثاني
    v_item_turkey_silk_white_id := gen_random_uuid();
    v_item_turkey_silk_cream_id := gen_random_uuid();
    v_item_turkey_poly_red_id := gen_random_uuid();
    v_item_turkey_poly_navy_id := gen_random_uuid();
    
    INSERT INTO shipment_items (id, tenant_id, shipment_id, material_id, color_id, item_description, expected_rolls, expected_quantity, unit, unit_price, total_price, provisional_unit_cost)
    VALUES 
        (v_item_turkey_silk_white_id, v_tenant_id, v_shipment_turkey_id, v_mat_silk_natural_id, v_color_white_id, 'حرير طبيعي - أبيض', 5, 250, 'meter', 50.00, 12500.00, 60.71),
        (v_item_turkey_silk_cream_id, v_tenant_id, v_shipment_turkey_id, v_mat_silk_natural_id, v_color_cream_id, 'حرير طبيعي - كريمي', 4, 200, 'meter', 50.00, 10000.00, 60.71),
        (v_item_turkey_poly_red_id, v_tenant_id, v_shipment_turkey_id, v_mat_poly_satin_id, v_color_red_id, 'بوليستر ساتان - أحمر', 8, 640, 'meter', 12.50, 8000.00, 15.18),
        (v_item_turkey_poly_navy_id, v_tenant_id, v_shipment_turkey_id, v_mat_poly_satin_id, v_color_navy_id, 'بوليستر ساتان - كحلي', 6, 480, 'meter', 12.50, 6000.00, 15.18)
    ON CONFLICT DO NOTHING;
    
    -- مصاريف الكونتينر الثاني (جزئية - بعضها متوقع)
    INSERT INTO shipment_costs (tenant_id, company_id, shipment_id, cost_type, vendor_id, vendor_name, description, expected_amount, expected_currency, expected_notes, actual_amount, actual_currency, invoice_status, invoice_number, invoice_date, payment_status, paid_amount)
    VALUES 
        (v_tenant_id, v_company_id, v_shipment_turkey_id, 'freight', v_shipping_company_id, 'ساشا للشحن البحري', 'شحن بحري من مرسين إلى أوديسا', 4000.00, 'USD', 'اتفاق شفهي مع ساشا', 4000.00, 'USD', 'invoiced', 'INV-SASHA-2024-002', '2024-02-05', 'paid', 4000.00),
        (v_tenant_id, v_company_id, v_shipment_turkey_id, 'customs_duty', v_customs_agent_id, 'شركة التخليص الجمركي الموحدة', 'رسوم جمركية متوقعة 8%', 2000.00, 'UAH', 'تقدير مبدئي - سيتم التأكد عند الوصول', NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0),
        (v_tenant_id, v_company_id, v_shipment_turkey_id, 'taxes', NULL, 'ضرائب الاستيراد', 'ضريبة VAT متوقعة', 1200.00, 'UAH', 'تقدير 6%', NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0),
        (v_tenant_id, v_company_id, v_shipment_turkey_id, 'insurance', v_insurance_company_id, 'شركة التأمين الدولية للشحن', 'تأمين بحري', 350.00, 'USD', NULL, 350.00, 'USD', 'invoiced', 'INV-ICI-2024-002', '2024-02-05', 'paid', 350.00),
        (v_tenant_id, v_company_id, v_shipment_turkey_id, 'transport', v_transport_company_id, 'شركة النقل السريع', 'نقل من الميناء للمستودع', 450.00, 'UAH', 'تقدير مبدئي', NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. الكونتينر الثالث: من الهند - في الجمارك
    -- CONT-2024-003 - كتان (وصل ويُخلص جمركياً)
    -- ═══════════════════════════════════════════════════════════════
    
    v_shipment_india_id := gen_random_uuid();
    
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, origin_port, destination_port,
        order_date, shipping_date, expected_arrival_date, actual_arrival_date,
        status,
        goods_currency, goods_exchange_rate,
        provisional_goods_cost,
        total_expected_costs,
        cost_allocation_method, is_cost_finalized,
        notes
    )
    VALUES (
        v_shipment_india_id, v_tenant_id, v_company_id, v_branch_id,
        'SHIP-2024-003', 'CONT-2024-003', 'BL-IND-2024-003',
        v_supplier_india_id, 'India', 'Mumbai Port', 'Odesa Port',
        '2024-01-20', '2024-01-25', '2024-02-15', '2024-02-14',
        'customs',
        'USD', 1,
        18000.00,
        5200.00,
        'by_quantity', false,
        'كونتينر كتان من الهند - في الجمارك حالياً'
    )
    ON CONFLICT (tenant_id, shipment_number) DO UPDATE SET status = 'customs';
    
    -- بنود الكونتينر الثالث
    v_item_india_linen_beige_id := gen_random_uuid();
    v_item_india_linen_gray_id := gen_random_uuid();
    
    INSERT INTO shipment_items (id, tenant_id, shipment_id, material_id, color_id, item_description, expected_rolls, expected_quantity, unit, unit_price, total_price, provisional_unit_cost)
    VALUES 
        (v_item_india_linen_beige_id, v_tenant_id, v_shipment_india_id, v_mat_linen_100_id, v_color_beige_id, 'كتان طبيعي 100% - بيج', 12, 1000, 'meter', 10.00, 10000.00, 12.89),
        (v_item_india_linen_gray_id, v_tenant_id, v_shipment_india_id, v_mat_linen_100_id, v_color_gray_id, 'كتان طبيعي 100% - رمادي', 10, 800, 'meter', 10.00, 8000.00, 12.89)
    ON CONFLICT DO NOTHING;
    
    -- مصاريف الكونتينر الثالث (جزئية - وصل ويُخلص)
    INSERT INTO shipment_costs (tenant_id, company_id, shipment_id, cost_type, vendor_id, vendor_name, description, expected_amount, expected_currency, expected_notes, actual_amount, actual_currency, actual_amount_in_base, invoice_status, invoice_number, invoice_date, payment_status, paid_amount, paid_date)
    VALUES 
        (v_tenant_id, v_company_id, v_shipment_india_id, 'freight', v_shipping_company_id, 'ساشا للشحن البحري', 'شحن بحري من مومباي إلى أوديسا', 3500.00, 'USD', NULL, 3600.00, 'USD', 3600.00, 'invoiced', 'INV-SASHA-2024-003', '2024-02-14', 'paid', 3600.00, '2024-02-15'),
        (v_tenant_id, v_company_id, v_shipment_india_id, 'customs_duty', v_customs_agent_id, 'شركة التخليص الجمركي الموحدة', 'رسوم جمركية - جاري التخليص', 1200.00, 'UAH', 'تقدير أولي', NULL, NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0, NULL),
        (v_tenant_id, v_company_id, v_shipment_india_id, 'taxes', NULL, 'ضرائب الاستيراد', 'ضريبة VAT', 800.00, 'UAH', 'تقدير 6%', NULL, NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0, NULL),
        (v_tenant_id, v_company_id, v_shipment_india_id, 'insurance', v_insurance_company_id, 'شركة التأمين الدولية للشحن', 'تأمين بحري', 250.00, 'USD', NULL, 250.00, 'USD', 250.00, 'invoiced', 'INV-ICI-2024-003', '2024-01-25', 'paid', 250.00, '2024-01-27'),
        (v_tenant_id, v_company_id, v_shipment_india_id, 'transport', v_transport_company_id, 'شركة النقل السريع', 'نقل من الميناء للمستودع', 400.00, 'UAH', 'سيتم بعد التخليص', NULL, NULL, NULL, 'expected', NULL, NULL, 'unpaid', 0, NULL)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════════════════════
    -- تحديث إجماليات المصاريف للشحنات
    -- ═══════════════════════════════════════════════════════════════
    
    -- Update total costs for each shipment
    UPDATE shipments s SET
        total_expected_costs = (
            SELECT COALESCE(SUM(COALESCE(expected_amount, 0)), 0)
            FROM shipment_costs sc
            WHERE sc.shipment_id = s.id
            AND sc.invoice_status != 'cancelled'
        ),
        total_actual_costs = (
            SELECT COALESCE(SUM(COALESCE(actual_amount, 0)), 0)
            FROM shipment_costs sc
            WHERE sc.shipment_id = s.id
            AND sc.invoice_status = 'invoiced'
        )
    WHERE s.tenant_id = v_tenant_id;
    
    -- Update total landed cost for finalized shipments
    UPDATE shipments SET
        total_landed_cost = final_goods_cost + total_actual_costs
    WHERE is_cost_finalized = true
    AND tenant_id = v_tenant_id;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Shipments and containers created successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - CONT-2024-001 (China): % - RECEIVED & FINALIZED', v_shipment_china_id;
    RAISE NOTICE '   - CONT-2024-002 (Turkey): % - IN TRANSIT', v_shipment_turkey_id;
    RAISE NOTICE '   - CONT-2024-003 (India): % - CUSTOMS', v_shipment_india_id;
    
END $$;
