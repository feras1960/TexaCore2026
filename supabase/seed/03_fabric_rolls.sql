-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: الرولونات (~35 رولون) مربوطة بالكونتينرات
-- Seed: Fabric Rolls linked to Shipments/Containers
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_warehouse_id UUID;
    
    -- الشحنات
    v_shipment_china_id UUID;
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    
    -- بنود الشحنات
    v_item_china_cotton_white_id UUID;
    v_item_china_cotton_black_id UUID;
    v_item_china_cotton_beige_id UUID;
    
    -- الموردين
    v_supplier_china_id UUID;
    v_supplier_turkey_id UUID;
    v_supplier_india_id UUID;
    
    -- المواد
    v_mat_cotton_plain_id UUID;
    v_mat_cotton_twill_id UUID;
    v_mat_poly_satin_id UUID;
    v_mat_silk_natural_id UUID;
    v_mat_linen_100_id UUID;
    
    -- الألوان
    v_color_white_id UUID;
    v_color_black_id UUID;
    v_color_beige_id UUID;
    v_color_navy_id UUID;
    v_color_red_id UUID;
    v_color_cream_id UUID;
    v_color_gray_id UUID;
    
    -- متغيرات مساعدة
    v_roll_counter INT := 0;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على المعرفات الأساسية
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_warehouse_id FROM warehouses WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant أو company. قم بتشغيل البيانات الأساسية أولاً';
    END IF;
    
    -- الشحنات
    SELECT id INTO v_shipment_china_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-001';
    SELECT id INTO v_shipment_turkey_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-002';
    SELECT id INTO v_shipment_india_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-003';
    
    -- الموردين
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005';
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003';
    SELECT id INTO v_supplier_india_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-006';
    
    -- المواد
    SELECT id INTO v_mat_cotton_plain_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'COT-100-PLAIN';
    SELECT id INTO v_mat_cotton_twill_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'COT-100-TWILL';
    SELECT id INTO v_mat_poly_satin_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'POLY-SATIN';
    SELECT id INTO v_mat_silk_natural_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'SILK-NATURAL';
    SELECT id INTO v_mat_linen_100_id FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'LINEN-100';
    
    -- الألوان
    SELECT id INTO v_color_white_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'WHITE';
    SELECT id INTO v_color_black_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLACK';
    SELECT id INTO v_color_beige_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BEIGE';
    SELECT id INTO v_color_navy_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'NAVY';
    SELECT id INTO v_color_red_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'RED';
    SELECT id INTO v_color_cream_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'CREAM';
    SELECT id INTO v_color_gray_id FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'GRAY';
    
    -- بنود الشحنات
    SELECT id INTO v_item_china_cotton_white_id FROM shipment_items WHERE shipment_id = v_shipment_china_id AND color_id = v_color_white_id LIMIT 1;
    SELECT id INTO v_item_china_cotton_black_id FROM shipment_items WHERE shipment_id = v_shipment_china_id AND color_id = v_color_black_id LIMIT 1;
    SELECT id INTO v_item_china_cotton_beige_id FROM shipment_items WHERE shipment_id = v_shipment_china_id AND color_id = v_color_beige_id LIMIT 1;
    
    RAISE NOTICE 'Creating fabric rolls...';
    RAISE NOTICE 'Shipment China: %, Turkey: %, India: %', v_shipment_china_id, v_shipment_turkey_id, v_shipment_india_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. رولونات الكونتينر الأول (الصين) - مُستلمة ومُغلقة
    -- قطن سادة - أبيض (10 رولونات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_rolls (
        tenant_id, company_id, material_id, color_id,
        roll_number, barcode,
        initial_length, current_length, reserved_length,
        width, weight, dye_lot, quality_grade,
        cost_per_meter, total_cost,
        supplier_unit_cost, estimated_landed_cost, final_landed_cost, cost_status,
        warehouse_id, location_code,
        supplier_id, shipment_id, shipment_item_id,
        received_date, status, notes
    )
    VALUES 
        -- قطن سادة أبيض - 10 رولونات
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-001', 'BC-COT-W-001', 100, 85, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', 'رولون قطن سادة أبيض - جودة ممتازة'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-002', 'BC-COT-W-002', 100, 100, 20, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'reserved', 'محجوز جزئياً لعميل'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-003', 'BC-COT-W-003', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-03', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-004', 'BC-COT-W-004', 100, 95, 0, 150, 17.1, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-04', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-005', 'BC-COT-W-005', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-05', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-006', 'BC-COT-W-006', 100, 0, 0, 150, 0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-01-06', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'sold', 'تم بيعه بالكامل'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-007', 'BC-COT-W-007', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-02-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-008', 'BC-COT-W-008', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-02-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-009', 'BC-COT-W-009', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'B', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-02-03', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', 'جودة B - عيب بسيط'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_white_id, 'ROL-COT-W-010', 'BC-COT-W-010', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-A', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-02-04', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_white_id, '2024-02-08', 'available', NULL),
        
        -- قطن سادة أسود - 8 رولونات
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-001', 'BC-COT-B-001', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-03-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-002', 'BC-COT-B-002', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-03-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-003', 'BC-COT-B-003', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-03-03', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-004', 'BC-COT-B-004', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-03-04', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-005', 'BC-COT-B-005', 100, 70, 0, 150, 12.6, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-03-05', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', 'تم قص 30 متر'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-006', 'BC-COT-B-006', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-04-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-007', 'BC-COT-B-007', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-04-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_black_id, 'ROL-COT-B-008', 'BC-COT-B-008', 100, 100, 30, 150, 18.0, 'DL-CHN-2024-B', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-04-03', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_black_id, '2024-02-08', 'reserved', 'محجوز 30 متر'),
        
        -- قطن سادة بيج - 7 رولونات
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-001', 'BC-COT-G-001', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-05-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-002', 'BC-COT-G-002', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-05-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-003', 'BC-COT-G-003', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-05-03', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-004', 'BC-COT-G-004', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-05-04', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-005', 'BC-COT-G-005', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-05-05', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-006', 'BC-COT-G-006', 120, 120, 0, 150, 21.6, 'DL-CHN-2024-C', 'A', 14.22, 1706.40, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-06-01', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', 'رولون كبير 120 متر'),
        (v_tenant_id, v_company_id, v_mat_cotton_plain_id, v_color_beige_id, 'ROL-COT-G-007', 'BC-COT-G-007', 100, 100, 0, 150, 18.0, 'DL-CHN-2024-C', 'A', 14.22, 1422.00, 10.00, 13.92, 14.22, 'finalized', v_warehouse_id, 'A-06-02', v_supplier_china_id, v_shipment_china_id, v_item_china_cotton_beige_id, '2024-02-08', 'available', NULL)
    ON CONFLICT (tenant_id, roll_number) DO NOTHING;
    
    v_roll_counter := 25;
    RAISE NOTICE 'Created % rolls from China shipment', v_roll_counter;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. رولونات مخزون موجود (بدون شحنة) - مواد متنوعة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_rolls (
        tenant_id, company_id, material_id, color_id,
        roll_number, barcode,
        initial_length, current_length, reserved_length,
        width, weight, dye_lot, quality_grade,
        cost_per_meter, total_cost,
        supplier_unit_cost, estimated_landed_cost, final_landed_cost, cost_status,
        warehouse_id, location_code,
        supplier_id,
        received_date, status, notes
    )
    VALUES 
        -- بوليستر ساتان - مخزون قديم
        (v_tenant_id, v_company_id, v_mat_poly_satin_id, v_color_red_id, 'ROL-POLY-R-001', 'BC-POLY-R-001', 80, 60, 0, 150, 9.6, 'DL-TUR-2023-X', 'A', 12.50, 1000.00, 9.00, NULL, 12.50, 'finalized', v_warehouse_id, 'B-01-01', v_supplier_turkey_id, '2023-12-15', 'available', 'مخزون قديم'),
        (v_tenant_id, v_company_id, v_mat_poly_satin_id, v_color_navy_id, 'ROL-POLY-N-001', 'BC-POLY-N-001', 80, 80, 0, 150, 9.6, 'DL-TUR-2023-X', 'A', 12.50, 1000.00, 9.00, NULL, 12.50, 'finalized', v_warehouse_id, 'B-01-02', v_supplier_turkey_id, '2023-12-15', 'available', 'مخزون قديم'),
        (v_tenant_id, v_company_id, v_mat_poly_satin_id, v_color_white_id, 'ROL-POLY-W-001', 'BC-POLY-W-001', 80, 40, 0, 150, 4.8, 'DL-TUR-2023-X', 'A', 12.50, 1000.00, 9.00, NULL, 12.50, 'finalized', v_warehouse_id, 'B-01-03', v_supplier_turkey_id, '2023-12-15', 'available', 'نصف مباع'),
        
        -- حرير طبيعي - مخزون قديم
        (v_tenant_id, v_company_id, v_mat_silk_natural_id, v_color_cream_id, 'ROL-SILK-C-001', 'BC-SILK-C-001', 50, 50, 0, 140, 5.0, 'DL-CHN-2023-S', 'A', 55.00, 2750.00, 45.00, NULL, 55.00, 'finalized', v_warehouse_id, 'C-01-01', v_supplier_china_id, '2023-11-20', 'available', 'حرير فاخر'),
        (v_tenant_id, v_company_id, v_mat_silk_natural_id, v_color_white_id, 'ROL-SILK-W-001', 'BC-SILK-W-001', 50, 30, 0, 140, 3.0, 'DL-CHN-2023-S', 'A', 55.00, 2750.00, 45.00, NULL, 55.00, 'finalized', v_warehouse_id, 'C-01-02', v_supplier_china_id, '2023-11-20', 'available', 'تم قص 20 متر'),
        
        -- كتان - مخزون قديم
        (v_tenant_id, v_company_id, v_mat_linen_100_id, v_color_beige_id, 'ROL-LINEN-G-001', 'BC-LINEN-G-001', 60, 60, 0, 150, 12.0, 'DL-IND-2023-L', 'A', 13.00, 780.00, 10.00, NULL, 13.00, 'finalized', v_warehouse_id, 'D-01-01', v_supplier_india_id, '2023-10-10', 'available', 'كتان فاخر'),
        (v_tenant_id, v_company_id, v_mat_linen_100_id, v_color_gray_id, 'ROL-LINEN-GR-001', 'BC-LINEN-GR-001', 60, 45, 0, 150, 9.0, 'DL-IND-2023-L', 'A', 13.00, 780.00, 10.00, NULL, 13.00, 'finalized', v_warehouse_id, 'D-01-02', v_supplier_india_id, '2023-10-10', 'available', 'تم قص 15 متر'),
        
        -- قطن تويل - مخزون قديم
        (v_tenant_id, v_company_id, v_mat_cotton_twill_id, v_color_navy_id, 'ROL-TWILL-N-001', 'BC-TWILL-N-001', 70, 70, 0, 150, 15.4, 'DL-IND-2023-T', 'A', 14.00, 980.00, 11.00, NULL, 14.00, 'finalized', v_warehouse_id, 'E-01-01', v_supplier_india_id, '2023-09-05', 'available', 'تويل كحلي'),
        (v_tenant_id, v_company_id, v_mat_cotton_twill_id, v_color_beige_id, 'ROL-TWILL-G-001', 'BC-TWILL-G-001', 70, 70, 0, 150, 15.4, 'DL-IND-2023-T', 'A', 14.00, 980.00, 11.00, NULL, 14.00, 'finalized', v_warehouse_id, 'E-01-02', v_supplier_india_id, '2023-09-05', 'available', 'تويل بيج'),
        (v_tenant_id, v_company_id, v_mat_cotton_twill_id, v_color_black_id, 'ROL-TWILL-B-001', 'BC-TWILL-B-001', 70, 55, 15, 150, 12.1, 'DL-IND-2023-T', 'A', 14.00, 980.00, 11.00, NULL, 14.00, 'finalized', v_warehouse_id, 'E-01-03', v_supplier_india_id, '2023-09-05', 'reserved', 'محجوز 15 متر')
    ON CONFLICT (tenant_id, roll_number) DO NOTHING;
    
    v_roll_counter := v_roll_counter + 10;
    RAISE NOTICE 'Created additional % rolls (old stock)', 10;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Fabric rolls created successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Total rolls created: %', v_roll_counter;
    RAISE NOTICE '   - From China shipment (finalized): 25';
    RAISE NOTICE '   - Old stock (no shipment): 10';
    
END $$;
