-- ═══════════════════════════════════════════════════════════════
-- STEP_33_B: إضافة أعمدة الترجمات للعملات (9 لغات)
-- ═══════════════════════════════════════════════════════════════

-- إضافة أعمدة الترجمات لباقي اللغات المدعومة

DO $$
BEGIN
    -- إضافة أعمدة الترجمات إذا لم تكن موجودة
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_de VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_tr VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_ru VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_uk VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_it VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_pl VARCHAR(100);
    ALTER TABLE currencies ADD COLUMN IF NOT EXISTS name_ro VARCHAR(100);
    
    RAISE NOTICE '✅ تمت إضافة أعمدة الترجمات لجدول currencies';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- تحديث أسماء العملات بجميع اللغات المدعومة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_record RECORD;
BEGIN
    RAISE NOTICE '🌍 بدء تحديث أسماء العملات بجميع اللغات...';
    
    FOR v_tenant_record IN SELECT id FROM tenants LOOP
        -- تحديث أسماء العملات
        UPDATE currencies SET
            -- الألمانية (German)
            name_de = CASE code
                WHEN 'SAR' THEN 'Saudi-Rial'
                WHEN 'AED' THEN 'VAE-Dirham'
                WHEN 'KWD' THEN 'Kuwait-Dinar'
                WHEN 'BHD' THEN 'Bahrain-Dinar'
                WHEN 'OMR' THEN 'Omanischer Rial'
                WHEN 'QAR' THEN 'Katar-Riyal'
                WHEN 'SYP' THEN 'Syrisches Pfund'
                WHEN 'JOD' THEN 'Jordanischer Dinar'
                WHEN 'IQD' THEN 'Irakischer Dinar'
                WHEN 'LBP' THEN 'Libanesisches Pfund'
                WHEN 'EGP' THEN 'Ägyptisches Pfund'
                WHEN 'LYD' THEN 'Libyscher Dinar'
                WHEN 'TND' THEN 'Tunesischer Dinar'
                WHEN 'MAD' THEN 'Marokkanischer Dirham'
                WHEN 'DZD' THEN 'Algerischer Dinar'
                WHEN 'EUR' THEN 'Euro'
                WHEN 'GBP' THEN 'Britisches Pfund'
                WHEN 'CHF' THEN 'Schweizer Franken'
                WHEN 'UAH' THEN 'Ukrainische Hrywnja'
                WHEN 'RUB' THEN 'Russischer Rubel'
                WHEN 'RON' THEN 'Rumänischer Leu'
                WHEN 'MDL' THEN 'Moldauischer Leu'
                WHEN 'PLN' THEN 'Polnischer Zloty'
                WHEN 'CZK' THEN 'Tschechische Krone'
                WHEN 'TRY' THEN 'Türkische Lira'
                WHEN 'CNY' THEN 'Chinesischer Yuan'
                WHEN 'INR' THEN 'Indische Rupie'
                WHEN 'JPY' THEN 'Japanischer Yen'
                WHEN 'USD' THEN 'US-Dollar'
                WHEN 'CAD' THEN 'Kanadischer Dollar'
            END,
            -- التركية (Turkish)
            name_tr = CASE code
                WHEN 'SAR' THEN 'Suudi Riyali'
                WHEN 'AED' THEN 'BAE Dirhemi'
                WHEN 'KWD' THEN 'Kuveyt Dinarı'
                WHEN 'BHD' THEN 'Bahreyn Dinarı'
                WHEN 'OMR' THEN 'Umman Riyali'
                WHEN 'QAR' THEN 'Katar Riyali'
                WHEN 'SYP' THEN 'Suriye Lirası'
                WHEN 'JOD' THEN 'Ürdün Dinarı'
                WHEN 'IQD' THEN 'Irak Dinarı'
                WHEN 'LBP' THEN 'Lübnan Lirası'
                WHEN 'EGP' THEN 'Mısır Poundu'
                WHEN 'LYD' THEN 'Libya Dinarı'
                WHEN 'TND' THEN 'Tunus Dinarı'
                WHEN 'MAD' THEN 'Fas Dirhemi'
                WHEN 'DZD' THEN 'Cezayir Dinarı'
                WHEN 'EUR' THEN 'Euro'
                WHEN 'GBP' THEN 'İngiliz Sterlini'
                WHEN 'CHF' THEN 'İsviçre Frangı'
                WHEN 'UAH' THEN 'Ukrayna Grivnası'
                WHEN 'RUB' THEN 'Rus Rublesi'
                WHEN 'RON' THEN 'Rumen Leyi'
                WHEN 'MDL' THEN 'Moldova Leyi'
                WHEN 'PLN' THEN 'Polonya Zlotisi'
                WHEN 'CZK' THEN 'Çek Korunası'
                WHEN 'TRY' THEN 'Türk Lirası'
                WHEN 'CNY' THEN 'Çin Yuanı'
                WHEN 'INR' THEN 'Hindistan Rupisi'
                WHEN 'JPY' THEN 'Japon Yeni'
                WHEN 'USD' THEN 'ABD Doları'
                WHEN 'CAD' THEN 'Kanada Doları'
            END,
            -- الروسية (Russian)
            name_ru = CASE code
                WHEN 'SAR' THEN 'Саудовский риял'
                WHEN 'AED' THEN 'Дирхам ОАЭ'
                WHEN 'KWD' THEN 'Кувейтский динар'
                WHEN 'BHD' THEN 'Бахрейнский динар'
                WHEN 'OMR' THEN 'Оманский риал'
                WHEN 'QAR' THEN 'Катарский риал'
                WHEN 'SYP' THEN 'Сирийский фунт'
                WHEN 'JOD' THEN 'Иорданский динар'
                WHEN 'IQD' THEN 'Иракский динар'
                WHEN 'LBP' THEN 'Ливанский фунт'
                WHEN 'EGP' THEN 'Египетский фунт'
                WHEN 'LYD' THEN 'Ливийский динар'
                WHEN 'TND' THEN 'Тунисский динар'
                WHEN 'MAD' THEN 'Марокканский дирхам'
                WHEN 'DZD' THEN 'Алжирский динар'
                WHEN 'EUR' THEN 'Евро'
                WHEN 'GBP' THEN 'Фунт стерлингов'
                WHEN 'CHF' THEN 'Швейцарский франк'
                WHEN 'UAH' THEN 'Украинская гривна'
                WHEN 'RUB' THEN 'Российский рубль'
                WHEN 'RON' THEN 'Румынский лей'
                WHEN 'MDL' THEN 'Молдавский лей'
                WHEN 'PLN' THEN 'Польский злотый'
                WHEN 'CZK' THEN 'Чешская крона'
                WHEN 'TRY' THEN 'Турецкая лира'
                WHEN 'CNY' THEN 'Китайский юань'
                WHEN 'INR' THEN 'Индийская рупия'
                WHEN 'JPY' THEN 'Японская иена'
                WHEN 'USD' THEN 'Доллар США'
                WHEN 'CAD' THEN 'Канадский доллар'
            END,
            -- الأوكرانية (Ukrainian)
            name_uk = CASE code
                WHEN 'SAR' THEN 'Саудівський ріял'
                WHEN 'AED' THEN 'Дирхам ОАЕ'
                WHEN 'KWD' THEN 'Кувейтський динар'
                WHEN 'BHD' THEN 'Бахрейнський динар'
                WHEN 'OMR' THEN 'Оманський ріал'
                WHEN 'QAR' THEN 'Катарський ріал'
                WHEN 'SYP' THEN 'Сирійський фунт'
                WHEN 'JOD' THEN 'Йорданський динар'
                WHEN 'IQD' THEN 'Іракський динар'
                WHEN 'LBP' THEN 'Ліванський фунт'
                WHEN 'EGP' THEN 'Єгипетський фунт'
                WHEN 'LYD' THEN 'Лівійський динар'
                WHEN 'TND' THEN 'Туніський динар'
                WHEN 'MAD' THEN 'Марокканський дирхам'
                WHEN 'DZD' THEN 'Алжирський динар'
                WHEN 'EUR' THEN 'Євро'
                WHEN 'GBP' THEN 'Фунт стерлінгів'
                WHEN 'CHF' THEN 'Швейцарський франк'
                WHEN 'UAH' THEN 'Українська гривня'
                WHEN 'RUB' THEN 'Російський рубль'
                WHEN 'RON' THEN 'Румунський лей'
                WHEN 'MDL' THEN 'Молдавський лей'
                WHEN 'PLN' THEN 'Польський злотий'
                WHEN 'CZK' THEN 'Чеська крона'
                WHEN 'TRY' THEN 'Турецька ліра'
                WHEN 'CNY' THEN 'Китайський юань'
                WHEN 'INR' THEN 'Індійська рупія'
                WHEN 'JPY' THEN 'Японська єна'
                WHEN 'USD' THEN 'Долар США'
                WHEN 'CAD' THEN 'Канадський долар'
            END,
            -- الإيطالية (Italian)
            name_it = CASE code
                WHEN 'SAR' THEN 'Riyal saudita'
                WHEN 'AED' THEN 'Dirham degli EAU'
                WHEN 'KWD' THEN 'Dinaro kuwaitiano'
                WHEN 'BHD' THEN 'Dinaro del Bahrein'
                WHEN 'OMR' THEN 'Rial omanita'
                WHEN 'QAR' THEN 'Riyal qatarino'
                WHEN 'SYP' THEN 'Lira siriana'
                WHEN 'JOD' THEN 'Dinaro giordano'
                WHEN 'IQD' THEN 'Dinaro iracheno'
                WHEN 'LBP' THEN 'Lira libanese'
                WHEN 'EGP' THEN 'Sterlina egiziana'
                WHEN 'LYD' THEN 'Dinaro libico'
                WHEN 'TND' THEN 'Dinaro tunisino'
                WHEN 'MAD' THEN 'Dirham marocchino'
                WHEN 'DZD' THEN 'Dinaro algerino'
                WHEN 'EUR' THEN 'Euro'
                WHEN 'GBP' THEN 'Sterlina britannica'
                WHEN 'CHF' THEN 'Franco svizzero'
                WHEN 'UAH' THEN 'Hryvnia ucraina'
                WHEN 'RUB' THEN 'Rublo russo'
                WHEN 'RON' THEN 'Leu rumeno'
                WHEN 'MDL' THEN 'Leu moldavo'
                WHEN 'PLN' THEN 'Zloty polacco'
                WHEN 'CZK' THEN 'Corona ceca'
                WHEN 'TRY' THEN 'Lira turca'
                WHEN 'CNY' THEN 'Yuan cinese'
                WHEN 'INR' THEN 'Rupia indiana'
                WHEN 'JPY' THEN 'Yen giapponese'
                WHEN 'USD' THEN 'Dollaro USA'
                WHEN 'CAD' THEN 'Dollaro canadese'
            END,
            -- البولندية (Polish)
            name_pl = CASE code
                WHEN 'SAR' THEN 'Rial saudyjski'
                WHEN 'AED' THEN 'Dirham ZEA'
                WHEN 'KWD' THEN 'Dinar kuwejcki'
                WHEN 'BHD' THEN 'Dinar bahrajski'
                WHEN 'OMR' THEN 'Rial omański'
                WHEN 'QAR' THEN 'Rial katarski'
                WHEN 'SYP' THEN 'Funt syryjski'
                WHEN 'JOD' THEN 'Dinar jordański'
                WHEN 'IQD' THEN 'Dinar iracki'
                WHEN 'LBP' THEN 'Funt libański'
                WHEN 'EGP' THEN 'Funt egipski'
                WHEN 'LYD' THEN 'Dinar libijski'
                WHEN 'TND' THEN 'Dinar tunezyjski'
                WHEN 'MAD' THEN 'Dirham marokański'
                WHEN 'DZD' THEN 'Dinar algierski'
                WHEN 'EUR' THEN 'Euro'
                WHEN 'GBP' THEN 'Funt szterling'
                WHEN 'CHF' THEN 'Frank szwajcarski'
                WHEN 'UAH' THEN 'Hrywna ukraińska'
                WHEN 'RUB' THEN 'Rubel rosyjski'
                WHEN 'RON' THEN 'Lej rumuński'
                WHEN 'MDL' THEN 'Lej mołdawski'
                WHEN 'PLN' THEN 'Złoty polski'
                WHEN 'CZK' THEN 'Korona czeska'
                WHEN 'TRY' THEN 'Lira turecka'
                WHEN 'CNY' THEN 'Juan chiński'
                WHEN 'INR' THEN 'Rupia indyjska'
                WHEN 'JPY' THEN 'Jen japoński'
                WHEN 'USD' THEN 'Dolar amerykański'
                WHEN 'CAD' THEN 'Dolar kanadyjski'
            END,
            -- الرومانية (Romanian)
            name_ro = CASE code
                WHEN 'SAR' THEN 'Rial saudit'
                WHEN 'AED' THEN 'Dirham EAU'
                WHEN 'KWD' THEN 'Dinar kuweitian'
                WHEN 'BHD' THEN 'Dinar bahreinian'
                WHEN 'OMR' THEN 'Rial omanez'
                WHEN 'QAR' THEN 'Rial qatarian'
                WHEN 'SYP' THEN 'Liră siriană'
                WHEN 'JOD' THEN 'Dinar iordanian'
                WHEN 'IQD' THEN 'Dinar irakian'
                WHEN 'LBP' THEN 'Liră libaneză'
                WHEN 'EGP' THEN 'Liră egipteană'
                WHEN 'LYD' THEN 'Dinar libian'
                WHEN 'TND' THEN 'Dinar tunisian'
                WHEN 'MAD' THEN 'Dirham marocan'
                WHEN 'DZD' THEN 'Dinar algerian'
                WHEN 'EUR' THEN 'Euro'
                WHEN 'GBP' THEN 'Liră sterlină'
                WHEN 'CHF' THEN 'Franc elvețian'
                WHEN 'UAH' THEN 'Hryvnia ucraineană'
                WHEN 'RUB' THEN 'Rublă rusească'
                WHEN 'RON' THEN 'Leu românesc'
                WHEN 'MDL' THEN 'Leu moldovenesc'
                WHEN 'PLN' THEN 'Zlot polonez'
                WHEN 'CZK' THEN 'Coroană cehă'
                WHEN 'TRY' THEN 'Liră turcească'
                WHEN 'CNY' THEN 'Yuan chinezesc'
                WHEN 'INR' THEN 'Rupie indiană'
                WHEN 'JPY' THEN 'Yen japonez'
                WHEN 'USD' THEN 'Dolar american'
                WHEN 'CAD' THEN 'Dolar canadian'
            END
        WHERE tenant_id = v_tenant_record.id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم تحديث أسماء العملات بجميع اللغات المدعومة (9 لغات)!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ خطأ أثناء تحديث الترجمات: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات:
-- ═══════════════════════════════════════════════════════════════
-- 1. تمت إضافة ترجمات كاملة للعملات بـ 9 لغات
-- 2. اللغات المدعومة: ar, en, de, tr, ru, uk, it, pl, ro
-- 3. يمكن للمستخدم اختيار اللغة المناسبة حسب إعدادات النظام
-- ═══════════════════════════════════════════════════════════════
