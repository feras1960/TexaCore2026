-- ═══════════════════════════════════════════════════════════════════════════
-- إنشاء شجرة محاسبية افتراضية قياسية - متعددة اللغات (9 لغات)
-- Create Default Standard Chart of Accounts - Multi-language (9 languages)
-- ═══════════════════════════════════════════════════════════════════════════
-- Languages: Arabic, English, Russian, Ukrainian, Romanian, Polish, Turkish, German, Italian
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to create default chart of accounts for a company (9 languages)
CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(
    p_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_base_currency TEXT;
    v_asset_type_id UUID;
    v_current_asset_type_id UUID;
    v_fixed_asset_type_id UUID;
    v_liability_type_id UUID;
    v_current_liability_type_id UUID;
    v_long_term_liability_type_id UUID;
    v_equity_type_id UUID;
    v_revenue_type_id UUID;
    v_expense_type_id UUID;
    v_cogs_type_id UUID;
    v_other_income_type_id UUID;
    v_other_expense_type_id UUID;
    
    -- Parent account IDs
    v_assets_id UUID;
    v_current_assets_id UUID;
    v_cash_id UUID;
    v_banks_id UUID;
    v_receivables_id UUID;
    v_inventory_id UUID;
    v_prepaid_id UUID;
    v_input_tax_id UUID;
    v_fixed_assets_id UUID;
    v_liabilities_id UUID;
    v_current_liabilities_id UUID;
    v_payables_id UUID;
    v_taxes_payable_id UUID;
    v_long_term_liabilities_id UUID;
    v_equity_id UUID;
    v_revenue_id UUID;
    v_sales_id UUID;
    v_other_income_id UUID;
    v_expenses_id UUID;
    v_cogs_id UUID;
    v_payroll_expenses_id UUID;
    v_operating_expenses_id UUID;
    v_admin_expenses_id UUID;
    v_marketing_expenses_id UUID;
    v_financial_expenses_id UUID;
    v_taxes_expense_id UUID;
    v_purchase_expenses_id UUID;
    v_shipping_expenses_id UUID;
    v_customs_expenses_id UUID;
    v_marine_insurance_id UUID;
    v_other_purchase_expenses_id UUID;
BEGIN
    -- Get tenant_id and default_currency from company
    SELECT tenant_id, COALESCE(default_currency, 'USD') 
    INTO v_tenant_id, v_base_currency 
    FROM companies WHERE id = p_company_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Company not found or has no tenant_id';
    END IF;
    
    -- Get account type IDs
    SELECT id INTO v_asset_type_id FROM account_types WHERE code = 'ASSET';
    SELECT id INTO v_current_asset_type_id FROM account_types WHERE code = 'CURRENT_ASSET';
    SELECT id INTO v_fixed_asset_type_id FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_liability_type_id FROM account_types WHERE code = 'LIABILITY';
    SELECT id INTO v_current_liability_type_id FROM account_types WHERE code = 'CURRENT_LIABILITY';
    SELECT id INTO v_long_term_liability_type_id FROM account_types WHERE code = 'LONG_TERM_LIABILITY';
    SELECT id INTO v_equity_type_id FROM account_types WHERE code = 'EQUITY';
    SELECT id INTO v_revenue_type_id FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_expense_type_id FROM account_types WHERE code = 'EXPENSE';
    SELECT id INTO v_cogs_type_id FROM account_types WHERE code = 'COGS';
    SELECT id INTO v_other_income_type_id FROM account_types WHERE code = 'OTHER_INCOME';
    SELECT id INTO v_other_expense_type_id FROM account_types WHERE code = 'OTHER_EXPENSE';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. ASSETS (الأصول) - Level 1
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1000', 
        'الأصول', 'Assets', 'Активы', 'Активи', 'Active', 'Aktywa', 'Varlıklar', 'Vermögenswerte', 'Attività',
        v_asset_type_id, NULL, true, false, 1, '1000', v_base_currency, true)
    RETURNING id INTO v_assets_id;
    
    -- ───────────────────────────────────────────────────────────────
    -- 1.1 Current Assets (الأصول المتداولة)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1100', 
        'الأصول المتداولة', 'Current Assets', 'Оборотные активы', 'Оборотні активи', 'Active curente', 'Aktywa obrotowe', 'Dönen Varlıklar', 'Umlaufvermögen', 'Attività correnti',
        v_current_asset_type_id, v_assets_id, true, false, 2, '1000.1100', v_base_currency, true)
    RETURNING id INTO v_current_assets_id;
    
    -- 1.1.1 Cash on Hand (الصناديق النقدية)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_cash_account)
    VALUES (v_tenant_id, p_company_id, '1110', 
        'الصناديق النقدية', 'Cash on Hand', 'Касса', 'Каса', 'Numerar în casă', 'Kasa', 'Kasa', 'Kasse', 'Cassa',
        v_current_asset_type_id, v_current_assets_id, true, false, 3, '1000.1100.1110', v_base_currency, true, true)
    RETURNING id INTO v_cash_id;
    
    -- Cash accounts (detail)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_cash_account)
    VALUES 
        (v_tenant_id, p_company_id, '1111', 'الصندوق الرئيسي', 'Main Cash', 'Основная касса', 'Основна каса', 'Casa principală', 'Kasa główna', 'Ana Kasa', 'Hauptkasse', 'Cassa Principale', v_current_asset_type_id, v_cash_id, false, true, 4, '1000.1100.1110.1111', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '1112', 'صندوق المصروفات النثرية', 'Petty Cash', 'Касса мелких расходов', 'Каса дрібних витрат', 'Casa de cheltuieli mici', 'Kasa podręczna', 'Kırtasiye Kasası', 'Handkasse', 'Piccola Cassa', v_current_asset_type_id, v_cash_id, false, true, 4, '1000.1100.1110.1112', v_base_currency, true, true);
    
    -- 1.1.2 Banks (البنوك)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_bank_account)
    VALUES (v_tenant_id, p_company_id, '1120', 
        'البنوك', 'Banks', 'Банки', 'Банки', 'Bănci', 'Banki', 'Bankalar', 'Banken', 'Banche',
        v_current_asset_type_id, v_current_assets_id, true, false, 3, '1000.1100.1120', v_base_currency, true, true)
    RETURNING id INTO v_banks_id;
    
    -- Bank accounts (detail)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_bank_account)
    VALUES 
        (v_tenant_id, p_company_id, '1121', 'البنك الرئيسي - العملة المحلية', 'Main Bank - Local Currency', 'Основной банк - местная валюта', 'Основний банк - місцева валюта', 'Banca principală - monedă locală', 'Bank główny - waluta lokalna', 'Ana Banka - Yerel Para', 'Hauptbank - Landeswährung', 'Banca Principale - Valuta Locale', v_current_asset_type_id, v_banks_id, false, true, 4, '1000.1100.1120.1121', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '1122', 'البنك الرئيسي - العملات الأجنبية', 'Main Bank - Foreign Currency', 'Основной банк - иностранная валюта', 'Основний банк - іноземна валюта', 'Banca principală - valută străină', 'Bank główny - waluta obca', 'Ana Banka - Döviz', 'Hauptbank - Fremdwährung', 'Banca Principale - Valuta Estera', v_current_asset_type_id, v_banks_id, false, true, 4, '1000.1100.1120.1122', 'USD', true, true);
    
    -- 1.1.3 Accounts Receivable (العملاء - الذمم المدينة) - GROUP ONLY
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_receivable)
    VALUES (v_tenant_id, p_company_id, '1130', 
        'العملاء (الذمم المدينة)', 'Accounts Receivable', 'Дебиторская задолженность', 'Дебіторська заборгованість', 'Creanțe', 'Należności', 'Alacak Hesapları', 'Forderungen', 'Crediti',
        v_current_asset_type_id, v_current_assets_id, true, false, 3, '1000.1100.1130', v_base_currency, true, true)
    RETURNING id INTO v_receivables_id;
    
    -- Sub-groups for receivables (empty - user adds customers)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_receivable)
    VALUES 
        (v_tenant_id, p_company_id, '1131', 'عملاء محليين', 'Local Customers', 'Местные клиенты', 'Місцеві клієнти', 'Clienți locali', 'Klienci lokalni', 'Yerel Müşteriler', 'Inlandskunden', 'Clienti Nazionali', v_current_asset_type_id, v_receivables_id, true, false, 4, '1000.1100.1130.1131', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '1132', 'عملاء خارجيين', 'Foreign Customers', 'Иностранные клиенты', 'Іноземні клієнти', 'Clienți străini', 'Klienci zagraniczni', 'Yabancı Müşteriler', 'Auslandskunden', 'Clienti Esteri', v_current_asset_type_id, v_receivables_id, true, false, 4, '1000.1100.1130.1132', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '1133', 'أوراق القبض', 'Notes Receivable', 'Векселя к получению', 'Векселі до отримання', 'Efecte de primit', 'Weksle do otrzymania', 'Alacak Senetleri', 'Wechselforderungen', 'Effetti Attivi', v_current_asset_type_id, v_receivables_id, false, true, 4, '1000.1100.1130.1133', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '1134', 'مدينون آخرون', 'Other Receivables', 'Прочие дебиторы', 'Інші дебітори', 'Alte creanțe', 'Inne należności', 'Diğer Alacaklar', 'Sonstige Forderungen', 'Altri Crediti', v_current_asset_type_id, v_receivables_id, false, true, 4, '1000.1100.1130.1134', v_base_currency, true, true);
    
    -- 1.1.4 Inventory (المخزون)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1140', 
        'المخزون', 'Inventory', 'Запасы', 'Запаси', 'Stocuri', 'Zapasy', 'Stok', 'Vorräte', 'Magazzino',
        v_current_asset_type_id, v_current_assets_id, true, false, 3, '1000.1100.1140', v_base_currency, true)
    RETURNING id INTO v_inventory_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '1141', 'بضاعة جاهزة', 'Finished Goods', 'Готовая продукция', 'Готова продукція', 'Produse finite', 'Wyroby gotowe', 'Mamul Mallar', 'Fertigerzeugnisse', 'Prodotti Finiti', v_current_asset_type_id, v_inventory_id, false, true, 4, '1000.1100.1140.1141', v_base_currency, true),
        (v_tenant_id, p_company_id, '1142', 'مواد خام', 'Raw Materials', 'Сырье', 'Сировина', 'Materii prime', 'Surowce', 'Hammaddeler', 'Rohstoffe', 'Materie Prime', v_current_asset_type_id, v_inventory_id, false, true, 4, '1000.1100.1140.1142', v_base_currency, true),
        (v_tenant_id, p_company_id, '1143', 'بضاعة في الطريق', 'Goods in Transit', 'Товары в пути', 'Товари в дорозі', 'Mărfuri în tranzit', 'Towary w drodze', 'Yoldaki Mallar', 'Waren unterwegs', 'Merci in Transito', v_current_asset_type_id, v_inventory_id, false, true, 4, '1000.1100.1140.1143', v_base_currency, true);
    
    -- 1.1.5 Prepaid Expenses (مصاريف مدفوعة مقدماً)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1150', 
        'مصاريف مدفوعة مقدماً', 'Prepaid Expenses', 'Предоплаченные расходы', 'Передоплачені витрати', 'Cheltuieli în avans', 'Koszty opłacone z góry', 'Peşin Ödenmiş Giderler', 'Vorausbezahlte Aufwendungen', 'Risconti Attivi',
        v_current_asset_type_id, v_current_assets_id, true, false, 3, '1000.1100.1150', v_base_currency, true)
    RETURNING id INTO v_prepaid_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '1151', 'إيجارات مدفوعة مقدماً', 'Prepaid Rent', 'Предоплаченная аренда', 'Передоплачена оренда', 'Chirie plătită în avans', 'Czynsz opłacony z góry', 'Peşin Ödenmiş Kira', 'Vorausbezahlte Miete', 'Affitti Anticipati', v_current_asset_type_id, v_prepaid_id, false, true, 4, '1000.1100.1150.1151', v_base_currency, true),
        (v_tenant_id, p_company_id, '1152', 'تأمين مدفوع مقدماً', 'Prepaid Insurance', 'Предоплаченное страхование', 'Передоплачене страхування', 'Asigurare plătită în avans', 'Ubezpieczenie opłacone z góry', 'Peşin Ödenmiş Sigorta', 'Vorausbezahlte Versicherung', 'Assicurazioni Anticipate', v_current_asset_type_id, v_prepaid_id, false, true, 4, '1000.1100.1150.1152', v_base_currency, true);
    
    -- 1.1.6 Input Tax / VAT Receivable (ضريبة المدخلات)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1160', 
        'ضريبة مدخلات (مسترده)', 'Input Tax (VAT Receivable)', 'НДС к возмещению', 'ПДВ до відшкодування', 'TVA deductibilă', 'VAT naliczony', 'İndirilecek KDV', 'Vorsteuer', 'IVA a Credito',
        v_current_asset_type_id, v_current_assets_id, false, true, 3, '1000.1100.1160', v_base_currency, true)
    RETURNING id INTO v_input_tax_id;
    
    -- ───────────────────────────────────────────────────────────────
    -- 1.2 Fixed Assets (الأصول الثابتة)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '1200', 
        'الأصول الثابتة', 'Fixed Assets', 'Основные средства', 'Основні засоби', 'Active fixe', 'Aktywa trwałe', 'Duran Varlıklar', 'Anlagevermögen', 'Immobilizzazioni',
        v_fixed_asset_type_id, v_assets_id, true, false, 2, '1000.1200', v_base_currency, true)
    RETURNING id INTO v_fixed_assets_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '1210', 'الأراضي', 'Land', 'Земля', 'Земля', 'Terenuri', 'Grunty', 'Arazi', 'Grundstücke', 'Terreni', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1210', v_base_currency, true),
        (v_tenant_id, p_company_id, '1220', 'المباني', 'Buildings', 'Здания', 'Будівлі', 'Clădiri', 'Budynki', 'Binalar', 'Gebäude', 'Fabbricati', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1220', v_base_currency, true),
        (v_tenant_id, p_company_id, '1230', 'الآلات والمعدات', 'Machinery & Equipment', 'Машины и оборудование', 'Машини та обладнання', 'Utilaje și echipamente', 'Maszyny i urządzenia', 'Makine ve Ekipman', 'Maschinen und Anlagen', 'Macchinari e Attrezzature', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1230', v_base_currency, true),
        (v_tenant_id, p_company_id, '1240', 'الأثاث والتجهيزات', 'Furniture & Fixtures', 'Мебель и оборудование', 'Меблі та обладнання', 'Mobilier și dotări', 'Meble i wyposażenie', 'Mobilya ve Demirbaş', 'Möbel und Einrichtung', 'Mobili e Arredi', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1240', v_base_currency, true),
        (v_tenant_id, p_company_id, '1250', 'السيارات ووسائل النقل', 'Vehicles', 'Транспортные средства', 'Транспортні засоби', 'Vehicule', 'Pojazdy', 'Taşıtlar', 'Fahrzeuge', 'Automezzi', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1250', v_base_currency, true),
        (v_tenant_id, p_company_id, '1260', 'أجهزة الحاسب الآلي', 'Computer Equipment', 'Компьютерное оборудование', 'Комп''ютерне обладнання', 'Echipamente IT', 'Sprzęt komputerowy', 'Bilgisayar Ekipmanları', 'EDV-Anlagen', 'Attrezzature Informatiche', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1260', v_base_currency, true),
        (v_tenant_id, p_company_id, '1290', 'مجمع الإهلاك', 'Accumulated Depreciation', 'Накопленная амортизация', 'Накопичена амортизація', 'Amortizare cumulată', 'Umorzenie', 'Birikmiş Amortisman', 'Kumulierte Abschreibungen', 'Fondo Ammortamento', v_fixed_asset_type_id, v_fixed_assets_id, false, true, 3, '1000.1200.1290', v_base_currency, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. LIABILITIES (الخصوم) - Level 1
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '2000', 
        'الخصوم', 'Liabilities', 'Обязательства', 'Зобов''язання', 'Datorii', 'Zobowiązania', 'Borçlar', 'Verbindlichkeiten', 'Passività',
        v_liability_type_id, NULL, true, false, 1, '2000', v_base_currency, true)
    RETURNING id INTO v_liabilities_id;
    
    -- ───────────────────────────────────────────────────────────────
    -- 2.1 Current Liabilities (الخصوم المتداولة)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '2100', 
        'الخصوم المتداولة', 'Current Liabilities', 'Краткосрочные обязательства', 'Поточні зобов''язання', 'Datorii curente', 'Zobowiązania krótkoterminowe', 'Kısa Vadeli Borçlar', 'Kurzfristige Verbindlichkeiten', 'Passività Correnti',
        v_current_liability_type_id, v_liabilities_id, true, false, 2, '2000.2100', v_base_currency, true)
    RETURNING id INTO v_current_liabilities_id;
    
    -- 2.1.1 Accounts Payable (الموردون - الذمم الدائنة) - GROUP ONLY
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_payable)
    VALUES (v_tenant_id, p_company_id, '2110', 
        'الموردون (الذمم الدائنة)', 'Accounts Payable', 'Кредиторская задолженность', 'Кредиторська заборгованість', 'Furnizori', 'Zobowiązania handlowe', 'Borç Hesapları', 'Verbindlichkeiten aus L.u.L.', 'Debiti verso Fornitori',
        v_current_liability_type_id, v_current_liabilities_id, true, false, 3, '2000.2100.2110', v_base_currency, true, true)
    RETURNING id INTO v_payables_id;
    
    -- Sub-groups for payables (empty - user adds suppliers)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_payable)
    VALUES 
        (v_tenant_id, p_company_id, '2111', 'موردون محليين', 'Local Suppliers', 'Местные поставщики', 'Місцеві постачальники', 'Furnizori locali', 'Dostawcy lokalni', 'Yerel Tedarikçiler', 'Inlandslieferanten', 'Fornitori Nazionali', v_current_liability_type_id, v_payables_id, true, false, 4, '2000.2100.2110.2111', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '2112', 'موردون خارجيين', 'Foreign Suppliers', 'Иностранные поставщики', 'Іноземні постачальники', 'Furnizori străini', 'Dostawcy zagraniczni', 'Yabancı Tedarikçiler', 'Auslandslieferanten', 'Fornitori Esteri', v_current_liability_type_id, v_payables_id, true, false, 4, '2000.2100.2110.2112', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '2113', 'مقدمو خدمات الشحن والتوريد', 'Logistics Service Providers', 'Логистические провайдеры', 'Логістичні провайдери', 'Furnizori servicii logistice', 'Dostawcy usług logistycznych', 'Lojistik Hizmet Sağlayıcıları', 'Logistikdienstleister', 'Fornitori Servizi Logistici', v_current_liability_type_id, v_payables_id, true, false, 4, '2000.2100.2110.2113', v_base_currency, true, true);
    
    -- Other current liabilities
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active, is_payable)
    VALUES 
        (v_tenant_id, p_company_id, '2120', 'أوراق الدفع', 'Notes Payable', 'Векселя к оплате', 'Векселі до сплати', 'Efecte de plătit', 'Weksle do zapłaty', 'Borç Senetleri', 'Wechselverbindlichkeiten', 'Effetti Passivi', v_current_liability_type_id, v_current_liabilities_id, false, true, 3, '2000.2100.2120', v_base_currency, true, true),
        (v_tenant_id, p_company_id, '2130', 'مستحقات الموظفين', 'Accrued Salaries', 'Задолженность по зарплате', 'Заборгованість по зарплаті', 'Salarii de plătit', 'Wynagrodzenia do wypłaty', 'Tahakkuk Eden Maaşlar', 'Lohnverbindlichkeiten', 'Debiti verso Dipendenti', v_current_liability_type_id, v_current_liabilities_id, false, true, 3, '2000.2100.2130', v_base_currency, true, false);
    
    -- 2.1.2 Taxes Payable (الضرائب المستحقة)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '2140', 
        'الضرائب المستحقة', 'Taxes Payable', 'Налоги к уплате', 'Податки до сплати', 'Taxe de plătit', 'Podatki do zapłaty', 'Ödenecek Vergiler', 'Steuerverbindlichkeiten', 'Debiti Tributari',
        v_current_liability_type_id, v_current_liabilities_id, true, false, 3, '2000.2100.2140', v_base_currency, true)
    RETURNING id INTO v_taxes_payable_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '2141', 'ضريبة القيمة المضافة المستحقة', 'VAT Payable', 'НДС к уплате', 'ПДВ до сплати', 'TVA de plătit', 'VAT do zapłaty', 'Ödenecek KDV', 'Umsatzsteuerverbindlichkeiten', 'IVA a Debito', v_current_liability_type_id, v_taxes_payable_id, false, true, 4, '2000.2100.2140.2141', v_base_currency, true),
        (v_tenant_id, p_company_id, '2142', 'ضريبة الدخل المستحقة', 'Income Tax Payable', 'Налог на прибыль к уплате', 'Податок на прибуток до сплати', 'Impozit pe venit de plătit', 'Podatek dochodowy do zapłaty', 'Ödenecek Gelir Vergisi', 'Körperschaftsteuer', 'IRES a Debito', v_current_liability_type_id, v_taxes_payable_id, false, true, 4, '2000.2100.2140.2142', v_base_currency, true),
        (v_tenant_id, p_company_id, '2143', 'ضريبة الاستقطاع', 'Withholding Tax', 'Удерживаемый налог', 'Утриманий податок', 'Impozit reținut', 'Podatek u źródła', 'Stopaj Vergisi', 'Quellensteuer', 'Ritenute d''Acconto', v_current_liability_type_id, v_taxes_payable_id, false, true, 4, '2000.2100.2140.2143', v_base_currency, true);
    
    -- Other current liabilities continued
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '2150', 'إيرادات مقدمة', 'Deferred Revenue', 'Доходы будущих периодов', 'Доходи майбутніх періодів', 'Venituri în avans', 'Przychody przyszłych okresów', 'Ertelenmiş Gelir', 'Erhaltene Anzahlungen', 'Risconti Passivi', v_current_liability_type_id, v_current_liabilities_id, false, true, 3, '2000.2100.2150', v_base_currency, true),
        (v_tenant_id, p_company_id, '2160', 'دائنون آخرون', 'Other Payables', 'Прочие кредиторы', 'Інші кредитори', 'Alți creditori', 'Inni wierzyciele', 'Diğer Borçlar', 'Sonstige Verbindlichkeiten', 'Altri Debiti', v_current_liability_type_id, v_current_liabilities_id, false, true, 3, '2000.2100.2160', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 2.2 Long-term Liabilities (الخصوم طويلة الأجل)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '2200', 
        'الخصوم طويلة الأجل', 'Long-term Liabilities', 'Долгосрочные обязательства', 'Довгострокові зобов''язання', 'Datorii pe termen lung', 'Zobowiązania długoterminowe', 'Uzun Vadeli Borçlar', 'Langfristige Verbindlichkeiten', 'Passività a Lungo Termine',
        v_long_term_liability_type_id, v_liabilities_id, true, false, 2, '2000.2200', v_base_currency, true)
    RETURNING id INTO v_long_term_liabilities_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '2210', 'قروض بنكية طويلة الأجل', 'Long-term Bank Loans', 'Долгосрочные банковские кредиты', 'Довгострокові банківські кредити', 'Credite bancare pe termen lung', 'Kredyty bankowe długoterminowe', 'Uzun Vadeli Banka Kredileri', 'Langfristige Bankdarlehen', 'Mutui Bancari a Lungo Termine', v_long_term_liability_type_id, v_long_term_liabilities_id, false, true, 3, '2000.2200.2210', v_base_currency, true),
        (v_tenant_id, p_company_id, '2220', 'مخصص نهاية الخدمة', 'End of Service Benefits', 'Выходное пособие', 'Вихідна допомога', 'Indemnizații de serviciu', 'Odprawy', 'Kıdem Tazminatı Karşılığı', 'Rückstellungen für Abfindungen', 'TFR', v_long_term_liability_type_id, v_long_term_liabilities_id, false, true, 3, '2000.2200.2220', v_base_currency, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. EQUITY (حقوق الملكية) - Level 1
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '3000', 
        'حقوق الملكية', 'Equity', 'Собственный капитал', 'Власний капітал', 'Capitaluri proprii', 'Kapitał własny', 'Öz Sermaye', 'Eigenkapital', 'Patrimonio Netto',
        v_equity_type_id, NULL, true, false, 1, '3000', v_base_currency, true)
    RETURNING id INTO v_equity_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '3100', 'رأس المال', 'Capital', 'Уставный капитал', 'Статутний капітал', 'Capital social', 'Kapitał zakładowy', 'Sermaye', 'Gezeichnetes Kapital', 'Capitale Sociale', v_equity_type_id, v_equity_id, false, true, 2, '3000.3100', v_base_currency, true),
        (v_tenant_id, p_company_id, '3200', 'الاحتياطي النظامي', 'Legal Reserve', 'Резервный капитал', 'Резервний капітал', 'Rezerve legale', 'Kapitał rezerwowy', 'Yasal Yedekler', 'Gesetzliche Rücklagen', 'Riserva Legale', v_equity_type_id, v_equity_id, false, true, 2, '3000.3200', v_base_currency, true),
        (v_tenant_id, p_company_id, '3300', 'الاحتياطي العام', 'General Reserve', 'Общий резерв', 'Загальний резерв', 'Rezerve generale', 'Kapitał zapasowy', 'Genel Yedekler', 'Andere Rücklagen', 'Riserva Straordinaria', v_equity_type_id, v_equity_id, false, true, 2, '3000.3300', v_base_currency, true),
        (v_tenant_id, p_company_id, '3400', 'الأرباح المحتجزة', 'Retained Earnings', 'Нераспределенная прибыль', 'Нерозподілений прибуток', 'Rezultat reportat', 'Zysk zatrzymany', 'Dağıtılmamış Karlar', 'Gewinnvortrag', 'Utili a Nuovo', v_equity_type_id, v_equity_id, false, true, 2, '3000.3400', v_base_currency, true),
        (v_tenant_id, p_company_id, '3500', 'أرباح / خسائر العام', 'Current Year Profit/Loss', 'Прибыль/убыток текущего года', 'Прибуток/збиток поточного року', 'Profit/Pierdere curentă', 'Wynik bieżącego roku', 'Cari Yıl Kar/Zarar', 'Jahresüberschuss/-fehlbetrag', 'Utile/Perdita d''Esercizio', v_equity_type_id, v_equity_id, false, true, 2, '3000.3500', v_base_currency, true),
        (v_tenant_id, p_company_id, '3600', 'جاري الشركاء', 'Partners Current Account', 'Текущий счет партнеров', 'Поточний рахунок партнерів', 'Cont curent asociați', 'Konto bieżące wspólników', 'Ortaklar Cari Hesabı', 'Verrechnungskonten Gesellschafter', 'Conto Corrente Soci', v_equity_type_id, v_equity_id, false, true, 2, '3000.3600', v_base_currency, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. REVENUE (الإيرادات) - Level 1
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '4000', 
        'الإيرادات', 'Revenue', 'Доходы', 'Доходи', 'Venituri', 'Przychody', 'Gelirler', 'Erträge', 'Ricavi',
        v_revenue_type_id, NULL, true, false, 1, '4000', v_base_currency, true)
    RETURNING id INTO v_revenue_id;
    
    -- 4.1 Sales Revenue (إيرادات المبيعات)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '4100', 
        'إيرادات المبيعات', 'Sales Revenue', 'Выручка от продаж', 'Виручка від продажів', 'Venituri din vânzări', 'Przychody ze sprzedaży', 'Satış Gelirleri', 'Umsatzerlöse', 'Ricavi delle Vendite',
        v_revenue_type_id, v_revenue_id, true, false, 2, '4000.4100', v_base_currency, true)
    RETURNING id INTO v_sales_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '4110', 'مبيعات بضاعة', 'Product Sales', 'Продажа товаров', 'Продаж товарів', 'Vânzări de produse', 'Sprzedaż produktów', 'Ürün Satışları', 'Warenverkäufe', 'Vendita Prodotti', v_revenue_type_id, v_sales_id, false, true, 3, '4000.4100.4110', v_base_currency, true),
        (v_tenant_id, p_company_id, '4120', 'إيرادات خدمات', 'Service Revenue', 'Выручка от услуг', 'Виручка від послуг', 'Venituri din servicii', 'Przychody z usług', 'Hizmet Gelirleri', 'Dienstleistungserlöse', 'Ricavi da Servizi', v_revenue_type_id, v_sales_id, false, true, 3, '4000.4100.4120', v_base_currency, true),
        (v_tenant_id, p_company_id, '4130', 'مردودات المبيعات', 'Sales Returns', 'Возвраты продаж', 'Повернення продажів', 'Retururi vânzări', 'Zwroty sprzedaży', 'Satış İadeleri', 'Retouren', 'Resi su Vendite', v_revenue_type_id, v_sales_id, false, true, 3, '4000.4100.4130', v_base_currency, true),
        (v_tenant_id, p_company_id, '4140', 'خصم مسموح به', 'Sales Discounts', 'Скидки с продаж', 'Знижки з продажів', 'Reduceri acordate', 'Rabaty udzielone', 'Satış İskontoları', 'Erlösschmälerungen', 'Sconti su Vendite', v_revenue_type_id, v_sales_id, false, true, 3, '4000.4100.4140', v_base_currency, true);
    
    -- 4.2 Other Income (إيرادات أخرى)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '4200', 
        'إيرادات أخرى', 'Other Income', 'Прочие доходы', 'Інші доходи', 'Alte venituri', 'Pozostałe przychody', 'Diğer Gelirler', 'Sonstige Erträge', 'Altri Ricavi',
        v_other_income_type_id, v_revenue_id, true, false, 2, '4000.4200', v_base_currency, true)
    RETURNING id INTO v_other_income_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '4210', 'إيرادات فوائد', 'Interest Income', 'Процентные доходы', 'Процентні доходи', 'Venituri din dobânzi', 'Przychody odsetkowe', 'Faiz Gelirleri', 'Zinserträge', 'Interessi Attivi', v_other_income_type_id, v_other_income_id, false, true, 3, '4000.4200.4210', v_base_currency, true),
        (v_tenant_id, p_company_id, '4220', 'أرباح فروقات عملة', 'Foreign Exchange Gains', 'Курсовые разницы (доход)', 'Курсові різниці (дохід)', 'Câștiguri din diferențe de curs', 'Różnice kursowe dodatnie', 'Kur Farkı Kazançları', 'Kursgewinne', 'Utili su Cambi', v_other_income_type_id, v_other_income_id, false, true, 3, '4000.4200.4220', v_base_currency, true),
        (v_tenant_id, p_company_id, '4230', 'إيرادات متنوعة', 'Miscellaneous Income', 'Прочие доходы', 'Інші доходи', 'Venituri diverse', 'Pozostałe przychody', 'Çeşitli Gelirler', 'Sonstige Erlöse', 'Proventi Diversi', v_other_income_type_id, v_other_income_id, false, true, 3, '4000.4200.4230', v_base_currency, true);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. EXPENSES (المصروفات) - Level 1 - EXPANDED
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5000', 
        'المصروفات', 'Expenses', 'Расходы', 'Витрати', 'Cheltuieli', 'Koszty', 'Giderler', 'Aufwendungen', 'Costi',
        v_expense_type_id, NULL, true, false, 1, '5000', v_base_currency, true)
    RETURNING id INTO v_expenses_id;
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.1 Cost of Goods Sold (تكلفة البضاعة المباعة)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5100', 
        'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'Себестоимость продаж', 'Собівартість продажів', 'Costul bunurilor vândute', 'Koszt sprzedanych towarów', 'Satılan Malın Maliyeti', 'Herstellungskosten', 'Costo del Venduto',
        v_cogs_type_id, v_expenses_id, true, false, 2, '5000.5100', v_base_currency, true)
    RETURNING id INTO v_cogs_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5110', 'تكلفة المبيعات', 'Cost of Sales', 'Себестоимость', 'Собівартість', 'Costul vânzărilor', 'Koszt sprzedaży', 'Satış Maliyeti', 'Umsatzkosten', 'Costo delle Vendite', v_cogs_type_id, v_cogs_id, false, true, 3, '5000.5100.5110', v_base_currency, true),
        (v_tenant_id, p_company_id, '5120', 'مشتريات', 'Purchases', 'Закупки', 'Закупівлі', 'Achiziții', 'Zakupy', 'Satın Almalar', 'Wareneinkauf', 'Acquisti', v_cogs_type_id, v_cogs_id, false, true, 3, '5000.5100.5120', v_base_currency, true),
        (v_tenant_id, p_company_id, '5130', 'مردودات المشتريات', 'Purchase Returns', 'Возвраты закупок', 'Повернення закупівель', 'Retururi la achiziții', 'Zwroty zakupów', 'Satın Alma İadeleri', 'Warenrücksendungen', 'Resi su Acquisti', v_cogs_type_id, v_cogs_id, false, true, 3, '5000.5100.5130', v_base_currency, true),
        (v_tenant_id, p_company_id, '5140', 'خصم مكتسب', 'Purchase Discounts', 'Скидки на закупки', 'Знижки на закупівлі', 'Reduceri obținute', 'Rabaty otrzymane', 'Satın Alma İskontoları', 'Lieferantenskonti', 'Sconti su Acquisti', v_cogs_type_id, v_cogs_id, false, true, 3, '5000.5100.5140', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.2 Payroll Expenses (مصاريف الرواتب والأجور)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5200', 
        'مصاريف الرواتب والأجور', 'Payroll Expenses', 'Расходы на оплату труда', 'Витрати на оплату праці', 'Cheltuieli cu salariile', 'Koszty wynagrodzeń', 'Bordro Giderleri', 'Personalaufwendungen', 'Costi del Personale',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5200', v_base_currency, true)
    RETURNING id INTO v_payroll_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5210', 'رواتب وأجور', 'Salaries & Wages', 'Заработная плата', 'Заробітна плата', 'Salarii', 'Wynagrodzenia', 'Maaş ve Ücretler', 'Löhne und Gehälter', 'Stipendi e Salari', v_expense_type_id, v_payroll_expenses_id, false, true, 3, '5000.5200.5210', v_base_currency, true),
        (v_tenant_id, p_company_id, '5220', 'بدلات الموظفين', 'Employee Allowances', 'Надбавки сотрудникам', 'Надбавки працівникам', 'Indemnizații angajați', 'Dodatki pracownicze', 'Çalışan Ödenekleri', 'Mitarbeiterzulagen', 'Indennità Dipendenti', v_expense_type_id, v_payroll_expenses_id, false, true, 3, '5000.5200.5220', v_base_currency, true),
        (v_tenant_id, p_company_id, '5230', 'تأمينات اجتماعية', 'Social Insurance', 'Социальное страхование', 'Соціальне страхування', 'Asigurări sociale', 'Ubezpieczenia społeczne', 'Sosyal Sigorta', 'Sozialversicherung', 'Contributi Previdenziali', v_expense_type_id, v_payroll_expenses_id, false, true, 3, '5000.5200.5230', v_base_currency, true),
        (v_tenant_id, p_company_id, '5240', 'مكافآت وحوافز', 'Bonuses & Incentives', 'Премии и поощрения', 'Премії та заохочення', 'Bonusuri și stimulente', 'Premie i bonusy', 'Prim ve Teşvikler', 'Prämien und Anreize', 'Premi e Incentivi', v_expense_type_id, v_payroll_expenses_id, false, true, 3, '5000.5200.5240', v_base_currency, true),
        (v_tenant_id, p_company_id, '5250', 'تكاليف التدريب', 'Training Costs', 'Расходы на обучение', 'Витрати на навчання', 'Costuri de instruire', 'Koszty szkoleń', 'Eğitim Maliyetleri', 'Schulungskosten', 'Costi di Formazione', v_expense_type_id, v_payroll_expenses_id, false, true, 3, '5000.5200.5250', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.3 Operating Expenses (مصاريف التشغيل)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5300', 
        'مصاريف التشغيل', 'Operating Expenses', 'Операционные расходы', 'Операційні витрати', 'Cheltuieli operaționale', 'Koszty operacyjne', 'Faaliyet Giderleri', 'Betriebsaufwendungen', 'Costi Operativi',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5300', v_base_currency, true)
    RETURNING id INTO v_operating_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5310', 'إيجارات', 'Rent Expense', 'Аренда', 'Оренда', 'Chirii', 'Czynsz', 'Kira Gideri', 'Miete', 'Affitti Passivi', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5310', v_base_currency, true),
        (v_tenant_id, p_company_id, '5320', 'كهرباء', 'Electricity', 'Электричество', 'Електрика', 'Electricitate', 'Energia elektryczna', 'Elektrik', 'Strom', 'Energia Elettrica', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5320', v_base_currency, true),
        (v_tenant_id, p_company_id, '5330', 'مياه', 'Water', 'Вода', 'Вода', 'Apă', 'Woda', 'Su', 'Wasser', 'Acqua', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5330', v_base_currency, true),
        (v_tenant_id, p_company_id, '5340', 'اتصالات وإنترنت', 'Telecom & Internet', 'Связь и интернет', 'Зв''язок та інтернет', 'Telecomunicații', 'Telekomunikacja', 'İletişim ve İnternet', 'Telekommunikation', 'Telecomunicazioni', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5340', v_base_currency, true),
        (v_tenant_id, p_company_id, '5350', 'مصاريف صيانة', 'Maintenance Expense', 'Расходы на ремонт', 'Витрати на ремонт', 'Cheltuieli de întreținere', 'Koszty napraw', 'Bakım Giderleri', 'Instandhaltung', 'Spese di Manutenzione', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5350', v_base_currency, true),
        (v_tenant_id, p_company_id, '5360', 'مصاريف نقل وتوصيل', 'Shipping & Delivery', 'Доставка', 'Доставка', 'Transport și livrare', 'Transport i dostawa', 'Nakliye ve Teslimat', 'Versand und Lieferung', 'Spese di Spedizione', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5360', v_base_currency, true),
        (v_tenant_id, p_company_id, '5370', 'مصاريف وقود ومحروقات', 'Fuel Expense', 'Расходы на топливо', 'Витрати на паливо', 'Cheltuieli cu combustibilul', 'Koszty paliwa', 'Yakıt Giderleri', 'Kraftstoffkosten', 'Carburanti', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5370', v_base_currency, true),
        (v_tenant_id, p_company_id, '5380', 'مصاريف تشغيلية أخرى', 'Other Operating Expenses', 'Прочие операционные расходы', 'Інші операційні витрати', 'Alte cheltuieli operaționale', 'Inne koszty operacyjne', 'Diğer Faaliyet Giderleri', 'Sonstige Betriebskosten', 'Altri Costi Operativi', v_expense_type_id, v_operating_expenses_id, false, true, 3, '5000.5300.5380', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.4 Administrative Expenses (المصروفات الإدارية)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5400', 
        'المصروفات الإدارية', 'Administrative Expenses', 'Административные расходы', 'Адміністративні витрати', 'Cheltuieli administrative', 'Koszty administracyjne', 'Yönetim Giderleri', 'Verwaltungskosten', 'Spese Amministrative',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5400', v_base_currency, true)
    RETURNING id INTO v_admin_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5410', 'مصاريف مكتبية ومستلزمات', 'Office Supplies', 'Канцтовары', 'Канцтовари', 'Rechizite birou', 'Materiały biurowe', 'Ofis Malzemeleri', 'Bürobedarf', 'Cancelleria', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5410', v_base_currency, true),
        (v_tenant_id, p_company_id, '5420', 'رسوم حكومية وتراخيص', 'Government Fees & Licenses', 'Госпошлины и лицензии', 'Держмито та ліцензії', 'Taxe și licențe', 'Opłaty i licencje', 'Devlet Harçları ve Lisanslar', 'Behördengebühren', 'Tasse e Licenze', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5420', v_base_currency, true),
        (v_tenant_id, p_company_id, '5430', 'مصاريف قانونية', 'Legal Fees', 'Юридические расходы', 'Юридичні витрати', 'Cheltuieli juridice', 'Koszty prawne', 'Hukuki Giderler', 'Rechtskosten', 'Spese Legali', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5430', v_base_currency, true),
        (v_tenant_id, p_company_id, '5440', 'مصاريف محاسبية ومراجعة', 'Accounting & Audit Fees', 'Бухгалтерские и аудиторские услуги', 'Бухгалтерські та аудиторські послуги', 'Servicii contabile și audit', 'Usługi księgowe i audyt', 'Muhasebe ve Denetim Giderleri', 'Buchhaltungs- und Prüfungskosten', 'Spese Contabili e Revisione', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5440', v_base_currency, true),
        (v_tenant_id, p_company_id, '5450', 'استهلاك أصول ثابتة', 'Depreciation Expense', 'Амортизация', 'Амортизація', 'Amortizare', 'Amortyzacja', 'Amortisman Gideri', 'Abschreibungen', 'Ammortamenti', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5450', v_base_currency, true),
        (v_tenant_id, p_company_id, '5460', 'تأمينات', 'Insurance Expense', 'Страхование', 'Страхування', 'Asigurări', 'Ubezpieczenia', 'Sigorta Giderleri', 'Versicherungen', 'Assicurazioni', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5460', v_base_currency, true),
        (v_tenant_id, p_company_id, '5470', 'مصاريف ضيافة', 'Hospitality Expense', 'Представительские расходы', 'Представницькі витрати', 'Cheltuieli de protocol', 'Koszty reprezentacyjne', 'Ağırlama Giderleri', 'Bewirtungskosten', 'Spese di Rappresentanza', v_expense_type_id, v_admin_expenses_id, false, true, 3, '5000.5400.5470', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.5 Marketing & Sales Expenses (مصاريف التسويق والمبيعات)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5500', 
        'مصاريف التسويق والمبيعات', 'Marketing & Sales Expenses', 'Маркетинговые расходы', 'Маркетингові витрати', 'Cheltuieli de marketing', 'Koszty marketingu', 'Pazarlama ve Satış Giderleri', 'Marketing- und Vertriebskosten', 'Spese di Marketing e Vendita',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5500', v_base_currency, true)
    RETURNING id INTO v_marketing_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5510', 'مصاريف إعلان ودعاية', 'Advertising Expense', 'Реклама', 'Реклама', 'Publicitate', 'Reklama', 'Reklam Giderleri', 'Werbung', 'Pubblicità', v_expense_type_id, v_marketing_expenses_id, false, true, 3, '5000.5500.5510', v_base_currency, true),
        (v_tenant_id, p_company_id, '5520', 'عمولات مبيعات', 'Sales Commissions', 'Комиссионные с продаж', 'Комісійні з продажів', 'Comisioane vânzări', 'Prowizje od sprzedaży', 'Satış Komisyonları', 'Verkaufsprovisionen', 'Provvigioni', v_expense_type_id, v_marketing_expenses_id, false, true, 3, '5000.5500.5520', v_base_currency, true),
        (v_tenant_id, p_company_id, '5530', 'مصاريف معارض', 'Exhibition Expenses', 'Выставочные расходы', 'Виставкові витрати', 'Cheltuieli expoziții', 'Koszty wystaw', 'Fuar Giderleri', 'Messekosten', 'Spese Fiere', v_expense_type_id, v_marketing_expenses_id, false, true, 3, '5000.5500.5530', v_base_currency, true),
        (v_tenant_id, p_company_id, '5540', 'مصاريف تسويقية أخرى', 'Other Marketing Expenses', 'Прочие маркетинговые расходы', 'Інші маркетингові витрати', 'Alte cheltuieli de marketing', 'Inne koszty marketingu', 'Diğer Pazarlama Giderleri', 'Sonstige Marketingkosten', 'Altre Spese di Marketing', v_expense_type_id, v_marketing_expenses_id, false, true, 3, '5000.5500.5540', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.6 Financial Expenses (المصروفات المالية)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5600', 
        'المصروفات المالية', 'Financial Expenses', 'Финансовые расходы', 'Фінансові витрати', 'Cheltuieli financiare', 'Koszty finansowe', 'Finansal Giderler', 'Finanzaufwendungen', 'Oneri Finanziari',
        v_other_expense_type_id, v_expenses_id, true, false, 2, '5000.5600', v_base_currency, true)
    RETURNING id INTO v_financial_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5610', 'فوائد قروض', 'Interest Expense', 'Процентные расходы', 'Процентні витрати', 'Cheltuieli cu dobânzi', 'Odsetki', 'Faiz Giderleri', 'Zinsaufwendungen', 'Interessi Passivi', v_other_expense_type_id, v_financial_expenses_id, false, true, 3, '5000.5600.5610', v_base_currency, true),
        (v_tenant_id, p_company_id, '5620', 'عمولات بنكية', 'Bank Charges', 'Банковские комиссии', 'Банківські комісії', 'Comisioane bancare', 'Prowizje bankowe', 'Banka Masrafları', 'Bankgebühren', 'Spese Bancarie', v_other_expense_type_id, v_financial_expenses_id, false, true, 3, '5000.5600.5620', v_base_currency, true),
        (v_tenant_id, p_company_id, '5630', 'خسائر فروقات عملة', 'Foreign Exchange Losses', 'Курсовые убытки', 'Курсові збитки', 'Pierderi din diferențe de curs', 'Różnice kursowe ujemne', 'Kur Farkı Zararları', 'Kursverluste', 'Perdite su Cambi', v_other_expense_type_id, v_financial_expenses_id, false, true, 3, '5000.5600.5630', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.7 Taxes (الضرائب - مصروفات)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5700', 
        'الضرائب', 'Taxes', 'Налоги', 'Податки', 'Taxe', 'Podatki', 'Vergiler', 'Steuern', 'Imposte',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5700', v_base_currency, true)
    RETURNING id INTO v_taxes_expense_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5710', 'ضريبة الدخل', 'Income Tax Expense', 'Налог на прибыль', 'Податок на прибуток', 'Impozit pe venit', 'Podatek dochodowy', 'Gelir Vergisi Gideri', 'Körperschaftsteuer', 'IRES', v_expense_type_id, v_taxes_expense_id, false, true, 3, '5000.5700.5710', v_base_currency, true),
        (v_tenant_id, p_company_id, '5720', 'ضرائب أخرى', 'Other Taxes', 'Прочие налоги', 'Інші податки', 'Alte taxe', 'Inne podatki', 'Diğer Vergiler', 'Sonstige Steuern', 'Altre Imposte', v_expense_type_id, v_taxes_expense_id, false, true, 3, '5000.5700.5720', v_base_currency, true);
    
    -- ───────────────────────────────────────────────────────────────
    -- 5.8 Purchase Expenses (مصاريف المشتريات)
    -- ─── يُستخدم هذا القسم لتعريف مقدمي خدمات الشحن والجمارك ───
    -- ─── المستخدم يضيف حسابات فرعية لكل مورد خدمات ───────────
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5800', 
        'مصاريف المشتريات', 'Purchase Expenses', 'Расходы на закупки', 'Витрати на закупівлі', 'Cheltuieli de achiziție', 'Koszty zakupu', 'Satın Alma Giderleri', 'Beschaffungskosten', 'Spese di Acquisto',
        v_expense_type_id, v_expenses_id, true, false, 2, '5000.5800', v_base_currency, true)
    RETURNING id INTO v_purchase_expenses_id;
    
    -- 5.8.1 Shipping Expenses (مصاريف الشحن)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5810', 
        'مصاريف الشحن', 'Shipping Expenses', 'Расходы на доставку', 'Витрати на доставку', 'Cheltuieli de transport', 'Koszty wysyłki', 'Nakliye Giderleri', 'Versandkosten', 'Spese di Spedizione',
        v_expense_type_id, v_purchase_expenses_id, true, false, 3, '5000.5800.5810', v_base_currency, true)
    RETURNING id INTO v_shipping_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5811', 'شحن بحري — عام', 'Ocean Freight — General', 'Морской фрахт — общий', 'Морський фрахт — загальний', 'Navlu maritim — general', 'Fracht morski — ogólny', 'Deniz Navlun — Genel', 'Seefracht — Allgemein', 'Trasporto Marittimo — Generale', v_expense_type_id, v_shipping_expenses_id, false, true, 4, '5000.5800.5810.5811', v_base_currency, true),
        (v_tenant_id, p_company_id, '5812', 'شحن جوي', 'Air Freight', 'Авиафрахт', 'Авіафрахт', 'Transport aerian', 'Fracht lotniczy', 'Hava Navlun', 'Luftfracht', 'Trasporto Aereo', v_expense_type_id, v_shipping_expenses_id, false, true, 4, '5000.5800.5810.5812', v_base_currency, true),
        (v_tenant_id, p_company_id, '5813', 'نقل بري داخلي', 'Inland Transport', 'Внутренний транспорт', 'Внутрішній транспорт', 'Transport intern', 'Transport krajowy', 'İç Nakliye', 'Inlandstransport', 'Trasporto Interno', v_expense_type_id, v_shipping_expenses_id, false, true, 4, '5000.5800.5810.5813', v_base_currency, true);
    
    -- 5.8.2 Customs Expenses (مصاريف الجمركة)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5820', 
        'مصاريف الجمركة', 'Customs Expenses', 'Таможенные расходы', 'Митні витрати', 'Cheltuieli vamale', 'Koszty celne', 'Gümrük Giderleri', 'Zollkosten', 'Spese Doganali',
        v_expense_type_id, v_purchase_expenses_id, true, false, 3, '5000.5800.5820', v_base_currency, true)
    RETURNING id INTO v_customs_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5821', 'رسوم جمركية', 'Customs Duties', 'Таможенные пошлины', 'Митні збори', 'Taxe vamale', 'Cła', 'Gümrük Vergileri', 'Zölle', 'Dazi Doganali', v_expense_type_id, v_customs_expenses_id, false, true, 4, '5000.5800.5820.5821', v_base_currency, true),
        (v_tenant_id, p_company_id, '5822', 'أتعاب تخليص جمركي', 'Customs Clearance Fees', 'Услуги таможенного оформления', 'Послуги митного оформлення', 'Taxe de vămuire', 'Opłaty celne', 'Gümrük Müşavirliği', 'Zollabfertigungsgebühren', 'Spese di Sdoganamento', v_expense_type_id, v_customs_expenses_id, false, true, 4, '5000.5800.5820.5822', v_base_currency, true),
        (v_tenant_id, p_company_id, '5823', 'مصاريف فحص ومعاينة', 'Inspection Fees', 'Инспекционные расходы', 'Інспекційні витрати', 'Taxe de inspecție', 'Opłaty inspekcyjne', 'Muayene Ücretleri', 'Inspektionsgebühren', 'Spese di Ispezione', v_expense_type_id, v_customs_expenses_id, false, true, 4, '5000.5800.5820.5823', v_base_currency, true);
    
    -- 5.8.3 Marine Insurance (تأمين بحري)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5830', 
        'تأمين بحري وشحن', 'Marine & Cargo Insurance', 'Морское страхование', 'Морське страхування', 'Asigurare maritimă', 'Ubezpieczenie morskie', 'Deniz Sigortası', 'Transportversicherung', 'Assicurazione Marittima',
        v_expense_type_id, v_purchase_expenses_id, false, true, 3, '5000.5800.5830', v_base_currency, true)
    RETURNING id INTO v_marine_insurance_id;
    
    -- 5.8.4 Other Purchase Expenses (مصاريف مشتريات أخرى)
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES (v_tenant_id, p_company_id, '5840', 
        'مصاريف مشتريات أخرى', 'Other Purchase Expenses', 'Прочие расходы на закупки', 'Інші витрати на закупівлі', 'Alte cheltuieli de achiziție', 'Inne koszty zakupu', 'Diğer Satın Alma Giderleri', 'Sonstige Beschaffungskosten', 'Altre Spese di Acquisto',
        v_expense_type_id, v_purchase_expenses_id, true, false, 3, '5000.5800.5840', v_base_currency, true)
    RETURNING id INTO v_other_purchase_expenses_id;
    
    INSERT INTO chart_of_accounts (tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, account_type_id, parent_id, is_group, is_detail, level, full_code, currency, is_active)
    VALUES 
        (v_tenant_id, p_company_id, '5841', 'رسوم ميناء', 'Port Charges', 'Портовые сборы', 'Портові збори', 'Taxe portuare', 'Opłaty portowe', 'Liman Ücretleri', 'Hafengebühren', 'Diritti Portuali', v_expense_type_id, v_other_purchase_expenses_id, false, true, 4, '5000.5800.5840.5841', v_base_currency, true),
        (v_tenant_id, p_company_id, '5842', 'مصاريف تخزين', 'Storage Fees', 'Складские расходы', 'Складські витрати', 'Cheltuieli de depozitare', 'Koszty magazynowania', 'Depolama Ücretleri', 'Lagerkosten', 'Spese di Magazzinaggio', v_expense_type_id, v_other_purchase_expenses_id, false, true, 4, '5000.5800.5840.5842', v_base_currency, true),
        (v_tenant_id, p_company_id, '5843', 'مصاريف مشتريات متنوعة', 'Miscellaneous Purchase Exp.', 'Прочие расходы', 'Інші витрати', 'Cheltuieli diverse', 'Koszty różne', 'Çeşitli Alım Giderleri', 'Sonstige Kosten', 'Spese Varie di Acquisto', v_expense_type_id, v_other_purchase_expenses_id, false, true, 4, '5000.5800.5840.5843', v_base_currency, true);
    
    RAISE NOTICE 'Standard chart of accounts (9 languages) created successfully for company %', p_company_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- تشغيل الدالة لإنشاء الشجرة المحاسبية
-- Run the function to create chart of accounts
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get the first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
        -- Check if chart of accounts already exists for this company
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id LIMIT 1) THEN
            PERFORM create_default_chart_of_accounts(v_company_id);
            RAISE NOTICE 'Standard chart of accounts (9 languages) created for company: %', v_company_id;
        ELSE
            RAISE NOTICE 'Chart of accounts already exists for company: %', v_company_id;
        END IF;
    ELSE
        RAISE NOTICE 'No company found. Please create a company first.';
    END IF;
END $$;
