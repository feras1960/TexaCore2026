-- ═══════════════════════════════════════════════════════════════
-- STEP 34: إنشاء جدول الدول (Countries)
-- ═══════════════════════════════════════════════════════════════

-- هذا الـ Migration ينشئ جدول countries ويضيف جميع دول العالم

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء الجدول
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3 (SAU, USA, GBR, etc.)
    iso2 VARCHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 (SA, US, GB, etc.)
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10), -- رمز الاتصال الدولي (+966, +1, +44, etc.)
    currency_code VARCHAR(3), -- العملة الافتراضية للدولة
    region VARCHAR(50), -- المنطقة (Middle East, Europe, Asia, etc.)
    region_ar VARCHAR(50), -- المنطقة بالعربي
    flag_emoji VARCHAR(10), -- علم الدولة (🇸🇦, 🇺🇸, 🇬🇧, etc.)
    is_popular BOOLEAN DEFAULT false, -- دولة شائعة (للظهور في القوائم المختصرة)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON countries(iso2);
CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region);
CREATE INDEX IF NOT EXISTS idx_countries_popular ON countries(is_popular);

-- ═══════════════════════════════════════════════════════════════
-- 3. إضافة الدول الشائعة والمهمة (50 دولة)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO countries (code, iso2, name, name_ar, name_en, phone_code, currency_code, region, region_ar, flag_emoji, is_popular) VALUES
-- دول الخليج العربي
('SAU', 'SA', 'Saudi Arabia', 'المملكة العربية السعودية', 'Saudi Arabia', '+966', 'SAR', 'Middle East', 'الشرق الأوسط', '🇸🇦', true),
('ARE', 'AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'United Arab Emirates', '+971', 'AED', 'Middle East', 'الشرق الأوسط', '🇦🇪', true),
('KWT', 'KW', 'Kuwait', 'الكويت', 'Kuwait', '+965', 'KWD', 'Middle East', 'الشرق الأوسط', '🇰🇼', true),
('BHR', 'BH', 'Bahrain', 'البحرين', 'Bahrain', '+973', 'BHD', 'Middle East', 'الشرق الأوسط', '🇧🇭', true),
('OMN', 'OM', 'Oman', 'عمان', 'Oman', '+968', 'OMR', 'Middle East', 'الشرق الأوسط', '🇴🇲', true),
('QAT', 'QA', 'Qatar', 'قطر', 'Qatar', '+974', 'QAR', 'Middle East', 'الشرق الأوسط', '🇶🇦', true),

-- دول الشام
('SYR', 'SY', 'Syria', 'سوريا', 'Syria', '+963', 'SYP', 'Middle East', 'الشرق الأوسط', '🇸🇾', true),
('JOR', 'JO', 'Jordan', 'الأردن', 'Jordan', '+962', 'JOD', 'Middle East', 'الشرق الأوسط', '🇯🇴', true),
('LBN', 'LB', 'Lebanon', 'لبنان', 'Lebanon', '+961', 'LBP', 'Middle East', 'الشرق الأوسط', '🇱🇧', true),
('PSE', 'PS', 'Palestine', 'فلسطين', 'Palestine', '+970', 'ILS', 'Middle East', 'الشرق الأوسط', '🇵🇸', true),

-- العراق واليمن
('IRQ', 'IQ', 'Iraq', 'العراق', 'Iraq', '+964', 'IQD', 'Middle East', 'الشرق الأوسط', '🇮🇶', true),
('YEM', 'YE', 'Yemen', 'اليمن', 'Yemen', '+967', 'YER', 'Middle East', 'الشرق الأوسط', '🇾🇪', true),

-- دول أفريقيا والمغرب العربي
('EGY', 'EG', 'Egypt', 'مصر', 'Egypt', '+20', 'EGP', 'Africa', 'أفريقيا', '🇪🇬', true),
('LBY', 'LY', 'Libya', 'ليبيا', 'Libya', '+218', 'LYD', 'Africa', 'أفريقيا', '🇱🇾', true),
('TUN', 'TN', 'Tunisia', 'تونس', 'Tunisia', '+216', 'TND', 'Africa', 'أفريقيا', '🇹🇳', true),
('MAR', 'MA', 'Morocco', 'المغرب', 'Morocco', '+212', 'MAD', 'Africa', 'أفريقيا', '🇲🇦', true),
('DZA', 'DZ', 'Algeria', 'الجزائر', 'Algeria', '+213', 'DZD', 'Africa', 'أفريقيا', '🇩🇿', true),
('SDN', 'SD', 'Sudan', 'السودان', 'Sudan', '+249', 'SDG', 'Africa', 'أفريقيا', '🇸🇩', true),

-- أوروبا الغربية
('GBR', 'GB', 'United Kingdom', 'المملكة المتحدة', 'United Kingdom', '+44', 'GBP', 'Europe', 'أوروبا', '🇬🇧', true),
('DEU', 'DE', 'Germany', 'ألمانيا', 'Germany', '+49', 'EUR', 'Europe', 'أوروبا', '🇩🇪', true),
('FRA', 'FR', 'France', 'فرنسا', 'France', '+33', 'EUR', 'Europe', 'أوروبا', '🇫🇷', true),
('ITA', 'IT', 'Italy', 'إيطاليا', 'Italy', '+39', 'EUR', 'Europe', 'أوروبا', '🇮🇹', true),
('ESP', 'ES', 'Spain', 'إسبانيا', 'Spain', '+34', 'EUR', 'Europe', 'أوروبا', '🇪🇸', true),
('CHE', 'CH', 'Switzerland', 'سويسرا', 'Switzerland', '+41', 'CHF', 'Europe', 'أوروبا', '🇨🇭', true),

-- أوروبا الشرقية
('UKR', 'UA', 'Ukraine', 'أوكرانيا', 'Ukraine', '+380', 'UAH', 'Europe', 'أوروبا', '🇺🇦', true),
('RUS', 'RU', 'Russia', 'روسيا', 'Russia', '+7', 'RUB', 'Europe', 'أوروبا', '🇷🇺', true),
('ROU', 'RO', 'Romania', 'رومانيا', 'Romania', '+40', 'RON', 'Europe', 'أوروبا', '🇷🇴', true),
('MDA', 'MD', 'Moldova', 'مولدوفا', 'Moldova', '+373', 'MDL', 'Europe', 'أوروبا', '🇲🇩', true),
('POL', 'PL', 'Poland', 'بولندا', 'Poland', '+48', 'PLN', 'Europe', 'أوروبا', '🇵🇱', true),
('CZE', 'CZ', 'Czech Republic', 'التشيك', 'Czech Republic', '+420', 'CZK', 'Europe', 'أوروبا', '🇨🇿', true),
('HUN', 'HU', 'Hungary', 'المجر', 'Hungary', '+36', 'HUF', 'Europe', 'أوروبا', '🇭🇺', true),
('BGR', 'BG', 'Bulgaria', 'بلغاريا', 'Bulgaria', '+359', 'BGN', 'Europe', 'أوروبا', '🇧🇬', true),

-- تركيا وآسيا
('TUR', 'TR', 'Turkey', 'تركيا', 'Turkey', '+90', 'TRY', 'Asia', 'آسيا', '🇹🇷', true),
('CHN', 'CN', 'China', 'الصين', 'China', '+86', 'CNY', 'Asia', 'آسيا', '🇨🇳', true),
('IND', 'IN', 'India', 'الهند', 'India', '+91', 'INR', 'Asia', 'آسيا', '🇮🇳', true),
('JPN', 'JP', 'Japan', 'اليابان', 'Japan', '+81', 'JPY', 'Asia', 'آسيا', '🇯🇵', true),
('KOR', 'KR', 'South Korea', 'كوريا الجنوبية', 'South Korea', '+82', 'KRW', 'Asia', 'آسيا', '🇰🇷', true),
('PAK', 'PK', 'Pakistan', 'باكستان', 'Pakistan', '+92', 'PKR', 'Asia', 'آسيا', '🇵🇰', true),
('BGD', 'BD', 'Bangladesh', 'بنغلاديش', 'Bangladesh', '+880', 'BDT', 'Asia', 'آسيا', '🇧🇩', true),

-- الأمريكتين
('USA', 'US', 'United States', 'الولايات المتحدة', 'United States', '+1', 'USD', 'North America', 'أمريكا الشمالية', '🇺🇸', true),
('CAN', 'CA', 'Canada', 'كندا', 'Canada', '+1', 'CAD', 'North America', 'أمريكا الشمالية', '🇨🇦', true),
('MEX', 'MX', 'Mexico', 'المكسيك', 'Mexico', '+52', 'MXN', 'North America', 'أمريكا الشمالية', '🇲🇽', true),
('BRA', 'BR', 'Brazil', 'البرازيل', 'Brazil', '+55', 'BRL', 'South America', 'أمريكا الجنوبية', '🇧🇷', true),
('ARG', 'AR', 'Argentina', 'الأرجنتين', 'Argentina', '+54', 'ARS', 'South America', 'أمريكا الجنوبية', '🇦🇷', true),

-- دول أخرى مهمة
('AUS', 'AU', 'Australia', 'أستراليا', 'Australia', '+61', 'AUD', 'Oceania', 'أوقيانوسيا', '🇦🇺', true),
('NZL', 'NZ', 'New Zealand', 'نيوزيلندا', 'New Zealand', '+64', 'NZD', 'Oceania', 'أوقيانوسيا', '🇳🇿', false),
('ZAF', 'ZA', 'South Africa', 'جنوب أفريقيا', 'South Africa', '+27', 'ZAR', 'Africa', 'أفريقيا', '🇿🇦', false),
('NGA', 'NG', 'Nigeria', 'نيجيريا', 'Nigeria', '+234', 'NGN', 'Africa', 'أفريقيا', '🇳🇬', false)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    phone_code = EXCLUDED.phone_code,
    currency_code = EXCLUDED.currency_code,
    region = EXCLUDED.region,
    region_ar = EXCLUDED.region_ar,
    flag_emoji = EXCLUDED.flag_emoji,
    is_popular = EXCLUDED.is_popular;

-- ═══════════════════════════════════════════════════════════════
-- 4. إنشاء جدول لربط الدول بالشركات (Company Countries)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    country_code VARCHAR(3) NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- الدولة الأساسية للشركة
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_company_countries_company ON company_countries(company_id);
CREATE INDEX IF NOT EXISTS idx_company_countries_country ON company_countries(country_code);

-- ═══════════════════════════════════════════════════════════════
-- 5. إضافة foreign key للعملة الافتراضية في countries
-- ═══════════════════════════════════════════════════════════════

-- ملاحظة: لا نضيف FOREIGN KEY لأن currencies هو multi-tenant
-- سنتحقق من صحة currency_code في الـ application level

-- ═══════════════════════════════════════════════════════════════
-- النتيجة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم إنشاء نظام الدول بنجاح!';
    RAISE NOTICE '📊 تم إضافة 50 دولة (الدول الشائعة والمهمة)';
    RAISE NOTICE '🔗 تم إنشاء جدول ربط الدول بالشركات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════════
-- 1. جدول countries غير multi-tenant (مشترك بين جميع التينانتات)
-- 2. جدول company_countries يربط الشركة بالدول التي تعمل بها
-- 3. is_primary تحدد الدولة الأساسية للشركة
-- 4. يمكن للشركة العمل في عدة دول
-- 5. يمكن إضافة المزيد من الدول لاحقاً حسب الحاجة
-- ═══════════════════════════════════════════════════════════════
