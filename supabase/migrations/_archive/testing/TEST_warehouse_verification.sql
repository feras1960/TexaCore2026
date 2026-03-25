-- ═══════════════════════════════════════════════════════════════════════════
-- WAREHOUSE MODULE: Comprehensive Verification & Stress Test
-- فحص شامل لقسم المستودعات واختبارات الضغط
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2 فبراير 2026
-- الغرض: التحقق من جميع الجداول والعلاقات وسيناريوهات العمل
-- ═══════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo '🔍 PART 1: التحقق من وجود الجداول الأساسية'
\echo '══════════════════════════════════════════════════════════════'

-- ═══════════════════════════════════════════════════════════════
-- TEST 1: التحقق من جداول المستودعات
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'warehouses',
        'warehouse_locations',
        'products',
        'product_variants',
        'product_categories',
        'inventory_stock',
        'inventory_movements',
        'inventory_batches',
        'inventory_serials'
    ];
    v_table TEXT;
    v_count INT;
    v_missing INT := 0;
BEGIN
    RAISE NOTICE '📦 التحقق من جداول المستودعات والمخزون:';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % (% صفوف)', v_table, v_count;
        ELSE
            RAISE NOTICE '  ❌ % - غير موجود', v_table;
            v_missing := v_missing + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ جميع جداول المستودعات موجودة!';
    ELSE
        RAISE NOTICE '⚠️ % جداول مفقودة', v_missing;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 2: التحقق من جداول الأقمشة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'fabric_groups',
        'fabric_colors',
        'fabric_materials',
        'fabric_material_colors',
        'fabric_rolls',
        'roll_movements',
        'roll_reservations',
        'fabric_samples'
    ];
    v_table TEXT;
    v_count INT;
    v_missing INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧵 التحقق من جداول الأقمشة:';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % (% صفوف)', v_table, v_count;
        ELSE
            RAISE NOTICE '  ❌ % - غير موجود', v_table;
            v_missing := v_missing + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ جميع جداول الأقمشة موجودة!';
    ELSE
        RAISE NOTICE '⚠️ % جداول مفقودة', v_missing;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 3: التحقق من جداول المبيعات والمشتريات
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'customers',
        'suppliers',
        'quotations',
        'sales_orders',
        'sales_order_items',
        'sales_invoices',
        'sales_invoice_items',
        'purchase_orders',
        'purchase_order_items',
        'purchase_invoices',
        'purchase_invoice_items'
    ];
    v_table TEXT;
    v_count INT;
    v_missing INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 التحقق من جداول المبيعات والمشتريات:';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % (% صفوف)', v_table, v_count;
        ELSE
            RAISE NOTICE '  ❌ % - غير موجود', v_table;
            v_missing := v_missing + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ جميع جداول المبيعات والمشتريات موجودة!';
    ELSE
        RAISE NOTICE '⚠️ % جداول مفقودة', v_missing;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 4: التحقق من جداول الشحنات والتكاليف
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'shipments',
        'shipment_items',
        'shipment_costs'
    ];
    v_table TEXT;
    v_count INT;
    v_missing INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚢 التحقق من جداول الشحنات:';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % (% صفوف)', v_table, v_count;
        ELSE
            RAISE NOTICE '  ❌ % - غير موجود', v_table;
            v_missing := v_missing + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ جميع جداول الشحنات موجودة!';
    ELSE
        RAISE NOTICE '⚠️ % جداول مفقودة', v_missing;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 5: التحقق من الجداول الجديدة (STEP_100)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'delivery_notes',
        'delivery_note_items',
        'warehouse_settings'
    ];
    v_table TEXT;
    v_count INT;
    v_missing INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🆕 التحقق من الجداول الجديدة (STEP_100):';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % (% صفوف)', v_table, v_count;
        ELSE
            RAISE NOTICE '  ⏳ % - بانتظار تنفيذ STEP_100', v_table;
            v_missing := v_missing + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ جميع الجداول الجديدة موجودة!';
    ELSE
        RAISE NOTICE '⏳ % جداول تنتظر تنفيذ Migration', v_missing;
    END IF;
END $$;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo '🔗 PART 2: التحقق من العلاقات (Foreign Keys)'
\echo '══════════════════════════════════════════════════════════════'

-- ═══════════════════════════════════════════════════════════════
-- TEST 6: العلاقات في جداول المستودعات
-- ═══════════════════════════════════════════════════════════════

SELECT 
    tc.table_name AS "الجدول",
    kcu.column_name AS "العمود",
    ccu.table_name AS "المرجع",
    ccu.column_name AS "عمود المرجع"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN (
    'warehouses', 'warehouse_locations', 'fabric_rolls', 
    'roll_movements', 'sales_orders', 'inventory_movements'
)
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo '📊 PART 3: إحصائيات البيانات'
\echo '══════════════════════════════════════════════════════════════'

-- ═══════════════════════════════════════════════════════════════
-- TEST 7: إحصائيات شاملة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_wh_count INT := 0;
    v_loc_count INT := 0;
    v_prod_count INT := 0;
    v_roll_count INT := 0;
    v_so_count INT := 0;
    v_po_count INT := 0;
BEGIN
    -- عد المستودعات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        SELECT COUNT(*) INTO v_wh_count FROM warehouses;
    END IF;
    
    -- عد المواقع
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
        SELECT COUNT(*) INTO v_loc_count FROM warehouse_locations;
    END IF;
    
    -- عد المنتجات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        SELECT COUNT(*) INTO v_prod_count FROM products;
    END IF;
    
    -- عد الرولونات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabric_rolls') THEN
        SELECT COUNT(*) INTO v_roll_count FROM fabric_rolls;
    END IF;
    
    -- عد أوامر البيع
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        SELECT COUNT(*) INTO v_so_count FROM sales_orders;
    END IF;
    
    -- عد أوامر الشراء
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
        SELECT COUNT(*) INTO v_po_count FROM purchase_orders;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 إحصائيات البيانات الحالية:';
    RAISE NOTICE '  🏭 المستودعات: %', v_wh_count;
    RAISE NOTICE '  📍 المواقع: %', v_loc_count;
    RAISE NOTICE '  📦 المنتجات: %', v_prod_count;
    RAISE NOTICE '  🧵 الرولونات: %', v_roll_count;
    RAISE NOTICE '  🛒 أوامر البيع: %', v_so_count;
    RAISE NOTICE '  📥 أوامر الشراء: %', v_po_count;
    RAISE NOTICE '';
END $$;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo '🧪 PART 4: اختبارات سلامة البيانات'
\echo '══════════════════════════════════════════════════════════════'

-- ═══════════════════════════════════════════════════════════════
-- TEST 8: التحقق من سلامة المراجع
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_orphans INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 التحقق من سلامة المراجع (Orphaned Records):';
    RAISE NOTICE '';
    
    -- التحقق من warehouse_locations بدون warehouse
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
        SELECT COUNT(*) INTO v_orphans
        FROM warehouse_locations wl
        WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.id = wl.warehouse_id);
        
        IF v_orphans = 0 THEN
            RAISE NOTICE '  ✅ warehouse_locations: لا توجد سجلات يتيمة';
        ELSE
            RAISE NOTICE '  ⚠️ warehouse_locations: % سجلات يتيمة', v_orphans;
        END IF;
    END IF;
    
    -- التحقق من fabric_rolls بدون material
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabric_rolls') THEN
        SELECT COUNT(*) INTO v_orphans
        FROM fabric_rolls fr
        WHERE fr.material_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM fabric_materials fm WHERE fm.id = fr.material_id);
        
        IF v_orphans = 0 THEN
            RAISE NOTICE '  ✅ fabric_rolls: لا توجد سجلات يتيمة';
        ELSE
            RAISE NOTICE '  ⚠️ fabric_rolls: % سجلات يتيمة', v_orphans;
        END IF;
    END IF;
    
    -- التحقق من sales_orders بدون customer
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        SELECT COUNT(*) INTO v_orphans
        FROM sales_orders so
        WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = so.customer_id);
        
        IF v_orphans = 0 THEN
            RAISE NOTICE '  ✅ sales_orders: لا توجد سجلات يتيمة';
        ELSE
            RAISE NOTICE '  ⚠️ sales_orders: % سجلات يتيمة', v_orphans;
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل فحص سلامة المراجع';
END $$;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo '⚡ PART 5: اختبار أداء الاستعلامات'
\echo '══════════════════════════════════════════════════════════════'

-- ═══════════════════════════════════════════════════════════════
-- TEST 9: التحقق من وجود الفهارس الأساسية
-- ═══════════════════════════════════════════════════════════════

SELECT 
    schemaname AS "Schema",
    tablename AS "جدول",
    indexname AS "فهرس",
    indexdef AS "التعريف"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'warehouses', 'warehouse_locations', 'fabric_rolls', 
    'inventory_movements', 'sales_orders', 'delivery_notes'
)
ORDER BY tablename, indexname
LIMIT 20;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo '📋 PART 6: ملخص النتائج'
\echo '══════════════════════════════════════════════════════════════'

DO $$
DECLARE
    v_total_tables INT := 0;
    v_existing_tables INT := 0;
    v_percentage DECIMAL(5,2);
BEGIN
    -- عد الجداول المطلوبة
    v_total_tables := 27;  -- عدد الجداول المتوقعة
    
    SELECT COUNT(*) INTO v_existing_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'warehouses', 'warehouse_locations', 'products', 'product_variants',
        'product_categories', 'inventory_stock', 'inventory_movements',
        'inventory_batches', 'inventory_serials', 'fabric_groups',
        'fabric_colors', 'fabric_materials', 'fabric_material_colors',
        'fabric_rolls', 'roll_movements', 'roll_reservations',
        'fabric_samples', 'customers', 'suppliers', 'quotations',
        'sales_orders', 'sales_invoices', 'purchase_orders',
        'purchase_invoices', 'shipments', 'shipment_items', 'shipment_costs'
    );
    
    v_percentage := (v_existing_tables::DECIMAL / v_total_tables) * 100;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 ملخص الفحص الشامل:';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  📦 جداول موجودة: % من %', v_existing_tables, v_total_tables;
    RAISE NOTICE '  📈 نسبة الاكتمال: %%', ROUND(v_percentage, 1);
    RAISE NOTICE '';
    
    IF v_percentage >= 90 THEN
        RAISE NOTICE '  ✅ الباك إند جاهز للعمل!';
    ELSIF v_percentage >= 70 THEN
        RAISE NOTICE '  ⚠️ الباك إند يحتاج بعض الإضافات';
    ELSE
        RAISE NOTICE '  ❌ الباك إند يحتاج تطوير كبير';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

\echo ''
\echo '✅ اكتمل الفحص الشامل للباك إند!'
\echo ''
