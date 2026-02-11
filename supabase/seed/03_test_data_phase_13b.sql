-- ═══════════════════════════════════════════════════════════════════════════
-- بيانات تجريبية متعددة اللغات (AR / EN / RU / UK)
-- Multilingual Test Data: Purchase Invoices + Container Items + Transit Reservations
-- Phase 13B-3 Testing Data
-- Date: 2026-02-11
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ Prerequisites:
--   1. 02_shipments_containers.sql (Containers data)
--   2. 20260211_shipment_items_enhancements.sql (New columns)
--   3. 20260211_transit_reservations.sql (Reservations table)
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 0: Add multilingual columns (name_ru, name_uk) if missing
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS name_ru VARCHAR(200),
    ADD COLUMN IF NOT EXISTS name_uk VARCHAR(200);

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS name_ru VARCHAR(200),
    ADD COLUMN IF NOT EXISTS name_uk VARCHAR(200);

ALTER TABLE shipment_items
    ADD COLUMN IF NOT EXISTS item_description_en VARCHAR(500),
    ADD COLUMN IF NOT EXISTS item_description_ru VARCHAR(500),
    ADD COLUMN IF NOT EXISTS item_description_uk VARCHAR(500);

COMMENT ON COLUMN customers.name_ru IS 'Имя клиента на русском — Ім''я клієнта російською';
COMMENT ON COLUMN customers.name_uk IS 'Ім''я клієнта українською — اسم العميل بالأوكرانية';
COMMENT ON COLUMN suppliers.name_ru IS 'Название поставщика на русском';
COMMENT ON COLUMN suppliers.name_uk IS 'Назва постачальника українською';

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
-- MAIN BLOCK
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_branch_id UUID;
    
    -- Suppliers
    v_supplier_china_id UUID;
    v_supplier_turkey_id UUID;
    v_supplier_india_id UUID;
    
    -- Customers
    v_customer_1_id UUID;
    v_customer_2_id UUID;
    v_customer_3_id UUID;
    v_customer_4_id UUID;
    
    -- Shipments
    v_shipment_turkey_id UUID;
    v_shipment_india_id UUID;
    v_shipment_china_id UUID;
    
    -- Purchase Invoices
    v_inv_turkey_silk_id UUID;
    v_inv_turkey_poly_id UUID;
    v_inv_india_linen_id UUID;
    
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- Get base IDs
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    SELECT id INTO v_branch_id FROM branches WHERE tenant_id = v_tenant_id AND company_id = v_company_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'No tenant or company found! Run base seeds first.';
    END IF;
    
    -- Suppliers
    SELECT id INTO v_supplier_china_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-005';
    SELECT id INTO v_supplier_turkey_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-003';
    SELECT id INTO v_supplier_india_id FROM suppliers WHERE tenant_id = v_tenant_id AND code = 'SUPP-006';
    
    -- Shipments
    SELECT id INTO v_shipment_turkey_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-002';
    SELECT id INTO v_shipment_india_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-003';
    SELECT id INTO v_shipment_china_id FROM shipments WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-001';
    
    -- Safety check
    IF v_shipment_turkey_id IS NULL AND v_shipment_india_id IS NULL AND v_shipment_china_id IS NULL THEN
        RAISE NOTICE '⚠️ No containers found! Run seed/02_shipments_containers.sql first.';
        RETURN;
    END IF;

    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📦 Tenant: %, Company: %', v_tenant_id, v_company_id;
    RAISE NOTICE '🚢 Turkey: %, India: %, China: %', v_shipment_turkey_id, v_shipment_india_id, v_shipment_china_id;
    RAISE NOTICE '═══════════════════════════════════════════════════════';

    -- ═══════════════════════════════════════════════════════════════
    -- 1. UPDATE SUPPLIERS — Add multilingual names
    -- ═══════════════════════════════════════════════════════════════

    IF v_supplier_china_id IS NOT NULL THEN
        UPDATE suppliers SET
            name_ru = 'Фабрики Гуандун — Хлопок',
            name_uk = 'Фабрики Гуандун — Бавовна'
        WHERE id = v_supplier_china_id;
    END IF;

    IF v_supplier_turkey_id IS NOT NULL THEN
        UPDATE suppliers SET
            name_ru = 'Фабрики Бурсы — Шёлк и Полиэстер',
            name_uk = 'Фабрики Бурси — Шовк та Поліестер'
        WHERE id = v_supplier_turkey_id;
    END IF;

    IF v_supplier_india_id IS NOT NULL THEN
        UPDATE suppliers SET
            name_ru = 'Фабрики Мумбаи — Лён',
            name_uk = 'Фабрики Мумбаї — Льон'
        WHERE id = v_supplier_india_id;
    END IF;

    RAISE NOTICE '✅ Suppliers updated with RU/UK names';

    -- ═══════════════════════════════════════════════════════════════
    -- 2. CREATE MULTILINGUAL CUSTOMERS (4 languages)
    -- ═══════════════════════════════════════════════════════════════

    -- Customer 1: Arabic-language customer (fabric shop)
    SELECT id INTO v_customer_1_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-001';
    IF v_customer_1_id IS NULL THEN
        INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, phone, status, credit_limit, balance, country, city)
        VALUES (v_tenant_id, v_company_id, 'CUST-TEST-001',
            'محلات النور للأقمشة',
            'Al-Nour Fabrics Store',
            'Магазин тканей Ан-Нур',
            'Магазин тканин Ан-Нур',
            '+380501234567', 'active', 50000, 0, 'Ukraine', 'Odesa'
        ) ON CONFLICT DO NOTHING;
        SELECT id INTO v_customer_1_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-001';
    ELSE
        UPDATE customers SET
            name_en = 'Al-Nour Fabrics Store',
            name_ru = 'Магазин тканей Ан-Нур',
            name_uk = 'Магазин тканин Ан-Нур'
        WHERE id = v_customer_1_id;
    END IF;

    -- Customer 2: Ukrainian-language customer (tailoring factory)
    SELECT id INTO v_customer_2_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-002';
    IF v_customer_2_id IS NULL THEN
        INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, phone, status, credit_limit, balance, country, city)
        VALUES (v_tenant_id, v_company_id, 'CUST-TEST-002',
            'مصنع الزهراء للخياطة',
            'Al-Zahraa Tailoring Factory',
            'Швейная фабрика Аз-Захра',
            'Швейна фабрика Аз-Захра',
            '+380671234568', 'active', 30000, 0, 'Ukraine', 'Kyiv'
        ) ON CONFLICT DO NOTHING;
        SELECT id INTO v_customer_2_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-002';
    ELSE
        UPDATE customers SET
            name_en = 'Al-Zahraa Tailoring Factory',
            name_ru = 'Швейная фабрика Аз-Захра',
            name_uk = 'Швейна фабрика Аз-Захра'
        WHERE id = v_customer_2_id;
    END IF;

    -- Customer 3: Russian-language customer (wholesale)
    SELECT id INTO v_customer_3_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-003';
    IF v_customer_3_id IS NULL THEN
        INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, phone, status, credit_limit, balance, country, city)
        VALUES (v_tenant_id, v_company_id, 'CUST-TEST-003',
            'شركة تكستايل بلس للتجارة',
            'Textile Plus Trading Co.',
            'Текстиль Плюс Трейдинг',
            'Текстиль Плюс Трейдінг',
            '+380931234569', 'active', 80000, 5200, 'Ukraine', 'Kharkiv'
        ) ON CONFLICT DO NOTHING;
        SELECT id INTO v_customer_3_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-003';
    ELSE
        UPDATE customers SET
            name_en = 'Textile Plus Trading Co.',
            name_ru = 'Текстиль Плюс Трейдинг',
            name_uk = 'Текстиль Плюс Трейдінг'
        WHERE id = v_customer_3_id;
    END IF;

    -- Customer 4: English-language customer (international brand)
    SELECT id INTO v_customer_4_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-004';
    IF v_customer_4_id IS NULL THEN
        INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, phone, status, credit_limit, balance, country, city, is_b2b, b2b_approved)
        VALUES (v_tenant_id, v_company_id, 'CUST-TEST-004',
            'مجموعة أوروبا فاشن',
            'Europa Fashion Group',
            'Группа Европа Фэшн',
            'Група Європа Фешн',
            '+380441234570', 'active', 120000, 12500, 'Ukraine', 'Lviv',
            true, true
        ) ON CONFLICT DO NOTHING;
        SELECT id INTO v_customer_4_id FROM customers WHERE tenant_id = v_tenant_id AND code = 'CUST-TEST-004';
    ELSE
        UPDATE customers SET
            name_en = 'Europa Fashion Group',
            name_ru = 'Группа Европа Фэшн',
            name_uk = 'Група Європа Фешн'
        WHERE id = v_customer_4_id;
    END IF;

    RAISE NOTICE '✅ 4 customers created/updated (AR/EN/RU/UK)';

    -- ═══════════════════════════════════════════════════════════════
    -- 3. PURCHASE INVOICES (multilingual notes)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Invoice: Turkish silk
    v_inv_turkey_silk_id := gen_random_uuid();
    INSERT INTO purchase_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency, exchange_rate,
        subtotal, tax_amount, total_amount,
        status, notes
    ) VALUES (
        v_inv_turkey_silk_id, v_tenant_id, v_company_id, v_branch_id,
        'PI-TUR-2024-001', '2024-02-01', '2024-03-01',
        v_supplier_turkey_id,
        'Bursa Silk & Polyester Mills / مصانع بورصة للحرير',
        'USD', 1,
        22500.00, 0, 22500.00,
        'approved',
        'AR: فاتورة حرير طبيعي وبوليستر ساتان — مصانع بورصة' || chr(10) ||
        'EN: Natural silk and satin polyester invoice — Bursa Mills' || chr(10) ||
        'RU: Счёт на натуральный шёлк и атласный полиэстер — Фабрики Бурсы' || chr(10) ||
        'UK: Рахунок на натуральний шовк та атласний поліестер — Фабрики Бурси'
    ) ON CONFLICT DO NOTHING;
    
    -- Invoice: Turkish polyester (additional)
    v_inv_turkey_poly_id := gen_random_uuid();
    INSERT INTO purchase_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency, exchange_rate,
        subtotal, tax_amount, total_amount,
        status, notes
    ) VALUES (
        v_inv_turkey_poly_id, v_tenant_id, v_company_id, v_branch_id,
        'PI-TUR-2024-002', '2024-02-01', '2024-03-01',
        v_supplier_turkey_id,
        'Bursa Polyester Division / قسم البوليستر — بورصة',
        'USD', 1,
        14000.00, 0, 14000.00,
        'approved',
        'AR: فاتورة بوليستر ساتان إضافية — ألوان أحمر وكحلي' || chr(10) ||
        'EN: Additional satin polyester invoice — Red and Navy colors' || chr(10) ||
        'RU: Дополнительный счёт на атласный полиэстер — Красный и Тёмно-синий' || chr(10) ||
        'UK: Додатковий рахунок на атласний поліестер — Червоний та Темно-синій'
    ) ON CONFLICT DO NOTHING;
    
    -- Invoice: Indian linen
    v_inv_india_linen_id := gen_random_uuid();
    INSERT INTO purchase_invoices (
        id, tenant_id, company_id, branch_id,
        invoice_number, invoice_date, due_date,
        supplier_id, supplier_name, currency, exchange_rate,
        subtotal, tax_amount, total_amount,
        status, notes
    ) VALUES (
        v_inv_india_linen_id, v_tenant_id, v_company_id, v_branch_id,
        'PI-IND-2024-001', '2024-01-20', '2024-02-20',
        v_supplier_india_id,
        'Mumbai Linen Mills / مصانع مومباي للكتان',
        'USD', 1,
        18000.00, 0, 18000.00,
        'approved',
        'AR: فاتورة كتان طبيعي 100% — بيج ورمادي' || chr(10) ||
        'EN: 100% natural linen invoice — Beige and Gray' || chr(10) ||
        'RU: Счёт на 100% натуральный лён — Бежевый и Серый' || chr(10) ||
        'UK: Рахунок на 100% натуральний льон — Бежевий та Сірий'
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ 3 purchase invoices created (multilingual notes)';

    -- ═══════════════════════════════════════════════════════════════
    -- 4. UPDATE TURKEY CONTAINER ITEMS (4 languages)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_shipment_turkey_id IS NOT NULL THEN
        -- Natural Silk — White
        UPDATE shipment_items SET
            supplier_id = v_supplier_turkey_id,
            supplier_name = 'Bursa Silk Mills / مصانع بورصة للحرير',
            purchase_invoice_id = v_inv_turkey_silk_id,
            invoice_number = 'PI-TUR-2024-001',
            material_code = 'SILK-NAT',
            color_name = 'أبيض / White / Белый / Білий',
            item_description = 'حرير طبيعي — أبيض | Natural Silk — White',
            item_description_en = 'Natural Silk — White (Bursa)',
            item_description_ru = 'Натуральный шёлк — Белый (Бурса)',
            item_description_uk = 'Натуральний шовк — Білий (Бурса)',
            weight_kg = 62.5,
            expected_sell_price = 75.00,
            reserved_quantity = 50,
            sold_quantity = 0,
            notes = 'AR: حرير تركي فاخر من بورصة — جودة ممتازة' || chr(10) ||
                    'EN: Premium Turkish silk from Bursa — Excellent quality' || chr(10) ||
                    'RU: Элитный турецкий шёлк из Бурсы — Отличное качество' || chr(10) ||
                    'UK: Елітний турецький шовк з Бурси — Відмінна якість'
        WHERE shipment_id = v_shipment_turkey_id 
          AND item_description ILIKE '%حرير%أبيض%';
        
        -- Natural Silk — Cream
        UPDATE shipment_items SET
            supplier_id = v_supplier_turkey_id,
            supplier_name = 'Bursa Silk Mills / مصانع بورصة للحرير',
            purchase_invoice_id = v_inv_turkey_silk_id,
            invoice_number = 'PI-TUR-2024-001',
            material_code = 'SILK-NAT',
            color_name = 'كريمي / Cream / Кремовый / Кремовий',
            item_description = 'حرير طبيعي — كريمي | Natural Silk — Cream',
            item_description_en = 'Natural Silk — Cream (Bursa)',
            item_description_ru = 'Натуральный шёлк — Кремовый (Бурса)',
            item_description_uk = 'Натуральний шовк — Кремовий (Бурса)',
            weight_kg = 50.0,
            expected_sell_price = 75.00,
            reserved_quantity = 0,
            sold_quantity = 0,
            notes = 'AR: حرير كريمي — مناسب للعبايات الفاخرة' || chr(10) ||
                    'EN: Cream silk — suitable for premium abayas' || chr(10) ||
                    'RU: Кремовый шёлк — подходит для элитных абай' || chr(10) ||
                    'UK: Кремовий шовк — підходить для елітних абай'
        WHERE shipment_id = v_shipment_turkey_id 
          AND item_description ILIKE '%حرير%كريم%';
        
        -- Satin Polyester — Red
        UPDATE shipment_items SET
            supplier_id = v_supplier_turkey_id,
            supplier_name = 'Bursa Polyester / بوليستر بورصة',
            purchase_invoice_id = v_inv_turkey_poly_id,
            invoice_number = 'PI-TUR-2024-002',
            material_code = 'POLY-SAT',
            color_name = 'أحمر / Red / Красный / Червоний',
            item_description = 'بوليستر ساتان — أحمر | Satin Polyester — Red',
            item_description_en = 'Satin Polyester — Red',
            item_description_ru = 'Атласный полиэстер — Красный',
            item_description_uk = 'Атласний поліестер — Червоний',
            weight_kg = 128.0,
            expected_sell_price = 18.50,
            reserved_quantity = 100,
            sold_quantity = 0,
            notes = 'AR: بوليستر ساتان لامع — مطلوب جداً في السوق' || chr(10) ||
                    'EN: Glossy satin polyester — High market demand' || chr(10) ||
                    'RU: Блестящий атласный полиэстер — Высокий спрос' || chr(10) ||
                    'UK: Блискучий атласний поліестер — Високий попит'
        WHERE shipment_id = v_shipment_turkey_id 
          AND item_description ILIKE '%بوليستر%أحمر%';
        
        -- Satin Polyester — Navy
        UPDATE shipment_items SET
            supplier_id = v_supplier_turkey_id,
            supplier_name = 'Bursa Polyester / بوليستر بورصة',
            purchase_invoice_id = v_inv_turkey_poly_id,
            invoice_number = 'PI-TUR-2024-002',
            material_code = 'POLY-SAT',
            color_name = 'كحلي / Navy / Тёмно-синий / Темно-синій',
            item_description = 'بوليستر ساتان — كحلي | Satin Polyester — Navy',
            item_description_en = 'Satin Polyester — Navy Blue',
            item_description_ru = 'Атласный полиэстер — Тёмно-синий',
            item_description_uk = 'Атласний поліестер — Темно-синій',
            weight_kg = 96.0,
            expected_sell_price = 18.50,
            reserved_quantity = 0,
            sold_quantity = 0,
            notes = 'AR: كحلي كلاسيكي — مناسب للبدلات والأزياء الرسمية' || chr(10) ||
                    'EN: Classic navy — suitable for suits and formal wear' || chr(10) ||
                    'RU: Классический тёмно-синий — для костюмов и деловой одежды' || chr(10) ||
                    'UK: Класичний темно-синій — для костюмів та ділового одягу'
        WHERE shipment_id = v_shipment_turkey_id 
          AND item_description ILIKE '%بوليستر%كحلي%';
        
        RAISE NOTICE '✅ Turkey container: 4 items updated (4 languages)';
    ELSE
        RAISE NOTICE '⚠️ Turkey container SHIP-2024-002 not found';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. UPDATE INDIA CONTAINER ITEMS (4 languages)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_shipment_india_id IS NOT NULL THEN
        -- Linen — Beige
        UPDATE shipment_items SET
            supplier_id = v_supplier_india_id,
            supplier_name = 'Mumbai Linen Mills / مصانع مومباي للكتان',
            purchase_invoice_id = v_inv_india_linen_id,
            invoice_number = 'PI-IND-2024-001',
            material_code = 'LIN-100',
            color_name = 'بيج / Beige / Бежевый / Бежевий',
            item_description = 'كتان طبيعي 100% — بيج | 100% Natural Linen — Beige',
            item_description_en = '100% Natural Linen — Beige (Mumbai)',
            item_description_ru = '100% натуральный лён — Бежевый (Мумбаи)',
            item_description_uk = '100% натуральний льон — Бежевий (Мумбаї)',
            weight_kg = 200.0,
            expected_sell_price = 15.50,
            reserved_quantity = 200,
            sold_quantity = 0,
            notes = 'AR: كتان هندي ممتاز — مناسب لجميع الفصول' || chr(10) ||
                    'EN: Premium Indian linen — suitable for all seasons' || chr(10) ||
                    'RU: Элитный индийский лён — подходит для всех сезонов' || chr(10) ||
                    'UK: Елітний індійський льон — підходить для всіх сезонів'
        WHERE shipment_id = v_shipment_india_id 
          AND item_description ILIKE '%كتان%بيج%';
        
        -- Linen — Gray
        UPDATE shipment_items SET
            supplier_id = v_supplier_india_id,
            supplier_name = 'Mumbai Linen Mills / مصانع مومباي للكتان',
            purchase_invoice_id = v_inv_india_linen_id,
            invoice_number = 'PI-IND-2024-001',
            material_code = 'LIN-100',
            color_name = 'رمادي / Gray / Серый / Сірий',
            item_description = 'كتان طبيعي 100% — رمادي | 100% Natural Linen — Gray',
            item_description_en = '100% Natural Linen — Gray (Mumbai)',
            item_description_ru = '100% натуральный лён — Серый (Мумбаи)',
            item_description_uk = '100% натуральний льон — Сірий (Мумбаї)',
            weight_kg = 160.0,
            expected_sell_price = 15.50,
            reserved_quantity = 0,
            sold_quantity = 0,
            notes = 'AR: كتان رمادي طبيعي — لون محايد متعدد الاستخدامات' || chr(10) ||
                    'EN: Natural gray linen — versatile neutral color' || chr(10) ||
                    'RU: Серый натуральный лён — универсальный нейтральный цвет' || chr(10) ||
                    'UK: Сірий натуральний льон — універсальний нейтральний колір'
        WHERE shipment_id = v_shipment_india_id 
          AND item_description ILIKE '%كتان%رمادي%';
        
        RAISE NOTICE '✅ India container: 2 items updated (4 languages)';
    ELSE
        RAISE NOTICE '⚠️ India container SHIP-2024-003 not found';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. UPDATE CHINA CONTAINER ITEMS (4 languages)
    -- ═══════════════════════════════════════════════════════════════
    
    IF v_shipment_china_id IS NOT NULL THEN
        -- Cotton — White
        UPDATE shipment_items SET
            supplier_name = 'Guangdong Cotton Mills / مصانع قوانغدونغ',
            material_code = 'COT-100',
            color_name = 'أبيض / White / Белый / Білий',
            item_description = 'قطن سادة 100% — أبيض | 100% Plain Cotton — White',
            item_description_en = '100% Plain Cotton — White (Guangdong)',
            item_description_ru = '100% хлопок — Белый (Гуандун)',
            item_description_uk = '100% бавовна — Білий (Гуандун)',
            weight_kg = 250.0,
            expected_sell_price = 18.00,
            reserved_quantity = 0,
            sold_quantity = 200,
            notes = 'AR: قطن مصري سادة — تم بيع 200 متر' || chr(10) ||
                    'EN: Plain Egyptian cotton — 200 meters sold' || chr(10) ||
                    'RU: Хлопок — Продано 200 метров' || chr(10) ||
                    'UK: Бавовна — Продано 200 метрів'
        WHERE shipment_id = v_shipment_china_id 
          AND item_description ILIKE '%أبيض%';
        
        -- Cotton — Black
        UPDATE shipment_items SET
            supplier_name = 'Guangdong Cotton Mills / مصانع قوانغدونغ',
            material_code = 'COT-100',
            color_name = 'أسود / Black / Чёрный / Чорний',
            item_description = 'قطن سادة 100% — أسود | 100% Plain Cotton — Black',
            item_description_en = '100% Plain Cotton — Black (Guangdong)',
            item_description_ru = '100% хлопок — Чёрный (Гуандун)',
            item_description_uk = '100% бавовна — Чорний (Гуандун)',
            weight_kg = 200.0,
            expected_sell_price = 18.00,
            reserved_quantity = 0,
            sold_quantity = 300,
            notes = 'AR: قطن أسود — تم بيع 300 متر' || chr(10) ||
                    'EN: Black cotton — 300 meters sold' || chr(10) ||
                    'RU: Чёрный хлопок — Продано 300 метров' || chr(10) ||
                    'UK: Чорна бавовна — Продано 300 метрів'
        WHERE shipment_id = v_shipment_china_id 
          AND item_description ILIKE '%أسود%';
        
        -- Cotton — Beige
        UPDATE shipment_items SET
            supplier_name = 'Guangdong Cotton Mills / مصانع قوانغدونغ',
            material_code = 'COT-100',
            color_name = 'بيج / Beige / Бежевый / Бежевий',
            item_description = 'قطن سادة 100% — بيج | 100% Plain Cotton — Beige',
            item_description_en = '100% Plain Cotton — Beige (Guangdong)',
            item_description_ru = '100% хлопок — Бежевый (Гуандун)',
            item_description_uk = '100% бавовна — Бежевий (Гуандун)',
            weight_kg = 175.0,
            expected_sell_price = 18.00,
            reserved_quantity = 0,
            sold_quantity = 150,
            notes = 'AR: قطن بيج — تم بيع 150 متر' || chr(10) ||
                    'EN: Beige cotton — 150 meters sold' || chr(10) ||
                    'RU: Бежевый хлопок — Продано 150 метров' || chr(10) ||
                    'UK: Бежева бавовна — Продано 150 метрів'
        WHERE shipment_id = v_shipment_china_id 
          AND item_description ILIKE '%بيج%';
        
        RAISE NOTICE '✅ China container: 3 items updated (4 languages)';
    ELSE
        RAISE NOTICE '⚠️ China container SHIP-2024-001 not found';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 7. UPDATE SHIPMENTS — margin + multilingual notes
    -- ═══════════════════════════════════════════════════════════════
    
    UPDATE shipments SET 
        default_margin_percent = 25.00,
        notes = 'AR: كونتينر حرير وبوليستر من تركيا — بالطريق 🚢' || chr(10) ||
                'EN: Silk and polyester container from Turkey — In transit 🚢' || chr(10) ||
                'RU: Контейнер с шёлком и полиэстером из Турции — В пути 🚢' || chr(10) ||
                'UK: Контейнер з шовком та поліестером з Туреччини — В дорозі 🚢'
    WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-002';
    
    UPDATE shipments SET 
        default_margin_percent = 20.00,
        notes = 'AR: كونتينر كتان من الهند — في الجمارك 📋' || chr(10) ||
                'EN: Linen container from India — In customs 📋' || chr(10) ||
                'RU: Контейнер со льном из Индии — На таможне 📋' || chr(10) ||
                'UK: Контейнер з льоном з Індії — На митниці 📋'
    WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-003';
    
    UPDATE shipments SET 
        default_margin_percent = 18.00,
        notes = 'AR: كونتينر قطن من الصين — تم الاستلام والإغلاق ✅' || chr(10) ||
                'EN: Cotton container from China — Received and finalized ✅' || chr(10) ||
                'RU: Контейнер с хлопком из Китая — Получен и закрыт ✅' || chr(10) ||
                'UK: Контейнер з бавовною з Китаю — Отримано та закрито ✅'
    WHERE tenant_id = v_tenant_id AND shipment_number = 'SHIP-2024-001';

    -- ═══════════════════════════════════════════════════════════════
    -- 8. TRANSIT RESERVATIONS (multilingual)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Reservation 1: Silk White (confirmed, with advance)
    IF v_customer_1_id IS NOT NULL AND v_shipment_turkey_id IS NOT NULL THEN
        INSERT INTO transit_reservations (
            tenant_id, company_id, branch_id,
            reservation_number, reservation_date,
            customer_id, customer_name,
            shipment_id, shipment_item_id,
            reserved_quantity, unit,
            unit_price, total_amount,
            advance_amount, advance_received,
            status, notes
        )
        SELECT
            v_tenant_id, v_company_id, v_branch_id,
            'TR-2024-001', '2024-02-10',
            v_customer_1_id,
            COALESCE((SELECT name_ar FROM customers WHERE id = v_customer_1_id), 'عميل 1'),
            v_shipment_turkey_id,
            si.id,
            50, 'meter',
            75.00, 3750.00,
            500.00, true,
            'confirmed',
            'AR: حجز حرير أبيض — دفعة مقدمة $500' || chr(10) ||
            'EN: White silk reservation — $500 advance paid' || chr(10) ||
            'RU: Бронирование белого шёлка — аванс $500 оплачен' || chr(10) ||
            'UK: Бронювання білого шовку — аванс $500 сплачено'
        FROM shipment_items si
        WHERE si.shipment_id = v_shipment_turkey_id
          AND si.item_description ILIKE '%حرير%أبيض%'
        LIMIT 1
        ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
        
        RAISE NOTICE '✅ Transit reservation TR-2024-001 (White Silk — Confirmed)';
    END IF;
    
    -- Reservation 2: Linen Beige (pending, no advance)
    IF v_customer_2_id IS NOT NULL AND v_shipment_india_id IS NOT NULL THEN
        INSERT INTO transit_reservations (
            tenant_id, company_id, branch_id,
            reservation_number, reservation_date,
            customer_id, customer_name,
            shipment_id, shipment_item_id,
            reserved_quantity, unit,
            unit_price, total_amount,
            advance_amount, advance_received,
            status, notes
        )
        SELECT
            v_tenant_id, v_company_id, v_branch_id,
            'TR-2024-002', '2024-02-12',
            v_customer_2_id,
            COALESCE((SELECT name_ar FROM customers WHERE id = v_customer_2_id), 'عميل 2'),
            v_shipment_india_id,
            si.id,
            200, 'meter',
            15.50, 3100.00,
            0, false,
            'pending',
            'AR: حجز كتان بيج — بانتظار التأكيد والدفعة المقدمة' || chr(10) ||
            'EN: Beige linen reservation — Awaiting confirmation and advance' || chr(10) ||
            'RU: Бронирование бежевого льна — Ожидание подтверждения и аванса' || chr(10) ||
            'UK: Бронювання бежевого льону — Очікування підтвердження та авансу'
        FROM shipment_items si
        WHERE si.shipment_id = v_shipment_india_id
          AND si.item_description ILIKE '%كتان%بيج%'
        LIMIT 1
        ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
        
        RAISE NOTICE '✅ Transit reservation TR-2024-002 (Beige Linen — Pending)';
    END IF;

    -- Reservation 3: Red Polyester (big wholesale order from B2B customer)
    IF v_customer_4_id IS NOT NULL AND v_shipment_turkey_id IS NOT NULL THEN
        INSERT INTO transit_reservations (
            tenant_id, company_id, branch_id,
            reservation_number, reservation_date,
            customer_id, customer_name,
            shipment_id, shipment_item_id,
            reserved_quantity, unit,
            unit_price, total_amount,
            advance_amount, advance_received,
            status, expected_delivery_date, notes
        )
        SELECT
            v_tenant_id, v_company_id, v_branch_id,
            'TR-2024-003', '2024-02-14',
            v_customer_4_id,
            COALESCE((SELECT name_en FROM customers WHERE id = v_customer_4_id), 'Europa Fashion Group'),
            v_shipment_turkey_id,
            si.id,
            300, 'meter',
            17.00, 5100.00,
            2000.00, true,
            'confirmed',
            '2024-03-01',
            'AR: طلبية كبيرة من مجموعة أوروبا فاشن — 300 متر بوليستر أحمر' || chr(10) ||
            'EN: Large order from Europa Fashion Group — 300m Red Polyester' || chr(10) ||
            'RU: Крупный заказ от Европа Фэшн — 300м Красный Полиэстер' || chr(10) ||
            'UK: Велике замовлення від Європа Фешн — 300м Червоний Поліестер'
        FROM shipment_items si
        WHERE si.shipment_id = v_shipment_turkey_id
          AND si.item_description ILIKE '%بوليستر%أحمر%'
        LIMIT 1
        ON CONFLICT (tenant_id, reservation_number) DO NOTHING;
        
        RAISE NOTICE '✅ Transit reservation TR-2024-003 (Red Polyester B2B — Confirmed)';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 9. FINAL SUMMARY
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Multilingual Test Data Applied Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT WAS CREATED:';
    RAISE NOTICE '   🏗️ Schema: name_ru, name_uk added to customers & suppliers';
    RAISE NOTICE '   🏗️ Schema: item_description_en/ru/uk added to shipment_items';
    RAISE NOTICE '   👥 4 Customers (AR/EN/RU/UK):';
    RAISE NOTICE '      1. محلات النور / Al-Nour / Ан-Нур (Odesa)';
    RAISE NOTICE '      2. مصنع الزهراء / Al-Zahraa / Аз-Захра (Kyiv)';
    RAISE NOTICE '      3. تكستايل بلس / Textile Plus / Текстиль Плюс (Kharkiv)';
    RAISE NOTICE '      4. أوروبا فاشن / Europa Fashion / Європа Фешн (Lviv)';
    RAISE NOTICE '   📄 3 Purchase Invoices (PI-TUR-001, PI-TUR-002, PI-IND-001)';
    RAISE NOTICE '   📦 9 Shipment Items updated (descriptions in 4 languages)';
    RAISE NOTICE '   🛒 3 Transit Reservations:';
    RAISE NOTICE '      TR-001: Silk White 50m → Al-Nour ($3,750 — confirmed)';
    RAISE NOTICE '      TR-002: Linen Beige 200m → Al-Zahraa ($3,100 — pending)';
    RAISE NOTICE '      TR-003: Poly Red 300m → Europa Fashion ($5,100 — B2B)';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Languages: العربية | English | Русский | Українська';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    
END $$;
