-- ═══════════════════════════════════════════════════════════════════════════
-- إضافة جداول نظام الأسعار (إذا لم تكن موجودة)
-- Add Pricing System Tables (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. جدول قوائم الأسعار
CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, company_id, code)
);

-- 2. جدول عناصر قائمة الأسعار
CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(18, 4) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    min_quantity DECIMAL(18, 4) DEFAULT 1,
    max_quantity DECIMAL(18, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(price_list_id, product_id, min_quantity)
);

-- 3. تحديث جدول مجموعات العملاء
DO $$
BEGIN
    -- إضافة company_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_groups' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE customer_groups 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ تمت إضافة عمود company_id لجدول customer_groups';
    ELSE
        RAISE NOTICE '⏭️ عمود company_id موجود بالفعل في customer_groups';
    END IF;
    
    -- إضافة name (English) إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_groups' AND column_name = 'name'
    ) THEN
        ALTER TABLE customer_groups 
        ADD COLUMN name VARCHAR(200);
        RAISE NOTICE '✅ تمت إضافة عمود name لجدول customer_groups';
    ELSE
        RAISE NOTICE '⏭️ عمود name موجود بالفعل في customer_groups';
    END IF;
END $$;

-- 4. إضافة price_list_id لجدول customers إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'price_list_id'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN price_list_id UUID REFERENCES price_lists(id);
        
        RAISE NOTICE '✅ تمت إضافة عمود price_list_id لجدول customers';
    ELSE
        RAISE NOTICE '⏭️ عمود price_list_id موجود بالفعل في customers';
    END IF;
END $$;

-- 5. RLS Policies
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

-- Policy: الوصول بناءً على tenant_id
DROP POLICY IF EXISTS tenant_isolation ON price_lists;
CREATE POLICY tenant_isolation ON price_lists
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON price_list_items;
CREATE POLICY tenant_isolation ON price_list_items
    FOR ALL 
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant_company 
    ON price_lists(tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_price_lists_active 
    ON price_lists(tenant_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_price_list_items_product 
    ON price_list_items(product_id);

CREATE INDEX IF NOT EXISTS idx_price_list_items_list 
    ON price_list_items(price_list_id);

-- 7. إدراج قوائم أسعار افتراضية
DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_default_list_id UUID;
    v_retail_list_id UUID;
BEGIN
    -- الحصول على أول tenant و company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد tenant/company - تخطي البيانات الافتراضية';
        RETURN;
    END IF;
    
    -- 1. قائمة أسعار افتراضية
    INSERT INTO price_lists (tenant_id, company_id, code, name, description, currency, is_active)
    VALUES (
        v_tenant_id,
        v_company_id,
        'DEFAULT',
        'Default Price List',
        'قائمة الأسعار الافتراضية',
        'USD',
        true
    )
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_default_list_id;
    
    -- 2. قائمة أسعار التجزئة
    INSERT INTO price_lists (tenant_id, company_id, code, name, description, currency, is_active)
    VALUES (
        v_tenant_id,
        v_company_id,
        'RETAIL',
        'Retail Price List',
        'قائمة أسعار التجزئة',
        'USD',
        true
    )
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING
    RETURNING id INTO v_retail_list_id;
    
    -- 3. قائمة أسعار الجملة
    INSERT INTO price_lists (tenant_id, company_id, code, name, description, currency, is_active)
    VALUES (
        v_tenant_id,
        v_company_id,
        'WHOLESALE',
        'Wholesale Price List',
        'قائمة أسعار الجملة - خصم 15%',
        'USD',
        true
    )
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING;
    
    RAISE NOTICE '✅ تم إنشاء قوائم الأسعار الافتراضية';
    
    -- 4. مجموعات العملاء (استخدام الأعمدة الموجودة)
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, discount_percent, is_active)
    VALUES 
        (v_tenant_id, 'RETAIL', 'زبائن التجزئة', 'Retail Customers', 0, true),
        (v_tenant_id, 'WHOLESALE', 'زبائن الجملة', 'Wholesale Customers', 15, true),
        (v_tenant_id, 'VIP', 'زبائن VIP', 'VIP Customers', 20, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    RAISE NOTICE '✅ تم إنشاء مجموعات العملاء الافتراضية';
    
END $$;

-- 8. التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ نظام الأسعار جاهز!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- عرض الإحصائيات
SELECT 
    'قوائم الأسعار' as item,
    COUNT(*) as count
FROM price_lists
UNION ALL
SELECT 
    'مجموعات العملاء' as item,
    COUNT(*) as count
FROM customer_groups;
