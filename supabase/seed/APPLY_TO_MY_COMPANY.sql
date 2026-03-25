-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 تطبيق شجرة الأقمشة الموسعة + البيانات التجريبية على شركتك
-- Apply Extended Fabric Chart + Demo Data to Your Company
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- الاستخدام: شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 0: إضافة حقل chart_type للشركات (إذا لم يكن موجوداً)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';
COMMENT ON COLUMN companies.chart_type IS 'نوع شجرة الحسابات: simple, extended, fabric_extended';

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 1: إنشاء دالة شجرة الأقمشة الموسعة (إذا لم تكن موجودة)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_fabric_extended_chart(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
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
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;
    
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
        RAISE NOTICE '⚠️ شجرة الحسابات موجودة - سيتم حذفها وإعادة إنشائها';
        DELETE FROM chart_of_accounts WHERE company_id = p_company_id;
    END IF;
    
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

    -- 1️⃣ الأصول
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '1', 'الأصول', 'Assets', 'Активы', 'Активи', 'Active', 'Aktywa', 'Varlıklar', 'Vermögenswerte', 'Attività', v_asset_type, NULL, false, true)
    RETURNING id INTO v_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '11', 'الأصول المتداولة', 'Current Assets', 'Оборотные активы', 'Оборотні активи', 'Active curente', 'Aktywa obrotowe', 'Dönen Varlıklar', 'Umlaufvermögen', 'Attività correnti', v_current_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_current_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable)
    VALUES 
        (v_tenant_id, p_company_id, '111', 'الصندوق الرئيسي', 'Main Cash', 'Главная касса', 'Головна каса', 'Casa principală', 'Kasa główna', 'Ana Kasa', 'Hauptkasse', 'Cassa principale', v_current_asset_type, v_current_assets_id, true, true, true, false, false),
        (v_tenant_id, p_company_id, '112', 'البنك - العملة المحلية', 'Bank - Local Currency', 'Банк - местная валюта', 'Банк - місцева валюта', 'Bancă - monedă locală', 'Bank - waluta lokalna', 'Banka - Yerel Para', 'Bank - Landeswährung', 'Banca - valuta locale', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '113', 'البنك - دولار', 'Bank - USD', 'Банк - доллар', 'Банк - долар', 'Bancă - USD', 'Bank - USD', 'Banka - USD', 'Bank - USD', 'Banca - USD', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '114', 'البنك - يورو', 'Bank - EUR', 'Банк - евро', 'Банк - євро', 'Bancă - EUR', 'Bank - EUR', 'Banka - EUR', 'Bank - EUR', 'Banca - EUR', v_current_asset_type, v_current_assets_id, true, true, false, true, false),
        (v_tenant_id, p_company_id, '115', 'ذمم الجملة', 'Wholesale Receivables', 'Дебиторы - опт', 'Дебітори - опт', 'Creanțe en-gros', 'Należności hurtowe', 'Toptan Alacaklar', 'Großhandel-Forderungen', 'Crediti ingrosso', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '116', 'ذمم التجزئة', 'Retail Receivables', 'Дебиторы - розница', 'Дебітори - роздріб', 'Creanțe retail', 'Należności detaliczne', 'Perakende Alacaklar', 'Einzelhandel-Forderungen', 'Crediti dettaglio', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '117', 'أوراق القبض', 'Notes Receivable', 'Векселя к получению', 'Векселі до отримання', 'Efecte de primit', 'Weksle do otrzymania', 'Alacak Senetleri', 'Wechselforderungen', 'Effetti attivi', v_current_asset_type, v_current_assets_id, true, true, false, false, true),
        (v_tenant_id, p_company_id, '118', 'الدفعات المقدمة للموردين', 'Supplier Advances', 'Авансы поставщикам', 'Аванси постачальникам', 'Avansuri furnizori', 'Zaliczki dla dostawców', 'Tedarikçi Avansları', 'Lieferantenvorauszahlungen', 'Anticipi fornitori', v_current_asset_type, v_current_assets_id, true, true, false, false, false);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', 'Основные средства', 'Основні засоби', 'Active fixe', 'Aktywa trwałe', 'Duran Varlıklar', 'Anlagevermögen', 'Immobilizzazioni', v_fixed_asset_type, v_assets_id, false, true)
    RETURNING id INTO v_fixed_assets_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '121', 'المباني و المستودعات', 'Buildings & Warehouses', 'Здания и склады', 'Будівлі та склади', 'Clădiri și depozite', 'Budynki i magazyny', 'Binalar ve Depolar', 'Gebäude und Lager', 'Edifici e magazzini', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '122', 'معدات المستودعات', 'Warehouse Equipment', 'Складское оборудование', 'Складське обладнання', 'Echipamente depozite', 'Wyposażenie magazynów', 'Depo Ekipmanları', 'Lagerausrüstung', 'Attrezzature magazzino', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '123', 'الأثاث و التجهيزات', 'Furniture & Fixtures', 'Мебель и оснащение', 'Меблі та обладнання', 'Mobilier', 'Meble i wyposażenie', 'Mobilya ve Demirbaşlar', 'Möbel und Einrichtung', 'Mobili e arredi', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '124', 'وسائل النقل', 'Vehicles', 'Транспортные средства', 'Транспортні засоби', 'Vehicule', 'Pojazdy', 'Taşıtlar', 'Fahrzeuge', 'Veicoli', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '125', 'أجهزة الكمبيوتر والأنظمة', 'IT & Systems', 'ИТ и системы', 'ІТ та системи', 'IT și sisteme', 'IT i systemy', 'BT ve Sistemler', 'IT und Systeme', 'IT e sistemi', v_fixed_asset_type, v_fixed_assets_id, true, true),
        (v_tenant_id, p_company_id, '129', 'الإهلاك المتراكم', 'Accumulated Depreciation', 'Накопленная амортизация', 'Накопичена амортизація', 'Amortizare cumulată', 'Umorzenie', 'Birikmiş Amortisman', 'Kumulierte Abschreibung', 'Fondo ammortamento', v_fixed_asset_type, v_fixed_assets_id, true, true);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '13', 'مخزون الأقمشة', 'Fabric Inventory', 'Запасы тканей', 'Запаси тканин', 'Stocuri textile', 'Zapasy tkanin', 'Kumaş Stoku', 'Stofflager', 'Magazzino tessuti', v_current_asset_type, v_current_assets_id, false, true)
    RETURNING id INTO v_fabric_inventory_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '131', 'مخزون الأقمشة - رولونات', 'Fabric Stock - Rolls', 'Запасы - рулоны', 'Запаси - рулони', 'Stoc - rulouri', 'Zapasy - rolki', 'Stok - Toplar', 'Lager - Rollen', 'Stock - rotoli', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '132', 'مخزون الأقمشة - أمتار', 'Fabric Stock - Meters', 'Запасы - метры', 'Запаси - метри', 'Stoc - metri', 'Zapasy - metry', 'Stok - Metreler', 'Lager - Meter', 'Stock - metri', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '133', 'مخزون قيد التحويل', 'Inventory in Transit', 'Товары в пути', 'Товари в дорозі', 'Stoc în tranzit', 'Zapasy w tranzycie', 'Yoldaki Stok', 'Waren unterwegs', 'Merce in transito', v_current_asset_type, v_fabric_inventory_id, true, true),
        (v_tenant_id, p_company_id, '134', 'مخزون معيب', 'Defective Inventory', 'Бракованный запас', 'Бракований запас', 'Stoc defect', 'Zapasy wadliwe', 'Hasarlı Stok', 'Defekter Bestand', 'Stock difettoso', v_current_asset_type, v_fabric_inventory_id, true, true);

    -- 2️⃣ الخصوم
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '2', 'الخصوم', 'Liabilities', 'Обязательства', 'Зобов''язання', 'Pasive', 'Pasywa', 'Borçlar', 'Verbindlichkeiten', 'Passività', v_liability_type, NULL, false, true)
    RETURNING id INTO v_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', 'Краткосрочные обязательства', 'Поточні зобов''язання', 'Pasive curente', 'Zobowiązania krótkoterminowe', 'Kısa Vadeli Borçlar', 'Kurzfristige Verbindlichkeiten', 'Passività correnti', v_current_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_current_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active, is_payable)
    VALUES 
        (v_tenant_id, p_company_id, '211', 'دين موردين الأقمشة', 'Fabric Suppliers Payable', 'Долг поставщикам тканей', 'Борг постачальникам тканин', 'Datorii furnizori textile', 'Zobowiązania - tkaniny', 'Kumaş Tedarikçi Borçları', 'Stofflieferanten-Verbindlichkeiten', 'Debiti fornitori tessuti', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '212', 'دين موردين آخرين', 'Other Suppliers Payable', 'Долг прочим поставщикам', 'Борг іншим постачальникам', 'Datorii alți furnizori', 'Zobowiązania - inne', 'Diğer Tedarikçi Borçları', 'Sonstige Lieferanten-Verbindlichkeiten', 'Debiti altri fornitori', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '213', 'أوراق الدفع', 'Notes Payable', 'Векселя к оплате', 'Векселі до сплати', 'Efecte de plătit', 'Weksle do zapłaty', 'Borç Senetleri', 'Wechselverbindlichkeiten', 'Effetti passivi', v_current_liability_type, v_current_liabilities_id, true, true, true),
        (v_tenant_id, p_company_id, '214', 'الرواتب المستحقة', 'Accrued Salaries', 'Начисленная зарплата', 'Нарахована зарплата', 'Salarii datorate', 'Wynagrodzenia należne', 'Tahakkuk Eden Maaşlar', 'Lohnverbindlichkeiten', 'Stipendi maturati', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, p_company_id, '215', 'ضريبة القيمة المضافة', 'VAT Payable', 'НДС к уплате', 'ПДВ до сплати', 'TVA de plătit', 'VAT należny', 'KDV Borcu', 'Umsatzsteuer', 'IVA a debito', v_current_liability_type, v_current_liabilities_id, true, true, false),
        (v_tenant_id, p_company_id, '216', 'دفعات مقدمة من العملاء', 'Customer Advances', 'Авансы от покупателей', 'Аванси від покупців', 'Avansuri clienți', 'Zaliczki od klientów', 'Müşteri Avansları', 'Kundenvorauszahlungen', 'Anticipi clienti', v_current_liability_type, v_current_liabilities_id, true, true, false);

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'Долгосрочные обязательства', 'Довгострокові зобов''язання', 'Pasive pe termen lung', 'Zobowiązania długoterminowe', 'Uzun Vadeli Borçlar', 'Langfristige Verbindlichkeiten', 'Passività a lungo termine', v_long_term_liability_type, v_liabilities_id, false, true)
    RETURNING id INTO v_long_term_liabilities_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '221', 'القروض طويلة الأجل', 'Long-term Loans', 'Долгосрочные займы', 'Довгострокові позики', 'Împrumuturi pe termen lung', 'Kredyty długoterminowe', 'Uzun Vadeli Krediler', 'Langfristige Darlehen', 'Mutui a lungo termine', v_long_term_liability_type, v_long_term_liabilities_id, true, true);

    -- 3️⃣ حقوق الملكية
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '3', 'حقوق الملكية', 'Equity', 'Капитал', 'Капітал', 'Capitaluri', 'Kapitał', 'Öz Sermaye', 'Eigenkapital', 'Patrimonio netto', v_equity_type, NULL, false, true)
    RETURNING id INTO v_equity_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '31', 'رأس المال', 'Capital', 'Уставный капитал', 'Статутний капітал', 'Capital social', 'Kapitał zakładowy', 'Sermaye', 'Gezeichnetes Kapital', 'Capitale sociale', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', 'Нераспределённая прибыль', 'Нерозподілений прибуток', 'Profit reportat', 'Zysk zatrzymany', 'Dağıtılmamış Karlar', 'Gewinnvortrag', 'Utili a nuovo', v_equity_type, v_equity_id, true, true),
        (v_tenant_id, p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', 'Прибыль/убыток года', 'Прибуток/збиток року', 'Profit/Pierdere curentă', 'Wynik roku bieżącego', 'Cari Yıl Kar/Zarar', 'Jahresüberschuss', 'Utile/perdita', v_equity_type, v_equity_id, true, true);

    -- 4️⃣ الإيرادات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '4', 'الإيرادات', 'Revenue', 'Доходы', 'Доходи', 'Venituri', 'Przychody', 'Gelirler', 'Erträge', 'Ricavi', v_revenue_type, NULL, false, true)
    RETURNING id INTO v_revenue_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '41', 'مبيعات الأقمشة - جملة', 'Fabric Sales - Wholesale', 'Продажи тканей - опт', 'Продажі тканин - опт', 'Vânzări textile en-gros', 'Sprzedaż tkanin - hurt', 'Kumaş Satışları - Toptan', 'Stoffverkäufe - Großhandel', 'Vendite tessuti - ingrosso', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '42', 'مبيعات الأقمشة - تجزئة', 'Fabric Sales - Retail', 'Продажи тканей - розница', 'Продажі тканин - роздріб', 'Vânzări textile retail', 'Sprzedaż tkanin - detal', 'Kumaş Satışları - Perakende', 'Stoffverkäufe - Einzelhandel', 'Vendite tessuti - dettaglio', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '43', 'مبيعات الرولونات', 'Roll Sales', 'Продажи рулонов', 'Продажі рулонів', 'Vânzări rulouri', 'Sprzedaż rolek', 'Top Satışları', 'Rollenverkäufe', 'Vendite rotoli', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '44', 'خصومات المبيعات', 'Sales Discounts', 'Скидки с продаж', 'Знижки з продажів', 'Reduceri vânzări', 'Rabaty sprzedaży', 'Satış İskontoları', 'Verkaufsrabatte', 'Sconti vendite', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '45', 'مردودات المبيعات', 'Sales Returns', 'Возвраты продаж', 'Повернення продажів', 'Retururi vânzări', 'Zwroty sprzedaży', 'Satış İadeleri', 'Verkaufsrückgaben', 'Resi su vendite', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '46', 'إيرادات أخرى', 'Other Income', 'Прочие доходы', 'Інші доходи', 'Alte venituri', 'Inne przychody', 'Diğer Gelirler', 'Sonstige Erträge', 'Altri ricavi', v_revenue_type, v_revenue_id, true, true),
        (v_tenant_id, p_company_id, '47', 'أرباح فروقات العملة', 'FX Gains', 'Курсовые доходы', 'Курсові доходи', 'Câștiguri din curs', 'Zyski kursowe', 'Kur Farkı Kazançları', 'Währungsgewinne', 'Utili su cambi', v_revenue_type, v_revenue_id, true, true);

    -- 5️⃣ المصروفات
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES (v_tenant_id, p_company_id, '5', 'المصروفات', 'Expenses', 'Расходы', 'Витрати', 'Cheltuieli', 'Koszty', 'Giderler', 'Aufwendungen', 'Costi', v_expense_type, NULL, false, true)
    RETURNING id INTO v_expenses_id;

    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_detail, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '51', 'تكلفة الأقمشة المباعة', 'Cost of Fabric Sold', 'Себестоимость тканей', 'Собівартість тканин', 'Costul textilelor', 'Koszt tkanin', 'Satılan Kumaş Maliyeti', 'Stoffkosten', 'Costo tessuti venduti', v_cogs_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '52', 'مصاريف العينات', 'Sample Expenses', 'Расходы на образцы', 'Витрати на зразки', 'Cheltuieli cu mostre', 'Koszty próbek', 'Numune Giderleri', 'Musterkosten', 'Costi campioni', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '53', 'مصاريف القص والهالك', 'Cutting & Waste', 'Расходы на отходы', 'Витрати на відходи', 'Cheltuieli cu deșeurile', 'Koszty odpadów', 'Kesim ve Fire', 'Schnitt- und Abfall', 'Taglio e scarti', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '54', 'مصاريف الشحن والجمارك', 'Shipping & Customs', 'Расходы на доставку', 'Витрати на доставку', 'Cheltuieli transport', 'Koszty wysyłki', 'Nakliye ve Gümrük', 'Versand und Zoll', 'Spedizione e dogana', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '55', 'مصاريف التخزين', 'Storage Expenses', 'Складские расходы', 'Складські витрати', 'Cheltuieli depozitare', 'Koszty magazynowania', 'Depolama Giderleri', 'Lagerkosten', 'Costi deposito', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '56', 'مصروفات الرواتب', 'Salary Expenses', 'Расходы на зарплату', 'Витрати на зарплату', 'Cheltuieli cu salariile', 'Koszty wynagrodzeń', 'Maaş Giderleri', 'Gehaltskosten', 'Costi stipendi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '57', 'مصروفات الإيجار', 'Rent Expenses', 'Расходы на аренду', 'Витрати на оренду', 'Cheltuieli cu chiria', 'Koszty najmu', 'Kira Giderleri', 'Mietkosten', 'Costi affitto', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '58', 'مصروفات المرافق', 'Utilities', 'Коммунальные', 'Комунальні', 'Cheltuieli utilități', 'Koszty mediów', 'Fatura Giderleri', 'Nebenkosten', 'Costi utenze', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '59', 'مصروفات التسويق', 'Marketing', 'Маркетинг', 'Маркетинг', 'Marketing', 'Koszty marketingu', 'Pazarlama', 'Marketing', 'Marketing', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '591', 'مصروفات إدارية', 'Administrative', 'Административные', 'Адміністративні', 'Administrative', 'Administracyjne', 'İdari Giderler', 'Verwaltungskosten', 'Costi amministrativi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '592', 'مصروفات الإهلاك', 'Depreciation', 'Амортизация', 'Амортизація', 'Amortizare', 'Amortyzacja', 'Amortisman', 'Abschreibungen', 'Ammortamenti', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '593', 'مصروفات البنوك', 'Bank Charges', 'Банковские расходы', 'Банківські витрати', 'Comisioane bancare', 'Opłaty bankowe', 'Banka Masrafları', 'Bankgebühren', 'Spese bancarie', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '594', 'خسائر فروقات العملة', 'FX Losses', 'Курсовые убытки', 'Курсові збитки', 'Pierderi curs', 'Straty kursowe', 'Kur Farkı Zararı', 'Währungsverluste', 'Perdite su cambi', v_expense_type, v_expenses_id, true, true),
        (v_tenant_id, p_company_id, '595', 'فروق المخزون', 'Inventory Variances', 'Инвентаризационные разницы', 'Інвентаризаційні різниці', 'Diferențe inventar', 'Różnice inwentaryzacyjne', 'Stok Farkları', 'Inventurdifferenzen', 'Differenze inventario', v_expense_type, v_expenses_id, true, true);

    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = p_company_id;
    
    RAISE NOTICE '✅ تم إنشاء شجرة الأقمشة الموسعة (59 حساب)';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 2: تطبيق الشجرة والبيانات التجريبية
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_acc_cash UUID;
    v_acc_bank_local UUID;
    v_acc_bank_usd UUID;
    v_acc_bank_eur UUID;
    v_acc_receivable UUID;
    v_acc_payable UUID;
    v_cust_wholesale UUID;
    v_cust_retail UUID;
    v_cust_vip UUID;
    v_supp_local UUID;
    v_supp_import UUID;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 بدء تطبيق شجرة الأقمشة الموسعة + البيانات التجريبية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';

    -- الحصول على التينانت والشركة الحالية
    -- سنستخدم آخر تينانت تم إنشاؤه (أو يمكنك تحديده يدوياً)
    SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id ORDER BY created_at DESC LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION '❌ لم يتم العثور على تينانت أو شركة';
    END IF;
    
    RAISE NOTICE '📌 Tenant: %', v_tenant_id;
    RAISE NOTICE '📌 Company: %', v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1️⃣ إنشاء شجرة الحسابات
    -- ═══════════════════════════════════════════════════════════════
    PERFORM create_fabric_extended_chart(v_company_id);
    
    -- الحصول على معرفات الحسابات
    SELECT id INTO v_acc_cash FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '111';
    SELECT id INTO v_acc_bank_local FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '112';
    SELECT id INTO v_acc_bank_usd FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '113';
    SELECT id INTO v_acc_bank_eur FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '114';
    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '115';
    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '211';

    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    DELETE FROM cash_accounts WHERE tenant_id = v_tenant_id AND company_id = v_company_id;
    
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    VALUES 
        (v_tenant_id, v_company_id, 'CASH-MAIN', 'الصندوق الرئيسي', 'Main Cash', 'cash', v_acc_cash, 'UAH', 75000, true),
        (v_tenant_id, v_company_id, 'BANK-LOCAL', 'البنك - العملة المحلية', 'Bank - Local', 'bank', v_acc_bank_local, 'UAH', 450000, true),
        (v_tenant_id, v_company_id, 'BANK-USD', 'البنك - دولار', 'Bank - USD', 'bank', v_acc_bank_usd, 'USD', 25000, true),
        (v_tenant_id, v_company_id, 'BANK-EUR', 'البنك - يورو', 'Bank - EUR', 'bank', v_acc_bank_eur, 'EUR', 12000, true);
    
    RAISE NOTICE '✅ تم إنشاء الصناديق والبنوك (4)';

    -- ═══════════════════════════════════════════════════════════════
    -- 3️⃣ مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 'Оптовики', 'Оптовики', 'Angrosisti', 'Hurtownicy', 'Toptancılar', 'Großhändler', 'Grossisti', 10, 150000, 30, true),
        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 'Розничные', 'Роздрібні', 'Retail', 'Detaliści', 'Perakendeciler', 'Einzelhändler', 'Dettaglianti', 5, 30000, 15, true),
        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 'VIP клиенты', 'VIP клієнти', 'Clienți VIP', 'Klienci VIP', 'VIP Müşteriler', 'VIP-Kunden', 'Clienti VIP', 15, 300000, 45, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET discount_percent = EXCLUDED.discount_percent, credit_limit = EXCLUDED.credit_limit;

    SELECT id INTO v_cust_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';
    
    RAISE NOTICE '✅ تم إنشاء مجموعات العملاء (3)';

    -- ═══════════════════════════════════════════════════════════════
    -- 4️⃣ مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 'Местные', 'Місцеві', 'Locali', 'Lokalni', 'Yerel', 'Lokal', 'Locali', 30, true),
        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 'Импорт', 'Імпорт', 'Import', 'Import', 'İthalat', 'Import', 'Import', 60, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET payment_terms_days = EXCLUDED.payment_terms_days;

    SELECT id INTO v_supp_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';
    
    RAISE NOTICE '✅ تم إنشاء مجموعات الموردين (2)';

    -- ═══════════════════════════════════════════════════════════════
    -- 5️⃣ العملاء
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'Золотой текстиль', 'Золотий текстиль', 'Textil de Aur', 'Złoty Tekstyl', 'Altın Tekstil', 'Goldenes Textil', 'Tessile Dorato', 'company', 'info@goldentextile.com', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics Factory', 'Объединённые ткани', 'Обєднані тканини', 'Țesături Unite', 'Zjednoczone Tkaniny', 'Birleşik Kumaş', 'Vereinigte Stoffe', 'Tessuti Uniti', 'company', 'sales@unitedfabrics.com', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 250000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'Магазин Цветы', 'Магазин Квіти', 'Magazin Flori', 'Sklep Kwiaty', 'Çiçek Kumaş', 'Blumen Stoffe', 'Negozio Fiori', 'company', 'flowers@shop.com', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 40000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'Бутик Элегант', 'Бутік Елегант', 'Butic Eleganță', 'Butik Elegancja', 'Elegans Butik', 'Eleganz Boutique', 'Boutique Eleganza', 'company', 'info@elegance.com', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 35000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion Group', 'Премиум мода', 'Преміум мода', 'Modă Premium', 'Moda Premium', 'Premium Moda', 'Premium Mode', 'Moda Premium', 'company', 'vip@premiumfashion.com', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 150000, v_acc_receivable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar, credit_limit = EXCLUDED.credit_limit;
    
    RAISE NOTICE '✅ تم إنشاء العملاء (5)';

    -- ═══════════════════════════════════════════════════════════════
    -- 6️⃣ الموردين
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'Украинская фабрика', 'Українська фабрика', 'Fabrica ucraineană', 'Ukraińska fabryka', 'Ukrayna Fabrikası', 'Ukrainische Fabrik', 'Fabbrica ucraina', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'Продвинутые волокна', 'Передові волокна', 'Fibre Avansate', 'Zaawansowane Włókna', 'İleri Elyaf', 'Fortschrittliche Fasern', 'Fibre Avanzate', 'company', 'info@advancedfibers.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'Текстильные фабрики Бурсы', 'Текстильні фабрики Бурси', 'Fabrici Bursa', 'Fabryki Bursa', 'Bursa Tekstil', 'Bursa Textilfabriken', 'Tessiture di Bursa', 'company', 'export@bursatextile.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'Фабрика Гуандун', 'Фабрика Гуандун', 'Fabrica Guangdong', 'Fabryka Guangdong', 'Guangdong Fabrikası', 'Guangdong Fabrik', 'Fabbrica Guangdong', 'company', 'export@guangdongtextile.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'Фабрики Мумбаи', 'Фабрики Мумбаї', 'Fabrici Mumbai', 'Fabryki Mumbai', 'Mumbai Fabrikaları', 'Mumbai Fabriken', 'Cotonifici Mumbai', 'company', 'export@mumbaicotton.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable, 'active')
    ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar, payment_terms_days = EXCLUDED.payment_terms_days;
    
    RAISE NOTICE '✅ تم إنشاء الموردين (5)';

    -- ═══════════════════════════════════════════════════════════════
    -- 7️⃣ مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active)
    VALUES 
        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', 'Хлопок', 'Бавовна', 'Bumbac', 'Bawełna', 'Pamuk', 'Baumwolle', 'Cotone', '🧵', 1, true),
        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', 'Полиэстер', 'Поліестер', 'Poliester', 'Poliester', 'Polyester', 'Polyester', 'Poliestere', '✨', 2, true),
        (v_tenant_id, 'SILK', 'حرير', 'Silk', 'Шёлк', 'Шовк', 'Mătase', 'Jedwab', 'İpek', 'Seide', 'Seta', '🦋', 3, true),
        (v_tenant_id, 'LINEN', 'كتان', 'Linen', 'Лён', 'Льон', 'In', 'Len', 'Keten', 'Leinen', 'Lino', '🌿', 4, true),
        (v_tenant_id, 'WOOL', 'صوف', 'Wool', 'Шерсть', 'Вовна', 'Lână', 'Wełna', 'Yün', 'Wolle', 'Lana', '🐑', 5, true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar, icon = EXCLUDED.icon;
    
    RAISE NOTICE '✅ تم إنشاء مجموعات الأقمشة (5)';

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
    ON CONFLICT (tenant_id, code) DO UPDATE SET hex_color = EXCLUDED.hex_color;
    
    RAISE NOTICE '✅ تم إنشاء ألوان الأقمشة (15)';

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
    ON CONFLICT (tenant_id, code) DO UPDATE SET name_ar = EXCLUDED.name_ar;
    
    RAISE NOTICE '✅ تم إنشاء وحدات القياس (5)';

    -- ═══════════════════════════════════════════════════════════════
    -- النتيجة النهائية
    -- ═══════════════════════════════════════════════════════════════
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم تطبيق جميع البيانات بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ملخص البيانات المُضافة:';
    RAISE NOTICE '   ✅ شجرة الحسابات: 59 حساب';
    RAISE NOTICE '   ✅ الصناديق والبنوك: 4';
    RAISE NOTICE '   ✅ مجموعات العملاء: 3';
    RAISE NOTICE '   ✅ مجموعات الموردين: 2';
    RAISE NOTICE '   ✅ العملاء: 5';
    RAISE NOTICE '   ✅ الموردين: 5';
    RAISE NOTICE '   ✅ مجموعات الأقمشة: 5';
    RAISE NOTICE '   ✅ ألوان الأقمشة: 15';
    RAISE NOTICE '   ✅ وحدات القياس: 5';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- عرض النتائج للتأكد
SELECT 'شجرة الحسابات' AS category, COUNT(*) AS count FROM chart_of_accounts WHERE company_id = (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'العملاء', COUNT(*) FROM customers WHERE tenant_id = (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'الموردين', COUNT(*) FROM suppliers WHERE tenant_id = (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'مجموعات الأقمشة', COUNT(*) FROM fabric_groups WHERE tenant_id = (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'ألوان الأقمشة', COUNT(*) FROM fabric_colors WHERE tenant_id = (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1);
