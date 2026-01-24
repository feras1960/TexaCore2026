# 🌍 نظام العملات والدول - دليل شامل
# Currencies & Countries System - Complete Guide

> **آخر تحديث:** 24 يناير 2026  
> **الحالة:** ✅ مكتمل ومُختبر

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [نظام العملات](#نظام-العملات)
3. [نظام الدول](#نظام-الدول)
4. [الإعدادات المحلية](#الإعدادات-المحلية)
5. [نظام التقريب](#نظام-التقريب)
6. [أمثلة الاستخدام](#أمثلة-الاستخدام)
7. [الدوال المساعدة](#الدوال-المساعدة)

---

## 🎯 نظرة عامة

تم بناء نظام شامل ومتكامل لإدارة العملات والدول مع الإعدادات المحلية الكاملة، يدعم:

- ✅ **30 عملة شائعة** من جميع المناطق
- ✅ **50 دولة** من جميع القارات
- ✅ **9 لغات** مدعومة بالكامل
- ✅ **إعدادات محلية شاملة** لكل دولة
- ✅ **نظام تقريب متقدم** بـ 5 طرق مختلفة

---

## 💰 نظام العملات

### الجدول: `currencies`

```sql
CREATE TABLE currencies (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    code VARCHAR(3) NOT NULL,
    name VARCHAR(100),
    name_ar VARCHAR(100),
    name_en VARCHAR(100),
    name_de VARCHAR(100),
    name_tr VARCHAR(100),
    name_ru VARCHAR(100),
    name_uk VARCHAR(100),
    name_it VARCHAR(100),
    name_pl VARCHAR(100),
    name_ro VARCHAR(100),
    symbol VARCHAR(10),
    exchange_rate DECIMAL(18,8),
    decimal_places INT,
    is_base BOOLEAN,
    UNIQUE(tenant_id, code)
);
```

### العملات المدعومة (30 عملة)

#### 🇸🇦 عملات الخليج العربي
- **SAR** - ريال سعودي (2 منازل)
- **AED** - درهم إماراتي (2 منازل)
- **KWD** - دينار كويتي (3 منازل)
- **BHD** - دينار بحريني (3 منازل)
- **OMR** - ريال عماني (3 منازل)
- **QAR** - ريال قطري (2 منازل)

#### 🇸🇾 عملات الشام والعراق
- **SYP** - ليرة سورية
- **JOD** - دينار أردني (3 منازل)
- **IQD** - دينار عراقي (3 منازل)
- **LBP** - ليرة لبنانية

#### 🇪🇬 عملات أفريقيا
- **EGP** - جنيه مصري
- **LYD** - دينار ليبي (3 منازل)
- **TND** - دينار تونسي (3 منازل)
- **MAD** - درهم مغربي
- **DZD** - دينار جزائري

#### 🇪🇺 عملات أوروبا
- **EUR** - يورو
- **GBP** - جنيه إسترليني
- **CHF** - فرنك سويسري
- **UAH** - غريفنا أوكراني
- **RUB** - روبل روسي
- **RON** - ليو روماني
- **MDL** - ليو مولدوفي
- **PLN** - زلوتي بولندي
- **CZK** - كورونا تشيكي

#### 🇹🇷 عملات آسيا
- **TRY** - ليرة تركية
- **CNY** - يوان صيني
- **INR** - روبية هندية
- **JPY** - ين ياباني (0 منازل)

#### 🇺🇸 عملات الأمريكتين
- **USD** - دولار أمريكي
- **CAD** - دولار كندي

### ترجمات العملات

كل عملة لها اسم بـ **9 لغات**:

```javascript
{
  "USD": {
    "ar": "دولار أمريكي",
    "en": "US Dollar",
    "de": "US-Dollar",
    "tr": "ABD Doları",
    "ru": "Доллар США",
    "uk": "Долар США",
    "it": "Dollaro USA",
    "pl": "Dolar amerykański",
    "ro": "Dolar american"
  }
}
```

---

## 🌍 نظام الدول

### الجدول: `countries`

```sql
CREATE TABLE countries (
    id UUID PRIMARY KEY,
    code VARCHAR(3) UNIQUE, -- ISO 3166-1 alpha-3 (SAU, USA, etc.)
    iso2 VARCHAR(2) UNIQUE,  -- ISO 3166-1 alpha-2 (SA, US, etc.)
    name VARCHAR(100),
    name_ar VARCHAR(100),
    name_en VARCHAR(100),
    -- + 7 لغات أخرى (de, tr, ru, uk, it, pl, ro)
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    region VARCHAR(50),
    region_ar VARCHAR(50),
    flag_emoji VARCHAR(10),
    is_popular BOOLEAN,
    
    -- الإعدادات المحلية
    locale VARCHAR(10),
    text_direction VARCHAR(3),
    number_system VARCHAR(20),
    date_format VARCHAR(20),
    time_format VARCHAR(5),
    week_start VARCHAR(10),
    decimal_separator VARCHAR(1),
    thousands_separator VARCHAR(1),
    
    -- إعدادات التقريب
    rounding_method VARCHAR(10),
    tax_rounding INT,
    amount_rounding INT,
    unit_price_rounding INT,
    total_rounding INT
);
```

### الدول المدعومة (50 دولة)

#### المناطق الجغرافية:
- 🇸🇦 **الخليج العربي**: 6 دول
- 🇸🇾 **الشام**: 4 دول
- 🇮🇶 **العراق واليمن**: 2 دولة
- 🇪🇬 **أفريقيا والمغرب العربي**: 6 دول
- 🇬🇧 **أوروبا الغربية**: 6 دول
- 🇺🇦 **أوروبا الشرقية**: 8 دول
- 🇹🇷 **تركيا وآسيا**: 7 دول
- 🇺🇸 **الأمريكتين**: 5 دول
- 🇦🇺 **دول أخرى**: 4 دول

### ربط الشركات بالدول

```sql
CREATE TABLE company_countries (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    country_code VARCHAR(3) REFERENCES countries(code),
    is_primary BOOLEAN,
    UNIQUE(company_id, country_code)
);
```

---

## ⚙️ الإعدادات المحلية

### 1. نظام التاريخ (`date_format`)

| القيمة | الوصف | الدول |
|--------|-------|-------|
| `gregorian` | تاريخ ميلادي | معظم الدول |
| `hijri` | تاريخ هجري | 🇸🇦 السعودية، 🇰🇼 الكويت، 🇴🇲 عمان، 🇾🇪 اليمن |
| `mixed` | مختلط | يمكن إضافته لاحقاً |

### 2. نظام الأرقام (`number_system`)

| القيمة | الوصف | مثال | الدول |
|--------|-------|------|-------|
| `latin` | أرقام إنجليزية | 1234567890 | معظم الدول |
| `arabic` | أرقام عربية | ١٢٣٤٥٦٧٨٩٠ | الدول الخليجية، مصر، العراق، سوريا |
| `hindi` | أرقام هندية | १२३४५६७८९० | 🇮🇳 الهند |

### 3. نظام الوقت (`time_format`)

| القيمة | الوصف | مثال | الدول |
|--------|-------|------|-------|
| `12h` | 12 ساعة | 3:30 PM | دول الخليج، أمريكا، UK، الهند |
| `24h` | 24 ساعة | 15:30 | أوروبا، معظم الدول العربية |

### 4. اتجاه النص (`text_direction`)

| القيمة | الوصف | الدول |
|--------|-------|-------|
| `rtl` | من اليمين لليسار | الدول العربية، 🇵🇰 باكستان |
| `ltr` | من اليسار لليمين | بقية الدول |

### 5. بداية الأسبوع (`week_start`)

| القيمة | الدول |
|--------|-------|
| `saturday` | معظم الدول العربية |
| `sunday` | أمريكا، كندا، الهند، اليابان |
| `monday` | أوروبا، أستراليا |

### 6. الفواصل العشرية والآلاف

| الدولة | Decimal | Thousands | مثال |
|--------|---------|-----------|------|
| 🇸🇦 السعودية | `.` | `,` | 1,234.56 |
| 🇩🇪 ألمانيا | `,` | `.` | 1.234,56 |
| 🇫🇷 فرنسا | `,` | ` ` | 1 234,56 |
| 🇨🇭 سويسرا | `.` | `'` | 1'234.56 |

---

## 🔢 نظام التقريب

### طرق التقريب المدعومة

#### 1. `half_up` - التقريب الطبيعي (الأكثر شيوعاً) ⬆️
```
123.444 → 123.44
123.445 → 123.45 ✓
123.446 → 123.45
```

#### 2. `half_down` - النصف للأسفل ⬇️
```
123.444 → 123.44
123.445 → 123.44 ✓
123.446 → 123.45
```

#### 3. `up` / `ceil` - للأعلى دائماً ⬆️
```
123.441 → 123.45 ✓
123.001 → 123.01 ✓
```

#### 4. `down` / `floor` - للأسفل دائماً ⬇️
```
123.449 → 123.44 ✓
123.999 → 123.99 ✓
```

#### 5. `half_even` / `banker` - التقريب المصرفي 🏦
```
123.445 → 123.44 (لأن 4 زوجي)
123.455 → 123.46 (لأن 5 فردي)
123.465 → 123.46 (لأن 6 زوجي)
```

### أنواع التقريب

| النوع | الوصف | المنازل الافتراضية |
|-------|-------|---------------------|
| `tax_rounding` | الضرائب | 2 |
| `amount_rounding` | المبالغ العامة | 2 |
| `unit_price_rounding` | أسعار الوحدات | 2-4 |
| `total_rounding` | المجموع النهائي | 2 |

### مستويات التقريب

1. **مستوى الدولة** - إعدادات افتراضية إقليمية
2. **مستوى الشركة** - يمكن وراثة الدولة أو التخصيص
3. **مستوى العملة** - عدد المنازل العشرية

---

## 📝 أمثلة الاستخدام

### 1. تقريب مبلغ عام

```sql
-- تقريب 123.456 إلى منزلتين عشريتين
SELECT round_amount(123.456, 2, 'half_up');
-- النتيجة: 123.46

-- تقريب الدينار الكويتي (3 منازل)
SELECT round_amount(123.4567, 3, 'half_up');
-- النتيجة: 123.457
```

### 2. تقريب حسب إعدادات الشركة

```sql
-- تقريب ضريبة
SELECT round_amount_for_company(
    'company_id_here',
    123.456,
    'tax'
);

-- تقريب سعر وحدة
SELECT round_amount_for_company(
    'company_id_here',
    9.9999,
    'unit_price'
);

-- تقريب مجموع نهائي
SELECT round_amount_for_company(
    'company_id_here',
    1234.567,
    'total'
);
```

### 3. جلب إعدادات الشركة

```sql
SELECT * FROM get_company_rounding_settings('company_id_here');

-- النتيجة:
-- rounding_method | tax_rounding | amount_rounding | unit_price_rounding | total_rounding
-- half_up        | 2            | 2               | 4                   | 2
```

### 4. عرض جميع الإعدادات

```sql
SELECT 
    company_name,
    country_name,
    inherit_country_rounding,
    effective_rounding_method,
    effective_tax_rounding
FROM v_company_rounding_settings;
```

---

## 🛠️ الدوال المساعدة

### 1. `round_amount()`

```sql
round_amount(
    p_amount DECIMAL(18,6),
    p_decimal_places INT,
    p_rounding_method VARCHAR(10) DEFAULT 'half_up'
) RETURNS DECIMAL(18,6)
```

**مثال:**
```sql
SELECT round_amount(123.456, 2, 'half_up');    -- 123.46
SELECT round_amount(123.456, 2, 'down');       -- 123.45
SELECT round_amount(123.456, 2, 'up');         -- 123.46
```

### 2. `round_amount_for_company()`

```sql
round_amount_for_company(
    p_company_id UUID,
    p_amount DECIMAL(18,6),
    p_type VARCHAR(20) DEFAULT 'amount'
) RETURNS DECIMAL(18,6)
```

**الأنواع المدعومة:**
- `amount` - مبلغ عام
- `tax` - ضريبة
- `unit_price` - سعر وحدة
- `total` - مجموع

### 3. `get_company_rounding_settings()`

```sql
get_company_rounding_settings(p_company_id UUID)
RETURNS TABLE(
    rounding_method VARCHAR(10),
    tax_rounding INT,
    amount_rounding INT,
    unit_price_rounding INT,
    total_rounding INT
)
```

### 4. View: `v_company_rounding_settings`

عرض سريع لكل إعدادات التقريب للشركات مع الوراثة من الدول.

---

## 📊 إحصائيات النظام

| العنصر | العدد | الحالة |
|--------|------|--------|
| **العملات** | 30 | ✅ |
| **الدول** | 50 | ✅ |
| **اللغات المدعومة** | 9 | ✅ |
| **الترجمات** | 900+ | ✅ |
| **طرق التقريب** | 5 | ✅ |
| **أنواع التقريب** | 4 | ✅ |

---

## 🚀 الخطوات التالية

### Frontend Integration (المرحلة القادمة)
1. [ ] إنشاء `currenciesService.ts`
2. [ ] إنشاء `countriesService.ts`
3. [ ] إنشاء `useCurrencies()` hook
4. [ ] إنشاء `useCountries()` hook
5. [ ] مكون اختيار العملة `CurrencySelector`
6. [ ] مكون اختيار الدولة `CountrySelector`
7. [ ] مكون إعدادات التقريب `RoundingSettings`
8. [ ] دمج في معالج التسجيل `RegisterWizard`

### Nexa Agent Integration (مستقبلاً)
1. [ ] تحديث أسعار الصرف التلقائي
2. [ ] الترجمة التلقائية للبيانات
3. [ ] اقتراح الإعدادات المحلية

---

## 📚 المراجع

- [ISO 4217 - Currency Codes](https://en.wikipedia.org/wiki/ISO_4217)
- [ISO 3166 - Country Codes](https://en.wikipedia.org/wiki/ISO_3166)
- [CLDR - Locale Data](http://cldr.unicode.org/)
- [PostgreSQL Rounding Functions](https://www.postgresql.org/docs/current/functions-math.html)

---

**🎉 النظام جاهز للاستخدام ويمكن البدء بالتكامل مع Frontend!**
