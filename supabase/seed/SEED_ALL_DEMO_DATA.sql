-- ═══════════════════════════════════════════════════════════════════════════
-- 🌍 سكربت شامل — بيانات تجريبية — v4 FINAL
-- Matches ACTUAL production schema (verified from information_schema)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    
    v_receivable_account_id UUID;
    v_payable_account_id UUID;
    
    v_supplier_turkey_id UUID;
    v_supplier_china_id UUID;
    v_supplier_india_id UUID;
    
    v_customer_1_id UUID;
    v_customer_2_id UUID;
    v_customer_3_id UUID;
    v_customer_4_id UUID;
    
    v_cust_group_id UUID;
    v_supp_group_id UUID;
    
    v_shipment_china_id UUID;
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    
    v_item_id UUID;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- 1. tenant + company + branch
    -- ═══════════════════════════════════════════════════════════════
    
    -- ⚡ شركتك الفعلية — hardcoded لتفادي اختيار شركة خاطئة
    v_company_id := '1313232a-6ad3-4002-891c-a9a9e8849a93';
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = v_company_id;
    
    IF v_tenant_id IS NULL THEN
        -- fallback: أول شركة نشطة
        SELECT id INTO v_tenant_id FROM tenants WHERE status = 'active' LIMIT 1;
        SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION '❌ No tenant or company found!';
    END IF;
    
    SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id LIMIT 1;
    
    RAISE NOTICE '📌 Tenant: %', v_tenant_id;
    RAISE NOTICE '📌 Company: %', v_company_id;
    RAISE NOTICE '📌 Branch: %', v_branch_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. وحدات القياس (type, NOT symbol/category)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO units_of_measure (id, tenant_id, code, name_ar, name_en, type)
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'MTR', 'متر', 'Meter', 'length'),
        (gen_random_uuid(), v_tenant_id, 'ROLL', 'رولون', 'Roll', 'length'),
        (gen_random_uuid(), v_tenant_id, 'PCS', 'قطعة', 'Piece', 'quantity'),
        (gen_random_uuid(), v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'weight'),
        (gen_random_uuid(), v_tenant_id, 'GM', 'غرام', 'Gram', 'weight')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    RAISE NOTICE '✅ Units: 5';

    -- ═══════════════════════════════════════════════════════════════
    -- 3. حسابات دليل الحسابات
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_receivable_account_id FROM chart_of_accounts 
        WHERE tenant_id = v_tenant_id AND account_code = '1201' LIMIT 1;
    SELECT id INTO v_payable_account_id FROM chart_of_accounts 
        WHERE tenant_id = v_tenant_id AND account_code = '2101' LIMIT 1;
    
    IF v_receivable_account_id IS NULL THEN
        SELECT id INTO v_receivable_account_id FROM chart_of_accounts 
            WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;
    IF v_payable_account_id IS NULL THEN
        v_payable_account_id := v_receivable_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. مجموعات
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_cust_group_id FROM customer_groups WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_supp_group_id FROM supplier_groups WHERE tenant_id = v_tenant_id LIMIT 1;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. 🏭 الموردين
    -- ACTUAL cols: code, supplier_type, name_ar, name_en, name_ru, name_uk,
    --   email, phone, country, city, group_id, currency, payable_account_id, status
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (tenant_id, company_id, code, supplier_type, 
        name_ar, name_en, name_ru, name_uk,
        email, phone, country, city, group_id, currency, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-003', 'company',
            'مصانع بورصة للحرير والبوليستر', 'Bursa Silk & Polyester Mills',
            'Фабрики Бурсы — Шёлк и Полиэстер', 'Фабрики Бурси — Шовк та Поліестер',
            'export@btm.com.tr', '+902241234567', 'Turkey', 'Bursa',
            v_supp_group_id, 'USD', v_payable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'company',
            'مصانع قوانغدونغ للقطن', 'Guangdong Cotton Mills',
            'Хлопковые фабрики Гуандун', 'Бавовняні фабрики Гуандун',
            'export@gtf.cn', '+8675512345678', 'China', 'Guangzhou',
            v_supp_group_id, 'USD', v_payable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-006', 'company',
            'مصانع مومباي للكتان', 'Mumbai Linen Mills',
            'Льняные фабрики Мумбаи', 'Лляні фабрики Мумбаї',
            'export@mcm.in', '+912212345678', 'India', 'Mumbai',
            v_supp_group_id, 'USD', v_payable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-001-UA', 'company',
            'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill',
            'Украинская текстильная фабрика', 'Українська текстильна фабрика',
            'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv',
            v_supp_group_id, 'UAH', v_payable_account_id, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-007', 'company',
            'شركة الأزرار والإكسسوارات', 'Buttons & Accessories Co.',
            'Компания Пуговиц и Аксессуаров', 'Компанія Ґудзиків та Аксесуарів',
            'info@bac.ua', '+380443333333', 'Ukraine', 'Kyiv',
            v_supp_group_id, 'UAH', v_payable_account_id, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET company_id = EXCLUDED.company_id;
    
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003';
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005';
    SELECT id INTO v_supplier_india_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-006';
    
    RAISE NOTICE '✅ Suppliers: 5 (4 languages)';

    -- ═══════════════════════════════════════════════════════════════
    -- 6. 👥 العملاء
    -- ACTUAL cols: code, name_ar, name_en, name_ru, name_uk,
    --   phone, country, city, group_id, receivable_account_id
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (tenant_id, company_id, code,
        name_ar, name_en, name_ru, name_uk,
        phone, country, city, group_id, receivable_account_id)
    VALUES
        (v_tenant_id, v_company_id, 'CUST-T01',
            'محلات النور للأقمشة', 'Al-Nour Fabrics Store',
            'Магазин тканей Аль-Нур', 'Магазин тканин Аль-Нур',
            '+380501234567', 'Ukraine', 'Odesa',
            v_cust_group_id, v_receivable_account_id),
        (v_tenant_id, v_company_id, 'CUST-T02',
            'مصنع الزهراء للخياطة', 'Al-Zahraa Tailoring Factory',
            'Швейная фабрика Аль-Захраа', 'Швейна фабрика Аль-Захраа',
            '+380671234568', 'Ukraine', 'Kyiv',
            v_cust_group_id, v_receivable_account_id),
        (v_tenant_id, v_company_id, 'CUST-T03',
            'شركة تكستايل بلس للتجارة', 'Textile Plus Trading Co.',
            'Текстиль Плюс Трейдинг', 'Текстиль Плюс Трейдінг',
            '+380931234569', 'Ukraine', 'Kharkiv',
            v_cust_group_id, v_receivable_account_id),
        (v_tenant_id, v_company_id, 'CUST-T04',
            'مجموعة أوروبا فاشن', 'Europa Fashion Group',
            'Европа Фэшн Групп', 'Європа Фешн Груп',
            '+380441234570', 'Ukraine', 'Lviv',
            v_cust_group_id, v_receivable_account_id),
        (v_tenant_id, v_company_id, 'CUST-T05',
            'شركة النسيج الذهبي', 'Golden Textile Co.',
            'Золотой Текстиль', 'Золотий Текстиль',
            '+380441234567', 'Ukraine', 'Kyiv',
            v_cust_group_id, v_receivable_account_id),
        (v_tenant_id, v_company_id, 'CUST-T06',
            'بوتيك الأناقة', 'Elegance Boutique',
            'Бутик Элеганс', 'Бутік Елеганс',
            '+380445678901', 'Ukraine', 'Lviv',
            v_cust_group_id, v_receivable_account_id)
    ON CONFLICT (tenant_id, code) DO UPDATE SET company_id = EXCLUDED.company_id;
    
    SELECT id INTO v_customer_1_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-T01';
    SELECT id INTO v_customer_2_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-T02';
    SELECT id INTO v_customer_3_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-T03';
    SELECT id INTO v_customer_4_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-T04';
    
    RAISE NOTICE '✅ Customers: 6 (4 languages)';

    -- ═══════════════════════════════════════════════════════════════
    -- 7. 🚢 الكونتينرات
    -- ACTUAL shipments cols: shipment_number, container_number, bill_of_lading,
    --   supplier_id, status, origin_country, port_of_loading, port_of_discharge,
    --   shipping_line, vessel_name, etd, eta, container_size, container_type,
    --   total_goods_cost, total_landed_cost, notes
    -- ═══════════════════════════════════════════════════════════════
    
    -- كونتينر الصين (مُستلم)
    v_shipment_china_id := gen_random_uuid();
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, port_of_loading, port_of_discharge,
        shipping_line, vessel_name, etd, eta,
        container_size, container_type,
        total_goods_cost, status, notes
    ) VALUES (
        v_shipment_china_id, v_tenant_id, v_company_id, v_branch_id,
        'SHP-CN-2026-001', 'CONT-CN-2026-001', 'BL-CN-001',
        v_supplier_china_id, 'China', 'Shanghai', 'Odesa',
        'COSCO', 'Tian An', '2026-01-05', '2026-02-10',
        '40', 'HC',
        20000.00, 'received',
        'كونتينر قطن من الصين — تم الاستلام | Cotton from China — Received'
    ) ON CONFLICT (tenant_id, shipment_number) DO NOTHING;
    SELECT id INTO v_shipment_china_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHP-CN-2026-001';
    
    -- كونتينر تركيا (بالطريق)
    v_shipment_turkey_id := gen_random_uuid();
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, port_of_loading, port_of_discharge,
        shipping_line, vessel_name, etd, eta,
        container_size, container_type,
        total_goods_cost, status, notes
    ) VALUES (
        v_shipment_turkey_id, v_tenant_id, v_company_id, v_branch_id,
        'SHP-TR-2026-001', 'CONT-TR-2026-001', 'BL-TR-002',
        v_supplier_turkey_id, 'Turkey', 'Mersin', 'Odesa',
        'MSC', 'MSC Mina', '2026-01-15', '2026-02-15',
        '40', 'HC',
        60100.00, 'shipped',
        'حرير وبوليستر من تركيا — تم الشحن | Silk & Polyester from Turkey — Shipped'
    ) ON CONFLICT (tenant_id, shipment_number) DO NOTHING;
    SELECT id INTO v_shipment_turkey_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHP-TR-2026-001';
    
    -- كونتينر الهند (جمارك)
    v_shipment_india_id := gen_random_uuid();
    INSERT INTO shipments (
        id, tenant_id, company_id, branch_id,
        shipment_number, container_number, bill_of_lading,
        supplier_id, origin_country, port_of_loading, port_of_discharge,
        shipping_line, vessel_name, etd, eta,
        container_size, container_type,
        total_goods_cost, status, notes
    ) VALUES (
        v_shipment_india_id, v_tenant_id, v_company_id, v_branch_id,
        'SHP-IN-2026-001', 'CONT-IN-2026-001', 'BL-IN-003',
        v_supplier_india_id, 'India', 'Mumbai Port', 'Odesa',
        'Maersk', 'Maersk Sealand', '2026-01-20', '2026-02-20',
        '20', 'GP',
        21600.00, 'at_port',
        'كتان من الهند — وصل الميناء | Linen from India — At Port'
    ) ON CONFLICT (tenant_id, shipment_number) DO NOTHING;
    SELECT id INTO v_shipment_india_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHP-IN-2026-001';
    
    RAISE NOTICE '✅ Shipments: 3 (CN✅, TR🚢, IN📋)';

    -- ═══════════════════════════════════════════════════════════════
    -- 8. 📦 بنود الكونتينرات
    -- ACTUAL shipment_items cols: tenant_id, shipment_id, item_description,
    --   expected_quantity, received_quantity, unit, unit_price, total_price,
    --   expected_rolls, received_rolls, reserved_quantity, sold_quantity, notes
    -- ═══════════════════════════════════════════════════════════════
    
    -- ═══ كونتينر تركيا (4 بنود) ═══
    IF v_shipment_turkey_id IS NOT NULL THEN
        INSERT INTO shipment_items (
            tenant_id, shipment_id, item_description,
            expected_quantity, unit, unit_price, total_price,
            expected_rolls, reserved_quantity, sold_quantity, notes
        ) VALUES
        (v_tenant_id, v_shipment_turkey_id,
            'حرير طبيعي — أبيض | Natural Silk — White | Натуральный шёлк — Белый | Натуральний шовк — Білий',
            500, 'meter', 45.00, 22500.00, 25, 0, 0,
            'حرير تركي فاخر'),
        (v_tenant_id, v_shipment_turkey_id,
            'حرير طبيعي — كريمي | Natural Silk — Cream | Натуральный шёлк — Кремовый | Натуральний шовк — Кремовий',
            400, 'meter', 45.00, 18000.00, 20, 0, 0,
            'حرير كريمي — للعبايات'),
        (v_tenant_id, v_shipment_turkey_id,
            'بوليستر ساتان — أحمر | Satin Polyester — Red | Атласный полиэстер — Красный | Атласний поліестер — Червоний',
            800, 'meter', 14.00, 11200.00, 40, 0, 0,
            'بوليستر ساتان لامع'),
        (v_tenant_id, v_shipment_turkey_id,
            'بوليستر ساتان — كحلي | Satin Polyester — Navy | Атласный полиэстер — Тёмно-синий | Атласний поліестер — Темно-синій',
            600, 'meter', 14.00, 8400.00, 30, 0, 0,
            'كحلي كلاسيكي');
        RAISE NOTICE '✅ Turkey items: 4';
    END IF;
    
    -- ═══ كونتينر الهند (2 بند) ═══
    IF v_shipment_india_id IS NOT NULL THEN
        INSERT INTO shipment_items (
            tenant_id, shipment_id, item_description,
            expected_quantity, unit, unit_price, total_price,
            expected_rolls, reserved_quantity, sold_quantity, notes
        ) VALUES
        (v_tenant_id, v_shipment_india_id,
            'كتان طبيعي 100% — بيج | Natural Linen — Beige | Натуральный лён — Бежевый | Натуральний льон — Бежевий',
            1000, 'meter', 12.00, 12000.00, 50, 0, 0,
            'كتان هندي'),
        (v_tenant_id, v_shipment_india_id,
            'كتان طبيعي 100% — رمادي | Natural Linen — Gray | Натуральный лён — Серый | Натуральний льон — Сірий',
            800, 'meter', 12.00, 9600.00, 40, 0, 0,
            'كتان رمادي');
        RAISE NOTICE '✅ India items: 2';
    END IF;
    
    -- ═══ كونتينر الصين (3 بنود — مُستلم) ═══
    IF v_shipment_china_id IS NOT NULL THEN
        INSERT INTO shipment_items (
            tenant_id, shipment_id, item_description,
            expected_quantity, received_quantity, unit, unit_price, total_price,
            expected_rolls, received_rolls, reserved_quantity, sold_quantity, notes
        ) VALUES
        (v_tenant_id, v_shipment_china_id,
            'قطن 100% — أبيض | 100% Cotton — White | Хлопок — Белый | Бавовна — Білий',
            1000, 1000, 'meter', 8.00, 8000.00, 50, 50, 0, 200,
            'تم بيع 200 متر'),
        (v_tenant_id, v_shipment_china_id,
            'قطن 100% — أسود | 100% Cotton — Black | Хлопок — Чёрный | Бавовна — Чорний',
            800, 800, 'meter', 8.00, 6400.00, 40, 40, 0, 300,
            'تم بيع 300 متر'),
        (v_tenant_id, v_shipment_china_id,
            'قطن 100% — بيج | 100% Cotton — Beige | Хлопок — Бежевый | Бавовна — Бежевій',
            700, 700, 'meter', 8.00, 5600.00, 35, 35, 0, 150,
            'تم بيع 150 متر');
        RAISE NOTICE '✅ China items: 3';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 9. 📄 فواتير مشتريات
    -- ACTUAL purchase_invoices cols: invoice_number, invoice_date, due_date,
    --   supplier_id, supplier_name, status, subtotal, tax_amount, total_amount(...cut)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO purchase_invoices (
        tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency,
        subtotal, tax_amount, total_amount, status, notes
    ) VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'PI-TUR-2026-001', '2026-02-01', '2026-03-01',
        v_supplier_turkey_id, 'Bursa Silk Mills / مصانع بورصة', 'USD',
        40500.00, 0, 40500.00, 'approved',
        'فاتورة حرير من تركيا | Turkish silk invoice'
    ) ON CONFLICT (tenant_id, company_id, invoice_number) DO NOTHING;
    
    INSERT INTO purchase_invoices (
        tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency,
        subtotal, tax_amount, total_amount, status, notes
    ) VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'PI-TUR-2026-002', '2026-02-05', '2026-03-05',
        v_supplier_turkey_id, 'Bursa Polyester / بوليستر بورصة', 'USD',
        19600.00, 0, 19600.00, 'approved',
        'فاتورة بوليستر من تركيا | Turkish polyester invoice'
    ) ON CONFLICT (tenant_id, company_id, invoice_number) DO NOTHING;
    
    INSERT INTO purchase_invoices (
        tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency,
        subtotal, tax_amount, total_amount, status, notes
    ) VALUES (
        v_tenant_id, v_company_id, v_branch_id,
        'PI-IND-2026-001', '2026-01-20', '2026-02-20',
        v_supplier_india_id, 'Mumbai Linen Mills / مصانع مومباي', 'USD',
        21600.00, 0, 21600.00, 'approved',
        'فاتورة كتان من الهند | Indian linen invoice'
    ) ON CONFLICT (tenant_id, company_id, invoice_number) DO NOTHING;
    
    RAISE NOTICE '✅ Purchase invoices: 3';

    -- ═══════════════════════════════════════════════════════════════
    -- 10. 🛒 حجوزات ترانزيت
    -- ACTUAL transit_reservations cols: reservation_number, reservation_date,
    --   customer_id, shipment_id, shipment_item_id, product_id,
    --   reserved_quantity, status, currency, notes
    -- NOTE: NO customer_name, NO unit, NO unit_price, NO total_amount,
    --       NO advance_amount, NO advance_received
    -- ═══════════════════════════════════════════════════════════════
    
    -- حجز 1: حرير أبيض → النور (confirmed)
    IF v_customer_1_id IS NOT NULL AND v_shipment_turkey_id IS NOT NULL THEN
        SELECT id INTO v_item_id FROM shipment_items 
            WHERE shipment_id = v_shipment_turkey_id AND item_description ILIKE '%حرير%أبيض%' LIMIT 1;
        
        IF v_item_id IS NOT NULL THEN
            INSERT INTO transit_reservations (
                tenant_id, company_id, branch_id,
                reservation_number, reservation_date,
                customer_id, shipment_id, shipment_item_id,
                reserved_quantity, currency, status, notes
            ) VALUES (
                v_tenant_id, v_company_id, v_branch_id,
                'TR-2026-001', '2026-02-05',
                v_customer_1_id, v_shipment_turkey_id, v_item_id,
                50, 'USD', 'confirmed',
                'حجز 50م حرير أبيض — النور | 50m White silk → Al-Nour | 50м Белый шёлк — Аль-Нур'
            ) ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
            
            UPDATE shipment_items SET reserved_quantity = COALESCE(reserved_quantity,0) + 50 
                WHERE id = v_item_id AND COALESCE(reserved_quantity,0) = 0;
            RAISE NOTICE '✅ Reservation TR-001 (Silk → Al-Nour)';
        END IF;
    END IF;
    
    -- حجز 2: كتان بيج → الزهراء (pending)
    IF v_customer_2_id IS NOT NULL AND v_shipment_india_id IS NOT NULL THEN
        SELECT id INTO v_item_id FROM shipment_items 
            WHERE shipment_id = v_shipment_india_id AND item_description ILIKE '%كتان%بيج%' LIMIT 1;
        
        IF v_item_id IS NOT NULL THEN
            INSERT INTO transit_reservations (
                tenant_id, company_id, branch_id,
                reservation_number, reservation_date,
                customer_id, shipment_id, shipment_item_id,
                reserved_quantity, currency, status, notes
            ) VALUES (
                v_tenant_id, v_company_id, v_branch_id,
                'TR-2026-002', '2026-02-07',
                v_customer_2_id, v_shipment_india_id, v_item_id,
                200, 'USD', 'pending',
                'حجز 200م كتان بيج — الزهراء | 200m Beige linen → Al-Zahraa | 200м Бежевый лён — Аль-Захраа'
            ) ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
            
            UPDATE shipment_items SET reserved_quantity = COALESCE(reserved_quantity,0) + 200
                WHERE id = v_item_id AND COALESCE(reserved_quantity,0) = 0;
            RAISE NOTICE '✅ Reservation TR-002 (Linen → Al-Zahraa)';
        END IF;
    END IF;
    
    -- حجز 3: بوليستر أحمر → أوروبا فاشن (confirmed)
    IF v_customer_4_id IS NOT NULL AND v_shipment_turkey_id IS NOT NULL THEN
        SELECT id INTO v_item_id FROM shipment_items 
            WHERE shipment_id = v_shipment_turkey_id AND item_description ILIKE '%بوليستر%أحمر%' LIMIT 1;
        
        IF v_item_id IS NOT NULL THEN
            INSERT INTO transit_reservations (
                tenant_id, company_id, branch_id,
                reservation_number, reservation_date,
                customer_id, shipment_id, shipment_item_id,
                reserved_quantity, currency, status, notes
            ) VALUES (
                v_tenant_id, v_company_id, v_branch_id,
                'TR-2026-003', '2026-02-10',
                v_customer_4_id, v_shipment_turkey_id, v_item_id,
                300, 'USD', 'confirmed',
                '300م بوليستر أحمر — أوروبا | 300m Red Polyester → Europa | 300м Красный полиэстер — Европа'
            ) ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
            
            UPDATE shipment_items SET reserved_quantity = COALESCE(reserved_quantity,0) + 300
                WHERE id = v_item_id AND COALESCE(reserved_quantity,0) = 0;
            RAISE NOTICE '✅ Reservation TR-003 (Polyester → Europa Fashion)';
        END IF;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ALL DEMO DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    
END $$;

-- ═══════════════════════════════════════
-- VERIFICATION — يظهر في Results
-- ═══════════════════════════════════════

SELECT 'suppliers' AS "البيان", COUNT(*) AS "العدد" FROM suppliers
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL SELECT 'shipment_items', COUNT(*) FROM shipment_items
UNION ALL SELECT 'purchase_invoices', COUNT(*) FROM purchase_invoices
UNION ALL SELECT 'transit_reservations', COUNT(*) FROM transit_reservations
UNION ALL SELECT 'units_of_measure', COUNT(*) FROM units_of_measure
ORDER BY "البيان";
