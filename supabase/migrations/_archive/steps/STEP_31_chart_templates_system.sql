-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 31: نظام قوالب الشجرات المحاسبية + البيانات التجريبية
-- Chart Templates System + Demo Data for New Tenants
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. جدول chart_templates - قوالب الشجرات الجاهزة
-- 2. دالة setup_chart_templates_for_tenant - إعداد القوالب لتينانت جديد
-- 3. دالة apply_chart_template_to_company - تطبيق قالب على شركة
-- 4. دالة upgrade_company_chart - ترقية الشجرة
-- 5. دالة copy_demo_data_template - نسخ البيانات التجريبية
-- 6. دالة propagate_templates_to_all_tenants - تعميم القوالب على جميع التينانتات
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. جدول قوالب الشجرات المحاسبية
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chart_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_code VARCHAR(50) NOT NULL,
    template_name_ar VARCHAR(200) NOT NULL,
    template_name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    chart_type VARCHAR(30) NOT NULL, -- 'simple', 'extended', 'fabric_extended'
    include_demo_data BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, template_code)
);

COMMENT ON TABLE chart_templates IS 'قوالب الشجرات المحاسبية الجاهزة لكل تينانت';
COMMENT ON COLUMN chart_templates.template_code IS 'رمز القالب: simple, extended, fabric_extended, fabric_extended_demo';
COMMENT ON COLUMN chart_templates.include_demo_data IS 'هل يتضمن القالب بيانات تجريبية';

-- ═══════════════════════════════════════════════════════════════
-- 2. دالة إعداد القوالب لتينانت جديد
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_chart_templates_for_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء القوالب الأربعة للتينانت
    INSERT INTO chart_templates (tenant_id, template_code, template_name_ar, template_name_en, description_ar, description_en, chart_type, include_demo_data, is_active)
    VALUES 
        (p_tenant_id, 'simple', 'الشجرة القياسية', 'Standard Chart', 'شجرة محاسبية قياسية (~40 حساب) - مناسبة للشركات الصغيرة', 'Standard accounting chart (~40 accounts) - suitable for small companies', 'simple', false, true),
        (p_tenant_id, 'extended', 'الشجرة الموسعة', 'Extended Chart', 'شجرة محاسبية موسعة (~80 حساب) - مناسبة للشركات المتوسطة', 'Extended accounting chart (~80 accounts) - suitable for medium companies', 'extended', false, true),
        (p_tenant_id, 'fabric_extended', 'الشجرة الموسعة للأقمشة', 'Extended Fabric Chart', 'شجرة محاسبية موسعة مخصصة لتجارة الأقمشة (59 حساب)', 'Extended accounting chart for fabric trading (59 accounts)', 'fabric_extended', false, true),
        (p_tenant_id, 'fabric_extended_demo', 'الشجرة الموسعة للأقمشة + بيانات تجريبية', 'Extended Fabric Chart + Demo Data', 'شجرة محاسبية موسعة للأقمشة مع بيانات تجريبية كاملة (للاختبار والتعلم)', 'Extended fabric chart with complete demo data (for testing and learning)', 'fabric_extended', true, true)
    ON CONFLICT (tenant_id, template_code) DO UPDATE SET
        template_name_ar = EXCLUDED.template_name_ar,
        description_ar = EXCLUDED.description_ar;
    
    RAISE NOTICE '✅ تم إعداد 4 قوالب شجرات محاسبية للتينانت %', p_tenant_id;
END;
$$;

COMMENT ON FUNCTION setup_chart_templates_for_tenant(UUID) IS 'إعداد القوالب الأربعة لتينانت جديد';

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة تطبيق قالب على شركة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION apply_chart_template_to_company(
    p_company_id UUID,
    p_template_code VARCHAR(50)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_chart_type VARCHAR(30);
    v_include_demo BOOLEAN;
    v_template_id UUID;
BEGIN
    -- الحصول على tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;
    
    -- الحصول على معلومات القالب
    SELECT id, chart_type, include_demo_data INTO v_template_id, v_chart_type, v_include_demo
    FROM chart_templates
    WHERE tenant_id = v_tenant_id AND template_code = p_template_code AND is_active = true;
    
    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'القالب % غير موجود أو غير نشط', p_template_code;
    END IF;
    
    -- التحقق من وجود شجرة مسبقة
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RAISE EXCEPTION 'الشركة لديها شجرة حسابات مسبقة. استخدم دالة الترقية upgrade_company_chart()';
    END IF;
    
    -- إنشاء الشجرة حسب النوع
    CASE v_chart_type
        WHEN 'simple' THEN
            PERFORM create_simple_chart_of_accounts(p_company_id);
        WHEN 'extended' THEN
            PERFORM create_extended_chart_of_accounts(p_company_id);
        WHEN 'fabric_extended' THEN
            PERFORM create_fabric_extended_chart(p_company_id);
        ELSE
            RAISE EXCEPTION 'نوع الشجرة غير معروف: %', v_chart_type;
    END CASE;
    
    -- تحديث نوع الشجرة في الشركة
    UPDATE companies SET chart_type = v_chart_type WHERE id = p_company_id;
    
    -- إذا كان القالب يتضمن بيانات تجريبية
    IF v_include_demo THEN
        RAISE NOTICE '📦 بدء إضافة البيانات التجريبية...';
        PERFORM copy_demo_data_to_company(p_company_id);
    END IF;
    
    RAISE NOTICE '✅ تم تطبيق القالب % على الشركة %', p_template_code, p_company_id;
END;
$$;

COMMENT ON FUNCTION apply_chart_template_to_company(UUID, VARCHAR) IS 'تطبيق قالب شجرة محاسبية على شركة';

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة ترقية الشجرة المحاسبية
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upgrade_company_chart(
    p_company_id UUID,
    p_target_chart_type VARCHAR(30)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_chart_type VARCHAR(30);
    v_tenant_id UUID;
BEGIN
    -- الحصول على نوع الشجرة الحالي
    SELECT chart_type, tenant_id INTO v_current_chart_type, v_tenant_id
    FROM companies WHERE id = p_company_id;
    
    IF v_current_chart_type IS NULL THEN
        RAISE EXCEPTION 'الشركة لا تملك شجرة حسابات';
    END IF;
    
    -- التحقق من مسار الترقية الصحيح
    IF v_current_chart_type = p_target_chart_type THEN
        RAISE NOTICE 'الشركة لديها بالفعل شجرة من نوع %', p_target_chart_type;
        RETURN;
    END IF;
    
    -- مسارات الترقية المسموحة:
    -- simple → extended
    -- simple → fabric_extended
    -- extended → fabric_extended
    IF v_current_chart_type = 'simple' AND p_target_chart_type NOT IN ('extended', 'fabric_extended') THEN
        RAISE EXCEPTION 'لا يمكن الترقية من simple إلى %', p_target_chart_type;
    END IF;
    
    IF v_current_chart_type = 'extended' AND p_target_chart_type != 'fabric_extended' THEN
        RAISE EXCEPTION 'لا يمكن الترقية من extended إلى %', p_target_chart_type;
    END IF;
    
    -- تنفيذ الترقية
    CASE p_target_chart_type
        WHEN 'extended' THEN
            PERFORM create_extended_chart_of_accounts(p_company_id);
        WHEN 'fabric_extended' THEN
            PERFORM create_fabric_extended_chart(p_company_id);
        ELSE
            RAISE EXCEPTION 'نوع الشجرة المستهدف غير مدعوم: %', p_target_chart_type;
    END CASE;
    
    -- تحديث نوع الشجرة
    UPDATE companies SET chart_type = p_target_chart_type WHERE id = p_company_id;
    
    RAISE NOTICE '✅ تمت ترقية الشجرة من % إلى %', v_current_chart_type, p_target_chart_type;
END;
$$;

COMMENT ON FUNCTION upgrade_company_chart(UUID, VARCHAR) IS 'ترقية شجرة الحسابات: simple→extended→fabric_extended';

-- ═══════════════════════════════════════════════════════════════
-- 5. دالة نسخ البيانات التجريبية لشركة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION copy_demo_data_to_company(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_acc_receivable UUID;
    v_acc_payable UUID;
    v_cust_wholesale UUID;
    v_cust_retail UUID;
    v_cust_vip UUID;
    v_supp_local UUID;
    v_supp_import UUID;
    v_count INT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    
    -- الحصول على حسابات الذمم
    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE company_id = p_company_id AND account_code = '115' LIMIT 1;
    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE company_id = p_company_id AND account_code = '211' LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 'Оптовики', 'Оптовики', 'Angrosisti', 'Hurtownicy', 'Toptancılar', 'Großhändler', 'Grossisti', 10, 150000, 30, true),
        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 'Розничные', 'Роздрібні', 'Retail', 'Detaliści', 'Perakendeciler', 'Einzelhändler', 'Dettaglianti', 5, 30000, 15, true),
        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 'VIP клиенты', 'VIP клієнти', 'Clienți VIP', 'Klienci VIP', 'VIP Müşteriler', 'VIP-Kunden', 'Clienti VIP', 15, 300000, 45, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_cust_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 'Местные', 'Місцеві', 'Locali', 'Lokalni', 'Yerel', 'Lokal', 'Locali', 30, true),
        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 'Импорт', 'Імпорт', 'Import', 'Import', 'İthalat', 'Import', 'Import', 60, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    SELECT id INTO v_supp_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. العملاء
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, p_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'Золотой текстиль', 'Золотий текстиль', 'Textil de Aur', 'Złoty Tekstyl', 'Altın Tekstil', 'Goldenes Textil', 'Tessile Dorato', 'company', 'info@goldentextile.com', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
        (v_tenant_id, p_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics Factory', 'Объединённые ткани', 'Обєднані тканини', 'Țesături Unite', 'Zjednoczone Tkaniny', 'Birleşik Kumaş', 'Vereinigte Stoffe', 'Tessuti Uniti', 'company', 'sales@unitedfabrics.com', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 250000, v_acc_receivable, 'active'),
        (v_tenant_id, p_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'Магазин Цветы', 'Магазин Квіти', 'Magazin Flori', 'Sklep Kwiaty', 'Çiçek Kumaş', 'Blumen Stoffe', 'Negozio Fiori', 'company', 'flowers@shop.com', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 40000, v_acc_receivable, 'active'),
        (v_tenant_id, p_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'Бутик Элегант', 'Бутік Елегант', 'Butic Eleganță', 'Butik Elegancja', 'Elegans Butik', 'Eleganz Boutique', 'Boutique Eleganza', 'company', 'info@elegance.com', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 35000, v_acc_receivable, 'active'),
        (v_tenant_id, p_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion Group', 'Премиум мода', 'Преміум мода', 'Modă Premium', 'Moda Premium', 'Premium Moda', 'Premium Mode', 'Moda Premium', 'company', 'vip@premiumfashion.com', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 150000, v_acc_receivable, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم إضافة % عميل', v_count;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. الموردين
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, p_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'Украинская фабрика', 'Українська фабрика', 'Fabrica ucraineană', 'Ukraińska fabryka', 'Ukrayna Fabrikası', 'Ukrainische Fabrik', 'Fabbrica ucraina', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable, 'active'),
        (v_tenant_id, p_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'Продвинутые волокна', 'Передові волокна', 'Fibre Avansate', 'Zaawansowane Włókna', 'İleri Elyaf', 'Fortschrittliche Fasern', 'Fibre Avanzate', 'company', 'info@advancedfibers.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable, 'active'),
        (v_tenant_id, p_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'Текстильные фабрики Бурсы', 'Текстильні фабрики Бурси', 'Fabrici Bursa', 'Fabryki Bursa', 'Bursa Tekstil', 'Bursa Textilfabriken', 'Tessiture di Bursa', 'company', 'export@bursatextile.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable, 'active'),
        (v_tenant_id, p_company_id, 'SUPP-004', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'Фабрика Гуандун', 'Фабрика Гуандун', 'Fabrica Guangdong', 'Fabryka Guangdong', 'Guangdong Fabrikası', 'Guangdong Fabrik', 'Fabbrica Guangdong', 'company', 'export@guangdongtextile.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable, 'active'),
        (v_tenant_id, p_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'Фабрики Мумбаи', 'Фабрики Мумбаї', 'Fabrici Mumbai', 'Fabryki Mumbai', 'Mumbai Fabrikaları', 'Mumbai Fabriken', 'Cotonifici Mumbai', 'company', 'export@mumbaicotton.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم إضافة % مورد', v_count;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active)
    VALUES 
        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', 'Хлопок', 'Бавовна', 'Bumbac', 'Bawełna', 'Pamuk', 'Baumwolle', 'Cotone', '🧵', 1, true),
        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', 'Полиэстер', 'Поліестер', 'Poliester', 'Poliester', 'Polyester', 'Polyester', 'Poliestere', '✨', 2, true),
        (v_tenant_id, 'SILK', 'حرير', 'Silk', 'Шёлк', 'Шовк', 'Mătase', 'Jedwab', 'İpek', 'Seide', 'Seta', '🦋', 3, true),
        (v_tenant_id, 'LINEN', 'كتان', 'Linen', 'Лён', 'Льон', 'In', 'Len', 'Keten', 'Leinen', 'Lino', '🌿', 4, true),
        (v_tenant_id, 'WOOL', 'صوف', 'Wool', 'Шерсть', 'Вовна', 'Lână', 'Wełna', 'Yün', 'Wolle', 'Lana', '🐑', 5, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. ألوان الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, is_active)
    VALUES 
        (v_tenant_id, 'WHITE', 'أبيض', 'White', true),
        (v_tenant_id, 'BLACK', 'أسود', 'Black', true),
        (v_tenant_id, 'RED', 'أحمر', 'Red', true),
        (v_tenant_id, 'BLUE', 'أزرق', 'Blue', true),
        (v_tenant_id, 'NAVY', 'كحلي', 'Navy', true),
        (v_tenant_id, 'GREEN', 'أخضر', 'Green', true),
        (v_tenant_id, 'BEIGE', 'بيج', 'Beige', true),
        (v_tenant_id, 'CREAM', 'كريمي', 'Cream', true),
        (v_tenant_id, 'GRAY', 'رمادي', 'Gray', true),
        (v_tenant_id, 'BURGUNDY', 'عنابي', 'Burgundy', true),
        (v_tenant_id, 'PINK', 'وردي', 'Pink', true),
        (v_tenant_id, 'YELLOW', 'أصفر', 'Yellow', true),
        (v_tenant_id, 'ORANGE', 'برتقالي', 'Orange', true),
        (v_tenant_id, 'PURPLE', 'بنفسجي', 'Purple', true),
        (v_tenant_id, 'BROWN', 'بني', 'Brown', true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 7. وحدات القياس
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
    VALUES 
        (v_tenant_id, 'M', 'متر', 'Meter', 'length', true, 1, true),
        (v_tenant_id, 'YARD', 'ياردة', 'Yard', 'length', false, 0.9144, true),
        (v_tenant_id, 'ROLL', 'رولون', 'Roll', 'piece', true, 1, true),
        (v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'weight', true, 1, true),
        (v_tenant_id, 'PC', 'قطعة', 'Piece', 'piece', true, 1, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 8. الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    SELECT 
        v_tenant_id, p_company_id, 'CASH-MAIN', 'الصندوق الرئيسي', 'Main Cash', 'cash',
        (SELECT id FROM chart_of_accounts WHERE company_id = p_company_id AND account_code = '111'),
        'UAH', 75000, true
    WHERE EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id AND account_code = '111')
    ON CONFLICT (tenant_id, company_id, code) DO NOTHING;
    
    RAISE NOTICE '✅ تم إضافة البيانات التجريبية للشركة %', p_company_id;
END;
$$;

COMMENT ON FUNCTION copy_demo_data_to_company(UUID) IS 'نسخ البيانات التجريبية (عملاء، موردين، مجموعات، ألوان) لشركة';

-- ═══════════════════════════════════════════════════════════════
-- 6. دالة تعميم القوالب على جميع التينانتات الموجودة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION propagate_templates_to_all_tenants()
RETURNS TABLE(tenant_id UUID, tenant_name VARCHAR, templates_created INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    v_count INT;
BEGIN
    -- إعداد القوالب لكل تينانت موجود
    FOR rec IN SELECT id, name FROM tenants LOOP
        BEGIN
            PERFORM setup_chart_templates_for_tenant(rec.id);
            SELECT COUNT(*) INTO v_count FROM chart_templates WHERE tenant_id = rec.id;
            
            tenant_id := rec.id;
            tenant_name := rec.name;
            templates_created := v_count;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ خطأ في إعداد القوالب للتينانت %: %', rec.id, SQLERRM;
            tenant_id := rec.id;
            tenant_name := rec.name;
            templates_created := 0;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION propagate_templates_to_all_tenants() IS 'تعميم القوالب الأربعة على جميع التينانتات الموجودة';

-- ═══════════════════════════════════════════════════════════════
-- 7. تحديث Trigger إنشاء التينانت لإعداد القوالب تلقائياً
-- ═══════════════════════════════════════════════════════════════

