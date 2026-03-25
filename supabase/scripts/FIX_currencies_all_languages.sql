-- =====================================================
-- FIX_currencies_all_languages.sql
-- إضافة جميع عملات العالم بـ 9 لغات
-- =====================================================

-- 1. إزالة قيد tenant_id NOT NULL
ALTER TABLE currencies ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. حذف العملات القديمة
DELETE FROM currencies;

-- 3. إضافة قيد UNIQUE على code
ALTER TABLE currencies DROP CONSTRAINT IF EXISTS currencies_code_unique;
ALTER TABLE currencies ADD CONSTRAINT currencies_code_unique UNIQUE (code);

-- 4. إضافة العملات الرئيسية مع جميع اللغات
INSERT INTO currencies (
    code, name, name_ar, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    symbol, decimal_places, is_active
) VALUES
-- العملات الرئيسية
('USD', 'US Dollar', 'دولار أمريكي', 'US-Dollar', 'ABD Doları', 'Доллар США', 'Долар США', 'Dollaro USA', 'Dolar amerykański', 'Dolar american', '$', 2, true),
('EUR', 'Euro', 'يورو', 'Euro', 'Euro', 'Евро', 'Євро', 'Euro', 'Euro', 'Euro', '€', 2, true),
('GBP', 'British Pound', 'جنيه استرليني', 'Britisches Pfund', 'İngiliz Sterlini', 'Британский фунт', 'Британський фунт', 'Sterlina britannica', 'Funt brytyjski', 'Liră sterlină', '£', 2, true),
('JPY', 'Japanese Yen', 'ين ياباني', 'Japanischer Yen', 'Japon Yeni', 'Японская иена', 'Японська єна', 'Yen giapponese', 'Jen japoński', 'Yen japonez', '¥', 0, true),
('CHF', 'Swiss Franc', 'فرنك سويسري', 'Schweizer Franken', 'İsviçre Frangı', 'Швейцарский франк', 'Швейцарський франк', 'Franco svizzero', 'Frank szwajcarski', 'Franc elvețian', 'CHF', 2, true),
('CAD', 'Canadian Dollar', 'دولار كندي', 'Kanadischer Dollar', 'Kanada Doları', 'Канадский доллар', 'Канадський долар', 'Dollaro canadese', 'Dolar kanadyjski', 'Dolar canadian', 'C$', 2, true),
('AUD', 'Australian Dollar', 'دولار أسترالي', 'Australischer Dollar', 'Avustralya Doları', 'Австралийский доллар', 'Австралійський долар', 'Dollaro australiano', 'Dolar australijski', 'Dolar australian', 'A$', 2, true),
('NZD', 'New Zealand Dollar', 'دولار نيوزيلندي', 'Neuseeland-Dollar', 'Yeni Zelanda Doları', 'Новозеландский доллар', 'Новозеландський долар', 'Dollaro neozelandese', 'Dolar nowozelandzki', 'Dolar neozeelandez', 'NZ$', 2, true),
('CNY', 'Chinese Yuan', 'يوان صيني', 'Chinesischer Yuan', 'Çin Yuanı', 'Китайский юань', 'Китайський юань', 'Yuan cinese', 'Juan chiński', 'Yuan chinezesc', '¥', 2, true),
('HKD', 'Hong Kong Dollar', 'دولار هونغ كونغ', 'Hongkong-Dollar', 'Hong Kong Doları', 'Гонконгский доллар', 'Гонконгський долар', 'Dollaro di Hong Kong', 'Dolar hongkoński', 'Dolar Hong Kong', 'HK$', 2, true),
('SGD', 'Singapore Dollar', 'دولار سنغافوري', 'Singapur-Dollar', 'Singapur Doları', 'Сингапурский доллар', 'Сінгапурський долар', 'Dollaro di Singapore', 'Dolar singapurski', 'Dolar singaporez', 'S$', 2, true),

-- العملات العربية
('SAR', 'Saudi Riyal', 'ريال سعودي', 'Saudi-Riyal', 'Suudi Riyali', 'Саудовский риял', 'Саудівський ріял', 'Riyal saudita', 'Rial saudyjski', 'Rial saudit', 'ر.س', 2, true),
('AED', 'UAE Dirham', 'درهم إماراتي', 'VAE-Dirham', 'BAE Dirhemi', 'Дирхам ОАЭ', 'Дирхам ОАЕ', 'Dirham degli EAU', 'Dirham ZEA', 'Dirham EAU', 'د.إ', 2, true),
('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'Kuwait-Dinar', 'Kuveyt Dinarı', 'Кувейтский динар', 'Кувейтський динар', 'Dinaro kuwaitiano', 'Dinar kuwejcki', 'Dinar kuweitian', 'د.ك', 3, true),
('BHD', 'Bahraini Dinar', 'دينار بحريني', 'Bahrain-Dinar', 'Bahreyn Dinarı', 'Бахрейнский динар', 'Бахрейнський динар', 'Dinaro del Bahrein', 'Dinar bahrajński', 'Dinar bahreinian', 'د.ب', 3, true),
('OMR', 'Omani Rial', 'ريال عماني', 'Omanischer Rial', 'Umman Riyali', 'Оманский риал', 'Оманський ріял', 'Rial omanita', 'Rial omański', 'Rial omanez', 'ر.ع', 3, true),
('QAR', 'Qatari Riyal', 'ريال قطري', 'Katar-Riyal', 'Katar Riyali', 'Катарский риал', 'Катарський ріял', 'Riyal del Qatar', 'Rial katarski', 'Rial qatarian', 'ر.ق', 2, true),
('JOD', 'Jordanian Dinar', 'دينار أردني', 'Jordanischer Dinar', 'Ürdün Dinarı', 'Иорданский динар', 'Йорданський динар', 'Dinaro giordano', 'Dinar jordański', 'Dinar iordanian', 'د.أ', 3, true),
('EGP', 'Egyptian Pound', 'جنيه مصري', 'Ägyptisches Pfund', 'Mısır Lirası', 'Египетский фунт', 'Єгипетський фунт', 'Sterlina egiziana', 'Funt egipski', 'Liră egipteană', 'ج.م', 2, true),
('LBP', 'Lebanese Pound', 'ليرة لبنانية', 'Libanesisches Pfund', 'Lübnan Lirası', 'Ливанский фунт', 'Ліванський фунт', 'Lira libanese', 'Funt libański', 'Liră libaneză', 'ل.ل', 0, true),
('SYP', 'Syrian Pound', 'ليرة سورية', 'Syrisches Pfund', 'Suriye Lirası', 'Сирийский фунт', 'Сирійський фунт', 'Lira siriana', 'Funt syryjski', 'Liră siriană', 'ل.س', 0, true),
('IQD', 'Iraqi Dinar', 'دينار عراقي', 'Irakischer Dinar', 'Irak Dinarı', 'Иракский динар', 'Іракський динар', 'Dinaro iracheno', 'Dinar iracki', 'Dinar irakian', 'د.ع', 0, true),
('YER', 'Yemeni Rial', 'ريال يمني', 'Jemenitischer Rial', 'Yemen Riyali', 'Йеменский риал', 'Єменський ріял', 'Rial yemenita', 'Rial jemeński', 'Rial yemenit', 'ر.ي', 2, true),
('MAD', 'Moroccan Dirham', 'درهم مغربي', 'Marokkanischer Dirham', 'Fas Dirhemi', 'Марокканский дирхам', 'Марокканський дирхам', 'Dirham marocchino', 'Dirham marokański', 'Dirham marocan', 'د.م', 2, true),
('DZD', 'Algerian Dinar', 'دينار جزائري', 'Algerischer Dinar', 'Cezayir Dinarı', 'Алжирский динар', 'Алжирський динар', 'Dinaro algerino', 'Dinar algierski', 'Dinar algerian', 'د.ج', 2, true),
('TND', 'Tunisian Dinar', 'دينار تونسي', 'Tunesischer Dinar', 'Tunus Dinarı', 'Тунисский динар', 'Туніський динар', 'Dinaro tunisino', 'Dinar tunezyjski', 'Dinar tunisian', 'د.ت', 3, true),
('LYD', 'Libyan Dinar', 'دينار ليبي', 'Libyscher Dinar', 'Libya Dinarı', 'Ливийский динар', 'Лівійський динар', 'Dinaro libico', 'Dinar libijski', 'Dinar libian', 'د.ل', 3, true),
('SDG', 'Sudanese Pound', 'جنيه سوداني', 'Sudanesisches Pfund', 'Sudan Lirası', 'Суданский фунт', 'Суданський фунт', 'Sterlina sudanese', 'Funt sudański', 'Liră sudaneză', 'ج.س', 2, true),
('ILS', 'Israeli Shekel', 'شيكل إسرائيلي', 'Israelischer Schekel', 'İsrail Şekeli', 'Израильский шекель', 'Ізраїльський шекель', 'Shekel israeliano', 'Szekel izraelski', 'Shekel israelian', '₪', 2, true),

-- العملات السلافية والروسية
('RUB', 'Russian Ruble', 'روبل روسي', 'Russischer Rubel', 'Rus Rublesi', 'Российский рубль', 'Російський рубль', 'Rublo russo', 'Rubel rosyjski', 'Rublă rusească', '₽', 2, true),
('UAH', 'Ukrainian Hryvnia', 'غريفنا أوكرانية', 'Ukrainische Hrywnja', 'Ukrayna Grivnası', 'Украинская гривна', 'Українська гривня', 'Grivnia ucraina', 'Hrywna ukraińska', 'Hryvnia ucraineană', '₴', 2, true),
('BYN', 'Belarusian Ruble', 'روبل بيلاروسي', 'Weißrussischer Rubel', 'Belarus Rublesi', 'Белорусский рубль', 'Білоруський рубль', 'Rublo bielorusso', 'Rubel białoruski', 'Rublă belarusă', 'Br', 2, true),
('KZT', 'Kazakhstani Tenge', 'تنغي كازاخستاني', 'Kasachischer Tenge', 'Kazak Tengesi', 'Казахстанский тенге', 'Казахстанський тенге', 'Tenge kazako', 'Tenge kazachski', 'Tenge kazah', '₸', 2, true),
('UZS', 'Uzbekistani Som', 'سوم أوزبكي', 'Usbekischer Sum', 'Özbek Somu', 'Узбекский сум', 'Узбецький сум', 'Som uzbeko', 'Sum uzbecki', 'Sum uzbek', 'сўм', 2, true),
('AZN', 'Azerbaijani Manat', 'مانات أذربيجاني', 'Aserbaidschan-Manat', 'Azerbaycan Manatı', 'Азербайджанский манат', 'Азербайджанський манат', 'Manat azerbaigiano', 'Manat azerski', 'Manat azer', '₼', 2, true),
('GEL', 'Georgian Lari', 'لاري جورجي', 'Georgischer Lari', 'Gürcü Larisi', 'Грузинский лари', 'Грузинський ларі', 'Lari georgiano', 'Lari gruziński', 'Lari georgian', '₾', 2, true),
('AMD', 'Armenian Dram', 'درام أرميني', 'Armenischer Dram', 'Ermeni Dramı', 'Армянский драм', 'Вірменський драм', 'Dram armeno', 'Dram armeński', 'Dram armenesc', '֏', 2, true),

-- العملات التركية
('TRY', 'Turkish Lira', 'ليرة تركية', 'Türkische Lira', 'Türk Lirası', 'Турецкая лира', 'Турецька ліра', 'Lira turca', 'Lira turecka', 'Liră turcească', '₺', 2, true),

-- العملات الأوروبية
('SEK', 'Swedish Krona', 'كرونا سويدية', 'Schwedische Krone', 'İsveç Kronu', 'Шведская крона', 'Шведська крона', 'Corona svedese', 'Korona szwedzka', 'Coroană suedeză', 'kr', 2, true),
('NOK', 'Norwegian Krone', 'كرونا نرويجية', 'Norwegische Krone', 'Norveç Kronu', 'Норвежская крона', 'Норвезька крона', 'Corona norvegese', 'Korona norweska', 'Coroană norvegiană', 'kr', 2, true),
('DKK', 'Danish Krone', 'كرونا دنماركية', 'Dänische Krone', 'Danimarka Kronu', 'Датская крона', 'Данська крона', 'Corona danese', 'Korona duńska', 'Coroană daneză', 'kr', 2, true),
('PLN', 'Polish Zloty', 'زلوتي بولندي', 'Polnischer Złoty', 'Polonya Zlotisi', 'Польский злотый', 'Польський злотий', 'Zloty polacco', 'Złoty polski', 'Zlot polonez', 'zł', 2, true),
('CZK', 'Czech Koruna', 'كرونا تشيكية', 'Tschechische Krone', 'Çek Korunası', 'Чешская крона', 'Чеська крона', 'Corona ceca', 'Korona czeska', 'Coroană cehă', 'Kč', 2, true),
('HUF', 'Hungarian Forint', 'فورنت مجري', 'Ungarischer Forint', 'Macar Forinti', 'Венгерский форинт', 'Угорський форинт', 'Fiorino ungherese', 'Forint węgierski', 'Forint maghiar', 'Ft', 2, true),
('RON', 'Romanian Leu', 'ليو روماني', 'Rumänischer Leu', 'Romanya Leyi', 'Румынский лей', 'Румунський лей', 'Leu rumeno', 'Lej rumuński', 'Leu românesc', 'lei', 2, true),
('BGN', 'Bulgarian Lev', 'ليف بلغاري', 'Bulgarischer Lew', 'Bulgar Levası', 'Болгарский лев', 'Болгарський лев', 'Lev bulgaro', 'Lew bułgarski', 'Leva bulgară', 'лв', 2, true),
('RSD', 'Serbian Dinar', 'دينار صربي', 'Serbischer Dinar', 'Sırp Dinarı', 'Сербский динар', 'Сербський динар', 'Dinaro serbo', 'Dinar serbski', 'Dinar sârbesc', 'дин', 2, true),
('ISK', 'Icelandic Krona', 'كرونا آيسلندية', 'Isländische Krone', 'İzlanda Kronu', 'Исландская крона', 'Ісландська крона', 'Corona islandese', 'Korona islandzka', 'Coroană islandeză', 'kr', 0, true),

-- العملات الآسيوية
('INR', 'Indian Rupee', 'روبية هندية', 'Indische Rupie', 'Hint Rupisi', 'Индийская рупия', 'Індійська рупія', 'Rupia indiana', 'Rupia indyjska', 'Rupie indiană', '₹', 2, true),
('PKR', 'Pakistani Rupee', 'روبية باكستانية', 'Pakistanische Rupie', 'Pakistan Rupisi', 'Пакистанская рупия', 'Пакистанська рупія', 'Rupia pakistana', 'Rupia pakistańska', 'Rupie pakistaneză', '₨', 2, true),
('BDT', 'Bangladeshi Taka', 'تاكا بنغلاديشية', 'Bangladeschischer Taka', 'Bangladeş Takası', 'Бангладешская така', 'Бангладеська така', 'Taka bangladese', 'Taka bengalski', 'Taka din Bangladesh', '৳', 2, true),
('THB', 'Thai Baht', 'بات تايلندي', 'Thailändischer Baht', 'Tayland Bahtı', 'Тайский бат', 'Тайський бат', 'Baht thailandese', 'Baht tajski', 'Baht thailandez', '฿', 2, true),
('VND', 'Vietnamese Dong', 'دونغ فيتنامي', 'Vietnamesischer Dong', 'Vietnam Dongu', 'Вьетнамский донг', 'В''єтнамський донг', 'Dong vietnamita', 'Dong wietnamski', 'Dong vietnamez', '₫', 0, true),
('IDR', 'Indonesian Rupiah', 'روبية إندونيسية', 'Indonesische Rupiah', 'Endonezya Rupisi', 'Индонезийская рупия', 'Індонезійська рупія', 'Rupia indonesiana', 'Rupia indonezyjska', 'Rupie indoneziană', 'Rp', 0, true),
('MYR', 'Malaysian Ringgit', 'رينغيت ماليزي', 'Malaysischer Ringgit', 'Malezya Ringgiti', 'Малайзийский ринггит', 'Малайзійський рінггіт', 'Ringgit malese', 'Ringgit malezyjski', 'Ringgit malaiezian', 'RM', 2, true),
('PHP', 'Philippine Peso', 'بيزو فلبيني', 'Philippinischer Peso', 'Filipin Pesosu', 'Филиппинское песо', 'Філіппінське песо', 'Peso filippino', 'Peso filipińskie', 'Peso filipinez', '₱', 2, true),
('KRW', 'South Korean Won', 'وون كوري', 'Südkoreanischer Won', 'Güney Kore Wonu', 'Южнокорейская вона', 'Південнокорейська вона', 'Won sudcoreano', 'Won południowokoreański', 'Won sud-coreean', '₩', 0, true),
('TWD', 'Taiwan Dollar', 'دولار تايواني', 'Taiwan-Dollar', 'Tayvan Doları', 'Тайваньский доллар', 'Тайванський долар', 'Dollaro taiwanese', 'Dolar tajwański', 'Dolar taiwanez', 'NT$', 2, true),

-- العملات الأفريقية
('ZAR', 'South African Rand', 'راند جنوب أفريقي', 'Südafrikanischer Rand', 'Güney Afrika Randı', 'Южноафриканский рэнд', 'Південноафриканський ренд', 'Rand sudafricano', 'Rand południowoafrykański', 'Rand sud-african', 'R', 2, true),
('NGN', 'Nigerian Naira', 'نيرة نيجيرية', 'Nigerianische Naira', 'Nijerya Nairası', 'Нигерийская найра', 'Нігерійська найра', 'Naira nigeriana', 'Naira nigeryjska', 'Naira nigeriană', '₦', 2, true),
('KES', 'Kenyan Shilling', 'شلن كيني', 'Kenia-Schilling', 'Kenya Şilini', 'Кенийский шиллинг', 'Кенійський шилінг', 'Scellino keniota', 'Szyling kenijski', 'Șiling kenyan', 'KSh', 2, true),
('GHS', 'Ghanaian Cedi', 'سيدي غاني', 'Ghanaischer Cedi', 'Gana Sedisi', 'Ганский седи', 'Ганський седі', 'Cedi ghanese', 'Cedi ghański', 'Cedi ghanez', '₵', 2, true),
('XOF', 'West African CFA', 'فرنك غرب أفريقي', 'Westafrikanischer CFA', 'Batı Afrika CFA', 'Западноафриканский франк', 'Західноафриканський франк', 'Franco CFA BCEAO', 'Frank CFA BCEAO', 'Franc CFA BCEAO', 'CFA', 0, true),
('XAF', 'Central African CFA', 'فرنك وسط أفريقي', 'Zentralafrikanischer CFA', 'Orta Afrika CFA', 'Центральноафриканский франк', 'Центральноафриканський франк', 'Franco CFA BEAC', 'Frank CFA BEAC', 'Franc CFA BEAC', 'FCFA', 0, true),

-- العملات الأمريكية
('MXN', 'Mexican Peso', 'بيزو مكسيكي', 'Mexikanischer Peso', 'Meksika Pesosu', 'Мексиканское песо', 'Мексиканське песо', 'Peso messicano', 'Peso meksykańskie', 'Peso mexican', '$', 2, true),
('BRL', 'Brazilian Real', 'ريال برازيلي', 'Brasilianischer Real', 'Brezilya Reali', 'Бразильский реал', 'Бразильський реал', 'Real brasiliano', 'Real brazylijski', 'Real brazilian', 'R$', 2, true),
('ARS', 'Argentine Peso', 'بيزو أرجنتيني', 'Argentinischer Peso', 'Arjantin Pesosu', 'Аргентинское песо', 'Аргентинське песо', 'Peso argentino', 'Peso argentyńskie', 'Peso argentinian', '$', 2, true),
('CLP', 'Chilean Peso', 'بيزو تشيلي', 'Chilenischer Peso', 'Şili Pesosu', 'Чилийское песо', 'Чилійське песо', 'Peso cileno', 'Peso chilijskie', 'Peso chilian', '$', 0, true),
('COP', 'Colombian Peso', 'بيزو كولومبي', 'Kolumbianischer Peso', 'Kolombiya Pesosu', 'Колумбийское песо', 'Колумбійське песо', 'Peso colombiano', 'Peso kolumbijskie', 'Peso columbian', '$', 2, true),
('PEN', 'Peruvian Sol', 'سول بيروفي', 'Peruanischer Sol', 'Peru Solu', 'Перуанский соль', 'Перуанський соль', 'Sol peruviano', 'Sol peruwiański', 'Sol peruvian', 'S/', 2, true)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    name_de = EXCLUDED.name_de,
    name_tr = EXCLUDED.name_tr,
    name_ru = EXCLUDED.name_ru,
    name_uk = EXCLUDED.name_uk,
    name_it = EXCLUDED.name_it,
    name_pl = EXCLUDED.name_pl,
    name_ro = EXCLUDED.name_ro,
    symbol = EXCLUDED.symbol,
    decimal_places = EXCLUDED.decimal_places,
    is_active = EXCLUDED.is_active;

-- 4. تحقق من النتيجة
SELECT COUNT(*) as total_currencies FROM currencies;

DO $$
BEGIN
    RAISE NOTICE '✅ تم إضافة العملات بـ 9 لغات بنجاح!';
END $$;
