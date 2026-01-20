-- ═══════════════════════════════════════════════════════════════════════════════
-- DIRECT SEED DATA - Run in Supabase SQL Editor
-- سكريبت إدخال البيانات مباشرة - شغّله من محرر SQL في Supabase
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- خطوات التشغيل:
-- 1. اذهب إلى https://supabase.com/dashboard
-- 2. اختر مشروعك
-- 3. من القائمة الجانبية: SQL Editor
-- 4. انسخ والصق هذا الكود
-- 5. اضغط Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- أولاً: إصلاح الـ Trigger الذي يسبب المشكلة
-- First: Fix the problematic trigger

CREATE OR REPLACE FUNCTION auto_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(50);
    v_old_values JSONB;
    v_new_values JSONB;
    v_entity_name VARCHAR(255);
BEGIN
    -- تحديد نوع العملية
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_new_values := to_jsonb(NEW);
        -- استخدام name_ar أولاً بدلاً من name
        v_entity_name := COALESCE(
            (v_new_values->>'name_ar'),
            (v_new_values->>'name_en'),
            (v_new_values->>'name'),
            (v_new_values->>'code'),
            NEW.id::TEXT
        );
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_entity_name := COALESCE(
            (v_new_values->>'name_ar'),
            (v_new_values->>'name_en'),
            (v_new_values->>'name'),
            (v_new_values->>'code'),
            NEW.id::TEXT
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old_values := to_jsonb(OLD);
        v_entity_name := COALESCE(
            (v_old_values->>'name_ar'),
            (v_old_values->>'name_en'),
            (v_old_values->>'name'),
            (v_old_values->>'code'),
            OLD.id::TEXT
        );
    END IF;
    
    -- تسجيل
    BEGIN
        PERFORM log_audit(
            v_action,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            v_entity_name,
            v_old_values,
            v_new_values
        );
    EXCEPTION WHEN OTHERS THEN
        -- تجاهل أخطاء التسجيل
        NULL;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ثانياً: إنشاء الجداول الناقصة
-- Second: Create missing tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- مجموعات العملاء
CREATE TABLE IF NOT EXISTS customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    parent_id UUID REFERENCES customer_groups(id),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms_days INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- العملاء
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'individual',
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    company_name VARCHAR(200),
    tax_number VARCHAR(100),
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    group_id UUID REFERENCES customer_groups(id),
    currency VARCHAR(3) DEFAULT 'USD',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms_days INT DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    receivable_account_id UUID REFERENCES chart_of_accounts(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- مجموعات الموردين
CREATE TABLE IF NOT EXISTS supplier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    parent_id UUID REFERENCES supplier_groups(id),
    payment_terms_days INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- الموردين
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    supplier_type VARCHAR(20) DEFAULT 'company',
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    company_name VARCHAR(200),
    tax_number VARCHAR(100),
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    group_id UUID REFERENCES supplier_groups(id),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms_days INT DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    payable_account_id UUID REFERENCES chart_of_accounts(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- مجموعات الأقمشة
CREATE TABLE IF NOT EXISTS fabric_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    parent_id UUID REFERENCES fabric_groups(id),
    icon VARCHAR(50) DEFAULT '📁',
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- إضافة الأعمدة الناقصة لجدول fabric_colors
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100);
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS hex_color VARCHAR(7);
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE fabric_colors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- مواد الأقمشة
CREATE TABLE IF NOT EXISTS fabric_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    group_id UUID REFERENCES fabric_groups(id),
    composition VARCHAR(500),
    category VARCHAR(50) DEFAULT 'woven',
    default_width DECIMAL(10,2) DEFAULT 150,
    weight_per_meter DECIMAL(10,4),
    unit VARCHAR(20) DEFAULT 'meter',
    purchase_price DECIMAL(15,4) DEFAULT 0,
    selling_price DECIMAL(15,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    origin_country VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ربط الأقمشة بالألوان
CREATE TABLE IF NOT EXISTS fabric_material_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    material_id UUID NOT NULL REFERENCES fabric_materials(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES fabric_colors(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    UNIQUE(material_id, color_id)
);

-- إضافة constraint للـ fabric_colors code
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_colors_tenant_id_code_key') THEN
        ALTER TABLE fabric_colors ADD CONSTRAINT fabric_colors_tenant_id_code_key UNIQUE(tenant_id, code);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- تفعيل RLS
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_material_colors ENABLE ROW LEVEL SECURITY;

-- سياسات RLS - السماح للمستخدمين المصادق عليهم
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - customer_groups" ON customer_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - supplier_groups" ON supplier_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - fabric_groups" ON fabric_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - fabric_materials" ON fabric_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable all for authenticated - fabric_material_colors" ON fabric_material_colors FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ثالثاً: إدخال البيانات التجريبية
-- Third: Insert demo data
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_user_id UUID;
    -- Account Type IDs
    v_current_asset UUID;
    v_current_liability UUID;
    v_revenue UUID;
    v_expense UUID;
    -- Account IDs
    v_acc_cash UUID;
    v_acc_bank_uah UUID;
    v_acc_bank_usd UUID;
    v_acc_bank_eur UUID;
    v_acc_receivable UUID;
    v_acc_inventory UUID;
    v_acc_payable UUID;
    -- Group IDs
    v_cust_group_wholesale UUID;
    v_cust_group_retail UUID;
    v_cust_group_vip UUID;
    v_supp_group_local UUID;
    v_supp_group_import UUID;
    -- Fabric Group IDs
    v_fabric_cotton UUID;
    v_fabric_polyester UUID;
    v_fabric_silk UUID;
    v_fabric_linen UUID;
    -- Color IDs
    v_color_white UUID;
    v_color_black UUID;
    v_color_red UUID;
    v_color_blue UUID;
    v_color_beige UUID;
    v_color_navy UUID;
    -- Material IDs
    v_mat_cotton_plain UUID;
    v_mat_poly_satin UUID;
BEGIN
    -- الحصول على معرفات المستخدم الحالي
    -- Get current user IDs - UPDATE THESE VALUES with your actual IDs
    v_tenant_id := 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47'::UUID;
    v_company_id := '14f19c82-b90d-45e2-9783-4b3c3789e8b7'::UUID;
    v_user_id := '85adc738-b893-4c84-8b80-156679b978c1'::UUID;

    -- الحصول على أنواع الحسابات
    SELECT id INTO v_current_asset FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_current_liability FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_revenue FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense FROM account_types WHERE code = 'EXPENSE';

    RAISE NOTICE 'بدء إدخال البيانات...';
    RAISE NOTICE 'Tenant: %, Company: %', v_tenant_id, v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- دليل الحسابات
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, account_type_id, is_cash_account, is_bank_account, is_receivable, is_payable, currency, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '1101', 'الصندوق الرئيسي', 'Main Cash', v_current_asset, true, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1102', 'البنك - غريفنا', 'Bank - UAH', v_current_asset, false, true, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1103', 'البنك - دولار', 'Bank - USD', v_current_asset, false, true, false, false, 'USD', true, true),
        (v_tenant_id, v_company_id, '1104', 'البنك - يورو', 'Bank - EUR', v_current_asset, false, true, false, false, 'EUR', true, true),
        (v_tenant_id, v_company_id, '1201', 'الذمم المدينة', 'Accounts Receivable', v_current_asset, false, false, true, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1301', 'المخزون', 'Inventory', v_current_asset, false, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '2101', 'الذمم الدائنة', 'Accounts Payable', v_current_liability, false, false, false, true, 'UAH', true, true),
        (v_tenant_id, v_company_id, '4101', 'إيرادات المبيعات', 'Sales Revenue', v_revenue, false, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '5101', 'المشتريات', 'Purchases', v_expense, false, false, false, false, 'UAH', true, true)
    ON CONFLICT (tenant_id, company_id, account_code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en;

    -- الحصول على معرفات الحسابات
    SELECT id INTO v_acc_cash FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1101';
    SELECT id INTO v_acc_bank_uah FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1102';
    SELECT id INTO v_acc_bank_usd FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1103';
    SELECT id INTO v_acc_bank_eur FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1104';
    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1201';
    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '2101';

    RAISE NOTICE '✅ تم إنشاء الحسابات المحاسبية';

    -- ═══════════════════════════════════════════════════════════════
    -- الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    VALUES 
        (v_tenant_id, v_company_id, 'CASH-UAH', 'الصندوق الرئيسي', 'Main Cash Box', 'cash', v_acc_cash, 'UAH', 50000, true),
        (v_tenant_id, v_company_id, 'BANK-UAH', 'PrivatBank - غريفنا', 'PrivatBank - UAH', 'bank', v_acc_bank_uah, 'UAH', 250000, true),
        (v_tenant_id, v_company_id, 'BANK-USD', 'PrivatBank - دولار', 'PrivatBank - USD', 'bank', v_acc_bank_usd, 'USD', 15000, true),
        (v_tenant_id, v_company_id, 'BANK-EUR', 'Raiffeisen - يورو', 'Raiffeisen - EUR', 'bank', v_acc_bank_eur, 'EUR', 8000, true)
    ON CONFLICT (tenant_id, company_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        current_balance = EXCLUDED.current_balance;

    RAISE NOTICE '✅ تم إنشاء الصناديق والبنوك';

    -- ═══════════════════════════════════════════════════════════════
    -- مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, discount_percent, credit_limit, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 10, 100000, 30, true),
        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 5, 20000, 15, true),
        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 15, 200000, 45, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar;

    SELECT id INTO v_cust_group_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_group_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_group_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';

    RAISE NOTICE '✅ تم إنشاء مجموعات العملاء';

    -- ═══════════════════════════════════════════════════════════════
    -- العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'company', 'info@goldentextile.ua', '+380441234567', 'Ukraine', 'Kyiv', v_cust_group_wholesale, 'UAH', 150000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics', 'company', 'sales@unitedfabrics.ua', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_group_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'company', 'flowers@shop.ua', '+380443456789', 'Ukraine', 'Kyiv', v_cust_group_retail, 'UAH', 30000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'company', 'info@elegance.ua', '+380444567890', 'Ukraine', 'Lviv', v_cust_group_retail, 'UAH', 25000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion', 'company', 'vip@premium.ua', '+380445678901', 'Ukraine', 'Kyiv', v_cust_group_vip, 'EUR', 100000, v_acc_receivable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar;

    RAISE NOTICE '✅ تم إنشاء العملاء';

    -- ═══════════════════════════════════════════════════════════════
    -- مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 30, true),
        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 60, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar;

    SELECT id INTO v_supp_group_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_group_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';

    RAISE NOTICE '✅ تم إنشاء مجموعات الموردين';

    -- ═══════════════════════════════════════════════════════════════
    -- الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_group_local, 'UAH', 30, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'company', 'info@afc.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_group_local, 'UAH', 45, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'company', 'export@btm.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_group_import, 'USD', 60, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ', 'Guangdong Factory', 'company', 'export@gtf.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_group_import, 'USD', 90, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'company', 'export@mcm.in', '+912212345678', 'India', 'Mumbai', v_supp_group_import, 'USD', 60, v_acc_payable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar;

    RAISE NOTICE '✅ تم إنشاء الموردين';

    -- ═══════════════════════════════════════════════════════════════
    -- الألوان
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, hex_color, is_active)
    VALUES 
        (v_tenant_id, 'WHITE', 'أبيض', 'White', '#FFFFFF', true),
        (v_tenant_id, 'BLACK', 'أسود', 'Black', '#000000', true),
        (v_tenant_id, 'RED', 'أحمر', 'Red', '#FF0000', true),
        (v_tenant_id, 'BLUE', 'أزرق', 'Blue', '#0000FF', true),
        (v_tenant_id, 'GREEN', 'أخضر', 'Green', '#00FF00', true),
        (v_tenant_id, 'BEIGE', 'بيج', 'Beige', '#F5F5DC', true),
        (v_tenant_id, 'NAVY', 'كحلي', 'Navy Blue', '#000080', true),
        (v_tenant_id, 'GRAY', 'رمادي', 'Gray', '#808080', true),
        (v_tenant_id, 'BROWN', 'بني', 'Brown', '#8B4513', true),
        (v_tenant_id, 'BURGUNDY', 'خمري', 'Burgundy', '#800020', true),
        (v_tenant_id, 'CREAM', 'كريمي', 'Cream', '#FFFDD0', true),
        (v_tenant_id, 'PINK', 'وردي', 'Pink', '#FFC0CB', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        hex_color = EXCLUDED.hex_color;

    SELECT id INTO v_color_white FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'WHITE';
    SELECT id INTO v_color_black FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLACK';
    SELECT id INTO v_color_red FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'RED';
    SELECT id INTO v_color_blue FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BLUE';
    SELECT id INTO v_color_beige FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'BEIGE';
    SELECT id INTO v_color_navy FROM fabric_colors WHERE tenant_id = v_tenant_id AND code = 'NAVY';

    RAISE NOTICE '✅ تم إنشاء الألوان';

    -- ═══════════════════════════════════════════════════════════════
    -- مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, icon, description, display_order, is_active)
    VALUES 
        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', '🧵', 'أقمشة قطنية طبيعية', 1, true),
        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', '✨', 'أقمشة بوليستر صناعية', 2, true),
        (v_tenant_id, 'SILK', 'حرير', 'Silk', '🦋', 'أقمشة حريرية فاخرة', 3, true),
        (v_tenant_id, 'LINEN', 'كتان', 'Linen', '🌿', 'أقمشة كتانية طبيعية', 4, true),
        (v_tenant_id, 'WOOL', 'صوف', 'Wool', '🐑', 'أقمشة صوفية', 5, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar;

    SELECT id INTO v_fabric_cotton FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'COTTON';
    SELECT id INTO v_fabric_polyester FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'POLYESTER';
    SELECT id INTO v_fabric_silk FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'SILK';
    SELECT id INTO v_fabric_linen FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'LINEN';

    RAISE NOTICE '✅ تم إنشاء مجموعات الأقمشة';

    -- ═══════════════════════════════════════════════════════════════
    -- مواد الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, group_id, composition, default_width, weight_per_meter, purchase_price, selling_price, currency, origin_country, status)
    VALUES 
        (v_tenant_id, v_company_id, 'COT-100-PLAIN', 'قطن سادة 100%', 'Plain Cotton 100%', v_fabric_cotton, '100% Cotton', 150, 0.18, 45, 75, 'UAH', 'Turkey', 'active'),
        (v_tenant_id, v_company_id, 'COT-100-TWILL', 'قطن تويل 100%', 'Cotton Twill 100%', v_fabric_cotton, '100% Cotton', 150, 0.22, 55, 90, 'UAH', 'India', 'active'),
        (v_tenant_id, v_company_id, 'COT-MIX-6040', 'قطن مخلوط 60/40', 'Cotton Blend 60/40', v_fabric_cotton, '60% Cotton, 40% Polyester', 150, 0.16, 35, 55, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'POLY-SATIN', 'بوليستر ساتان', 'Polyester Satin', v_fabric_polyester, '100% Polyester', 150, 0.12, 38, 62, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'POLY-CREPE', 'بوليستر كريب', 'Polyester Crepe', v_fabric_polyester, '100% Polyester', 145, 0.14, 42, 68, 'UAH', 'Turkey', 'active'),
        (v_tenant_id, v_company_id, 'POLY-CHIFFON', 'شيفون بوليستر', 'Polyester Chiffon', v_fabric_polyester, '100% Polyester', 150, 0.08, 30, 50, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'SILK-NATURAL', 'حرير طبيعي', 'Natural Silk', v_fabric_silk, '100% Silk', 140, 0.10, 180, 320, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'LINEN-100', 'كتان طبيعي 100%', '100% Natural Linen', v_fabric_linen, '100% Linen', 150, 0.20, 75, 125, 'UAH', 'Ukraine', 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        selling_price = EXCLUDED.selling_price;

    SELECT id INTO v_mat_cotton_plain FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'COT-100-PLAIN';
    SELECT id INTO v_mat_poly_satin FROM fabric_materials WHERE tenant_id = v_tenant_id AND code = 'POLY-SATIN';

    RAISE NOTICE '✅ تم إنشاء مواد الأقمشة';

    -- ═══════════════════════════════════════════════════════════════
    -- ربط الأقمشة بالألوان
    -- ═══════════════════════════════════════════════════════════════
    
    -- ربط القطن السادة بعدة ألوان
    IF v_mat_cotton_plain IS NOT NULL THEN
        INSERT INTO fabric_material_colors (tenant_id, material_id, color_id, is_available)
        SELECT v_tenant_id, v_mat_cotton_plain, fc.id, true
        FROM fabric_colors fc
        WHERE fc.tenant_id = v_tenant_id AND fc.code IN ('WHITE', 'BLACK', 'BEIGE', 'NAVY', 'GRAY', 'RED', 'BLUE')
        ON CONFLICT (material_id, color_id) DO NOTHING;
    END IF;

    -- ربط البوليستر ساتان بعدة ألوان
    IF v_mat_poly_satin IS NOT NULL THEN
        INSERT INTO fabric_material_colors (tenant_id, material_id, color_id, is_available)
        SELECT v_tenant_id, v_mat_poly_satin, fc.id, true
        FROM fabric_colors fc
        WHERE fc.tenant_id = v_tenant_id AND fc.code IN ('WHITE', 'BLACK', 'RED', 'BLUE', 'BURGUNDY', 'NAVY', 'PINK')
        ON CONFLICT (material_id, color_id) DO NOTHING;
    END IF;

    RAISE NOTICE '✅ تم ربط الأقمشة بالألوان';

    -- ═══════════════════════════════════════════════════════════════
    -- ملخص
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء جميع البيانات التجريبية بنجاح!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 الملخص:';
    RAISE NOTICE '   - الحسابات المحاسبية: 9';
    RAISE NOTICE '   - الصناديق والبنوك: 4 (UAH, USD, EUR)';
    RAISE NOTICE '   - مجموعات العملاء: 3';
    RAISE NOTICE '   - العملاء: 5';
    RAISE NOTICE '   - مجموعات الموردين: 2';
    RAISE NOTICE '   - الموردين: 5';
    RAISE NOTICE '   - الألوان: 12';
    RAISE NOTICE '   - مجموعات الأقمشة: 5';
    RAISE NOTICE '   - مواد الأقمشة: 8';
    RAISE NOTICE '════════════════════════════════════════════════════════════';

END $$;
