-- =====================================================
-- ADD_ALL_WORLD_CURRENCIES.sql
-- إضافة جميع عملات العالم لقاعدة البيانات
-- =====================================================

-- 1. حذف العملات المكررة أولاً
DELETE FROM currencies a
USING currencies b
WHERE a.id > b.id AND a.code = b.code;

-- 2. إضافة قيد UNIQUE
ALTER TABLE currencies DROP CONSTRAINT IF EXISTS currencies_code_unique;
ALTER TABLE currencies ADD CONSTRAINT currencies_code_unique UNIQUE (code);

-- 3. إضافة جميع عملات العالم
INSERT INTO currencies (code, name, name_ar, symbol, decimal_places, is_active) VALUES
-- العملات الرئيسية
('USD', 'US Dollar', 'دولار أمريكي', '$', 2, true),
('EUR', 'Euro', 'يورو', '€', 2, true),
('GBP', 'British Pound', 'جنيه استرليني', '£', 2, true),
('JPY', 'Japanese Yen', 'ين ياباني', '¥', 0, true),
('CHF', 'Swiss Franc', 'فرنك سويسري', 'CHF', 2, true),
('CAD', 'Canadian Dollar', 'دولار كندي', 'C$', 2, true),
('AUD', 'Australian Dollar', 'دولار أسترالي', 'A$', 2, true),
('NZD', 'New Zealand Dollar', 'دولار نيوزيلندي', 'NZ$', 2, true),
('CNY', 'Chinese Yuan', 'يوان صيني', '¥', 2, true),
('HKD', 'Hong Kong Dollar', 'دولار هونغ كونغ', 'HK$', 2, true),
('SGD', 'Singapore Dollar', 'دولار سنغافوري', 'S$', 2, true),

-- العملات العربية
('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 2, true),
('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 2, true),
('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 3, true),
('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 3, true),
('OMR', 'Omani Rial', 'ريال عماني', 'ر.ع', 3, true),
('QAR', 'Qatari Riyal', 'ريال قطري', 'ر.ق', 2, true),
('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.أ', 3, true),
('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 2, true),
('LBP', 'Lebanese Pound', 'ليرة لبنانية', 'ل.ل', 0, true),
('SYP', 'Syrian Pound', 'ليرة سورية', 'ل.س', 0, true),
('IQD', 'Iraqi Dinar', 'دينار عراقي', 'د.ع', 0, true),
('YER', 'Yemeni Rial', 'ريال يمني', 'ر.ي', 2, true),
('MAD', 'Moroccan Dirham', 'درهم مغربي', 'د.م', 2, true),
('DZD', 'Algerian Dinar', 'دينار جزائري', 'د.ج', 2, true),
('TND', 'Tunisian Dinar', 'دينار تونسي', 'د.ت', 3, true),
('LYD', 'Libyan Dinar', 'دينار ليبي', 'د.ل', 3, true),
('SDG', 'Sudanese Pound', 'جنيه سوداني', 'ج.س', 2, true),
('SOS', 'Somali Shilling', 'شلن صومالي', 'S', 2, true),
('DJF', 'Djiboutian Franc', 'فرنك جيبوتي', 'Fdj', 0, true),
('KMF', 'Comorian Franc', 'فرنك قمري', 'CF', 0, true),
('MRU', 'Mauritanian Ouguiya', 'أوقية موريتانية', 'UM', 2, true),
('ILS', 'Israeli Shekel', 'شيكل إسرائيلي', '₪', 2, true),

-- العملات السلافية والروسية
('RUB', 'Russian Ruble', 'روبل روسي', '₽', 2, true),
('UAH', 'Ukrainian Hryvnia', 'غريفنا أوكرانية', '₴', 2, true),
('BYN', 'Belarusian Ruble', 'روبل بيلاروسي', 'Br', 2, true),
('KZT', 'Kazakhstani Tenge', 'تنغي كازاخستاني', '₸', 2, true),
('UZS', 'Uzbekistani Som', 'سوم أوزبكي', 'сўм', 2, true),
('AZN', 'Azerbaijani Manat', 'مانات أذربيجاني', '₼', 2, true),
('GEL', 'Georgian Lari', 'لاري جورجي', '₾', 2, true),
('AMD', 'Armenian Dram', 'درام أرميني', '֏', 2, true),
('TJS', 'Tajikistani Somoni', 'سوموني طاجيكي', 'SM', 2, true),
('KGS', 'Kyrgyzstani Som', 'سوم قرغيزي', 'сом', 2, true),
('TMT', 'Turkmenistani Manat', 'مانات تركماني', 'm', 2, true),

-- العملات التركية
('TRY', 'Turkish Lira', 'ليرة تركية', '₺', 2, true),

-- العملات الأوروبية (غير اليورو)
('SEK', 'Swedish Krona', 'كرونا سويدية', 'kr', 2, true),
('NOK', 'Norwegian Krone', 'كرونا نرويجية', 'kr', 2, true),
('DKK', 'Danish Krone', 'كرونا دنماركية', 'kr', 2, true),
('PLN', 'Polish Zloty', 'زلوتي بولندي', 'zł', 2, true),
('CZK', 'Czech Koruna', 'كرونا تشيكية', 'Kč', 2, true),
('HUF', 'Hungarian Forint', 'فورنت مجري', 'Ft', 2, true),
('RON', 'Romanian Leu', 'ليو روماني', 'lei', 2, true),
('BGN', 'Bulgarian Lev', 'ليف بلغاري', 'лв', 2, true),
('HRK', 'Croatian Kuna', 'كونا كرواتية', 'kn', 2, true),
('RSD', 'Serbian Dinar', 'دينار صربي', 'дин', 2, true),
('BAM', 'Bosnia Mark', 'مارك بوسني', 'KM', 2, true),
('MKD', 'Macedonian Denar', 'دينار مقدوني', 'ден', 2, true),
('ALL', 'Albanian Lek', 'ليك ألباني', 'L', 2, true),
('ISK', 'Icelandic Krona', 'كرونا آيسلندية', 'kr', 0, true),
('MDL', 'Moldovan Leu', 'ليو مولدوفي', 'L', 2, true),

-- العملات الآسيوية
('INR', 'Indian Rupee', 'روبية هندية', '₹', 2, true),
('PKR', 'Pakistani Rupee', 'روبية باكستانية', '₨', 2, true),
('BDT', 'Bangladeshi Taka', 'تاكا بنغلاديشية', '৳', 2, true),
('LKR', 'Sri Lankan Rupee', 'روبية سريلانكية', 'Rs', 2, true),
('NPR', 'Nepalese Rupee', 'روبية نيبالية', 'रू', 2, true),
('MMK', 'Myanmar Kyat', 'كيات ميانماري', 'K', 2, true),
('THB', 'Thai Baht', 'بات تايلندي', '฿', 2, true),
('VND', 'Vietnamese Dong', 'دونغ فيتنامي', '₫', 0, true),
('IDR', 'Indonesian Rupiah', 'روبية إندونيسية', 'Rp', 0, true),
('MYR', 'Malaysian Ringgit', 'رينغيت ماليزي', 'RM', 2, true),
('PHP', 'Philippine Peso', 'بيزو فلبيني', '₱', 2, true),
('KRW', 'South Korean Won', 'وون كوري', '₩', 0, true),
('TWD', 'Taiwan Dollar', 'دولار تايواني', 'NT$', 2, true),
('KHR', 'Cambodian Riel', 'ريال كمبودي', '៛', 2, true),
('LAK', 'Lao Kip', 'كيب لاوسي', '₭', 0, true),
('MNT', 'Mongolian Tugrik', 'توغريغ منغولي', '₮', 2, true),
('AFN', 'Afghan Afghani', 'أفغاني أفغانستاني', '؋', 2, true),
('IRR', 'Iranian Rial', 'ريال إيراني', '﷼', 0, true),
('MVR', 'Maldivian Rufiyaa', 'روفية مالديفية', 'Rf', 2, true),
('BTN', 'Bhutanese Ngultrum', 'نغولترم بوتاني', 'Nu', 2, true),
('BND', 'Brunei Dollar', 'دولار بروناي', 'B$', 2, true),

-- العملات الأفريقية
('ZAR', 'South African Rand', 'راند جنوب أفريقي', 'R', 2, true),
('NGN', 'Nigerian Naira', 'نيرة نيجيرية', '₦', 2, true),
('KES', 'Kenyan Shilling', 'شلن كيني', 'KSh', 2, true),
('TZS', 'Tanzanian Shilling', 'شلن تنزاني', 'TSh', 2, true),
('UGX', 'Ugandan Shilling', 'شلن أوغندي', 'USh', 0, true),
('GHS', 'Ghanaian Cedi', 'سيدي غاني', '₵', 2, true),
('XOF', 'West African CFA', 'فرنك غرب أفريقي', 'CFA', 0, true),
('XAF', 'Central African CFA', 'فرنك وسط أفريقي', 'FCFA', 0, true),
('ETB', 'Ethiopian Birr', 'بر إثيوبي', 'Br', 2, true),
('RWF', 'Rwandan Franc', 'فرنك رواندي', 'FRw', 0, true),
('BIF', 'Burundian Franc', 'فرنك بوروندي', 'FBu', 0, true),
('MGA', 'Malagasy Ariary', 'أرياري مدغشقري', 'Ar', 0, true),
('MUR', 'Mauritian Rupee', 'روبية موريشيوسية', '₨', 2, true),
('SCR', 'Seychellois Rupee', 'روبية سيشيلية', '₨', 2, true),
('ZMW', 'Zambian Kwacha', 'كواشا زامبية', 'ZK', 2, true),
('MWK', 'Malawian Kwacha', 'كواشا ملاوية', 'MK', 2, true),
('BWP', 'Botswana Pula', 'بولا بوتسوانية', 'P', 2, true),
('NAD', 'Namibian Dollar', 'دولار ناميبي', 'N$', 2, true),
('SZL', 'Swazi Lilangeni', 'ليلانجيني سوازي', 'E', 2, true),
('LSL', 'Lesotho Loti', 'لوتي ليسوتو', 'L', 2, true),
('AOA', 'Angolan Kwanza', 'كوانزا أنغولية', 'Kz', 2, true),
('MZN', 'Mozambican Metical', 'متيكال موزمبيقي', 'MT', 2, true),
('CVE', 'Cape Verdean Escudo', 'إسكودو الرأس الأخضر', '$', 2, true),
('GMD', 'Gambian Dalasi', 'دلاسي غامبي', 'D', 2, true),
('GNF', 'Guinean Franc', 'فرنك غيني', 'FG', 0, true),
('SLL', 'Sierra Leonean Leone', 'ليون سيراليوني', 'Le', 2, true),
('LRD', 'Liberian Dollar', 'دولار ليبيري', 'L$', 2, true),
('ERN', 'Eritrean Nakfa', 'ناكفا إريترية', 'Nfk', 2, true),
('CDF', 'Congolese Franc', 'فرنك كونغولي', 'FC', 2, true),
('ZWL', 'Zimbabwean Dollar', 'دولار زيمبابوي', 'Z$', 2, true),

-- العملات الأمريكية
('MXN', 'Mexican Peso', 'بيزو مكسيكي', '$', 2, true),
('BRL', 'Brazilian Real', 'ريال برازيلي', 'R$', 2, true),
('ARS', 'Argentine Peso', 'بيزو أرجنتيني', '$', 2, true),
('CLP', 'Chilean Peso', 'بيزو تشيلي', '$', 0, true),
('COP', 'Colombian Peso', 'بيزو كولومبي', '$', 2, true),
('PEN', 'Peruvian Sol', 'سول بيروفي', 'S/', 2, true),
('VES', 'Venezuelan Bolivar', 'بوليفار فنزويلي', 'Bs', 2, true),
('UYU', 'Uruguayan Peso', 'بيزو أوروغواي', '$', 2, true),
('PYG', 'Paraguayan Guarani', 'غواراني باراغواي', '₲', 0, true),
('BOB', 'Bolivian Boliviano', 'بوليفيانو بوليفي', 'Bs', 2, true),
('GTQ', 'Guatemalan Quetzal', 'كيتزال غواتيمالي', 'Q', 2, true),
('HNL', 'Honduran Lempira', 'ليمبيرا هندوراسية', 'L', 2, true),
('NIO', 'Nicaraguan Cordoba', 'قرطبة نيكاراغوية', 'C$', 2, true),
('CRC', 'Costa Rican Colon', 'كولون كوستاريكي', '₡', 2, true),
('PAB', 'Panamanian Balboa', 'بالبوا بنمية', 'B/', 2, true),
('DOP', 'Dominican Peso', 'بيزو دومينيكاني', 'RD$', 2, true),
('JMD', 'Jamaican Dollar', 'دولار جامايكي', 'J$', 2, true),
('TTD', 'Trinidad Dollar', 'دولار ترينيداد', 'TT$', 2, true),
('BBD', 'Barbadian Dollar', 'دولار باربادوسي', 'Bds$', 2, true),
('BSD', 'Bahamian Dollar', 'دولار بهامي', 'B$', 2, true),
('BZD', 'Belize Dollar', 'دولار بليزي', 'BZ$', 2, true),
('GYD', 'Guyanese Dollar', 'دولار غياني', 'G$', 2, true),
('SRD', 'Surinamese Dollar', 'دولار سورينامي', '$', 2, true),
('HTG', 'Haitian Gourde', 'غورد هايتي', 'G', 2, true),
('CUP', 'Cuban Peso', 'بيزو كوبي', '₱', 2, true),
('AWG', 'Aruban Florin', 'فلورن أروبي', 'ƒ', 2, true),
('ANG', 'Netherlands Antilles Guilder', 'غيلدر الأنتيل', 'ƒ', 2, true),
('XCD', 'East Caribbean Dollar', 'دولار شرق الكاريبي', '$', 2, true),

-- العملات الأوقيانوسية
('FJD', 'Fijian Dollar', 'دولار فيجي', 'FJ$', 2, true),
('PGK', 'Papua New Guinean Kina', 'كينا بابوا', 'K', 2, true),
('SBD', 'Solomon Islands Dollar', 'دولار جزر سليمان', 'SI$', 2, true),
('VUV', 'Vanuatu Vatu', 'فاتو فانواتو', 'VT', 0, true),
('WST', 'Samoan Tala', 'تالا ساموا', 'WS$', 2, true),
('TOP', 'Tongan Paanga', 'بانغا تونغا', 'T$', 2, true),
('XPF', 'CFP Franc', 'فرنك سي إف بي', '₣', 0, true)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    symbol = EXCLUDED.symbol,
    decimal_places = EXCLUDED.decimal_places,
    is_active = EXCLUDED.is_active;

-- 4. تحقق من النتيجة
SELECT COUNT(*) as total_currencies FROM currencies;

DO $$
BEGIN
    RAISE NOTICE '✅ تم إضافة جميع عملات العالم بنجاح!';
END $$;
