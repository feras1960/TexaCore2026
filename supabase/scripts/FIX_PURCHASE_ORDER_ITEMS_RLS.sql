-- ═══════════════════════════════════════════════════════════════════════════
-- تدقيق شامل لسياسات RLS على جداول المشتريات
-- COMPREHENSIVE PURCHASE TABLES RLS AUDIT & FIX
-- Date: 2026-02-12
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- المشكلة: بنود المشتريات (purchase_order_items, purchase_invoice_items)
-- تحتوي tenant_id NOT NULL ولكن Frontend لا يرسلها
-- الحل: إنشاء triggers تلقائية تعبئ tenant_id من الجدول الأب
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════╗
-- ║  الخطوة 1: حذف السياسات القديمة البسيطة  ║
-- ╚═══════════════════════════════════════╝

-- purchase_order_items (السياسة القديمة من الـ migration الأولى)
DROP POLICY IF EXISTS purchase_order_items_tenant_isolation ON purchase_order_items;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  الخطوة 2: إنشاء دوال تعبئة tenant_id التلقائية         ║
-- ╚═══════════════════════════════════════════════════════════╝

-- 2A: purchase_order_items ← من purchase_orders
CREATE OR REPLACE FUNCTION public.auto_fill_purchase_order_item_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM purchase_orders
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_fill_poi_tenant ON purchase_order_items;
CREATE TRIGGER trg_auto_fill_poi_tenant
    BEFORE INSERT ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_purchase_order_item_tenant();

-- 2B: purchase_invoice_items ← من purchase_invoices
CREATE OR REPLACE FUNCTION public.auto_fill_purchase_invoice_item_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM purchase_invoices
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_fill_pii_tenant ON purchase_invoice_items;
CREATE TRIGGER trg_auto_fill_pii_tenant
    BEFORE INSERT ON purchase_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_purchase_invoice_item_tenant();

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  الخطوة 3: تطبيق السياسات الموحدة على جميع الجداول       ║
-- ╚═══════════════════════════════════════════════════════════╝

-- التنظيف: حذف أي سياسات قديمة أولاً ثم تطبيق الموحدة
DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'purchase_orders',
        'purchase_order_items',
        'purchase_invoices',
        'purchase_invoice_items',
        'purchase_returns',
        'purchase_return_items',
        'purchase_requests',
        'purchase_quotations',
        'purchase_receipts'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            -- تحقق من وجود الأعمدة
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                    PERFORM public.create_company_rls_policies(v_table, true, true);
                    RAISE NOTICE '✅ % → tenant_id + company_id', v_table;
                ELSE
                    PERFORM public.create_company_rls_policies(v_table, true, false);
                    RAISE NOTICE '✅ % → tenant_id only', v_table;
                END IF;
            ELSE
                RAISE NOTICE '⚠️ % → no tenant_id column, skipping', v_table;
            END IF;
        ELSE
            RAISE NOTICE '⏭️ % → table does not exist', v_table;
        END IF;
    END LOOP;
END $$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  الخطوة 4: التحقق النهائي                                ║
-- ╚═══════════════════════════════════════════════════════════╝

-- 4A: عرض كل السياسات على جداول المشتريات
SELECT 
    '📋 RLS Policies' as section,
    tablename, 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename LIKE 'purchase_%'
ORDER BY tablename, policyname;

-- 4B: عرض Triggers التعبئة التلقائية
SELECT 
    '🔄 Auto-fill Triggers' as section,
    tgname as trigger_name,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE 'trg_auto_fill_p%'
ORDER BY tgrelid::regclass;

-- 4C: ملخص
SELECT 
    '✅ AUDIT COMPLETE' as status,
    (SELECT count(DISTINCT tablename) FROM pg_policies WHERE tablename LIKE 'purchase_%') as tables_with_policies,
    (SELECT count(*) FROM pg_policies WHERE tablename LIKE 'purchase_%') as total_policies;
