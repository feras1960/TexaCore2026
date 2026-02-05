-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 21: التحقق من العلاقات والربط بين الجداول
-- STEP 21: Verify Relationships and Links Between Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من Foreign Keys
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_fk RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 قائمة Foreign Keys المتعلقة بـ tenant_id:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_fk IN 
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'tenants'
          AND ccu.column_name = 'id'
        ORDER BY tc.table_name
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: %.% → tenants.id', 
            LPAD(v_count::TEXT, 3, ' '), 
            v_fk.table_name,
            v_fk.column_name;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ إجمالي Foreign Keys: %', v_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من البيانات المفقودة tenant_id
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table RECORD;
    v_null_count INT;
    v_total_count INT;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 التحقق من البيانات المفقودة tenant_id:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_table IN 
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'tenant_id'
          AND is_nullable = 'NO'
        ORDER BY table_name
    LOOP
        EXECUTE format('
            SELECT 
                COUNT(*)::INT,
                COUNT(*) FILTER (WHERE tenant_id IS NULL)::INT
            FROM %I
        ', v_table.table_name) INTO v_total_count, v_null_count;
        
        IF v_null_count > 0 THEN
            RAISE WARNING '⚠️ %: % من % بدون tenant_id', 
                v_table.table_name, v_null_count, v_total_count;
        ELSE
            RAISE NOTICE '✅ %: جميع السجلات (%) لديها tenant_id', 
                v_table.table_name, v_total_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من Triggers
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_trigger RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 قائمة Triggers المهمة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_trigger IN 
        SELECT 
            trigger_name,
            event_object_table,
            action_timing,
            event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND (trigger_name LIKE '%tenant%' 
               OR trigger_name LIKE '%journal%'
               OR trigger_name LIKE '%inventory%')
        ORDER BY event_object_table, trigger_name
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: % on % (%) (%)', 
            LPAD(v_count::TEXT, 3, ' '), 
            v_trigger.trigger_name,
            v_trigger.event_object_table,
            v_trigger.action_timing,
            v_trigger.event_manipulation;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ إجمالي Triggers: %', v_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من Functions المهمة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_func RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 قائمة Functions المهمة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOR v_func IN 
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_type = 'FUNCTION'
          AND (
              routine_name LIKE '%tenant%'
              OR routine_name LIKE '%journal%'
              OR routine_name LIKE '%inventory%'
              OR routine_name LIKE '%super%'
              OR routine_name LIKE '%account%'
          )
        ORDER BY routine_name
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE '%: %()', 
            LPAD(v_count::TEXT, 3, ' '), 
            v_func.routine_name;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ إجمالي Functions: %', v_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. ملخص شامل للنظام
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 ملخص النظام:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    -- Tenants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        SELECT COUNT(*) INTO v_count FROM tenants;
        RAISE NOTICE 'Tenants: %', v_count;
        SELECT COUNT(*) INTO v_count FROM tenants WHERE status = 'active';
        RAISE NOTICE '  - Active: %', v_count;
        SELECT COUNT(*) INTO v_count FROM tenants WHERE status = 'available';
        RAISE NOTICE '  - Available: %', v_count;
    END IF;
    
    -- Companies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        SELECT COUNT(*) INTO v_count FROM companies;
        RAISE NOTICE 'Companies: %', v_count;
    END IF;
    
    -- Users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        SELECT COUNT(*) INTO v_count FROM user_profiles;
        RAISE NOTICE 'Users: %', v_count;
    END IF;
    
    -- Journal Entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        SELECT COUNT(*) INTO v_count FROM journal_entries;
        RAISE NOTICE 'Journal Entries: %', v_count;
    END IF;
    
    -- Products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        SELECT COUNT(*) INTO v_count FROM products;
        RAISE NOTICE 'Products: %', v_count;
    END IF;
    
    -- Warehouses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        SELECT COUNT(*) INTO v_count FROM warehouses;
        RAISE NOTICE 'Warehouses: %', v_count;
    END IF;
    
    -- Customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        SELECT COUNT(*) INTO v_count FROM customers;
        RAISE NOTICE 'Customers: %', v_count;
    END IF;
    
    -- Suppliers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        SELECT COUNT(*) INTO v_count FROM suppliers;
        RAISE NOTICE 'Suppliers: %', v_count;
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ✅ تم التحقق من جميع العلاقات والربط!
-- ✅ All relationships and links verified!
