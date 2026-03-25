
/**
 * ════════════════════════════════════════════════════════════════
 * 💰 قائمة العملات العالمية الشاملة
 * ════════════════════════════════════════════════════════════════
 *
 * تشمل جميع العملات المعترف بها عالمياً (ISO 4217)
 * مع الأسماء بالعربية والإنجليزية ورمز العملة
 *
 * تُستخدم في:
 * - معالج التسجيل (FabricRegistrationWizard)
 * - إعدادات الشركة
 * - أي مكان يحتاج اختيار عملة
 *
 * ════════════════════════════════════════════════════════════════
 */

export interface Currency {
    code: string;
    nameEn: string;
    nameAr: string;
    symbol: string;
}

export const allCurrencies: Currency[] = [
    // ─── العملات الرئيسية العالمية ────────────────────
    { code: 'USD', nameEn: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
    { code: 'EUR', nameEn: 'Euro', nameAr: 'يورو', symbol: '€' },
    { code: 'GBP', nameEn: 'British Pound', nameAr: 'جنيه إسترليني', symbol: '£' },
    { code: 'CHF', nameEn: 'Swiss Franc', nameAr: 'فرنك سويسري', symbol: 'CHF' },
    { code: 'JPY', nameEn: 'Japanese Yen', nameAr: 'ين ياباني', symbol: '¥' },
    { code: 'CAD', nameEn: 'Canadian Dollar', nameAr: 'دولار كندي', symbol: 'C$' },
    { code: 'AUD', nameEn: 'Australian Dollar', nameAr: 'دولار أسترالي', symbol: 'A$' },
    { code: 'NZD', nameEn: 'New Zealand Dollar', nameAr: 'دولار نيوزيلندي', symbol: 'NZ$' },
    { code: 'CNY', nameEn: 'Chinese Yuan', nameAr: 'يوان صيني', symbol: '¥' },
    { code: 'HKD', nameEn: 'Hong Kong Dollar', nameAr: 'دولار هونغ كونغ', symbol: 'HK$' },
    { code: 'SGD', nameEn: 'Singapore Dollar', nameAr: 'دولار سنغافوري', symbol: 'S$' },

    // ─── العملات العربية ──────────────────────────────
    { code: 'SAR', nameEn: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: '﷼' },
    { code: 'AED', nameEn: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
    { code: 'KWD', nameEn: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك' },
    { code: 'QAR', nameEn: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'ر.ق' },
    { code: 'BHD', nameEn: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب' },
    { code: 'OMR', nameEn: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'ر.ع' },
    { code: 'JOD', nameEn: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'د.أ' },
    { code: 'EGP', nameEn: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م' },
    { code: 'LBP', nameEn: 'Lebanese Pound', nameAr: 'ليرة لبنانية', symbol: 'ل.ل' },
    { code: 'SYP', nameEn: 'Syrian Pound', nameAr: 'ليرة سورية', symbol: 'ل.س' },
    { code: 'IQD', nameEn: 'Iraqi Dinar', nameAr: 'دينار عراقي', symbol: 'ع.د' },
    { code: 'YER', nameEn: 'Yemeni Rial', nameAr: 'ريال يمني', symbol: 'ر.ي' },
    { code: 'MAD', nameEn: 'Moroccan Dirham', nameAr: 'درهم مغربي', symbol: 'د.م' },
    { code: 'DZD', nameEn: 'Algerian Dinar', nameAr: 'دينار جزائري', symbol: 'د.ج' },
    { code: 'TND', nameEn: 'Tunisian Dinar', nameAr: 'دينار تونسي', symbol: 'د.ت' },
    { code: 'LYD', nameEn: 'Libyan Dinar', nameAr: 'دينار ليبي', symbol: 'ل.د' },
    { code: 'SDG', nameEn: 'Sudanese Pound', nameAr: 'جنيه سوداني', symbol: 'ج.س' },
    { code: 'ILS', nameEn: 'Israeli Shekel', nameAr: 'شيكل', symbol: '₪' },
    { code: 'MRU', nameEn: 'Mauritanian Ouguiya', nameAr: 'أوقية موريتانية', symbol: 'أ.م' },
    { code: 'SOS', nameEn: 'Somali Shilling', nameAr: 'شلن صومالي', symbol: 'Sh' },
    { code: 'DJF', nameEn: 'Djiboutian Franc', nameAr: 'فرنك جيبوتي', symbol: 'Fdj' },
    { code: 'KMF', nameEn: 'Comorian Franc', nameAr: 'فرنك قمري', symbol: 'CF' },

    // ─── العملات التركية والقوقازية ──────────────────
    { code: 'TRY', nameEn: 'Turkish Lira', nameAr: 'ليرة تركية', symbol: '₺' },
    { code: 'GEL', nameEn: 'Georgian Lari', nameAr: 'لاري جورجي', symbol: '₾' },
    { code: 'AMD', nameEn: 'Armenian Dram', nameAr: 'درام أرميني', symbol: '֏' },
    { code: 'AZN', nameEn: 'Azerbaijani Manat', nameAr: 'مانات أذربيجاني', symbol: '₼' },

    // ─── العملات الأوروبية (غير اليورو) ──────────────
    { code: 'PLN', nameEn: 'Polish Zloty', nameAr: 'زلوتي بولندي', symbol: 'zł' },
    { code: 'CZK', nameEn: 'Czech Koruna', nameAr: 'كرونا تشيكية', symbol: 'Kč' },
    { code: 'HUF', nameEn: 'Hungarian Forint', nameAr: 'فورنت مجري', symbol: 'Ft' },
    { code: 'RON', nameEn: 'Romanian Leu', nameAr: 'ليو روماني', symbol: 'lei' },
    { code: 'BGN', nameEn: 'Bulgarian Lev', nameAr: 'ليف بلغاري', symbol: 'лв' },
    { code: 'SEK', nameEn: 'Swedish Krona', nameAr: 'كرونا سويدية', symbol: 'kr' },
    { code: 'NOK', nameEn: 'Norwegian Krone', nameAr: 'كرونا نرويجية', symbol: 'kr' },
    { code: 'DKK', nameEn: 'Danish Krone', nameAr: 'كرونا دنماركية', symbol: 'kr' },
    { code: 'ISK', nameEn: 'Icelandic Króna', nameAr: 'كرونا آيسلندية', symbol: 'kr' },
    { code: 'RSD', nameEn: 'Serbian Dinar', nameAr: 'دينار صربي', symbol: 'din' },
    { code: 'BAM', nameEn: 'Bosnia-Herzegovina Mark', nameAr: 'مارك بوسني', symbol: 'KM' },
    { code: 'ALL', nameEn: 'Albanian Lek', nameAr: 'ليك ألباني', symbol: 'L' },
    { code: 'MKD', nameEn: 'Macedonian Denar', nameAr: 'دينار مقدوني', symbol: 'ден' },
    { code: 'MDL', nameEn: 'Moldovan Leu', nameAr: 'ليو مولدافي', symbol: 'L' },
    { code: 'HRK', nameEn: 'Croatian Kuna', nameAr: 'كونا كرواتية', symbol: 'kn' },

    // ─── العملات السلافية وآسيا الوسطى ───────────────
    { code: 'RUB', nameEn: 'Russian Ruble', nameAr: 'روبل روسي', symbol: '₽' },
    { code: 'UAH', nameEn: 'Ukrainian Hryvnia', nameAr: 'غريفنا أوكرانية', symbol: '₴' },
    { code: 'BYN', nameEn: 'Belarusian Ruble', nameAr: 'روبل بيلاروسي', symbol: 'Br' },
    { code: 'KZT', nameEn: 'Kazakhstani Tenge', nameAr: 'تنغي كازاخستاني', symbol: '₸' },
    { code: 'UZS', nameEn: 'Uzbekistani Som', nameAr: 'سوم أوزبكي', symbol: 'сўм' },
    { code: 'KGS', nameEn: 'Kyrgyzstani Som', nameAr: 'سوم قرغيزي', symbol: 'сом' },
    { code: 'TJS', nameEn: 'Tajikistani Somoni', nameAr: 'سوموني طاجيكي', symbol: 'SM' },
    { code: 'TMT', nameEn: 'Turkmenistani Manat', nameAr: 'مانات تركمانستاني', symbol: 'T' },

    // ─── العملات الآسيوية ────────────────────────────
    { code: 'INR', nameEn: 'Indian Rupee', nameAr: 'روبية هندية', symbol: '₹' },
    { code: 'PKR', nameEn: 'Pakistani Rupee', nameAr: 'روبية باكستانية', symbol: '₨' },
    { code: 'BDT', nameEn: 'Bangladeshi Taka', nameAr: 'تاكا بنغلاديشية', symbol: '৳' },
    { code: 'LKR', nameEn: 'Sri Lankan Rupee', nameAr: 'روبية سريلانكية', symbol: 'Rs' },
    { code: 'NPR', nameEn: 'Nepalese Rupee', nameAr: 'روبية نيبالية', symbol: 'Rs' },
    { code: 'MVR', nameEn: 'Maldivian Rufiyaa', nameAr: 'روفيا مالديفية', symbol: 'Rf' },
    { code: 'AFN', nameEn: 'Afghan Afghani', nameAr: 'أفغاني أفغاني', symbol: '؋' },
    { code: 'IRR', nameEn: 'Iranian Rial', nameAr: 'ريال إيراني', symbol: '﷼' },
    { code: 'IDR', nameEn: 'Indonesian Rupiah', nameAr: 'روبية إندونيسية', symbol: 'Rp' },
    { code: 'MYR', nameEn: 'Malaysian Ringgit', nameAr: 'رينغيت ماليزي', symbol: 'RM' },
    { code: 'THB', nameEn: 'Thai Baht', nameAr: 'بات تايلندي', symbol: '฿' },
    { code: 'VND', nameEn: 'Vietnamese Dong', nameAr: 'دونغ فيتنامي', symbol: '₫' },
    { code: 'PHP', nameEn: 'Philippine Peso', nameAr: 'بيزو فلبيني', symbol: '₱' },
    { code: 'KRW', nameEn: 'South Korean Won', nameAr: 'وون كوري جنوبي', symbol: '₩' },
    { code: 'KPW', nameEn: 'North Korean Won', nameAr: 'وون كوري شمالي', symbol: '₩' },
    { code: 'TWD', nameEn: 'Taiwan Dollar', nameAr: 'دولار تايواني', symbol: 'NT$' },
    { code: 'MMK', nameEn: 'Myanmar Kyat', nameAr: 'كيات ميانمار', symbol: 'K' },
    { code: 'KHR', nameEn: 'Cambodian Riel', nameAr: 'ريال كمبودي', symbol: '៛' },
    { code: 'LAK', nameEn: 'Lao Kip', nameAr: 'كيب لاوسي', symbol: '₭' },
    { code: 'BND', nameEn: 'Brunei Dollar', nameAr: 'دولار بروناي', symbol: 'B$' },
    { code: 'MNT', nameEn: 'Mongolian Tugrik', nameAr: 'توغريك منغولي', symbol: '₮' },
    { code: 'BTN', nameEn: 'Bhutanese Ngultrum', nameAr: 'نغولترام بوتاني', symbol: 'Nu' },
    { code: 'MOP', nameEn: 'Macanese Pataca', nameAr: 'باتاكا ماكاوية', symbol: 'MOP$' },

    // ─── العملات الأفريقية ───────────────────────────
    { code: 'ZAR', nameEn: 'South African Rand', nameAr: 'راند جنوب أفريقي', symbol: 'R' },
    { code: 'NGN', nameEn: 'Nigerian Naira', nameAr: 'نيرة نيجيرية', symbol: '₦' },
    { code: 'KES', nameEn: 'Kenyan Shilling', nameAr: 'شلن كيني', symbol: 'KSh' },
    { code: 'GHS', nameEn: 'Ghanaian Cedi', nameAr: 'سيدي غاني', symbol: 'GH₵' },
    { code: 'TZS', nameEn: 'Tanzanian Shilling', nameAr: 'شلن تنزاني', symbol: 'TSh' },
    { code: 'UGX', nameEn: 'Ugandan Shilling', nameAr: 'شلن أوغندي', symbol: 'USh' },
    { code: 'ETB', nameEn: 'Ethiopian Birr', nameAr: 'بر إثيوبي', symbol: 'Br' },
    { code: 'ERN', nameEn: 'Eritrean Nakfa', nameAr: 'ناكفا إريترية', symbol: 'Nfk' },
    { code: 'RWF', nameEn: 'Rwandan Franc', nameAr: 'فرنك رواندي', symbol: 'RF' },
    { code: 'BIF', nameEn: 'Burundian Franc', nameAr: 'فرنك بوروندي', symbol: 'FBu' },
    { code: 'CDF', nameEn: 'Congolese Franc', nameAr: 'فرنك كونغولي', symbol: 'FC' },
    { code: 'XAF', nameEn: 'Central African CFA Franc', nameAr: 'فرنك وسط أفريقي', symbol: 'FCFA' },
    { code: 'XOF', nameEn: 'West African CFA Franc', nameAr: 'فرنك غرب أفريقي', symbol: 'CFA' },
    { code: 'GMD', nameEn: 'Gambian Dalasi', nameAr: 'دالاسي غامبي', symbol: 'D' },
    { code: 'GNF', nameEn: 'Guinean Franc', nameAr: 'فرنك غيني', symbol: 'FG' },
    { code: 'SLL', nameEn: 'Sierra Leonean Leone', nameAr: 'ليون سيراليوني', symbol: 'Le' },
    { code: 'LRD', nameEn: 'Liberian Dollar', nameAr: 'دولار ليبيري', symbol: 'L$' },
    { code: 'MWK', nameEn: 'Malawian Kwacha', nameAr: 'كواتشا مالاوية', symbol: 'MK' },
    { code: 'ZMW', nameEn: 'Zambian Kwacha', nameAr: 'كواتشا زامبية', symbol: 'ZK' },
    { code: 'BWP', nameEn: 'Botswana Pula', nameAr: 'بولا بوتسوانية', symbol: 'P' },
    { code: 'MZN', nameEn: 'Mozambican Metical', nameAr: 'ميتيكال موزمبيقي', symbol: 'MT' },
    { code: 'AOA', nameEn: 'Angolan Kwanza', nameAr: 'كوانزا أنغولية', symbol: 'Kz' },
    { code: 'MGA', nameEn: 'Malagasy Ariary', nameAr: 'أرياري مدغشقر', symbol: 'Ar' },
    { code: 'MUR', nameEn: 'Mauritian Rupee', nameAr: 'روبية موريشيوسية', symbol: '₨' },
    { code: 'SCR', nameEn: 'Seychellois Rupee', nameAr: 'روبية سيشلية', symbol: '₨' },
    { code: 'CVE', nameEn: 'Cape Verdean Escudo', nameAr: 'إسكودو كابوفيردي', symbol: '$' },
    { code: 'NAD', nameEn: 'Namibian Dollar', nameAr: 'دولار ناميبي', symbol: 'N$' },
    { code: 'LSL', nameEn: 'Lesotho Loti', nameAr: 'لوتي ليسوتو', symbol: 'L' },
    { code: 'SZL', nameEn: 'Eswatini Lilangeni', nameAr: 'ليلانجيني إسواتيني', symbol: 'E' },
    { code: 'STN', nameEn: 'São Tomé Dobra', nameAr: 'دوبرا ساو تومي', symbol: 'Db' },

    // ─── العملات الأمريكية ───────────────────────────
    { code: 'MXN', nameEn: 'Mexican Peso', nameAr: 'بيزو مكسيكي', symbol: 'MX$' },
    { code: 'BRL', nameEn: 'Brazilian Real', nameAr: 'ريال برازيلي', symbol: 'R$' },
    { code: 'ARS', nameEn: 'Argentine Peso', nameAr: 'بيزو أرجنتيني', symbol: 'AR$' },
    { code: 'CLP', nameEn: 'Chilean Peso', nameAr: 'بيزو تشيلي', symbol: 'CL$' },
    { code: 'COP', nameEn: 'Colombian Peso', nameAr: 'بيزو كولومبي', symbol: 'CO$' },
    { code: 'PEN', nameEn: 'Peruvian Sol', nameAr: 'سول بيروفي', symbol: 'S/' },
    { code: 'UYU', nameEn: 'Uruguayan Peso', nameAr: 'بيزو أوروغواي', symbol: '$U' },
    { code: 'PYG', nameEn: 'Paraguayan Guarani', nameAr: 'غواراني باراغواي', symbol: '₲' },
    { code: 'BOB', nameEn: 'Bolivian Boliviano', nameAr: 'بوليفيانو بوليفي', symbol: 'Bs' },
    { code: 'VES', nameEn: 'Venezuelan Bolívar', nameAr: 'بوليفار فنزويلي', symbol: 'Bs.S' },
    { code: 'CRC', nameEn: 'Costa Rican Colón', nameAr: 'كولون كوستاريكي', symbol: '₡' },
    { code: 'GTQ', nameEn: 'Guatemalan Quetzal', nameAr: 'كتزال غواتيمالي', symbol: 'Q' },
    { code: 'HNL', nameEn: 'Honduran Lempira', nameAr: 'لمبيرا هندوراسية', symbol: 'L' },
    { code: 'NIO', nameEn: 'Nicaraguan Córdoba', nameAr: 'قرطبة نيكاراغوية', symbol: 'C$' },
    { code: 'PAB', nameEn: 'Panamanian Balboa', nameAr: 'بالبوا بنمية', symbol: 'B/' },
    { code: 'DOP', nameEn: 'Dominican Peso', nameAr: 'بيزو دومينيكاني', symbol: 'RD$' },
    { code: 'CUP', nameEn: 'Cuban Peso', nameAr: 'بيزو كوبي', symbol: '₱' },
    { code: 'HTG', nameEn: 'Haitian Gourde', nameAr: 'غورد هايتي', symbol: 'G' },
    { code: 'JMD', nameEn: 'Jamaican Dollar', nameAr: 'دولار جامايكي', symbol: 'J$' },
    { code: 'TTD', nameEn: 'Trinidad & Tobago Dollar', nameAr: 'دولار ترينيداد', symbol: 'TT$' },
    { code: 'BBD', nameEn: 'Barbadian Dollar', nameAr: 'دولار باربادوسي', symbol: 'Bds$' },
    { code: 'BSD', nameEn: 'Bahamian Dollar', nameAr: 'دولار بهامي', symbol: 'B$' },
    { code: 'BZD', nameEn: 'Belize Dollar', nameAr: 'دولار بليزي', symbol: 'BZ$' },
    { code: 'GYD', nameEn: 'Guyanese Dollar', nameAr: 'دولار غياني', symbol: 'GY$' },
    { code: 'SRD', nameEn: 'Surinamese Dollar', nameAr: 'دولار سورينامي', symbol: 'SR$' },
    { code: 'AWG', nameEn: 'Aruban Florin', nameAr: 'فلورن أروبي', symbol: 'Afl' },
    { code: 'ANG', nameEn: 'Netherlands Antillean Guilder', nameAr: 'غيلدر أنتيلي', symbol: 'NAƒ' },
    { code: 'XCD', nameEn: 'East Caribbean Dollar', nameAr: 'دولار كاريبي شرقي', symbol: 'EC$' },

    // ─── عملات المحيط الهادئ والأوقيانوسية ──────────
    { code: 'FJD', nameEn: 'Fijian Dollar', nameAr: 'دولار فيجي', symbol: 'FJ$' },
    { code: 'PGK', nameEn: 'Papua New Guinean Kina', nameAr: 'كينا بابوا غينيا', symbol: 'K' },
    { code: 'WST', nameEn: 'Samoan Tala', nameAr: 'تالا ساموا', symbol: 'WS$' },
    { code: 'TOP', nameEn: 'Tongan Paʻanga', nameAr: 'بانغا تونغية', symbol: 'T$' },
    { code: 'VUV', nameEn: 'Vanuatu Vatu', nameAr: 'فاتو فانواتو', symbol: 'VT' },
    { code: 'SBD', nameEn: 'Solomon Islands Dollar', nameAr: 'دولار جزر سليمان', symbol: 'SI$' },

    // ─── عملات إضافية ────────────────────────────────
    { code: 'XPF', nameEn: 'CFP Franc', nameAr: 'فرنك سي إف بي', symbol: '₣' },
    { code: 'XDR', nameEn: 'Special Drawing Rights (IMF)', nameAr: 'حقوق السحب الخاصة', symbol: 'SDR' },
];

/**
 * الحصول على اسم العملة حسب اللغة
 */
export function getCurrencyName(code: string, language: string): string {
    const currency = allCurrencies.find(c => c.code === code);
    if (!currency) return code;
    return language === 'ar' ? currency.nameAr : currency.nameEn;
}

/**
 * الحصول على رمز العملة
 */
export function getCurrencySymbol(code: string): string {
    const currency = allCurrencies.find(c => c.code === code);
    return currency?.symbol || code;
}
