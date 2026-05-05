-- ═══════════════════════════════════════════════════════════════════════════════
-- DIRECT SEED DATA v2 - Multi-Language Support (9 Languages)
-- سكريبت البيانات التجريبية - دعم 9 لغات
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- اللغات المدعومة:
-- AR (العربية) | EN (English) | RU (Русский) | UK (Українська) | 
-- RO (Română) | PL (Polski) | TR (Türkçe) | DE (Deutsch) | IT (Italiano)
-- ═══════════════════════════════════════════════════════════════════════════════

-- أولاً: إصلاح الـ Trigger
CREATE OR REPLACE FUNCTION auto_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(50);
    v_old_values JSONB;
    v_new_values JSONB;
    v_entity_name VARCHAR(255);
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_new_values := to_jsonb(NEW);
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
    
    BEGIN
        PERFORM log_audit(v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_entity_name, v_old_values, v_new_values);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- إنشاء الجداول الناقصة مع دعم 9 لغات
-- ═══════════════════════════════════════════════════════════════════════════════

-- مجموعات العملاء
CREATE TABLE IF NOT EXISTS customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    name_ru VARCHAR(100),
    name_uk VARCHAR(100),
    name_ro VARCHAR(100),
    name_pl VARCHAR(100),
    name_tr VARCHAR(100),
    name_de VARCHAR(100),
    name_it VARCHAR(100),
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
    name_ru VARCHAR(200),
    name_uk VARCHAR(200),
    name_ro VARCHAR(200),
    name_pl VARCHAR(200),
    name_tr VARCHAR(200),
    name_de VARCHAR(200),
    name_it VARCHAR(200),
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
    name_ru VARCHAR(100),
    name_uk VARCHAR(100),
    name_ro VARCHAR(100),
    name_pl VARCHAR(100),
    name_tr VARCHAR(100),
    name_de VARCHAR(100),
    name_it VARCHAR(100),
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
    name_ru VARCHAR(200),
    name_uk VARCHAR(200),
    name_ro VARCHAR(200),
    name_pl VARCHAR(200),
    name_tr VARCHAR(200),
    name_de VARCHAR(200),
    name_it VARCHAR(200),
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
    name_ru VARCHAR(200),
    name_uk VARCHAR(200),
    name_ro VARCHAR(200),
    name_pl VARCHAR(200),
    name_tr VARCHAR(200),
    name_de VARCHAR(200),
    name_it VARCHAR(200),
    parent_id UUID REFERENCES fabric_groups(id),
    icon VARCHAR(50) DEFAULT '📁',
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- مواد الأقمشة
CREATE TABLE IF NOT EXISTS fabric_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    name_ru VARCHAR(200),
    name_uk VARCHAR(200),
    name_ro VARCHAR(200),
    name_pl VARCHAR(200),
    name_tr VARCHAR(200),
    name_de VARCHAR(200),
    name_it VARCHAR(200),
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

-- تفعيل RLS
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_material_colors ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
DROP POLICY IF EXISTS "Enable all - customer_groups" ON customer_groups;
DROP POLICY IF EXISTS "Enable all - customers" ON customers;
DROP POLICY IF EXISTS "Enable all - supplier_groups" ON supplier_groups;
DROP POLICY IF EXISTS "Enable all - suppliers" ON suppliers;
DROP POLICY IF EXISTS "Enable all - fabric_groups" ON fabric_groups;
DROP POLICY IF EXISTS "Enable all - fabric_materials" ON fabric_materials;
DROP POLICY IF EXISTS "Enable all - fabric_material_colors" ON fabric_material_colors;

CREATE POLICY "Enable all - customer_groups" ON customer_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - supplier_groups" ON supplier_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - fabric_groups" ON fabric_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - fabric_materials" ON fabric_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all - fabric_material_colors" ON fabric_material_colors FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- إدخال البيانات التجريبية - 9 لغات
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID := (SELECT id FROM tenants LIMIT 1);
    v_company_id UUID := (SELECT id FROM companies LIMIT 1);
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
    v_acc_payable UUID;
    -- Group IDs
    v_cust_wholesale UUID;
    v_cust_retail UUID;
    v_cust_vip UUID;
    v_supp_local UUID;
    v_supp_import UUID;
    -- Fabric Groups
    v_fg_cotton UUID;
    v_fg_polyester UUID;
    v_fg_silk UUID;
    v_fg_linen UUID;
    -- Materials
    v_mat_cotton UUID;
    v_mat_satin UUID;
BEGIN
    RAISE NOTICE '🚀 بدء إدخال البيانات التجريبية (9 لغات)...';

    -- الحصول على أنواع الحسابات
    SELECT id INTO v_current_asset FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_current_liability FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_revenue FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense FROM account_types WHERE code = 'EXPENSE';

    -- ═══════════════════════════════════════════════════════════════
    -- 1. دليل الحسابات (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, is_cash_account, is_bank_account, is_receivable, is_payable, currency, is_detail, is_active)
    VALUES 
        (v_tenant_id, v_company_id, '1101', 'الصندوق الرئيسي', 'Main Cash', 'Главная касса', 'Головна каса', 'Casa principală', 'Kasa główna', 'Ana Kasa', 'Hauptkasse', 'Cassa principale', v_current_asset, true, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1102', 'البنك - غريفنا', 'Bank - UAH', 'Банк - гривна', 'Банк - гривня', 'Bancă - UAH', 'Bank - UAH', 'Banka - UAH', 'Bank - UAH', 'Banca - UAH', v_current_asset, false, true, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1103', 'البنك - دولار', 'Bank - USD', 'Банк - доллар', 'Банк - долар', 'Bancă - USD', 'Bank - USD', 'Banka - USD', 'Bank - USD', 'Banca - USD', v_current_asset, false, true, false, false, 'USD', true, true),
        (v_tenant_id, v_company_id, '1104', 'البنك - يورو', 'Bank - EUR', 'Банк - евро', 'Банк - євро', 'Bancă - EUR', 'Bank - EUR', 'Banka - EUR', 'Bank - EUR', 'Banca - EUR', v_current_asset, false, true, false, false, 'EUR', true, true),
        (v_tenant_id, v_company_id, '1201', 'الذمم المدينة', 'Accounts Receivable', 'Дебиторская задолженность', 'Дебіторська заборгованість', 'Conturi de încasat', 'Należności', 'Alacaklar', 'Forderungen', 'Crediti', v_current_asset, false, false, true, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '1301', 'المخزون', 'Inventory', 'Запасы', 'Запаси', 'Stoc', 'Zapasy', 'Stok', 'Lagerbestand', 'Inventario', v_current_asset, false, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '2101', 'الذمم الدائنة', 'Accounts Payable', 'Кредиторская задолженность', 'Кредиторська заборгованість', 'Conturi de plătit', 'Zobowiązania', 'Borçlar', 'Verbindlichkeiten', 'Debiti', v_current_liability, false, false, false, true, 'UAH', true, true),
        (v_tenant_id, v_company_id, '4101', 'إيرادات المبيعات', 'Sales Revenue', 'Выручка от продаж', 'Дохід від продажів', 'Venituri din vânzări', 'Przychody ze sprzedaży', 'Satış Geliri', 'Umsatzerlöse', 'Ricavi vendite', v_revenue, false, false, false, false, 'UAH', true, true),
        (v_tenant_id, v_company_id, '5101', 'المشتريات', 'Purchases', 'Закупки', 'Закупівлі', 'Achiziții', 'Zakupy', 'Satın Alma', 'Einkäufe', 'Acquisti', v_expense, false, false, false, false, 'UAH', true, true)
    ON CONFLICT (tenant_id, company_id, account_code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    SELECT id INTO v_acc_cash FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1101';
    SELECT id INTO v_acc_bank_uah FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1102';
    SELECT id INTO v_acc_bank_usd FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1103';
    SELECT id INTO v_acc_bank_eur FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1104';
    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '1201';
    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND account_code = '2101';

    RAISE NOTICE '✅ تم إنشاء دليل الحسابات (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 2. الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    VALUES 
        (v_tenant_id, v_company_id, 'CASH-UAH', 'الصندوق الرئيسي', 'Main Cash Box', 'cash', v_acc_cash, 'UAH', 50000, true),
        (v_tenant_id, v_company_id, 'BANK-UAH', 'PrivatBank - غريفنا', 'PrivatBank - UAH', 'bank', v_acc_bank_uah, 'UAH', 250000, true),
        (v_tenant_id, v_company_id, 'BANK-USD', 'PrivatBank - دولار', 'PrivatBank - USD', 'bank', v_acc_bank_usd, 'USD', 15000, true),
        (v_tenant_id, v_company_id, 'BANK-EUR', 'Raiffeisen - يورو', 'Raiffeisen - EUR', 'bank', v_acc_bank_eur, 'EUR', 8000, true)
    ON CONFLICT (tenant_id, company_id, code) DO UPDATE SET current_balance = EXCLUDED.current_balance;

    RAISE NOTICE '✅ تم إنشاء الصناديق والبنوك';

    -- ═══════════════════════════════════════════════════════════════
    -- 3. مجموعات العملاء (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 'Оптовики', 'Оптовики', 'Angrosisti', 'Hurtownicy', 'Toptancılar', 'Großhändler', 'Grossisti', 10, 100000, 30, true),
        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 'Розничные', 'Роздрібні', 'Retail', 'Detaliści', 'Perakendeciler', 'Einzelhändler', 'Dettaglianti', 5, 20000, 15, true),
        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 'VIP клиенты', 'VIP клієнти', 'Clienți VIP', 'Klienci VIP', 'VIP Müşteriler', 'VIP-Kunden', 'Clienti VIP', 15, 200000, 45, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    SELECT id INTO v_cust_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';

    RAISE NOTICE '✅ تم إنشاء مجموعات العملاء (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 4. العملاء (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'Золотой текстиль', 'Золотий текстиль', 'Textil de Aur', 'Złoty Tekstyl', 'Altın Tekstil', 'Goldenes Textil', 'Tessile Dorato', 'company', 'info@goldentextile.ua', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 150000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics', 'Объединённые ткани', 'Обєднані тканини', 'Țesături Unite', 'Zjednoczone Tkaniny', 'Birleşik Kumaşlar', 'Vereinigte Stoffe', 'Tessuti Uniti', 'company', 'sales@unitedfabrics.ua', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'Магазин тканей Цветы', 'Магазин тканин Квіти', 'Magazin Flori', 'Sklep Kwiaty', 'Çiçek Kumaş', 'Blumen Stoffe', 'Negozio Fiori', 'company', 'flowers@shop.ua', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 30000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'Бутик Элегант', 'Бутік Елегант', 'Butic Eleganță', 'Butik Elegancja', 'Elegans Butik', 'Eleganz Boutique', 'Boutique Eleganza', 'company', 'info@elegance.ua', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 25000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion', 'Премиум мода', 'Преміум мода', 'Modă Premium', 'Moda Premium', 'Premium Moda', 'Premium Mode', 'Moda Premium', 'company', 'vip@premium.ua', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 100000, v_acc_receivable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    RAISE NOTICE '✅ تم إنشاء العملاء (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 5. مجموعات الموردين (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 'Местные поставщики', 'Місцеві постачальники', 'Furnizori locali', 'Dostawcy lokalni', 'Yerel Tedarikçiler', 'Lokale Lieferanten', 'Fornitori locali', 30, true),
        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 'Импортёры', 'Імпортери', 'Furnizori import', 'Importerzy', 'İthalat Tedarikçileri', 'Importlieferanten', 'Fornitori import', 60, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    SELECT id INTO v_supp_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';

    RAISE NOTICE '✅ تم إنشاء مجموعات الموردين (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 6. الموردين (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'Украинская текстильная фабрика', 'Українська текстильна фабрика', 'Fabrica textilă ucraineană', 'Ukraińska fabryka tekstylna', 'Ukrayna Tekstil Fabrikası', 'Ukrainische Textilfabrik', 'Fabbrica tessile ucraina', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'Продвинутые волокна', 'Передові волокна', 'Fibre Avansate', 'Zaawansowane Włókna', 'İleri Elyaf', 'Fortschrittliche Fasern', 'Fibre Avanzate', 'company', 'info@afc.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'Текстильные фабрики Бурсы', 'Текстильні фабрики Бурси', 'Fabrici textile Bursa', 'Fabryki tekstylne Bursa', 'Bursa Tekstil Fabrikaları', 'Bursa Textilfabriken', 'Tessiture di Bursa', 'company', 'export@btm.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ', 'Guangdong Factory', 'Фабрика Гуандун', 'Фабрика Гуандун', 'Fabrica Guangdong', 'Fabryka Guangdong', 'Guangdong Fabrikası', 'Guangdong Fabrik', 'Fabbrica Guangdong', 'company', 'export@gtf.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'Хлопковые фабрики Мумбаи', 'Бавовняні фабрики Мумбаї', 'Fabrici bumbac Mumbai', 'Fabryki bawełny Mumbai', 'Mumbai Pamuk Fabrikaları', 'Mumbai Baumwollfabriken', 'Cotonifici Mumbai', 'company', 'export@mcm.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    RAISE NOTICE '✅ تم إنشاء الموردين (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 7. مجموعات الأقمشة (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active)
    VALUES 
        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', 'Хлопок', 'Бавовна', 'Bumbac', 'Bawełna', 'Pamuk', 'Baumwolle', 'Cotone', '🧵', 1, true),
        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', 'Полиэстер', 'Поліестер', 'Poliester', 'Poliester', 'Polyester', 'Polyester', 'Poliestere', '✨', 2, true),
        (v_tenant_id, 'SILK', 'حرير', 'Silk', 'Шёлк', 'Шовк', 'Mătase', 'Jedwab', 'İpek', 'Seide', 'Seta', '🦋', 3, true),
        (v_tenant_id, 'LINEN', 'كتان', 'Linen', 'Лён', 'Льон', 'In', 'Len', 'Keten', 'Leinen', 'Lino', '🌿', 4, true),
        (v_tenant_id, 'WOOL', 'صوف', 'Wool', 'Шерсть', 'Вовна', 'Lână', 'Wełna', 'Yün', 'Wolle', 'Lana', '🐑', 5, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    SELECT id INTO v_fg_cotton FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'COTTON';
    SELECT id INTO v_fg_polyester FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'POLYESTER';
    SELECT id INTO v_fg_silk FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'SILK';
    SELECT id INTO v_fg_linen FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'LINEN';

    RAISE NOTICE '✅ تم إنشاء مجموعات الأقمشة (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- 8. مواد الأقمشة (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_materials (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, group_id, composition, default_width, weight_per_meter, purchase_price, selling_price, currency, origin_country, status)
    VALUES 
        (v_tenant_id, v_company_id, 'COT-100-PLAIN', 'قطن سادة 100%', 'Plain Cotton 100%', 'Хлопок простой 100%', 'Бавовна проста 100%', 'Bumbac simplu 100%', 'Bawełna gładka 100%', 'Düz Pamuk %100', 'Glatte Baumwolle 100%', 'Cotone liscio 100%', v_fg_cotton, '100% Cotton', 150, 0.18, 45, 75, 'UAH', 'Turkey', 'active'),
        (v_tenant_id, v_company_id, 'COT-100-TWILL', 'قطن تويل 100%', 'Cotton Twill 100%', 'Хлопок твил 100%', 'Бавовна твіл 100%', 'Bumbac twill 100%', 'Bawełna twill 100%', 'Pamuk Dimi %100', 'Baumwoll-Twill 100%', 'Cotone twill 100%', v_fg_cotton, '100% Cotton', 150, 0.22, 55, 90, 'UAH', 'India', 'active'),
        (v_tenant_id, v_company_id, 'POLY-SATIN', 'بوليستر ساتان', 'Polyester Satin', 'Полиэстер сатин', 'Поліестер сатин', 'Poliester satin', 'Poliester satyna', 'Polyester Saten', 'Polyester-Satin', 'Poliestere raso', v_fg_polyester, '100% Polyester', 150, 0.12, 38, 62, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'SILK-NATURAL', 'حرير طبيعي', 'Natural Silk', 'Натуральный шёлк', 'Натуральний шовк', 'Mătase naturală', 'Jedwab naturalny', 'Doğal İpek', 'Naturseide', 'Seta naturale', v_fg_silk, '100% Silk', 140, 0.10, 180, 320, 'UAH', 'China', 'active'),
        (v_tenant_id, v_company_id, 'LINEN-100', 'كتان طبيعي 100%', '100% Natural Linen', '100% натуральный лён', '100% натуральний льон', 'In natural 100%', 'Len naturalny 100%', '%100 Doğal Keten', '100% Naturleinen', 'Lino naturale 100%', v_fg_linen, '100% Linen', 150, 0.20, 75, 125, 'UAH', 'Ukraine', 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;

    RAISE NOTICE '✅ تم إنشاء مواد الأقمشة (9 لغات)';

    -- ═══════════════════════════════════════════════════════════════
    -- ملخص
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء جميع البيانات بـ 9 لغات!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 الملخص:';
    RAISE NOTICE '   ✅ الحسابات المحاسبية: 9';
    RAISE NOTICE '   ✅ الصناديق والبنوك: 4 (UAH, USD, EUR)';
    RAISE NOTICE '   ✅ مجموعات العملاء: 3';
    RAISE NOTICE '   ✅ العملاء: 5';
    RAISE NOTICE '   ✅ مجموعات الموردين: 2';
    RAISE NOTICE '   ✅ الموردين: 5';
    RAISE NOTICE '   ✅ مجموعات الأقمشة: 5';
    RAISE NOTICE '   ✅ مواد الأقمشة: 5';
    RAISE NOTICE '';
    RAISE NOTICE '🌍 اللغات: AR | EN | RU | UK | RO | PL | TR | DE | IT';
    RAISE NOTICE '════════════════════════════════════════════════════════════';

END $$;
