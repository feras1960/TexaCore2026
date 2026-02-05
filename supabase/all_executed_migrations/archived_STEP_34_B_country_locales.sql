-- ═══════════════════════════════════════════════════════════════
-- STEP_34_B: إضافة الإعدادات المحلية للدول
-- ═══════════════════════════════════════════════════════════════

-- إضافة أعمدة الترجمات والإعدادات المحلية لجدول countries

DO $$
BEGIN
    -- أعمدة الترجمات (9 لغات)
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_de VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_tr VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_ru VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_uk VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_it VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_pl VARCHAR(100);
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_ro VARCHAR(100);
    
    -- الإعدادات المحلية
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS locale VARCHAR(10); -- ar-SA, en-US, etc.
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS text_direction VARCHAR(3) DEFAULT 'ltr'; -- rtl أو ltr
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS number_system VARCHAR(20) DEFAULT 'latin'; -- arabic, latin, hindi, etc.
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'gregorian'; -- gregorian, hijri, mixed
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS time_format VARCHAR(5) DEFAULT '24h'; -- 12h أو 24h
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'monday'; -- saturday, sunday, monday
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS decimal_separator VARCHAR(1) DEFAULT '.'; -- . أو ,
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS thousands_separator VARCHAR(1) DEFAULT ','; -- , أو . أو space
    
    RAISE NOTICE '✅ تمت إضافة أعمدة الترجمات والإعدادات المحلية';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- تحديث أسماء الدول بجميع اللغات والإعدادات المحلية
-- ═══════════════════════════════════════════════════════════════

-- دول الخليج العربي
UPDATE countries SET
    name_de = 'Saudi-Arabien', name_tr = 'Suudi Arabistan', name_ru = 'Саудовская Аравия',
    name_uk = 'Саудівська Аравія', name_it = 'Arabia Saudita', name_pl = 'Arabia Saudyjska', name_ro = 'Arabia Saudită',
    locale = 'ar-SA', text_direction = 'rtl', number_system = 'arabic', date_format = 'hijri',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'SAU';

UPDATE countries SET
    name_de = 'Vereinigte Arabische Emirate', name_tr = 'Birleşik Arap Emirlikleri', name_ru = 'ОАЭ',
    name_uk = 'ОАЕ', name_it = 'Emirati Arabi Uniti', name_pl = 'Zjednoczone Emiraty Arabskie', name_ro = 'Emiratele Arabe Unite',
    locale = 'ar-AE', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'ARE';

UPDATE countries SET
    name_de = 'Kuwait', name_tr = 'Kuveyt', name_ru = 'Кувейт',
    name_uk = 'Кувейт', name_it = 'Kuwait', name_pl = 'Kuwejt', name_ro = 'Kuweit',
    locale = 'ar-KW', text_direction = 'rtl', number_system = 'arabic', date_format = 'hijri',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'KWT';

UPDATE countries SET
    name_de = 'Bahrain', name_tr = 'Bahreyn', name_ru = 'Бахрейн',
    name_uk = 'Бахрейн', name_it = 'Bahrein', name_pl = 'Bahrajn', name_ro = 'Bahrain',
    locale = 'ar-BH', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'BHR';

UPDATE countries SET
    name_de = 'Oman', name_tr = 'Umman', name_ru = 'Оман',
    name_uk = 'Оман', name_it = 'Oman', name_pl = 'Oman', name_ro = 'Oman',
    locale = 'ar-OM', text_direction = 'rtl', number_system = 'arabic', date_format = 'hijri',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'OMN';

UPDATE countries SET
    name_de = 'Katar', name_tr = 'Katar', name_ru = 'Катар',
    name_uk = 'Катар', name_it = 'Qatar', name_pl = 'Katar', name_ro = 'Qatar',
    locale = 'ar-QA', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'QAT';

-- دول الشام
UPDATE countries SET
    name_de = 'Syrien', name_tr = 'Suriye', name_ru = 'Сирия',
    name_uk = 'Сирія', name_it = 'Siria', name_pl = 'Syria', name_ro = 'Siria',
    locale = 'ar-SY', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'SYR';

UPDATE countries SET
    name_de = 'Jordanien', name_tr = 'Ürdün', name_ru = 'Иордания',
    name_uk = 'Йорданія', name_it = 'Giordania', name_pl = 'Jordania', name_ro = 'Iordania',
    locale = 'ar-JO', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'JOR';

UPDATE countries SET
    name_de = 'Libanon', name_tr = 'Lübnan', name_ru = 'Ливан',
    name_uk = 'Ліван', name_it = 'Libano', name_pl = 'Liban', name_ro = 'Liban',
    locale = 'ar-LB', text_direction = 'rtl', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'LBN';

UPDATE countries SET
    name_de = 'Palästina', name_tr = 'Filistin', name_ru = 'Палестина',
    name_uk = 'Палестина', name_it = 'Palestina', name_pl = 'Palestyna', name_ro = 'Palestina',
    locale = 'ar-PS', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'PSE';

-- العراق واليمن
UPDATE countries SET
    name_de = 'Irak', name_tr = 'Irak', name_ru = 'Ирак',
    name_uk = 'Ірак', name_it = 'Iraq', name_pl = 'Irak', name_ro = 'Irak',
    locale = 'ar-IQ', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'IRQ';

UPDATE countries SET
    name_de = 'Jemen', name_tr = 'Yemen', name_ru = 'Йемен',
    name_uk = 'Ємен', name_it = 'Yemen', name_pl = 'Jemen', name_ro = 'Yemen',
    locale = 'ar-YE', text_direction = 'rtl', number_system = 'arabic', date_format = 'hijri',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'YEM';

-- دول أفريقيا والمغرب العربي
UPDATE countries SET
    name_de = 'Ägypten', name_tr = 'Mısır', name_ru = 'Египет',
    name_uk = 'Єгипет', name_it = 'Egitto', name_pl = 'Egipt', name_ro = 'Egipt',
    locale = 'ar-EG', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'EGY';

UPDATE countries SET
    name_de = 'Libyen', name_tr = 'Libya', name_ru = 'Ливия',
    name_uk = 'Лівія', name_it = 'Libia', name_pl = 'Libia', name_ro = 'Libia',
    locale = 'ar-LY', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'LBY';

UPDATE countries SET
    name_de = 'Tunesien', name_tr = 'Tunus', name_ru = 'Тунис',
    name_uk = 'Туніс', name_it = 'Tunisia', name_pl = 'Tunezja', name_ro = 'Tunisia',
    locale = 'ar-TN', text_direction = 'rtl', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'TUN';

UPDATE countries SET
    name_de = 'Marokko', name_tr = 'Fas', name_ru = 'Марокко',
    name_uk = 'Марокко', name_it = 'Marocco', name_pl = 'Maroko', name_ro = 'Maroc',
    locale = 'ar-MA', text_direction = 'rtl', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'MAR';

UPDATE countries SET
    name_de = 'Algerien', name_tr = 'Cezayir', name_ru = 'Алжир',
    name_uk = 'Алжир', name_it = 'Algeria', name_pl = 'Algieria', name_ro = 'Algeria',
    locale = 'ar-DZ', text_direction = 'rtl', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'saturday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'DZA';

UPDATE countries SET
    name_de = 'Sudan', name_tr = 'Sudan', name_ru = 'Судан',
    name_uk = 'Судан', name_it = 'Sudan', name_pl = 'Sudan', name_ro = 'Sudan',
    locale = 'ar-SD', text_direction = 'rtl', number_system = 'arabic', date_format = 'gregorian',
    time_format = '12h', week_start = 'saturday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'SDN';

-- أوروبا الغربية
UPDATE countries SET
    name_de = 'Vereinigtes Königreich', name_tr = 'Birleşik Krallık', name_ru = 'Великобритания',
    name_uk = 'Велика Британія', name_it = 'Regno Unito', name_pl = 'Wielka Brytania', name_ro = 'Regatul Unit',
    locale = 'en-GB', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'GBR';

UPDATE countries SET
    name_de = 'Deutschland', name_tr = 'Almanya', name_ru = 'Германия',
    name_uk = 'Німеччина', name_it = 'Germania', name_pl = 'Niemcy', name_ro = 'Germania',
    locale = 'de-DE', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'DEU';

UPDATE countries SET
    name_de = 'Frankreich', name_tr = 'Fransa', name_ru = 'Франция',
    name_uk = 'Франція', name_it = 'Francia', name_pl = 'Francja', name_ro = 'Franța',
    locale = 'fr-FR', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'FRA';

UPDATE countries SET
    name_de = 'Italien', name_tr = 'İtalya', name_ru = 'Италия',
    name_uk = 'Італія', name_it = 'Italia', name_pl = 'Włochy', name_ro = 'Italia',
    locale = 'it-IT', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'ITA';

UPDATE countries SET
    name_de = 'Spanien', name_tr = 'İspanya', name_ru = 'Испания',
    name_uk = 'Іспанія', name_it = 'Spagna', name_pl = 'Hiszpania', name_ro = 'Spania',
    locale = 'es-ES', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'ESP';

UPDATE countries SET
    name_de = 'Schweiz', name_tr = 'İsviçre', name_ru = 'Швейцария',
    name_uk = 'Швейцарія', name_it = 'Svizzera', name_pl = 'Szwajcaria', name_ro = 'Elveția',
    locale = 'de-CH', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = '.', thousands_separator = "'"
WHERE code = 'CHE';

-- أوروبا الشرقية
UPDATE countries SET
    name_de = 'Ukraine', name_tr = 'Ukrayna', name_ru = 'Украина',
    name_uk = 'Україна', name_it = 'Ucraina', name_pl = 'Ukraina', name_ro = 'Ucraina',
    locale = 'uk-UA', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'UKR';

UPDATE countries SET
    name_de = 'Russland', name_tr = 'Rusya', name_ru = 'Россия',
    name_uk = 'Росія', name_it = 'Russia', name_pl = 'Rosja', name_ro = 'Rusia',
    locale = 'ru-RU', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'RUS';

UPDATE countries SET
    name_de = 'Rumänien', name_tr = 'Romanya', name_ru = 'Румыния',
    name_uk = 'Румунія', name_it = 'Romania', name_pl = 'Rumunia', name_ro = 'România',
    locale = 'ro-RO', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'ROU';

UPDATE countries SET
    name_de = 'Moldawien', name_tr = 'Moldova', name_ru = 'Молдова',
    name_uk = 'Молдова', name_it = 'Moldova', name_pl = 'Mołdawia', name_ro = 'Moldova',
    locale = 'ro-MD', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'MDA';

UPDATE countries SET
    name_de = 'Polen', name_tr = 'Polonya', name_ru = 'Польша',
    name_uk = 'Польща', name_it = 'Polonia', name_pl = 'Polska', name_ro = 'Polonia',
    locale = 'pl-PL', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'POL';

UPDATE countries SET
    name_de = 'Tschechien', name_tr = 'Çekya', name_ru = 'Чехия',
    name_uk = 'Чехія', name_it = 'Repubblica Ceca', name_pl = 'Czechy', name_ro = 'Cehia',
    locale = 'cs-CZ', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'CZE';

UPDATE countries SET
    name_de = 'Ungarn', name_tr = 'Macaristan', name_ru = 'Венгрия',
    name_uk = 'Угорщина', name_it = 'Ungheria', name_pl = 'Węgry', name_ro = 'Ungaria',
    locale = 'hu-HU', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'HUN';

UPDATE countries SET
    name_de = 'Bulgarien', name_tr = 'Bulgaristan', name_ru = 'Болгария',
    name_uk = 'Болгарія', name_it = 'Bulgaria', name_pl = 'Bułgaria', name_ro = 'Bulgaria',
    locale = 'bg-BG', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'BGR';

-- تركيا وآسيا
UPDATE countries SET
    name_de = 'Türkei', name_tr = 'Türkiye', name_ru = 'Турция',
    name_uk = 'Туреччина', name_it = 'Turchia', name_pl = 'Turcja', name_ro = 'Turcia',
    locale = 'tr-TR', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'TUR';

UPDATE countries SET
    name_de = 'China', name_tr = 'Çin', name_ru = 'Китай',
    name_uk = 'Китай', name_it = 'Cina', name_pl = 'Chiny', name_ro = 'China',
    locale = 'zh-CN', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'CHN';

UPDATE countries SET
    name_de = 'Indien', name_tr = 'Hindistan', name_ru = 'Индия',
    name_uk = 'Індія', name_it = 'India', name_pl = 'Indie', name_ro = 'India',
    locale = 'hi-IN', text_direction = 'ltr', number_system = 'hindi', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'IND';

UPDATE countries SET
    name_de = 'Japan', name_tr = 'Japonya', name_ru = 'Япония',
    name_uk = 'Японія', name_it = 'Giappone', name_pl = 'Japonia', name_ro = 'Japonia',
    locale = 'ja-JP', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'JPN';

UPDATE countries SET
    name_de = 'Südkorea', name_tr = 'Güney Kore', name_ru = 'Южная Корея',
    name_uk = 'Південна Корея', name_it = 'Corea del Sud', name_pl = 'Korea Południowa', name_ro = 'Coreea de Sud',
    locale = 'ko-KR', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'KOR';

UPDATE countries SET
    name_de = 'Pakistan', name_tr = 'Pakistan', name_ru = 'Пакистан',
    name_uk = 'Пакистан', name_it = 'Pakistan', name_pl = 'Pakistan', name_ro = 'Pakistan',
    locale = 'ur-PK', text_direction = 'rtl', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'PAK';

UPDATE countries SET
    name_de = 'Bangladesch', name_tr = 'Bangladeş', name_ru = 'Бангладеш',
    name_uk = 'Бангладеш', name_it = 'Bangladesh', name_pl = 'Bangladesz', name_ro = 'Bangladesh',
    locale = 'bn-BD', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'BGD';

-- الأمريكتين
UPDATE countries SET
    name_de = 'Vereinigte Staaten', name_tr = 'Amerika Birleşik Devletleri', name_ru = 'США',
    name_uk = 'США', name_it = 'Stati Uniti', name_pl = 'Stany Zjednoczone', name_ro = 'Statele Unite',
    locale = 'en-US', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'USA';

UPDATE countries SET
    name_de = 'Kanada', name_tr = 'Kanada', name_ru = 'Канада',
    name_uk = 'Канада', name_it = 'Canada', name_pl = 'Kanada', name_ro = 'Canada',
    locale = 'en-CA', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'CAN';

UPDATE countries SET
    name_de = 'Mexiko', name_tr = 'Meksika', name_ru = 'Мексика',
    name_uk = 'Мексика', name_it = 'Messico', name_pl = 'Meksyk', name_ro = 'Mexic',
    locale = 'es-MX', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'sunday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'MEX';

UPDATE countries SET
    name_de = 'Brasilien', name_tr = 'Brezilya', name_ru = 'Бразилия',
    name_uk = 'Бразилія', name_it = 'Brasile', name_pl = 'Brazylia', name_ro = 'Brazilia',
    locale = 'pt-BR', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'sunday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'BRA';

UPDATE countries SET
    name_de = 'Argentinien', name_tr = 'Arjantin', name_ru = 'Аргентина',
    name_uk = 'Аргентина', name_it = 'Argentina', name_pl = 'Argentyna', name_ro = 'Argentina',
    locale = 'es-AR', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'monday', decimal_separator = ',', thousands_separator = '.'
WHERE code = 'ARG';

-- دول أخرى
UPDATE countries SET
    name_de = 'Australien', name_tr = 'Avustralya', name_ru = 'Австралия',
    name_uk = 'Австралія', name_it = 'Australia', name_pl = 'Australia', name_ro = 'Australia',
    locale = 'en-AU', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'AUS';

UPDATE countries SET
    name_de = 'Neuseeland', name_tr = 'Yeni Zelanda', name_ru = 'Новая Зеландия',
    name_uk = 'Нова Зеландія', name_it = 'Nuova Zelanda', name_pl = 'Nowa Zelandia', name_ro = 'Noua Zeelandă',
    locale = 'en-NZ', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'NZL';

UPDATE countries SET
    name_de = 'Südafrika', name_tr = 'Güney Afrika', name_ru = 'ЮАР',
    name_uk = 'ПАР', name_it = 'Sudafrica', name_pl = 'Republika Południowej Afryki', name_ro = 'Africa de Sud',
    locale = 'en-ZA', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '24h', week_start = 'sunday', decimal_separator = ',', thousands_separator = ' '
WHERE code = 'ZAF';

UPDATE countries SET
    name_de = 'Nigeria', name_tr = 'Nijerya', name_ru = 'Нигерия',
    name_uk = 'Нігерія', name_it = 'Nigeria', name_pl = 'Nigeria', name_ro = 'Nigeria',
    locale = 'en-NG', text_direction = 'ltr', number_system = 'latin', date_format = 'gregorian',
    time_format = '12h', week_start = 'monday', decimal_separator = '.', thousands_separator = ','
WHERE code = 'NGA';

-- ═══════════════════════════════════════════════════════════════
-- النتيجة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم تحديث نظام الدول بالكامل!';
    RAISE NOTICE '🌍 إضافة أسماء الدول بـ 9 لغات';
    RAISE NOTICE '⚙️ إضافة الإعدادات المحلية الكاملة لكل دولة';
    RAISE NOTICE '📅 أنظمة التاريخ: Gregorian, Hijri, Mixed';
    RAISE NOTICE '🔢 أنظمة الأرقام: Latin, Arabic, Hindi';
    RAISE NOTICE '🕐 أنظمة الوقت: 12h, 24h';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════════
-- 1. دول الخليج: معظمها RTL + أرقام عربية + تاريخ هجري أو مختلط
-- 2. السعودية والكويت وعمان واليمن: تاريخ هجري
-- 3. الدول العربية الأخرى: أغلبها تاريخ ميلادي
-- 4. أوروبا: LTR + نظام 24 ساعة (ما عدا UK)
-- 5. الهند: نظام أرقام هندي (Devanagari)
-- 6. الأمريكتين: نظام 12 ساعة + بداية الأسبوع الأحد
-- 7. الفواصل العشرية: بعض الدول تستخدم (,) والبعض (.)
-- 8. فواصل الآلاف: بعض الدول تستخدم (.) والبعض (,) والبعض مسافة
-- ═══════════════════════════════════════════════════════════════
