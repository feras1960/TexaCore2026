-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed: شجرة الأقمشة الموسعة (59 حساب) + البيانات التجريبية
-- Extended Fabric Chart of Accounts Seed - 9 Languages
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يُنشئ:
-- 1. شجرة الحسابات الموسعة للأقمشة (59 حساب)
-- 2. الصناديق والبنوك
-- 3. مجموعات العملاء والموردين
-- 4. عملاء وموردين تجريبيين
-- 5. مجموعات وألوان ومواد الأقمشة
-- 
-- الاستخدام: شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    -- Tenant & Company
    v_tenant_id UUID;
    v_company_id UUID;
    
    -- Account Type IDs
    v_asset_type UUID;
    v_current_asset_type UUID;
    v_fixed_asset_type UUID;
    v_liability_type UUID;
    v_current_liability_type UUID;
    v_long_term_liability_type UUID;
    v_equity_type UUID;
    v_revenue_type UUID;
    v_expense_type UUID;
    v_cogs_type UUID;
    
    -- Account IDs for linking
    v_acc_cash UUID;
    v_acc_bank_local UUID;
    v_acc_bank_usd UUID;
    v_acc_bank_eur UUID;
    v_acc_receivable_wholesale UUID;
    v_acc_receivable_retail UUID;
    v_acc_payable_fabric UUID;
    v_acc_payable_other UUID;
    
    -- Customer Group IDs
    v_cust_wholesale UUID;
    v_cust_retail UUID;
    v_cust_vip UUID;
    
    -- Supplier Group IDs
    v_supp_local UUID;
    v_supp_import UUID;
    
    -- Fabric Group IDs
    v_fg_cotton UUID;
    v_fg_polyester UUID;
    v_fg_silk UUID;
    v_fg_linen UUID;
    v_fg_wool UUID;
BEGIN
    RAISE NOTICE '🚀 بدء إنشاء البيانات التجريبية للأقمشة (9 لغات)...';

    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على Tenant و Company الحاليين
    -- ═══════════════════════════════════════════════════════════════
    
    -- الحصول على أول tenant (أو يمكن تحديده يدوياً)
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant في قاعدة البيانات';
    END IF;
    
    -- الحصول على أول شركة للتينانت
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد شركة للتينانت';
    END IF;
    
    RAISE NOTICE '📌 Tenant ID: %', v_tenant_id;
    RAISE NOTICE '📌 Company ID: %', v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- الحصول على أنواع الحسابات
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_asset_type FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_term_liability_type FROM account_types WHERE code = 'LONG_TERM_LIABILITY';
    SELECT id INTO v_equity_type FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type FROM account_types WHERE code = 'COGS';

    -- ═══════════════════════════════════════════════════════════════
    -- 1️⃣ إنشاء شجرة الحسابات الموسعة للأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من عدم وجود شجرة مسبقة
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id LIMIT 1) THEN
        RAISE NOTICE '⚠️ شجرة الحسابات موجودة مسبقاً - تخطي إنشاء الشجرة';
    ELSE
        -- استدعاء دالة إنشاء الشجرة
        PERFORM create_fabric_extended_chart(v_company_id);
        RAISE NOTICE '✅ تم إنشاء شجرة الأقمشة الموسعة (59 حساب)';
    END IF;

    -- الحصول على معرفات الحسابات للربط
    SELECT id INTO v_acc_cash FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '111';
    SELECT id INTO v_acc_bank_local FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '112';
    SELECT id INTO v_acc_bank_usd FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '113';
    SELECT id INTO v_acc_bank_eur FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '114';
    SELECT id INTO v_acc_receivable_wholesale FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '115';
    SELECT id INTO v_acc_receivable_retail FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '116';
    SELECT id INTO v_acc_payable_fabric FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '211';
    SELECT id INTO v_acc_payable_other FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '212';

    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    VALUES 
        (v_tenant_id, v_company_id, 'CASH-MAIN', 'الصندوق الرئيسي', 'Main Cash Box', 'cash', v_acc_cash, 'UAH', 50000, true),
        (v_tenant_id, v_company_id, 'BANK-LOCAL', 'البنك - العملة المحلية', 'Bank - Local Currency', 'bank', v_acc_bank_local, 'UAH', 250000, true),
        (v_tenant_id, v_company_id, 'BANK-USD', 'البنك - دولار', 'Bank - USD', 'bank', v_acc_bank_usd, 'USD', 15000, true),
        (v_tenant_id, v_company_id, 'BANK-EUR', 'البنك - يورو', 'Bank - EUR', 'bank', v_acc_bank_eur, 'EUR', 8000, true)
    ON CONFLICT (tenant_id, company_id, code) DO UPDATE SET current_balance = EXCLUDED.current_balance;
    
    RAISE NOTICE '✅ تم إنشاء الصناديق والبنوك';

    -- ═══════════════════════════════════════════════════════════════
    -- 3️⃣ مجموعات العملاء (9 لغات)
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
    
    RAISE NOTICE '✅ تم إنشاء مجموعات العملاء';

    -- ═══════════════════════════════════════════════════════════════
    -- 4️⃣ مجموعات الموردين (9 لغات)
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
    
    RAISE NOTICE '✅ تم إنشاء مجموعات الموردين';

    -- ═══════════════════════════════════════════════════════════════
    -- 5️⃣ العملاء (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'Золотой текстиль', 'Золотий текстиль', 'Textil de Aur', 'Złoty Tekstyl', 'Altın Tekstil', 'Goldenes Textil', 'Tessile Dorato', 'company', 'info@goldentextile.ua', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 150000, v_acc_receivable_wholesale, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics', 'Объединённые ткани', 'Обєднані тканини', 'Țesături Unite', 'Zjednoczone Tkaniny', 'Birleşik Kumaşlar', 'Vereinigte Stoffe', 'Tessuti Uniti', 'company', 'sales@unitedfabrics.ua', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable_wholesale, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'Магазин тканей Цветы', 'Магазин тканин Квіти', 'Magazin Flori', 'Sklep Kwiaty', 'Çiçek Kumaş', 'Blumen Stoffe', 'Negozio Fiori', 'company', 'flowers@shop.ua', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 30000, v_acc_receivable_retail, 'active'),
        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'Бутик Элегант', 'Бутік Елегант', 'Butic Eleganță', 'Butik Elegancja', 'Elegans Butik', 'Eleganz Boutique', 'Boutique Eleganza', 'company', 'info@elegance.ua', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 25000, v_acc_receivable_retail, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion', 'Премиум мода', 'Преміум мода', 'Modă Premium', 'Moda Premium', 'Premium Moda', 'Premium Mode', 'Moda Premium', 'company', 'vip@premium.ua', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 100000, v_acc_receivable_wholesale, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;
    
    RAISE NOTICE '✅ تم إنشاء العملاء';

    -- ═══════════════════════════════════════════════════════════════
    -- 6️⃣ الموردين (9 لغات)
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'Украинская текстильная фабрика', 'Українська текстильна фабрика', 'Fabrica textilă ucraineană', 'Ukraińska fabryka tekstylna', 'Ukrayna Tekstil Fabrikası', 'Ukrainische Textilfabrik', 'Fabbrica tessile ucraina', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable_fabric, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'Продвинутые волокна', 'Передові волокна', 'Fibre Avansate', 'Zaawansowane Włókna', 'İleri Elyaf', 'Fortschrittliche Fasern', 'Fibre Avanzate', 'company', 'info@afc.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable_fabric, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'Текстильные фабрики Бурсы', 'Текстильні фабрики Бурси', 'Fabrici textile Bursa', 'Fabryki tekstylne Bursa', 'Bursa Tekstil Fabrikaları', 'Bursa Textilfabriken', 'Tessiture di Bursa', 'company', 'export@btm.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable_fabric, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'Фабрика Гуандун', 'Фабрика Гуандун', 'Fabrica Guangdong', 'Fabryka Guangdong', 'Guangdong Fabrikası', 'Guangdong Fabrik', 'Fabbrica Guangdong', 'company', 'export@gtf.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable_fabric, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'Хлопковые фабрики Мумбаи', 'Бавовняні фабрики Мумбаї', 'Fabrici bumbac Mumbai', 'Fabryki bawełny Mumbai', 'Mumbai Pamuk Fabrikaları', 'Mumbai Baumwollfabriken', 'Cotonifici Mumbai', 'company', 'export@mcm.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable_fabric, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
        name_uk = EXCLUDED.name_uk, name_ro = EXCLUDED.name_ro, name_pl = EXCLUDED.name_pl,
        name_tr = EXCLUDED.name_tr, name_de = EXCLUDED.name_de, name_it = EXCLUDED.name_it;
    
    RAISE NOTICE '✅ تم إنشاء الموردين';

    -- ═══════════════════════════════════════════════════════════════
    -- 7️⃣ مجموعات الأقمشة (9 لغات)
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
    SELECT id INTO v_fg_wool FROM fabric_groups WHERE tenant_id = v_tenant_id AND code = 'WOOL';
    
    RAISE NOTICE '✅ تم إنشاء مجموعات الأقمشة';

    -- ═══════════════════════════════════════════════════════════════
    -- 8️⃣ ألوان الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, hex_color, is_active)
    VALUES 
        (v_tenant_id, 'WHITE', 'أبيض', 'White', '#FFFFFF', true),
        (v_tenant_id, 'BLACK', 'أسود', 'Black', '#000000', true),
        (v_tenant_id, 'RED', 'أحمر', 'Red', '#FF0000', true),
        (v_tenant_id, 'BLUE', 'أزرق', 'Blue', '#0000FF', true),
        (v_tenant_id, 'NAVY', 'كحلي', 'Navy', '#000080', true),
        (v_tenant_id, 'GREEN', 'أخضر', 'Green', '#008000', true),
        (v_tenant_id, 'BEIGE', 'بيج', 'Beige', '#F5F5DC', true),
        (v_tenant_id, 'CREAM', 'كريمي', 'Cream', '#FFFDD0', true),
        (v_tenant_id, 'GRAY', 'رمادي', 'Gray', '#808080', true),
        (v_tenant_id, 'BURGUNDY', 'عنابي', 'Burgundy', '#800020', true),
        (v_tenant_id, 'PINK', 'وردي', 'Pink', '#FFC0CB', true),
        (v_tenant_id, 'YELLOW', 'أصفر', 'Yellow', '#FFFF00', true),
        (v_tenant_id, 'ORANGE', 'برتقالي', 'Orange', '#FFA500', true),
        (v_tenant_id, 'PURPLE', 'بنفسجي', 'Purple', '#800080', true),
        (v_tenant_id, 'BROWN', 'بني', 'Brown', '#A52A2A', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, hex_color = EXCLUDED.hex_color;
    
    RAISE NOTICE '✅ تم إنشاء ألوان الأقمشة';

    -- ═══════════════════════════════════════════════════════════════
    -- 9️⃣ وحدات القياس
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
    VALUES 
        (v_tenant_id, 'M', 'متر', 'Meter', 'length', true, 1, true),
        (v_tenant_id, 'YARD', 'ياردة', 'Yard', 'length', false, 0.9144, true),
        (v_tenant_id, 'ROLL', 'رولون', 'Roll', 'piece', true, 1, true),
        (v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'weight', true, 1, true),
        (v_tenant_id, 'PC', 'قطعة', 'Piece', 'piece', true, 1, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en;
    
    RAISE NOTICE '✅ تم إنشاء وحدات القياس';

    -- ═══════════════════════════════════════════════════════════════
    -- 🔟 تحديث نوع الشجرة للشركة
    -- ═══════════════════════════════════════════════════════════════
    
    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- نهاية البيانات التجريبية
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم إنشاء جميع البيانات التجريبية بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ملخص البيانات:';
    RAISE NOTICE '   - شجرة الحسابات: 59 حساب (الموسعة للأقمشة)';
    RAISE NOTICE '   - الصناديق والبنوك: 4';
    RAISE NOTICE '   - مجموعات العملاء: 3';
    RAISE NOTICE '   - مجموعات الموردين: 2';
    RAISE NOTICE '   - العملاء: 5';
    RAISE NOTICE '   - الموردين: 5';
    RAISE NOTICE '   - مجموعات الأقمشة: 5';
    RAISE NOTICE '   - ألوان الأقمشة: 15';
    RAISE NOTICE '   - وحدات القياس: 5';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
