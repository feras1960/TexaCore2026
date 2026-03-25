-- =====================================================
-- FIX_all_issues.sql
-- إصلاح جميع المشاكل المكتشفة
-- تاريخ: 2026-02-05
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: إضافة الفهارس المفقودة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    idx_name TEXT;
    tenant_count INT := 0;
    company_count INT := 0;
    combined_count INT := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 الجزء 1: إضافة الفهارس المفقودة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    -- فهارس tenant_id
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
    LOOP
        idx_name := 'idx_' || r.table_name || '_tenant_id';
        BEGIN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', idx_name, r.table_name);
            tenant_count := tenant_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Skip: %', idx_name;
        END;
    END LOOP;
    
    -- فهارس company_id
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
    LOOP
        idx_name := 'idx_' || r.table_name || '_company_id';
        BEGIN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', idx_name, r.table_name);
            company_count := company_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Skip: %', idx_name;
        END;
    END LOOP;
    
    -- فهارس مركبة
    FOR r IN 
        SELECT c1.table_name
        FROM information_schema.columns c1
        JOIN information_schema.columns c2 
            ON c1.table_schema = c2.table_schema AND c1.table_name = c2.table_name
        WHERE c1.table_schema = 'public'
          AND c1.column_name = 'tenant_id'
          AND c2.column_name = 'company_id'
          AND NOT EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = c1.table_name
              AND i.indexdef LIKE '%tenant_id%company_id%'
          )
    LOOP
        idx_name := 'idx_' || r.table_name || '_tenant_company';
        BEGIN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id, company_id)', idx_name, r.table_name);
            combined_count := combined_count + 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ فهارس tenant_id: %', tenant_count;
    RAISE NOTICE '✅ فهارس company_id: %', company_count;
    RAISE NOTICE '✅ فهارس مركبة: %', combined_count;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: إضافة created_at المفقود
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    added_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 الجزء 2: إضافة created_at المفقود';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    FOR r IN 
        SELECT t.tablename as table_name
        FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' 
              AND c.table_name = t.tablename 
              AND c.column_name = 'created_at'
          )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);
            RAISE NOTICE '  ✅ Added created_at to: %', r.table_name;
            added_count := added_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Skip: %', r.table_name;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ أُضيف created_at لـ % جدول', added_count;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 3: إضافة updated_at المفقود
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    added_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 الجزء 3: إضافة updated_at المفقود';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    FOR r IN 
        SELECT t.tablename as table_name
        FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' 
              AND c.table_name = t.tablename 
              AND c.column_name = 'updated_at'
          )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);
            RAISE NOTICE '  ✅ Added updated_at to: %', r.table_name;
            added_count := added_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Skip: %', r.table_name;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ أُضيف updated_at لـ % جدول', added_count;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الملخص النهائي
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📊 الملخص النهائي' as report,
    (SELECT COUNT(DISTINCT tablename) FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE '%tenant_id%') as "فهارس tenant",
    (SELECT COUNT(DISTINCT tablename) FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE '%company_id%') as "فهارس company",
    (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'created_at')) as "بدون created_at",
    (SELECT COUNT(*) FROM pg_tables t WHERE t.schemaname = 'public' AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'updated_at')) as "بدون updated_at";
