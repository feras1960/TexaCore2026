-- =====================================================
-- ADD_missing_indexes.sql
-- إضافة الفهارس المفقودة على tenant_id و company_id
-- تاريخ: 2026-02-05
-- =====================================================

-- هذا السكربت يُنشئ الفهارس تلقائياً للجداول التي تنقصها

DO $$
DECLARE
    r RECORD;
    idx_name TEXT;
    created_count INT := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 إضافة الفهارس المفقودة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    -- إضافة فهارس tenant_id
    RAISE NOTICE '';
    RAISE NOTICE '📍 إضافة فهارس tenant_id...';
    
    FOR r IN 
        SELECT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'tenant_id'
          AND NOT EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = c.table_name
              AND i.indexdef LIKE '%tenant_id%'
          )
        ORDER BY c.table_name
    LOOP
        idx_name := 'idx_' || r.table_name || '_tenant_id';
        
        -- تحقق من عدم وجود الفهرس
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', idx_name, r.table_name);
            RAISE NOTICE '  ✅ Created: %', idx_name;
            created_count := created_count + 1;
        END IF;
    END LOOP;
    
    -- إضافة فهارس company_id
    RAISE NOTICE '';
    RAISE NOTICE '📍 إضافة فهارس company_id...';
    
    FOR r IN 
        SELECT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'company_id'
          AND NOT EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = c.table_name
              AND i.indexdef LIKE '%company_id%'
          )
        ORDER BY c.table_name
    LOOP
        idx_name := 'idx_' || r.table_name || '_company_id';
        
        -- تحقق من عدم وجود الفهرس
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', idx_name, r.table_name);
            RAISE NOTICE '  ✅ Created: %', idx_name;
            created_count := created_count + 1;
        END IF;
    END LOOP;
    
    -- إضافة فهارس مركبة (tenant_id + company_id)
    RAISE NOTICE '';
    RAISE NOTICE '📍 إضافة فهارس مركبة (tenant_id, company_id)...';
    
    FOR r IN 
        SELECT c1.table_name
        FROM information_schema.columns c1
        JOIN information_schema.columns c2 
            ON c1.table_schema = c2.table_schema 
            AND c1.table_name = c2.table_name
        WHERE c1.table_schema = 'public'
          AND c1.column_name = 'tenant_id'
          AND c2.column_name = 'company_id'
          AND NOT EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = c1.table_name
              AND i.indexdef LIKE '%tenant_id%'
              AND i.indexdef LIKE '%company_id%'
          )
        ORDER BY c1.table_name
    LOOP
        idx_name := 'idx_' || r.table_name || '_tenant_company';
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id, company_id)', idx_name, r.table_name);
            RAISE NOTICE '  ✅ Created: %', idx_name;
            created_count := created_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء % فهرس جديد', created_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- التحقق من النتائج
SELECT 
    '📊 ملخص الفهارس' as report,
    (SELECT COUNT(DISTINCT tablename) FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE '%tenant_id%') as tenant_indexes,
    (SELECT COUNT(DISTINCT tablename) FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE '%company_id%') as company_indexes;
