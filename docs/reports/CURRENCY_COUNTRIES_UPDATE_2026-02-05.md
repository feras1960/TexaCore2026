# 📋 تقرير تحديثات العملات والدول
**التاريخ:** 2026-02-05  
**المحادثة ID:** 181dc554-6452-48f2-88d2-fcd01dc045d6

---

## 📌 ملخص التحديثات

### 1. إصلاح جدول العملات (currencies)

#### المشكلة:
- جدول `currencies` كان يتطلب `tenant_id NOT NULL` مما يمنع إضافة عملات عالمية
- العملات كانت مكررة وغير مكتملة

#### الحل:
```sql
-- إزالة قيد tenant_id NOT NULL
ALTER TABLE currencies ALTER COLUMN tenant_id DROP NOT NULL;

-- إضافة قيد UNIQUE على code
ALTER TABLE currencies ADD CONSTRAINT currencies_code_unique UNIQUE (code);
```

#### الملف: `/supabase/scripts/FIX_currencies_all_languages.sql`
- يحتوي على ~70 عملة عالمية
- كل عملة بـ **9 لغات**: English, Arabic, German, Turkish, Russian, Ukrainian, Italian, Polish, Romanian

---

### 2. إصلاح قائمة الدول

#### المشكلة:
- أوكرانيا والعديد من الدول مفقودة من قائمة التسجيل
- كان هناك ملفين مختلفين للدول:
  - `/src/features/auth/RegistrationWizard.tsx` (الملف القديم - غير مستخدم)
  - `/src/data/countries.ts` (الملف الفعلي المستخدم)

#### الحل:
**الملف:** `/src/data/countries.ts`

أُضيفت الدول المفقودة:
```typescript
{ code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', currency: 'UAH', phoneCode: '+380' }
```

#### الدول المتوفرة الآن: ~130 دولة
تشمل:
- جميع الدول العربية
- الدول السلافية (روسيا، أوكرانيا، بيلاروسيا، كازاخستان...)
- الدول الأوروبية
- الدول الآسيوية
- الدول الأفريقية
- الدول الأمريكية

---

### 3. توسيع قائمة العملات في نموذج التسجيل

#### الملف: `/src/features/auth/FabricRegistrationWizard.tsx`

#### التغييرات:
تم توسيع القائمة من ~16 عملة إلى **~55 عملة** تشمل:

| الفئة | العملات |
|-------|---------|
| **الرئيسية** | USD, EUR, GBP, CHF, JPY, CAD, AUD, CNY |
| **العربية** | SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, LBP, SYP, IQD, YER, MAD, DZD, TND, LYD, SDG |
| **السلافية** | RUB, **UAH**, BYN, KZT, UZS, AZN, GEL, AMD |
| **التركية/الأوروبية** | TRY, PLN, CZK, HUF, RON, BGN, SEK, NOK, DKK |
| **الآسيوية** | INR, PKR, BDT, IDR, MYR, SGD, THB, PHP, KRW |
| **الأفريقية** | ZAR, NGN, KES |
| **الأمريكية** | MXN, BRL, ARS, COP |

---

### 4. اكتشاف الملف الصحيح للتسجيل

#### الاكتشاف المهم:
```typescript
// في App.tsx السطر 22
const RegistrationWizard = React.lazy(() => import('@/features/auth/FabricRegistrationWizard'));
```

- **الملف المستخدم فعلياً:** `FabricRegistrationWizard.tsx`
- **الملف غير المستخدم:** `RegistrationWizard.tsx`

---

## 📁 الملفات المُعدّلة

| الملف | التغيير |
|-------|---------|
| `/src/data/countries.ts` | إضافة أوكرانيا |
| `/src/features/auth/FabricRegistrationWizard.tsx` | توسيع قائمة العملات (~55 عملة) |
| `/supabase/scripts/FIX_currencies_all_languages.sql` | سكريبت إضافة العملات بـ 9 لغات |

---

## 📁 الملفات المُنشأة

| الملف | الوصف |
|-------|-------|
| `/supabase/scripts/FIX_currencies_all_languages.sql` | إصلاح جدول العملات + إضافة 70 عملة |
| `/supabase/scripts/FIX_duplicate_currencies.sql` | إزالة العملات المكررة |
| `/supabase/scripts/ADD_ALL_WORLD_CURRENCIES.sql` | إضافة جميع عملات العالم |
| `/supabase/scripts/CHECK_currencies_structure.sql` | فحص هيكل جدول العملات |

---

## ✅ خطوات التنفيذ المطلوبة

### 1. تنفيذ سكريبت العملات في Supabase:
```sql
-- نفّذ الملف:
/supabase/scripts/FIX_currencies_all_languages.sql
```

### 2. التحقق من النتيجة:
```sql
SELECT COUNT(*) as total_currencies FROM currencies;
-- يجب أن يكون ~70 عملة
```

---

## 🔗 العلاقات والترابطات

### الدولة ← العملة المحلية:
```typescript
// عند اختيار دولة، تتحدد العملة المحلية تلقائياً
onValueChange={(val) => {
    handleChange('country', val);
    const country = countries.find(c => c.code === val);
    if (country) {
        handleChange('localCurrency', country.currency);
    }
}}
```

### العملة الرئيسية:
- افتراضياً: `USD`
- يمكن للمستخدم تغييرها

---

## 📊 حالة قاعدة البيانات

### جدول currencies:
| العمود | النوع | Nullable | الوصف |
|--------|-------|----------|-------|
| id | uuid | NO | المعرف الفريد |
| code | varchar | NO | رمز العملة (USD, EUR...) |
| name | varchar | NO | الاسم بالإنجليزية |
| name_ar | varchar | YES | الاسم بالعربية |
| name_de | varchar | YES | الاسم بالألمانية |
| name_tr | varchar | YES | الاسم بالتركية |
| name_ru | varchar | YES | الاسم بالروسية |
| name_uk | varchar | YES | الاسم بالأوكرانية |
| name_it | varchar | YES | الاسم بالإيطالية |
| name_pl | varchar | YES | الاسم بالبولندية |
| name_ro | varchar | YES | الاسم بالرومانية |
| symbol | varchar | YES | رمز العملة ($, €...) |
| decimal_places | integer | YES | عدد الخانات العشرية |
| is_active | boolean | YES | حالة التفعيل |
| tenant_id | uuid | **YES** | معرف المستأجر (NULL للعملات العالمية) |

---

## 🎯 الخطوات التالية (المحادثة القادمة)

1. **أسعار الصرف**: تطبيق نظام أسعار الصرف التاريخية
2. **تحديث البيانات التلقائي**: جلب أسعار الصرف من API خارجي
3. **التقارير المالية**: حساب التحويلات بين العملات
4. **اختبار شامل**: التأكد من عمل كل المميزات

---

## 📝 ملاحظات مهمة

1. **الملف الصحيح للتسجيل:** `FabricRegistrationWizard.tsx` (وليس `RegistrationWizard.tsx`)
2. **مصدر الدول:** `/src/data/countries.ts`
3. **العملات في DB vs UI:** 
   - DB: 70 عملة (بـ 9 لغات)
   - UI: 55 عملة (عربي/إنجليزي)

---

*تم إنشاء هذا التقرير في: 2026-02-05 18:14 UTC*
