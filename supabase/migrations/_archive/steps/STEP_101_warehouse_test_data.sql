-- ═══════════════════════════════════════════════════════════════
-- WAREHOUSE V8 - TEST DATA (بيانات تجريبية شاملة)
-- ═══════════════════════════════════════════════════════════════
-- 
-- يتطلب تنفيذ STEP_100_warehouse_v8_tables.sql أولاً
-- 
-- يتضمن:
-- - مستودعات (3 مستودعات)
-- - مواقع داخل المستودعات
-- - مواد أقمشة (fabric_materials)
-- - رولونات (fabric_rolls)
-- - كونتينرات
-- - حركات مخزون
-- - جرد مخزني
-- - طلبات عينات
-- 
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_wh_main UUID;
    v_wh_branch1 UUID;
    v_wh_branch2 UUID;
    v_loc_a1 UUID;
    v_loc_a2 UUID;
    v_loc_b1 UUID;
    v_material1 UUID;
    v_material2 UUID;
    v_material3 UUID;
    v_roll1 UUID;
    v_roll2 UUID;
    v_roll3 UUID;
BEGIN
    -- Get tenant and company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;

    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE 'No tenant or company found. Skipping test data.';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating test data for tenant: %, company: %', v_tenant_id, v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. WAREHOUSES (المستودعات)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Check if warehouses already exist
    SELECT id INTO v_wh_main FROM warehouses WHERE company_id = v_company_id AND code = 'WH-MAIN' LIMIT 1;
    
    IF v_wh_main IS NULL THEN
        INSERT INTO warehouses (tenant_id, company_id, name_ar, name_en, code, address, is_main, is_active, capacity)
        VALUES (v_tenant_id, v_company_id, 'المستودع الرئيسي', 'Main Warehouse', 'WH-MAIN', 'خاركيف - منطقة صناعية', TRUE, TRUE, 1000)
        RETURNING id INTO v_wh_main;
    END IF;

    SELECT id INTO v_wh_branch1 FROM warehouses WHERE company_id = v_company_id AND code = 'WH-KYIV' LIMIT 1;
    
    IF v_wh_branch1 IS NULL THEN
        INSERT INTO warehouses (tenant_id, company_id, name_ar, name_en, code, address, is_main, is_active, capacity)
        VALUES (v_tenant_id, v_company_id, 'فرع كييف', 'Kyiv Branch', 'WH-KYIV', 'كييف - شارع التجارة', FALSE, TRUE, 500)
        RETURNING id INTO v_wh_branch1;
    END IF;

    SELECT id INTO v_wh_branch2 FROM warehouses WHERE company_id = v_company_id AND code = 'WH-ODESA' LIMIT 1;
    
    IF v_wh_branch2 IS NULL THEN
        INSERT INTO warehouses (tenant_id, company_id, name_ar, name_en, code, address, is_main, is_active, capacity)
        VALUES (v_tenant_id, v_company_id, 'فرع أوديسا', 'Odesa Branch', 'WH-ODESA', 'أوديسا - ميناء تجاري', FALSE, TRUE, 300)
        RETURNING id INTO v_wh_branch2;
    END IF;

    RAISE NOTICE 'Warehouses: Main=%, Kyiv=%, Odesa=%', v_wh_main, v_wh_branch1, v_wh_branch2;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. WAREHOUSE LOCATIONS (مواقع المستودعات)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_wh_main IS NOT NULL THEN
        SELECT id INTO v_loc_a1 FROM warehouse_locations WHERE warehouse_id = v_wh_main AND code = 'A1' LIMIT 1;
        IF v_loc_a1 IS NULL THEN
            INSERT INTO warehouse_locations (tenant_id, company_id, warehouse_id, code, name, location_type, capacity)
            VALUES (v_tenant_id, v_company_id, v_wh_main, 'A1', 'رف A - قسم 1', 'shelf', 100)
            RETURNING id INTO v_loc_a1;
        END IF;

        SELECT id INTO v_loc_a2 FROM warehouse_locations WHERE warehouse_id = v_wh_main AND code = 'A2' LIMIT 1;
        IF v_loc_a2 IS NULL THEN
            INSERT INTO warehouse_locations (tenant_id, company_id, warehouse_id, code, name, location_type, capacity)
            VALUES (v_tenant_id, v_company_id, v_wh_main, 'A2', 'رف A - قسم 2', 'shelf', 100)
            RETURNING id INTO v_loc_a2;
        END IF;

        SELECT id INTO v_loc_b1 FROM warehouse_locations WHERE warehouse_id = v_wh_main AND code = 'B1' LIMIT 1;
        IF v_loc_b1 IS NULL THEN
            INSERT INTO warehouse_locations (tenant_id, company_id, warehouse_id, code, name, location_type, capacity)
            VALUES (v_tenant_id, v_company_id, v_wh_main, 'B1', 'رف B - قسم 1', 'shelf', 150)
            RETURNING id INTO v_loc_b1;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. FABRIC MATERIALS (المواد والأقمشة)
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_material1 FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'FAB-001' LIMIT 1;
    IF v_material1 IS NULL THEN
        INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, category, unit, default_width, weight_per_meter)
        VALUES (v_tenant_id, v_company_id, 'FAB-001', 'قماش قطني أحمر', 'Red Cotton Fabric', 'cotton', 'meter', 150, 200)
        RETURNING id INTO v_material1;
    END IF;

    SELECT id INTO v_material2 FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'FAB-002' LIMIT 1;
    IF v_material2 IS NULL THEN
        INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, category, unit, default_width, weight_per_meter)
        VALUES (v_tenant_id, v_company_id, 'FAB-002', 'قماش حرير أزرق', 'Blue Silk Fabric', 'silk', 'meter', 140, 120)
        RETURNING id INTO v_material2;
    END IF;

    SELECT id INTO v_material3 FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'FAB-003' LIMIT 1;
    IF v_material3 IS NULL THEN
        INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, category, unit, default_width, weight_per_meter)
        VALUES (v_tenant_id, v_company_id, 'FAB-003', 'قماش صوف رمادي', 'Gray Wool Fabric', 'wool', 'meter', 160, 300)
        RETURNING id INTO v_material3;
    END IF;

    RAISE NOTICE 'Materials: %', v_material1;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. FABRIC ROLLS (رولونات الأقمشة)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_material1 IS NOT NULL AND v_wh_main IS NOT NULL THEN
        SELECT id INTO v_roll1 FROM fabric_rolls WHERE tenant_id = v_tenant_id AND roll_number = 'RL-2026-001' LIMIT 1;
        IF v_roll1 IS NULL THEN
            INSERT INTO fabric_rolls (tenant_id, company_id, roll_number, material_id, warehouse_id, location_id, initial_length, current_length, dye_lot, status)
            VALUES (v_tenant_id, v_company_id, 'RL-2026-001', v_material1, v_wh_main, v_loc_a1, 100, 85, 'DL-001', 'available')
            RETURNING id INTO v_roll1;
        END IF;

        SELECT id INTO v_roll2 FROM fabric_rolls WHERE tenant_id = v_tenant_id AND roll_number = 'RL-2026-002' LIMIT 1;
        IF v_roll2 IS NULL THEN
            INSERT INTO fabric_rolls (tenant_id, company_id, roll_number, material_id, warehouse_id, location_id, initial_length, current_length, dye_lot, status)
            VALUES (v_tenant_id, v_company_id, 'RL-2026-002', v_material1, v_wh_main, v_loc_a1, 100, 100, 'DL-001', 'available')
            RETURNING id INTO v_roll2;
        END IF;

        SELECT id INTO v_roll3 FROM fabric_rolls WHERE tenant_id = v_tenant_id AND roll_number = 'RL-2026-003' LIMIT 1;
        IF v_roll3 IS NULL THEN
            INSERT INTO fabric_rolls (tenant_id, company_id, roll_number, material_id, warehouse_id, location_id, initial_length, current_length, dye_lot, status)
            VALUES (v_tenant_id, v_company_id, 'RL-2026-003', v_material2, v_wh_main, v_loc_a2, 80, 72, 'DL-002', 'available')
            RETURNING id INTO v_roll3;
        END IF;
    END IF;

    RAISE NOTICE 'Rolls created: %, %, %', v_roll1, v_roll2, v_roll3;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. INVENTORY MOVEMENTS (حركات المخزون)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_wh_main IS NOT NULL AND v_material1 IS NOT NULL THEN
        -- استلام
        INSERT INTO inventory_movements (tenant_id, company_id, warehouse_id, to_warehouse_id, material_id, roll_id, movement_number, movement_type, movement_date, quantity, reference_number, notes, status, created_by)
        SELECT v_tenant_id, v_company_id, v_wh_main, v_wh_main, v_material1, v_roll1, 'MV-001', 'receipt', CURRENT_DATE - INTERVAL '5 days', 100, 'PO-2026-001', 'استلام من مورد النسيج', 'completed', (SELECT id FROM users LIMIT 1)
        WHERE NOT EXISTS (SELECT 1 FROM inventory_movements WHERE reference_number = 'PO-2026-001');

        -- بيع
        INSERT INTO inventory_movements (tenant_id, company_id, warehouse_id, from_warehouse_id, material_id, roll_id, movement_number, movement_type, movement_date, quantity, reference_number, notes, status, created_by)
        SELECT v_tenant_id, v_company_id, v_wh_main, v_wh_main, v_material1, v_roll1, 'MV-002', 'sale', CURRENT_DATE - INTERVAL '3 days', 15, 'INV-2026-089', 'بيع للعميل', 'completed', (SELECT id FROM users LIMIT 1)
        WHERE NOT EXISTS (SELECT 1 FROM inventory_movements WHERE reference_number = 'INV-2026-089');

        -- مناقلة معلقة
        IF v_wh_branch1 IS NOT NULL THEN
            INSERT INTO inventory_movements (tenant_id, company_id, warehouse_id, from_warehouse_id, to_warehouse_id, material_id, movement_number, movement_type, movement_date, quantity, reference_number, notes, status, created_by)
            SELECT v_tenant_id, v_company_id, v_wh_main, v_wh_main, v_wh_branch1, v_material1, 'MV-003', 'transfer', CURRENT_DATE, 20, 'TR-2026-015', 'مناقلة إلى فرع كييف', 'pending', (SELECT id FROM users LIMIT 1)
            WHERE NOT EXISTS (SELECT 1 FROM inventory_movements WHERE reference_number = 'TR-2026-015');
        END IF;
    END IF;

    RAISE NOTICE 'Inventory movements created';

    -- ═══════════════════════════════════════════════════════════════
    -- 6. CONTAINERS (الكونتينرات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO containers (tenant_id, company_id, container_number, description, arrival_date, status, total_rolls, received_rolls, origin_country, warehouse_id)
    SELECT v_tenant_id, v_company_id, 'C-2026-001', 'كونتينر أقمشة من الصين', CURRENT_DATE - INTERVAL '1 day', 'arrived', 45, 0, 'الصين', v_wh_main
    WHERE NOT EXISTS (SELECT 1 FROM containers WHERE container_number = 'C-2026-001' AND tenant_id = v_tenant_id);

    INSERT INTO containers (tenant_id, company_id, container_number, description, arrival_date, status, total_rolls, received_rolls, origin_country)
    SELECT v_tenant_id, v_company_id, 'C-2026-002', 'كونتينر حرير من تركيا', CURRENT_DATE + INTERVAL '7 days', 'in_transit', 30, 0, 'تركيا'
    WHERE NOT EXISTS (SELECT 1 FROM containers WHERE container_number = 'C-2026-002' AND tenant_id = v_tenant_id);

    RAISE NOTICE 'Containers created';

    -- ═══════════════════════════════════════════════════════════════
    -- 7. STOCK COUNTS (الجرد المخزني)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO stock_counts (tenant_id, company_id, count_number, warehouse_id, count_date, status, total_items, counted_items, match_count, variance_count, completed_date)
    SELECT v_tenant_id, v_company_id, 'SC-2026-001', v_wh_main, CURRENT_DATE - INTERVAL '10 days', 'completed', 25, 25, 23, 2, CURRENT_DATE - INTERVAL '10 days'
    WHERE NOT EXISTS (SELECT 1 FROM stock_counts WHERE count_number = 'SC-2026-001' AND tenant_id = v_tenant_id);

    INSERT INTO stock_counts (tenant_id, company_id, count_number, warehouse_id, count_date, planned_date, status, total_items)
    SELECT v_tenant_id, v_company_id, 'SC-2026-002', v_wh_main, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 'planned', 30
    WHERE NOT EXISTS (SELECT 1 FROM stock_counts WHERE count_number = 'SC-2026-002' AND tenant_id = v_tenant_id);

    RAISE NOTICE 'Stock counts created';

    -- ═══════════════════════════════════════════════════════════════
    -- 8. SAMPLE REQUESTS (طلبات العينات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO sample_requests (tenant_id, company_id, request_number, roll_id, material_id, warehouse_id, request_date, requested_length, status, priority, purpose, requested_by)
    SELECT v_tenant_id, v_company_id, 'SMP-2026-001', v_roll1, v_material1, v_wh_main, CURRENT_DATE - INTERVAL '2 days', 0.5, 'ready', 'normal', 'عرض على العميل', 'سارة'
    WHERE v_roll1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sample_requests WHERE request_number = 'SMP-2026-001' AND tenant_id = v_tenant_id);

    INSERT INTO sample_requests (tenant_id, company_id, request_number, roll_id, material_id, warehouse_id, request_date, requested_length, status, priority, purpose, requested_by)
    SELECT v_tenant_id, v_company_id, 'SMP-2026-002', v_roll3, v_material2, v_wh_main, CURRENT_DATE, 1.0, 'pending', 'high', 'اختبار الجودة', 'أحمد'
    WHERE v_roll3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sample_requests WHERE request_number = 'SMP-2026-002' AND tenant_id = v_tenant_id);

    INSERT INTO sample_requests (tenant_id, company_id, request_number, material_id, warehouse_id, request_date, requested_length, status, priority, purpose, requested_by)
    SELECT v_tenant_id, v_company_id, 'SMP-2026-003', v_material3, v_wh_main, CURRENT_DATE - INTERVAL '5 days', 0.3, 'distributed', 'normal', 'معرض تجاري', 'محمد'
    WHERE v_material3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sample_requests WHERE request_number = 'SMP-2026-003' AND tenant_id = v_tenant_id);

    RAISE NOTICE 'Sample requests created';

    RAISE NOTICE '✅ Test data created successfully!';

END $$;

-- ═══════════════════════════════════════════════════════════════
-- Verification Query
-- ═══════════════════════════════════════════════════════════════
SELECT 'warehouses' as table_name, COUNT(*) as count FROM warehouses
UNION ALL SELECT 'warehouse_locations', COUNT(*) FROM warehouse_locations
UNION ALL SELECT 'fabric_materials', COUNT(*) FROM fabric_materials
UNION ALL SELECT 'fabric_rolls', COUNT(*) FROM fabric_rolls
UNION ALL SELECT 'inventory_movements', COUNT(*) FROM inventory_movements
UNION ALL SELECT 'containers', COUNT(*) FROM containers
UNION ALL SELECT 'stock_counts', COUNT(*) FROM stock_counts
UNION ALL SELECT 'sample_requests', COUNT(*) FROM sample_requests;
