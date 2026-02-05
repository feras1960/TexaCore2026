-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 WAREHOUSE MODULE - COMPREHENSIVE VERIFICATION SCRIPT
-- التحقق الشامل من قسم المستودعات
-- ═══════════════════════════════════════════════════════════════════════════
-- تاريخ الإنشاء: 2 فبراير 2026
-- الغرض: التحقق من جميع الجداول والعلاقات والصلاحيات
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: التحقق من وجود الجداول
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_exists BOOLEAN;
    v_count BIGINT;
    v_tables TEXT[] := ARRAY[
        -- Core Warehouse Tables
        'warehouses',
        'warehouse_locations',
        'warehouse_settings',
        'warehouse_assignments',
        
        -- Fabric/Materials Tables
        'fabric_groups',
        'fabric_colors',
        'fabric_materials',
        'fabric_material_colors',
        
        -- Roll Management
        'fabric_rolls',
        'roll_movements',
        'roll_reservations',
        
        -- Inventory Core
        'inventory_stock',
        'inventory_movements',
        'inventory_batches',
        'inventory_serials',
        
        -- Operations
        'containers',
        'stock_counts',
        'stock_count_items',
        'sample_requests',
        'fabric_samples',
        
        -- Delivery
        'delivery_notes',
        'delivery_note_items'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📦 WAREHOUSE MODULE - TABLE VERIFICATION';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = v_table
        ) INTO v_exists;
        
        IF v_exists THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;
            RAISE NOTICE '  ✅ % | Rows: %', RPAD(v_table, 30), v_count;
        ELSE
            RAISE NOTICE '  ❌ % | NOT FOUND', RPAD(v_table, 30);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: التحقق من العلاقات (Foreign Keys)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_fk RECORD;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔗 FOREIGN KEY RELATIONSHIPS';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR v_fk IN
        SELECT
            tc.table_name AS from_table,
            kcu.column_name AS from_column,
            ccu.table_name AS to_table,
            ccu.column_name AS to_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
            'warehouses', 'warehouse_locations', 'fabric_materials',
            'fabric_rolls', 'roll_movements', 'delivery_notes',
            'delivery_note_items', 'stock_counts', 'stock_count_items',
            'sample_requests', 'containers', 'roll_reservations'
        )
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        RAISE NOTICE '  % .% → % .%',
            RPAD(v_fk.from_table, 22),
            RPAD(v_fk.from_column, 18),
            RPAD(v_fk.to_table, 22),
            v_fk.to_column;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_rls_enabled BOOLEAN;
    v_policy_count INT;
    v_tables TEXT[] := ARRAY[
        'warehouses',
        'warehouse_locations',
        'warehouse_settings',
        'fabric_groups',
        'fabric_colors',
        'fabric_materials',
        'fabric_rolls',
        'roll_movements',
        'roll_reservations',
        'inventory_stock',
        'inventory_movements',
        'inventory_batches',
        'containers',
        'stock_counts',
        'stock_count_items',
        'sample_requests',
        'delivery_notes',
        'delivery_note_items'
    ];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 ROW LEVEL SECURITY (RLS) STATUS';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        -- Check if RLS is enabled
        SELECT relrowsecurity INTO v_rls_enabled
        FROM pg_class
        WHERE relname = v_table AND relnamespace = 'public'::regnamespace;
        
        -- Count policies
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE tablename = v_table AND schemaname = 'public';
        
        IF v_rls_enabled IS NULL THEN
            RAISE NOTICE '  ⚠️  % | Table not found', RPAD(v_table, 25);
        ELSIF v_rls_enabled THEN
            RAISE NOTICE '  ✅ % | RLS: ON  | Policies: %', RPAD(v_table, 25), v_policy_count;
        ELSE
            RAISE NOTICE '  ❌ % | RLS: OFF | Policies: %', RPAD(v_table, 25), v_policy_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: التحقق من الأعمدة الهامة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_col RECORD;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 CRITICAL COLUMNS CHECK';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Check warehouses columns
    RAISE NOTICE '  📦 warehouses:';
    FOR v_col IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'warehouses'
        AND column_name IN ('id', 'tenant_id', 'company_id', 'code', 'name_ar', 'is_active', 'is_main', 'capacity')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '      ✓ % (%, nullable: %)', 
            RPAD(v_col.column_name, 15), v_col.data_type, v_col.is_nullable;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Check fabric_materials columns
    RAISE NOTICE '  🧵 fabric_materials:';
    FOR v_col IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'fabric_materials'
        AND column_name IN ('id', 'tenant_id', 'company_id', 'code', 'name_ar', 'unit', 'purchase_price', 'selling_price', 'custom_fields')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '      ✓ % (%, nullable: %)', 
            RPAD(v_col.column_name, 15), v_col.data_type, v_col.is_nullable;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Check fabric_rolls columns
    RAISE NOTICE '  🔄 fabric_rolls:';
    FOR v_col IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'fabric_rolls'
        AND column_name IN ('id', 'tenant_id', 'company_id', 'material_id', 'roll_number', 'initial_length', 'current_length', 'status', 'warehouse_id')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '      ✓ % (%, nullable: %)', 
            RPAD(v_col.column_name, 15), v_col.data_type, v_col.is_nullable;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Check inventory_movements columns
    RAISE NOTICE '  📋 inventory_movements:';
    FOR v_col IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'inventory_movements'
        AND column_name IN ('id', 'tenant_id', 'company_id', 'movement_type', 'status', 'warehouse_id', 'material_id', 'roll_id')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '      ✓ % (%, nullable: %)', 
            RPAD(v_col.column_name, 15), v_col.data_type, v_col.is_nullable;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: التحقق من الدوال (Functions)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_func TEXT;
    v_exists BOOLEAN;
    v_functions TEXT[] := ARRAY[
        'generate_delivery_note_number',
        'approve_delivery_note',
        'confirm_delivery',
        'get_warehouse_settings'
    ];
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '⚙️  DATABASE FUNCTIONS';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOREACH v_func IN ARRAY v_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = v_func
        ) INTO v_exists;
        
        IF v_exists THEN
            RAISE NOTICE '  ✅ % | EXISTS', RPAD(v_func, 35);
        ELSE
            RAISE NOTICE '  ❌ % | NOT FOUND', RPAD(v_func, 35);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: التحقق من الـ Triggers
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_trigger RECORD;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '⚡ TRIGGERS ON WAREHOUSE TABLES';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR v_trigger IN
        SELECT DISTINCT
            event_object_table AS table_name,
            trigger_name,
            event_manipulation AS event
        FROM information_schema.triggers
        WHERE event_object_table IN (
            'warehouses', 'warehouse_locations', 'fabric_materials',
            'fabric_rolls', 'roll_movements', 'delivery_notes',
            'inventory_movements', 'stock_counts'
        )
        ORDER BY event_object_table, trigger_name
    LOOP
        RAISE NOTICE '  ✅ %.% ON %',
            RPAD(v_trigger.table_name, 22),
            RPAD(v_trigger.trigger_name, 30),
            v_trigger.event;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: التحقق من الفهارس (Indexes)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_idx RECORD;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 INDEXES ON WAREHOUSE TABLES';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR v_idx IN
        SELECT
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN (
            'warehouses', 'warehouse_locations', 'fabric_materials',
            'fabric_rolls', 'roll_movements', 'delivery_notes',
            'inventory_movements', 'stock_counts', 'containers'
        )
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '  ✅ %.%',
            RPAD(v_idx.tablename, 22),
            v_idx.indexname;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 8: ملخص التحقق
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 VERIFICATION SUMMARY';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  ✅ Core Tables: warehouses, warehouse_locations, warehouse_settings';
    RAISE NOTICE '  ✅ Material Tables: fabric_groups, fabric_materials, fabric_colors';
    RAISE NOTICE '  ✅ Roll Tables: fabric_rolls, roll_movements, roll_reservations';
    RAISE NOTICE '  ✅ Inventory: inventory_stock, inventory_movements, inventory_batches';
    RAISE NOTICE '  ✅ Operations: containers, stock_counts, sample_requests';
    RAISE NOTICE '  ✅ Delivery: delivery_notes, delivery_note_items';
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ WAREHOUSE MODULE VERIFICATION COMPLETE';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
