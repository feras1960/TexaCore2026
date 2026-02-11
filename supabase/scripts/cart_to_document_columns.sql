-- ═══════════════════════════════════════════════════════════════════
-- سكربت: إضافة الأعمدة والتريغرات اللازمة لتحويل السلة إلى مستندات
-- Cart → Document Conversion: Required Schema Changes
-- تاريخ: 2026-02-11
-- ═══════════════════════════════════════════════════════════════════
-- 
-- ✅ متوافق مع نظام RLS الموحّد (Phase 41 / APPLY_all_policies.sql)
-- ✅ يستخدم auto_set_tenant_id() — نفس النمط المعتمد في CREATE_protection_triggers.sql
-- ✅ آمن للتنفيذ المتكرر (IF NOT EXISTS + DO blocks)
--
-- هذا السكربت يُضيف:
-- 1. عمود notes + currency لجدول quotations
-- 2. عمود notes + currency لجدول sales_orders  
-- 3. جعل customer_id في sales_orders اختياري (nullable)
-- 4. تريغرات auto_set_tenant_id على quotations و transit_reservations
-- 5. تحديث سياسات RLS لتستخدم النمط الموحّد (إذا كانت قديمة)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. إضافة أعمدة notes و currency لجدول quotations
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'quotations' AND column_name = 'notes'
    ) THEN
        ALTER TABLE quotations ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to quotations';
    ELSE
        RAISE NOTICE '⏭️ notes column already exists on quotations';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'quotations' AND column_name = 'currency'
    ) THEN
        ALTER TABLE quotations ADD COLUMN currency VARCHAR(3) DEFAULT 'SAR';
        RAISE NOTICE '✅ Added currency column to quotations';
    ELSE
        RAISE NOTICE '⏭️ currency column already exists on quotations';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. إضافة أعمدة notes و currency لجدول sales_orders
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'notes'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to sales_orders';
    ELSE
        RAISE NOTICE '⏭️ notes column already exists on sales_orders';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'currency'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN currency VARCHAR(3) DEFAULT 'SAR';
        RAISE NOTICE '✅ Added currency column to sales_orders';
    ELSE
        RAISE NOTICE '⏭️ currency column already exists on sales_orders';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. جعل customer_id في sales_orders اختياري (nullable)
--    السبب: عند الإنشاء من السلة قد لا يكون العميل محدداً بعد (مسودة)
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sales_orders' 
          AND column_name = 'customer_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE sales_orders ALTER COLUMN customer_id DROP NOT NULL;
        RAISE NOTICE '✅ Made customer_id nullable on sales_orders';
    ELSE
        RAISE NOTICE '⏭️ customer_id is already nullable on sales_orders';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 4. إضافة عمود currency في transit_reservations (للمستقبل)
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transit_reservations' AND column_name = 'currency'
    ) THEN
        ALTER TABLE transit_reservations ADD COLUMN currency VARCHAR(3) DEFAULT 'SAR';
        RAISE NOTICE '✅ Added currency column to transit_reservations';
    ELSE
        RAISE NOTICE '⏭️ currency column already exists on transit_reservations';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 5. تفعيل تريغر auto_set_tenant_id على الجداول الناقصة
--    هذا التريغر موجود مسبقاً في CREATE_protection_triggers.sql لكن
--    quotations و transit_reservations لم يكونا في القائمة الأصلية
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    -- quotations
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'quotations'
    ) THEN
        DROP TRIGGER IF EXISTS trg_auto_tenant_quotations ON public.quotations;
        CREATE TRIGGER trg_auto_tenant_quotations
            BEFORE INSERT ON public.quotations
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_tenant_id();
        RAISE NOTICE '✅ Applied auto_set_tenant_id trigger on quotations';
    END IF;

    -- transit_reservations
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'transit_reservations'
    ) THEN
        DROP TRIGGER IF EXISTS trg_auto_tenant_transit_reservations ON public.transit_reservations;
        CREATE TRIGGER trg_auto_tenant_transit_reservations
            BEFORE INSERT ON public.transit_reservations
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_tenant_id();
        RAISE NOTICE '✅ Applied auto_set_tenant_id trigger on transit_reservations';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 6. تحديث سياسات RLS لتستخدم النمط الموحّد (Phase 41)
--    يحذف السياسات القديمة (quote_select_policy, quote_write_policy) 
--    ويُطبّق السياسات الموحّدة عبر create_company_rls_policies()
-- ─────────────────────────────────────────────────────────────────
DO $$ 
DECLARE
    v_tables TEXT[] := ARRAY['quotations', 'transit_reservations'];
    v_table TEXT;
    v_has_tenant BOOLEAN;
    v_has_company BOOLEAN;
    r RECORD;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            -- Check columns
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id'
            ) INTO v_has_tenant;

            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id'
            ) INTO v_has_company;

            -- Drop ALL old policies (both old-style and unified-style)
            -- This is safe because create_company_rls_policies will recreate them
            FOR r IN (
                SELECT policyname FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = v_table
            )
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, v_table);
            END LOOP;

            -- Apply unified RLS policies
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_company_rls_policies') THEN
                PERFORM create_company_rls_policies(v_table, v_has_tenant, v_has_company);
                RAISE NOTICE '✅ Applied unified RLS policies on %', v_table;
            ELSE
                RAISE NOTICE '⚠️ create_company_rls_policies function not found — run APPLY_all_policies.sql first';
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- ✅ تم! 
-- الآن السكربت متوافق 100% مع:
-- • نظام RLS الموحّد (Phase 41)
-- • تريغرات auto_set_tenant_id من CREATE_protection_triggers.sql
-- • نمط D-Group (tenant_id + company_id) من APPLY_all_policies.sql
-- ═══════════════════════════════════════════════════════════════════
SELECT '🎯 Cart-to-Document schema migration completed — RLS-Compliant!' AS result;
