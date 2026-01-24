-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 30: شجرة الحسابات الموسعة للأقمشة (59 حساب)
-- Extended Fabric Chart of Accounts - 9 Languages
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. دالة create_fabric_extended_chart() - إنشاء الشجرة الموسعة للأقمشة
-- 2. دالة copy_demo_data_to_tenant() - نقل البيانات التجريبية لتينانت جديد
-- 3. تحديث companies.chart_type ليشمل 'fabric_extended'
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. تحديث أنواع الشجرة المتاحة
-- ═══════════════════════════════════════════════════════════════

-- التأكد من وجود حقل chart_type
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

COMMENT ON COLUMN companies.chart_type IS 'نوع شجرة الحسابات: simple (قياسية ~40), extended (موسعة ~80), fabric_extended (موسعة أقمشة ~59)';

-- ═══════════════════════════════════════════════════════════════
-- 2. دالة إنشاء شجرة الأقمشة الموسعة (59 حساب - 9 لغات)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
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
    
    -- Parent Account IDs
    v_assets_id UUID;
    v_current_assets_id UUID;
    v_fixed_assets_id UUID;
    v_fabric_inventory_id UUID;
    v_liabilities_id UUID;
    v_current_liabilities_id UUID;
    v_long_term_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_expenses_id UUID;
BEGIN
    -- الحصول على tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'الشركة غير موجودة أو ليس لها tenant_id';
    END IF;
    
    -- التحقق من عدم وجود شجرة مسبقة
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RAISE NOTICE 'شجرة الحسابات موجودة مسبقاً لهذه الشركة';
        RETURN;
    END IF;
    
    -- الحصول على أنواع الحسابات
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

    RAISE NOTICE '🚀 بدء إنشاء شجرة الأقمشة الموسعة (59 حساب - 9 لغات)...';

    -- ═══════════════════════════════════════════════════════════════
    -- 1️⃣ الأصول (Assets)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', 'Активы', 'Активи', 'Active', 'Aktywa', 'Varlıklar', 'Vermögenswerte', 'Attività', v_asset_type, NULL, false, true)
    RETURNING id INTO v_assets_id;

    -- 11 الأصول المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', 'Оборотные активы', 'Оборотні активи', 'Active curente', 'Aktywa obrotowe', 'Dönen Varlıklar', 'Umlaufvermögen', 'Attività correnti', v_current_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_current_assets_id;

    -- 111-118 حسابات الأصول المتداولة الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable)
    VALUES 
        (v_tenant_id, p_company_id, '111', 'الصندوق الرئيسي', 'Main Cash', 'Главная касса', 'Головна каса', 'Casa principală', 'Kasa główna', 'Ana Kasa', 'Hauptkasse', 'Cassa principale', v_current_asset_type, v_current_assets_id, true, true, true, false, false),
        (v_tenant_id, p_company_id, '112', 'البنك - العملة المحلية', 'Bank - Local Currency', 'Банк - местная валюта', 'Банк - місцева валюта', 'Bancă - monedă locală', 'Bank - waluta lokalna', 'Banka - Yerel Para', 'Bank - Landeswährung', 'Banca - valuta locale', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '113', 'البنك - دولار', 'Bank - USD', 'Банк - доллар', 'Банк - долар', 'Bancă - USD', 'Bank - USD', 'Banka - USD', 'Bank - USD', 'Banca - USD', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '114', 'البنك - يورو', 'Bank - EUR', 'Банк - евро', 'Банк - євро', 'Bancă - EUR', 'Bank - EUR', 'Banka - EUR', 'Bank - EUR', 'Banca - EUR', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '115', 'ذمم الجملة - جملة', 'Wholesale Receivables', 'Дебиторы - опт', 'Дебітори - опт', 'Creanțe en-gros', 'Należności hurtowe', 'Toptan Alacaklar', 'Großhandel-Forderungen', 'Crediti ingrosso', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '116', 'ذمم التجزئة - تجزئة', 'Retail Receivables', 'Дебиторы - розница', 'Дебітори - роздріб', 'Creanțe retail', 'Należności detaliczne', 'Perakende Alacaklar', 'Einzelhandel-Forderungen', 'Crediti dettaglio', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '117', 'أوراق القبض', 'Notes Receivable', 'Векселя к получению', 'Векселі до отримання', 'Efecte de primit', 'Weksle do otrzymania', 'Alacak Senetleri', 'Wechselforderungen', 'Effetti attivi', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Advances', 'Авансы поставщикам', 'Аванси постачальникам', 'Avansuri furnizori', 'Zaliczki dla dostawców', 'Tedarikçi Avansları', 'Lieferantenvorauszahlungen', 'Anticipi fornitori', v_current_asset_type, v_current_assets_id, true, true, false, false, false);

    -- 12 الأصول الثابتة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', 'Основные средства', 'Основні засоби', 'Active fixe', 'Aktywa trwałe', 'Duran Varlıklar', 'Anlagevermögen', 'Immobilizzazioni', v_fixed_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_fixed_assets_id;

    -- 121-129 حسابات الأصول الثابتة الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '121', 'المباني و المستودعات', 'Buildings & Warehouses', 'Здания и склады', 'Будівлі та склади', 'Clădiri și depozite', 'Budynki i magazyny', 'Binalar ve Depolar', 'Gebäude und Lager', 'Edifici e magazzini', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', 'Складское оборудование', 'Складське обладнання', 'Echipamente depozite', 'Wyposażenie magazynów', 'Depo Ekipmanları', 'Lagerausrüstung', 'Attrezzature magazzino', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث و التجهيزات', 'Furniture & Fixtures', 'Мебель и оснащение', 'Меблі та обладнання', 'Mobilier', 'Meble i wyposażenie', 'Mobilya ve Demirbaşlar', 'Möbel und Einrichtung', 'Mobili e arredi', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', 'Транспортные средства', 'Транспортні засоби', 'Vehicule', 'Pojazdy', 'Taşıtlar', 'Fahrzeuge', 'Veicoli', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة والباركود', 'IT & Barcode Systems', 'ИТ и сканеры', 'ІТ та сканери', 'IT și scanere', 'IT i skanery', 'BT ve Barkod Sistemleri', 'IT und Barcode-Systeme', 'IT e sistemi barcode', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', 'Накопленная амортизация', 'Накопичена амортизація', 'Amortizare cumulată', 'Umorzenie', 'Birikmiş Amortisman', 'Kumulierte Abschreibung', 'Fondo ammortamento', v_fixed_asset_type, v_fixed_assets_id, true, true);

    -- 129 (as parent) مخزون الأقمشة - نستخدم رقم مختلف
    -- ننشئ مخزون الأقمشة تحت الأصول المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '13', 'مخزون الأقمشة', 'Fabric Inventory', 'Запасы тканей', 'Запаси тканин', 'Stocuri textile', 'Zapasy tkanin', 'Kumaş Stoku', 'Stofflager', 'Magazzino tessuti', v_current_asset_type, v_current_assets_id, false, true)
    RETURNING id INTO v_fabric_inventory_id;

    -- 131-134 حسابات مخزون الأقمشة الفرعية (باستخدام الترميز الجديد)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '131', 'مخزون الأقمشة - رولونات', 'Fabric Stock - Rolls', 'Запасы - рулоны', 'Запаси - рулони', 'Stoc - rulouri', 'Zapasy - rolki', 'Stok - Toplar', 'Lager - Rollen', 'Stock - rotoli', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '132', 'مخزون الأقمشة - أمتار', 'Fabric Stock - Meters', 'Запасы - метры', 'Запаси - метри', 'Stoc - metri', 'Zapasy - metry', 'Stok - Metreler', 'Lager - Meter', 'Stock - metri', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '133', 'مخزون قيد التحويل', 'Inventory in Transit', 'Товары в пути', 'Товари в дорозі', 'Stoc în tranzit', 'Zapasy w tranzycie', 'Yoldaki Stok', 'Waren unterwegs', 'Merce in transito', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '134', 'مخزون معيب', 'Defective Inventory', 'Бракованный запас', 'Бракований запас', 'Stoc defect', 'Zapasy wadliwe', 'Hasarlı Stok', 'Defekter Bestand', 'Stock difettoso', v_current_asset_type, v_fabric_inventory_id, true, true);

    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ الخصوم (Liabilities)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', 'Обязательства', 'Зобов''язання', 'Pasive', 'Pasywa', 'Borçlar', 'Verbindlichkeiten', 'Passività', v_liability_type, NULL, false, true)
    RETURNING id INTO v_liabilities_id;

    -- 21 الخصوم المتداولة
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', 'Краткосрочные обязательства', 'Поточні зобов''язання', 'Pasive curente', 'Zobowiązania krótkoterminowe', 'Kısa Vadeli Borçlar', 'Kurzfristige Verbindlichkeiten', 'Passività correnti', v_current_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_current_liabilities_id;

    -- 211-216 حسابات الخصوم المتداولة الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES 
        (v_tenant_id, p_company_id, '211', 'دين الموردين - الأقمشة', 'Fabric Suppliers Payable', 'Долг поставщикам тканей', 'Борг постачальникам тканин', 'Datorii furnizori textile', 'Zobowiązania - tkaniny', 'Kumaş Tedarikçi Borçları', 'Stofflieferanten-Verbindlichkeiten', 'Debiti fornitori tessuti', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '212', 'دين الموردين - أخرى', 'Other Suppliers Payable', 'Долг прочим поставщикам', 'Борг іншим постачальникам', 'Datorii alți furnizori', 'Zobowiązania - inne', 'Diğer Tedarikçi Borçları', 'Sonstige Lieferanten-Verbindlichkeiten', 'Debiti altri fornitori', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '213', 'أوراق الدفع', 'Notes Payable', 'Векселя к оплате', 'Векселі до сплати', 'Efecte de plătit', 'Weksle do zapłaty', 'Borç Senetleri', 'Wechselverbindlichkeiten', 'Effetti passivi', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '214', 'الرواتب المستحقة', 'Accrued Salaries', 'Начисленная зарплата', 'Нарахована зарплата', 'Salarii datorate', 'Wynagrodzenia należne', 'Tahakkuk Eden Maaşlar', 'Lohnverbindlichkeiten', 'Stipendi maturati', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, p_company_id, '215', 'ضريبة القيمة المضافة', 'VAT Payable', 'НДС к уплате', 'ПДВ до сплати', 'TVA de plătit', 'VAT należny', 'KDV Borcu', 'Umsatzsteuer-Verbindlichkeiten', 'IVA a debito', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, p_company_id, '216', 'الدفعات المقدمة للعملاء', 'Customer Advances', 'Авансы от покупателей', 'Аванси від покупців', 'Avansuri clienți', 'Zaliczki od klientów', 'Müşteri Avansları', 'Kundenvorauszahlungen', 'Anticipi clienti', v_current_liability_type, v_current_liabilities_id, true, true, false);

    -- 22 الخصوم طويلة الأجل
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'Долгосрочные обязательства', 'Довгострокові зобов''язання', 'Pasive pe termen lung', 'Zobowiązania długoterminowe', 'Uzun Vadeli Borçlar', 'Langfristige Verbindlichkeiten', 'Passività a lungo termine', v_long_term_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_long_term_liabilities_id;

    -- 221 القروض طويلة الأجل
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', 'Долгосрочные займы', 'Довгострокові позики', 'Împrumuturi pe termen lung', 'Kredyty długoterminowe', 'Uzun Vadeli Krediler', 'Langfristige Darlehen', 'Mutui a lungo termine', v_long_term_liability_type, v_long_term_liabilities_id, true, true);

    -- ═══════════════════════════════════════════════════════════════
    -- 3️⃣ حقوق الملكية (Equity)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', 'Капитал', 'Капітал', 'Capitaluri', 'Kapitał', 'Öz Sermaye', 'Eigenkapital', 'Patrimonio netto', v_equity_type, NULL, false, true)
    RETURNING id INTO v_equity_id;

    -- 31-33 حسابات حقوق الملكية الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', 'Уставный капитал', 'Статутний капітал', 'Capital social', 'Kapitał zakładowy', 'Sermaye', 'Gezeichnetes Kapital', 'Capitale sociale', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', 'Нераспределённая прибыль', 'Нерозподілений прибуток', 'Profit reportat', 'Zysk zatrzymany', 'Dağıtılmamış Karlar', 'Gewinnvortrag', 'Utili a nuovo', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', 'Прибыль/убыток года', 'Прибуток/збиток року', 'Profit/Pierdere curentă', 'Wynik roku bieżącego', 'Cari Yıl Kar/Zarar', 'Jahresüberschuss/-fehlbetrag', 'Utile/perdita d''esercizio', v_equity_type, v_equity_id, true, true);

    -- ═══════════════════════════════════════════════════════════════
    -- 4️⃣ الإيرادات (Revenue)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', 'Доходы', 'Доходи', 'Venituri', 'Przychody', 'Gelirler', 'Erträge', 'Ricavi', v_revenue_type, NULL, false, true)
    RETURNING id INTO v_revenue_id;

    -- 41-47 حسابات الإيرادات الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '41', 'مبيعات الأقمشة - جملة', 'Fabric Sales - Wholesale', 'Продажи тканей - опт', 'Продажі тканин - опт', 'Vânzări textile en-gros', 'Sprzedaż tkanin - hurt', 'Kumaş Satışları - Toptan', 'Stoffverkäufe - Großhandel', 'Vendite tessuti - ingrosso', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '42', 'مبيعات الأقمشة - تجزئة', 'Fabric Sales - Retail', 'Продажи тканей - розница', 'Продажі тканин - роздріб', 'Vânzări textile retail', 'Sprzedaż tkanin - detal', 'Kumaş Satışları - Perakende', 'Stoffverkäufe - Einzelhandel', 'Vendite tessuti - dettaglio', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '43', 'مبيعات الرولونات', 'Roll Sales', 'Продажи рулонов', 'Продажі рулонів', 'Vânzări rulouri', 'Sprzedaż rolek', 'Top Satışları', 'Rollenverkäufe', 'Vendite rotoli', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'خصومات المبيعات', 'Sales Discounts', 'Скидки с продаж', 'Знижки з продажів', 'Reduceri vânzări', 'Rabaty sprzedaży', 'Satış İskontoları', 'Verkaufsrabatte', 'Sconti vendite', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'مردودات المبيعات', 'Sales Returns', 'Возвраты продаж', 'Повернення продажів', 'Retururi vânzări', 'Zwroty sprzedaży', 'Satış İadeleri', 'Verkaufsrückgaben', 'Resi su vendite', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'إيرادات أخرى', 'Other Income', 'Прочие доходы', 'Інші доходи', 'Alte venituri', 'Inne przychody', 'Diğer Gelirler', 'Sonstige Erträge', 'Altri ricavi', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '47', 'أرباح فروقات العملة', 'FX Gains', 'Курсовые доходы', 'Курсові доходи', 'Câștiguri din curs', 'Zyski kursowe', 'Kur Farkı Kazançları', 'Währungsgewinne', 'Utili su cambi', v_revenue_type, v_revenue_id, true, true);

    -- ═══════════════════════════════════════════════════════════════
    -- 5️⃣ المصروفات (Expenses)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', 'Расходы', 'Витрати', 'Cheltuieli', 'Koszty', 'Giderler', 'Aufwendungen', 'Costi', v_expense_type, NULL, false, true)
    RETURNING id INTO v_expenses_id;

    -- 51-595 حسابات المصروفات الفرعية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '51', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', 'Себестоимость тканей', 'Собівартість тканин', 'Costul textilelor', 'Koszt tkanin', 'Satılan Kumaş Maliyeti', 'Stoffkosten', 'Costo tessuti venduti', v_cogs_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '52', 'مصاريف العينات', 'Sample Expenses', 'Расходы на образцы', 'Витрати на зразки', 'Cheltuieli cu mostre', 'Koszty próbek', 'Numune Giderleri', 'Musterkosten', 'Costi campioni', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '53', 'مصاريف القص والهالك', 'Cutting & Waste', 'Расходы на отходы', 'Витрати на відходи', 'Cheltuieli cu deșeurile', 'Koszty odpadów', 'Kesim ve Fire Giderleri', 'Schnitt- und Abfallkosten', 'Costi taglio e scarti', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '54', 'مصاريف الشحن والجمارك', 'Shipping & Customs', 'Расходы на доставку', 'Витрати на доставку', 'Cheltuieli cu transportul', 'Koszty wysyłki', 'Nakliye ve Gümrük Giderleri', 'Versand- und Zollkosten', 'Costi spedizione e dogana', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '55', 'مصاريف التخزين', 'Storage Expenses', 'Складские расходы', 'Складські витрати', 'Cheltuieli depozitare', 'Koszty magazynowania', 'Depolama Giderleri', 'Lagerkosten', 'Costi deposito', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '56', 'مصروفات الرواتب', 'Salary Expenses', 'Расходы на зарплату', 'Витрати на зарплату', 'Cheltuieli cu salariile', 'Koszty wynagrodzeń', 'Maaş Giderleri', 'Gehaltskosten', 'Costi stipendi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات الإيجار', 'Rent Expenses', 'Расходы на аренду', 'Витрати на оренду', 'Cheltuieli cu chiria', 'Koszty najmu', 'Kira Giderleri', 'Mietkosten', 'Costi affitto', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '58', 'مصروفات المرافق', 'Utilities', 'Коммунальные витрати', 'Комунальні витрати', 'Cheltuieli cu utilitățile', 'Koszty mediów', 'Fatura Giderleri', 'Nebenkosten', 'Costi utenze', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '59', 'مصروفات التسويق', 'Marketing', 'Маркетинговые расходы', 'Маркетингові витрати', 'Cheltuieli de marketing', 'Koszty marketingu', 'Pazarlama Giderleri', 'Marketingkosten', 'Costi marketing', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '591', 'مصروفات إدارية', 'Administrative', 'Административные расходы', 'Адміністративні витрати', 'Cheltuieli administrative', 'Koszty administracyjne', 'İdari Giderler', 'Verwaltungskosten', 'Costi amministrativi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '592', 'مصروفات الإهلاك', 'Depreciation', 'Амортизация', 'Амортизація', 'Cheltuieli cu amortizarea', 'Koszty amortyzacji', 'Amortisman Giderleri', 'Abschreibungen', 'Ammortamenti', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات البنوك', 'Bank Charges', 'Банковские расходы', 'Банківські витрати', 'Comisioane bancare', 'Opłaty bankowe', 'Banka Masrafları', 'Bankgebühren', 'Spese bancarie', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '594', 'خسائر فروقات العملة', 'FX Losses', 'Курсовые убытки', 'Курсові збитки', 'Pierderi din curs', 'Straty kursowe', 'Kur Farkı Zararları', 'Währungsverluste', 'Perdite su cambi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '595', 'فروق المخزون', 'Inventory Variances', 'Инвентаризационные разницы', 'Інвентаризаційні різниці', 'Diferențe de inventar', 'Różnice inwentaryzacyjne', 'Stok Farkları', 'Inventurdifferenzen', 'Differenze inventariali', v_expense_type, v_expenses_id, true, true);

    -- تحديث نوع الشجرة للشركة
    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;
    
    RAISE NOTICE '✅ تم إنشاء شجرة الأقمشة الموسعة بنجاح للشركة % - عدد الحسابات: 59', p_company_id;
END;
$$;

COMMENT ON FUNCTION create_fabric_extended_chart(UUID) IS 'إنشاء شجرة حسابات موسعة للأقمشة (59 حساب) - 9 لغات';

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة نقل البيانات التجريبية من تينانت لآخر
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION copy_demo_data_to_tenant(
    p_source_tenant_id UUID,
    p_target_tenant_id UUID,
    p_target_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_company_id UUID;
BEGIN
    -- الحصول على الشركة المصدر
    SELECT id INTO v_source_company_id FROM companies WHERE tenant_id = p_source_tenant_id LIMIT 1;
    IF v_source_company_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد شركة في التينانت المصدر';
    END IF;

    RAISE NOTICE '🚀 بدء نقل البيانات التجريبية من التينانت % إلى %', p_source_tenant_id, p_target_tenant_id;

    -- نسخ مجموعات العملاء
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active)
    SELECT p_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active
    FROM customer_groups WHERE tenant_id = p_source_tenant_id
    ON CONFLICT (tenant_id, code) DO NOTHING;
    RAISE NOTICE '✅ تم نسخ مجموعات العملاء';

    -- نسخ مجموعات الموردين
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active)
    SELECT p_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active
    FROM supplier_groups WHERE tenant_id = p_source_tenant_id
    ON CONFLICT (tenant_id, code) DO NOTHING;
    RAISE NOTICE '✅ تم نسخ مجموعات الموردين';

    -- نسخ مجموعات الأقمشة
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active)
    SELECT p_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active
    FROM fabric_groups WHERE tenant_id = p_source_tenant_id
    ON CONFLICT (tenant_id, code) DO NOTHING;
    RAISE NOTICE '✅ تم نسخ مجموعات الأقمشة';

    -- نسخ ألوان الأقمشة
    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, hex_color, is_active)
    SELECT p_target_tenant_id, code, name_ar, name_en, hex_color, is_active
    FROM fabric_colors WHERE tenant_id = p_source_tenant_id
    ON CONFLICT (tenant_id, code) DO NOTHING;
    RAISE NOTICE '✅ تم نسخ ألوان الأقمشة';

    -- نسخ وحدات القياس
    INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
    SELECT p_target_tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active
    FROM units_of_measure WHERE tenant_id = p_source_tenant_id
    ON CONFLICT (tenant_id, code) DO NOTHING;
    RAISE NOTICE '✅ تم نسخ وحدات القياس';

    RAISE NOTICE '🎉 تم نقل جميع البيانات التجريبية بنجاح!';
END;
$$;

COMMENT ON FUNCTION copy_demo_data_to_tenant(UUID, UUID, UUID) IS 'نقل البيانات التجريبية (المجموعات، الألوان، الوحدات) من تينانت لآخر';

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة اختيار نوع الشجرة عند التسجيل
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_company_chart(
    p_company_id UUID,
    p_chart_type VARCHAR(30) DEFAULT 'simple'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- التحقق من نوع الشجرة المطلوب وإنشاؤها
    CASE p_chart_type
        WHEN 'simple' THEN
            PERFORM create_simple_chart_of_accounts(p_company_id);
        WHEN 'extended' THEN
            PERFORM create_extended_chart_of_accounts(p_company_id);
        WHEN 'fabric_extended' THEN
            PERFORM create_fabric_extended_chart(p_company_id);
        ELSE
            RAISE EXCEPTION 'نوع الشجرة غير معروف: %. الأنواع المتاحة: simple, extended, fabric_extended', p_chart_type;
    END CASE;
    
    RAISE NOTICE '✅ تم إعداد شجرة الحسابات من نوع % للشركة %', p_chart_type, p_company_id;
END;
$$;

COMMENT ON FUNCTION setup_company_chart(UUID, VARCHAR) IS 'إعداد شجرة الحسابات للشركة بناءً على النوع المختار: simple (قياسية), extended (موسعة), fabric_extended (موسعة أقمشة)';

-- ═══════════════════════════════════════════════════════════════
-- 5. تحديث Trigger لإتاحة اختيار نوع الشجرة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_company_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء الشجرة بناءً على النوع المحدد في الشركة
    -- إذا لم يكن محدداً، استخدم simple كافتراضي
    CASE COALESCE(NEW.chart_type, 'simple')
        WHEN 'fabric_extended' THEN
            PERFORM create_fabric_extended_chart(NEW.id);
        WHEN 'extended' THEN
            PERFORM create_extended_chart_of_accounts(NEW.id);
        ELSE
            PERFORM create_simple_chart_of_accounts(NEW.id);
    END CASE;
    
    RAISE NOTICE '✅ تم إنشاء شجرة الحسابات تلقائياً للشركة الجديدة: % (نوع: %)', NEW.id, COALESCE(NEW.chart_type, 'simple');
    
    RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- نهاية الملف
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء STEP 30: شجرة الأقمشة الموسعة بنجاح';
    RAISE NOTICE '';
    RAISE NOTICE '📋 الدوال المتاحة:';
    RAISE NOTICE '   - create_fabric_extended_chart(company_id) - إنشاء الشجرة الموسعة (59 حساب)';
    RAISE NOTICE '   - copy_demo_data_to_tenant(source, target, company) - نقل البيانات التجريبية';
    RAISE NOTICE '   - setup_company_chart(company_id, chart_type) - اختيار نوع الشجرة';
    RAISE NOTICE '';
    RAISE NOTICE '📊 أنواع الشجرات المتاحة:';
    RAISE NOTICE '   - simple: القياسية (~40 حساب)';
    RAISE NOTICE '   - extended: الموسعة (~80 حساب)';
    RAISE NOTICE '   - fabric_extended: الموسعة للأقمشة (59 حساب)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
