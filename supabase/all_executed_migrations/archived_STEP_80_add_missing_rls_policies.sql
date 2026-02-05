-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 80: إضافة سياسات RLS للجداول غير المحمية
-- Add RLS Policies to Unprotected Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-01-31
-- الوصف: إضافة سياسات العزل بين المستأجرين للجداول التالية:
--   1. accounts
--   2. containers
--   3. container_expenses
--   4. container_cost_allocations
--   5. container_expense_allocations
--   6. container_items
--   7. stock_ledger
--   8. product_uom_conversions
--   9. batches
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. جدول الحسابات (accounts)
-- ═══════════════════════════════════════════════════════════════

-- تفعيل RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS tenant_isolation_select ON accounts;
DROP POLICY IF EXISTS tenant_isolation_insert ON accounts;
DROP POLICY IF EXISTS tenant_isolation_update ON accounts;
DROP POLICY IF EXISTS tenant_isolation_delete ON accounts;

-- إنشاء سياسات جديدة
CREATE POLICY tenant_isolation_select ON accounts
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON accounts
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON accounts
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON accounts
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 2. جدول الكونتينرات (containers)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON containers;
DROP POLICY IF EXISTS tenant_isolation_insert ON containers;
DROP POLICY IF EXISTS tenant_isolation_update ON containers;
DROP POLICY IF EXISTS tenant_isolation_delete ON containers;

CREATE POLICY tenant_isolation_select ON containers
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON containers
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON containers
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON containers
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 3. جدول مصاريف الكونتينر (container_expenses)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE container_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON container_expenses;
DROP POLICY IF EXISTS tenant_isolation_insert ON container_expenses;
DROP POLICY IF EXISTS tenant_isolation_update ON container_expenses;
DROP POLICY IF EXISTS tenant_isolation_delete ON container_expenses;

CREATE POLICY tenant_isolation_select ON container_expenses
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON container_expenses
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON container_expenses
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON container_expenses
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 4. جدول توزيع تكاليف الكونتينر (container_cost_allocations)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE container_cost_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON container_cost_allocations;
DROP POLICY IF EXISTS tenant_isolation_insert ON container_cost_allocations;
DROP POLICY IF EXISTS tenant_isolation_update ON container_cost_allocations;
DROP POLICY IF EXISTS tenant_isolation_delete ON container_cost_allocations;

CREATE POLICY tenant_isolation_select ON container_cost_allocations
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON container_cost_allocations
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON container_cost_allocations
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON container_cost_allocations
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 5. جدول توزيع مصاريف الكونتينر (container_expense_allocations)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE container_expense_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON container_expense_allocations;
DROP POLICY IF EXISTS tenant_isolation_insert ON container_expense_allocations;
DROP POLICY IF EXISTS tenant_isolation_update ON container_expense_allocations;
DROP POLICY IF EXISTS tenant_isolation_delete ON container_expense_allocations;

CREATE POLICY tenant_isolation_select ON container_expense_allocations
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON container_expense_allocations
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON container_expense_allocations
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON container_expense_allocations
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 6. جدول بنود الكونتينر (container_items)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE container_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON container_items;
DROP POLICY IF EXISTS tenant_isolation_insert ON container_items;
DROP POLICY IF EXISTS tenant_isolation_update ON container_items;
DROP POLICY IF EXISTS tenant_isolation_delete ON container_items;

CREATE POLICY tenant_isolation_select ON container_items
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON container_items
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON container_items
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON container_items
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 7. جدول سجل المخزون (stock_ledger)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON stock_ledger;
DROP POLICY IF EXISTS tenant_isolation_insert ON stock_ledger;
DROP POLICY IF EXISTS tenant_isolation_update ON stock_ledger;
DROP POLICY IF EXISTS tenant_isolation_delete ON stock_ledger;

CREATE POLICY tenant_isolation_select ON stock_ledger
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON stock_ledger
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON stock_ledger
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON stock_ledger
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 8. جدول تحويلات وحدات القياس (product_uom_conversions)
-- ═══════════════════════════════════════════════════════════════

-- أولاً: إضافة عمود tenant_id إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_uom_conversions' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE product_uom_conversions ADD COLUMN tenant_id UUID;
        
        -- تحديث tenant_id من جدول المنتجات
        UPDATE product_uom_conversions puc
        SET tenant_id = p.tenant_id
        FROM products p
        WHERE puc.product_id = p.id;
    END IF;
END $$;

ALTER TABLE product_uom_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON product_uom_conversions;
DROP POLICY IF EXISTS tenant_isolation_insert ON product_uom_conversions;
DROP POLICY IF EXISTS tenant_isolation_update ON product_uom_conversions;
DROP POLICY IF EXISTS tenant_isolation_delete ON product_uom_conversions;

CREATE POLICY tenant_isolation_select ON product_uom_conversions
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
        OR tenant_id IS NULL  -- للسماح بالوحدات العامة
    );

CREATE POLICY tenant_isolation_insert ON product_uom_conversions
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON product_uom_conversions
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON product_uom_conversions
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- 9. جدول الدفعات (batches)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON batches;
DROP POLICY IF EXISTS tenant_isolation_insert ON batches;
DROP POLICY IF EXISTS tenant_isolation_update ON batches;
DROP POLICY IF EXISTS tenant_isolation_delete ON batches;

CREATE POLICY tenant_isolation_select ON batches
    FOR SELECT USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_insert ON batches
    FOR INSERT WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_update ON batches
    FOR UPDATE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    ) WITH CHECK (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

CREATE POLICY tenant_isolation_delete ON batches
    FOR DELETE USING (
        (tenant_id = get_current_user_tenant_id()) 
        OR is_super_admin()
    );

-- ═══════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'accounts', 'containers', 'container_expenses', 
        'container_cost_allocations', 'container_expense_allocations',
        'container_items', 'stock_ledger', 'product_uom_conversions', 'batches'
    ];
    v_table TEXT;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = v_table
        ) THEN
            v_count := v_count + 1;
            RAISE NOTICE '✅ RLS enabled for: %', v_table;
        ELSE
            RAISE NOTICE '❌ RLS MISSING for: %', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Summary: % / 9 tables now have RLS policies', v_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
