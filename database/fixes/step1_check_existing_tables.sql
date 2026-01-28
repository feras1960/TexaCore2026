-- ═══════════════════════════════════════════════════════════════════════════
-- الخطوة 1: التحقق من الجداول الموجودة
-- Step 1: Check Existing Tables
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 الخطوة 1: فحص الجداول الموجودة حالياً';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. عد جميع الجداول
-- ═══════════════════════════════════════════════════════════════

SELECT 
    '📊 إجمالي الجداول' as "المؤشر",
    COUNT(*)::TEXT as "العدد"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ═══════════════════════════════════════════════════════════════
-- 2. التحقق من الجداول الأساسية (Core)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🔍 الجداول الأساسية (Core):'; END $$;

SELECT 
    t.table_name as "اسم الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('tenants'),
    ('companies'),
    ('branches'),
    ('user_profiles'),
    ('currencies'),
    ('countries')
) AS t(table_name)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════
-- 3. التحقق من جداول المحاسبة
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '💰 جداول المحاسبة:'; END $$;

SELECT 
    t.table_name as "اسم الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('chart_of_accounts'),
    ('journal_entries'),
    ('journal_entry_lines'),
    ('fiscal_years'),
    ('account_types')
) AS t(table_name)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════
-- 4. التحقق من جداول الفواتير (التي تحتاج Triggers)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '📄 جداول الفواتير (المطلوبة للـ Triggers):'; END $$;

SELECT 
    t.table_name as "اسم الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('sales_invoices'),
    ('purchase_invoices'),
    ('payment_receipts'),
    ('payment_vouchers'),
    ('customers'),
    ('suppliers'),
    ('products')
) AS t(table_name)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق من جداول SaaS
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE ''; END $$;
DO $$ BEGIN RAISE NOTICE '🏢 جداول SaaS:'; END $$;

SELECT 
    t.table_name as "اسم الجدول",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ موجود'
        ELSE '❌ مفقود'
    END as "الحالة"
FROM (VALUES 
    ('subscription_plans'),
    ('subscriptions'),
    ('tenant_modules'),
    ('agents'),
    ('white_label_configs')
) AS t(table_name)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════
-- 6. النتيجة والتوصية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_total_tables INT;
    v_has_tenants BOOLEAN;
    v_has_accounting BOOLEAN;
    v_has_invoices BOOLEAN;
    v_recommendation TEXT;
BEGIN
    -- عد الجداول
    SELECT COUNT(*) INTO v_total_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    
    -- هل يوجد جدول tenants؟
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tenants'
    ) INTO v_has_tenants;
    
    -- هل يوجد جداول محاسبة؟
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chart_of_accounts'
    ) INTO v_has_accounting;
    
    -- هل يوجد جداول فواتير؟
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sales_invoices'
    ) INTO v_has_invoices;
    
    -- تحديد التوصية
    IF v_total_tables = 0 THEN
        v_recommendation := 'قاعدة البيانات فارغة - نحتاج لتشغيل جميع Migrations من البداية';
    ELSIF NOT v_has_tenants THEN
        v_recommendation := 'نحتاج لتشغيل: 00001_initial_schema.sql و 00002_add_tenant_system.sql';
    ELSIF NOT v_has_accounting THEN
        v_recommendation := 'نحتاج لتشغيل: 00004_add_accounting_tables.sql';
    ELSIF NOT v_has_invoices THEN
        v_recommendation := 'نحتاج لتشغيل: 00006_add_core_modules.sql';
    ELSE
        v_recommendation := 'الجداول الأساسية موجودة - يمكن تطبيق fix_accounting_triggers.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 النتيجة:';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'إجمالي الجداول: %', v_total_tables;
    RAISE NOTICE 'جدول Tenants: %', CASE WHEN v_has_tenants THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'جداول المحاسبة: %', CASE WHEN v_has_accounting THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'جداول الفواتير: %', CASE WHEN v_has_invoices THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE '💡 التوصية:';
    RAISE NOTICE '   %', v_recommendation;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
