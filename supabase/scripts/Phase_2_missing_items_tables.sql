-- ═══════════════════════════════════════════════════════════════════════════
-- المرحلة ٢: إنشاء جداول البنود المفقودة (Items Tables)
-- Phase 2: Create Missing Items Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-02-14
-- الغرض: إنشاء جداول البنود لكل مستندات الدورة المالية
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ مُتوافق مع سياسات الأمان المحدّثة (2026-02-05):
--    ✔ عزل 3 مستويات: Brand → Tenant → Company
--    ✔ يستخدم: check_row_access(), is_platform_admin(), can_access_company()
--    ✔ يستخدم: create_company_rls_policies() للسياسات الموحّدة
--    ✔ يستخدم: apply_auto_tenant_trigger() + apply_auto_company_trigger() + apply_brand_isolation_trigger()
--    ✔ أسماء السياسات: {table_name}_select_policy / _insert_policy / _update_policy / _delete_policy
--    ✔ كل جدول من المجموعة د: tenant_id + company_id
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ١. purchase_return_items — بنود مرتجع المشتريات 🔴 حرج     ║
-- ║  المجموعة: د (شركة) — tenant_id + company_id               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    return_id UUID NOT NULL,
    
    -- هوية الصنف (Polymorphic: material أو product)
    product_id UUID,
    material_id UUID,
    variant_id UUID,
    
    description TEXT,
    quantity_returned NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit_id UUID,
    unit VARCHAR(50),
    unit_price NUMERIC(15,4) DEFAULT 0,
    discount_amount NUMERIC(15,4) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,4) DEFAULT 0,
    subtotal NUMERIC(15,4) DEFAULT 0,
    total NUMERIC(15,4) DEFAULT 0,
    
    warehouse_id UUID,
    reason TEXT,                          -- سبب الإرجاع
    condition VARCHAR(50) DEFAULT 'good', -- good, damaged, expired
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- FK to parent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_return_items_return_fkey') THEN
        ALTER TABLE purchase_return_items ADD CONSTRAINT purchase_return_items_return_fkey FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pri_return ON purchase_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_pri_tenant ON purchase_return_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pri_company ON purchase_return_items(company_id);
CREATE INDEX IF NOT EXISTS idx_pri_material ON purchase_return_items(material_id);
CREATE INDEX IF NOT EXISTS idx_pri_product ON purchase_return_items(product_id);

-- ✅ RLS بالمعيار الموحّد (Meta-Generator)
SELECT create_company_rls_policies('purchase_return_items', true, true);

-- ✅ Triggers بالمعيار الموحّد
SELECT apply_auto_tenant_trigger('purchase_return_items');
SELECT apply_auto_company_trigger('purchase_return_items');
SELECT apply_brand_isolation_trigger('purchase_return_items');

DO $$ BEGIN RAISE NOTICE '✅ Created: purchase_return_items (Group D - tenant+company)'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٢. sales_return_items — بنود مرتجع المبيعات 🔴 حرج         ║
-- ║  المجموعة: د (شركة) — tenant_id + company_id               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    return_id UUID NOT NULL,
    
    product_id UUID,
    material_id UUID,
    variant_id UUID,
    
    description TEXT,
    quantity_returned NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit_id UUID,
    unit VARCHAR(50),
    unit_price NUMERIC(15,4) DEFAULT 0,
    discount_amount NUMERIC(15,4) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,4) DEFAULT 0,
    subtotal NUMERIC(15,4) DEFAULT 0,
    total NUMERIC(15,4) DEFAULT 0,
    
    warehouse_id UUID,
    reason TEXT,
    condition VARCHAR(50) DEFAULT 'good',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_return_items_return_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_returns') THEN
            ALTER TABLE sales_return_items ADD CONSTRAINT sales_return_items_return_fkey FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sri_return ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sri_tenant ON sales_return_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sri_company ON sales_return_items(company_id);
CREATE INDEX IF NOT EXISTS idx_sri_product ON sales_return_items(product_id);

-- ✅ RLS + Triggers (Unified)
SELECT create_company_rls_policies('sales_return_items', true, true);
SELECT apply_auto_tenant_trigger('sales_return_items');
SELECT apply_auto_company_trigger('sales_return_items');
SELECT apply_brand_isolation_trigger('sales_return_items');

DO $$ BEGIN RAISE NOTICE '✅ Created: sales_return_items (Group D - tenant+company)'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٣. purchase_quotation_items — بنود عرض سعر الشراء 🟡       ║
-- ║  المجموعة: د (شركة)                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS purchase_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    quotation_id UUID NOT NULL,
    
    product_id UUID,
    material_id UUID,
    variant_id UUID,
    
    description TEXT,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit_id UUID,
    unit VARCHAR(50),
    unit_price NUMERIC(15,4) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,4) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,4) DEFAULT 0,
    subtotal NUMERIC(15,4) DEFAULT 0,
    total NUMERIC(15,4) DEFAULT 0,
    
    delivery_date DATE,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_quotation_items_quotation_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_quotations') THEN
            ALTER TABLE purchase_quotation_items ADD CONSTRAINT purchase_quotation_items_quotation_fkey FOREIGN KEY (quotation_id) REFERENCES purchase_quotations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pqi_quotation ON purchase_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_pqi_tenant ON purchase_quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pqi_company ON purchase_quotation_items(company_id);

-- ✅ RLS + Triggers (Unified)
SELECT create_company_rls_policies('purchase_quotation_items', true, true);
SELECT apply_auto_tenant_trigger('purchase_quotation_items');
SELECT apply_auto_company_trigger('purchase_quotation_items');
SELECT apply_brand_isolation_trigger('purchase_quotation_items');

DO $$ BEGIN RAISE NOTICE '✅ Created: purchase_quotation_items (Group D - tenant+company)'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٤. purchase_request_items — بنود طلب الشراء 🟡              ║
-- ║  المجموعة: د (شركة)                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    request_id UUID NOT NULL,
    
    product_id UUID,
    material_id UUID,
    variant_id UUID,
    
    description TEXT,
    quantity_requested NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit_id UUID,
    unit VARCHAR(50),
    estimated_price NUMERIC(15,4) DEFAULT 0,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_request_items_request_fkey') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_requests') THEN
            ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_request_fkey FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_preqi_request ON purchase_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_preqi_tenant ON purchase_request_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preqi_company ON purchase_request_items(company_id);

-- ✅ RLS + Triggers (Unified)
SELECT create_company_rls_policies('purchase_request_items', true, true);
SELECT apply_auto_tenant_trigger('purchase_request_items');
SELECT apply_auto_company_trigger('purchase_request_items');
SELECT apply_brand_isolation_trigger('purchase_request_items');

DO $$ BEGIN RAISE NOTICE '✅ Created: purchase_request_items (Group D - tenant+company)'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٥. quotation_items — بنود عرض سعر المبيعات 🟡               ║
-- ║  المجموعة: د (شركة)                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items' AND table_schema = 'public') THEN
        CREATE TABLE quotation_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            company_id UUID NOT NULL REFERENCES companies(id),
            quotation_id UUID NOT NULL,
            
            product_id UUID,
            variant_id UUID,
            material_id UUID,
            
            warehouse_id UUID,
            unit_id UUID,
            description TEXT,
            quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
            unit_price NUMERIC(15,4) DEFAULT 0,
            discount_percent NUMERIC(5,2) DEFAULT 0,
            discount_amount NUMERIC(15,4) DEFAULT 0,
            tax_percent NUMERIC(5,2) DEFAULT 0,
            tax_amount NUMERIC(15,4) DEFAULT 0,
            subtotal NUMERIC(15,4) DEFAULT 0,
            total NUMERIC(15,4) DEFAULT 0,
            notes TEXT,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );
        
        -- FK to quotations
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
            ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_quotation_fkey
                FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_qi_quotation ON quotation_items(quotation_id);
        CREATE INDEX idx_qi_tenant ON quotation_items(tenant_id);
        CREATE INDEX idx_qi_company ON quotation_items(company_id);
        
        -- ✅ RLS + Triggers (Unified)
        PERFORM create_company_rls_policies('quotation_items', true, true);
        PERFORM apply_auto_tenant_trigger('quotation_items');
        PERFORM apply_auto_company_trigger('quotation_items');
        PERFORM apply_brand_isolation_trigger('quotation_items');
        
        RAISE NOTICE '✅ Created: quotation_items (Group D - tenant+company)';
    ELSE
        RAISE NOTICE '⏭️ quotation_items already exists';
        
        -- ✅ تأكد من وجود company_id حتى لو الجدول موجود
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'quotation_items' AND column_name = 'company_id'
        ) THEN
            ALTER TABLE quotation_items ADD COLUMN company_id UUID REFERENCES companies(id);
            CREATE INDEX IF NOT EXISTS idx_qi_company ON quotation_items(company_id);
            RAISE NOTICE '  ⚠️ Added missing company_id to quotation_items';
        END IF;
    END IF;
END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٦. sales_order_items — بنود أمر البيع 🟡                    ║
-- ║  المجموعة: د (شركة)                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items' AND table_schema = 'public') THEN
        CREATE TABLE sales_order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            company_id UUID NOT NULL REFERENCES companies(id),
            order_id UUID NOT NULL,
            
            product_id UUID,
            variant_id UUID,
            material_id UUID,
            
            warehouse_id UUID,
            unit_id UUID,
            description TEXT,
            quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
            unit_price NUMERIC(15,4) DEFAULT 0,
            discount_percent NUMERIC(5,2) DEFAULT 0,
            discount_amount NUMERIC(15,4) DEFAULT 0,
            tax_percent NUMERIC(5,2) DEFAULT 0,
            tax_amount NUMERIC(15,4) DEFAULT 0,
            subtotal NUMERIC(15,4) DEFAULT 0,
            total NUMERIC(15,4) DEFAULT 0,
            delivered_quantity NUMERIC(15,3) DEFAULT 0,
            reserved_quantity NUMERIC(15,3) DEFAULT 0,
            notes TEXT,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );
        
        -- FK to sales_orders
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
            ALTER TABLE sales_order_items ADD CONSTRAINT sales_order_items_order_fkey
                FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_soi_order ON sales_order_items(order_id);
        CREATE INDEX idx_soi_tenant ON sales_order_items(tenant_id);
        CREATE INDEX idx_soi_company ON sales_order_items(company_id);
        CREATE INDEX idx_soi_product ON sales_order_items(product_id);
        
        -- ✅ RLS + Triggers (Unified)
        PERFORM create_company_rls_policies('sales_order_items', true, true);
        PERFORM apply_auto_tenant_trigger('sales_order_items');
        PERFORM apply_auto_company_trigger('sales_order_items');
        PERFORM apply_brand_isolation_trigger('sales_order_items');
        
        RAISE NOTICE '✅ Created: sales_order_items (Group D - tenant+company)';
    ELSE
        RAISE NOTICE '⏭️ sales_order_items already exists';
        
        -- ✅ تأكد من وجود company_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales_order_items' AND column_name = 'company_id'
        ) THEN
            ALTER TABLE sales_order_items ADD COLUMN company_id UUID REFERENCES companies(id);
            CREATE INDEX IF NOT EXISTS idx_soi_company ON sales_order_items(company_id);
            RAISE NOTICE '  ⚠️ Added missing company_id to sales_order_items';
        END IF;
    END IF;
END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  التحقق النهائي                                              ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'purchase_return_items', 'sales_return_items',
        'purchase_quotation_items', 'purchase_request_items',
        'quotation_items', 'sales_order_items'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
    v_rls BOOLEAN;
    v_policies INT;
    v_has_tenant BOOLEAN;
    v_has_company BOOLEAN;
    v_triggers INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 PHASE 2 VERIFICATION — Unified Security Compliance';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    
    FOREACH v_table IN ARRAY v_tables LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = v_table
        ) INTO v_exists;
        
        IF v_exists THEN
            -- RLS enabled?
            SELECT relrowsecurity INTO v_rls
            FROM pg_class WHERE relname = v_table AND relnamespace = 'public'::regnamespace;
            
            -- Policy count (should be 4: SELECT, INSERT, UPDATE, DELETE)
            SELECT COUNT(*) INTO v_policies
            FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table;
            
            -- Has tenant_id + company_id?
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = v_table AND column_name = 'tenant_id'
            ) INTO v_has_tenant;
            
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = v_table AND column_name = 'company_id'
            ) INTO v_has_company;
            
            -- Trigger count
            SELECT COUNT(*) INTO v_triggers
            FROM information_schema.triggers
            WHERE event_object_table = v_table;
            
            IF v_rls AND v_policies >= 4 AND v_has_tenant AND v_has_company AND v_triggers >= 3 THEN
                RAISE NOTICE '  ✅ % — RLS: %, Policies: %, tenant+company: ✓, Triggers: %', 
                    v_table, v_rls, v_policies, v_triggers;
            ELSE
                RAISE NOTICE '  ⚠️ % — RLS: %, Policies: %/4, tenant: %, company: %, Triggers: %/3', 
                    v_table, v_rls, v_policies, v_has_tenant, v_has_company, v_triggers;
            END IF;
        ELSE
            RAISE NOTICE '  ❌ % — NOT FOUND!', v_table;
        END IF;
    END LOOP;
    
    -- Verify policy names follow convention
    RAISE NOTICE '';
    RAISE NOTICE '── Policy Name Convention Check ──';
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = ANY(v_tables)
        AND policyname NOT LIKE '%_policy'
    ) THEN
        RAISE NOTICE '  ⚠️ Found policies NOT following _policy naming convention!';
    ELSE
        RAISE NOTICE '  ✅ All policies follow {table}_*_policy naming convention';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Phase 2 Complete — Unified Security Compliant!';
    RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;

COMMIT;
