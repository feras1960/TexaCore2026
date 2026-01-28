# 🌍 دليل دمج مفاتيح الترجمة - نظام الباقات

**التاريخ:** 2026-01-24  
**اللغات المدعومة:** 9 لغات

---

## ✅ الملفات المُنشأة

تم إنشاء ملفات الترجمة للغات التالية:

1. ✅ `wizard_plans_translations_ar.json` - العربية
2. ✅ `wizard_plans_translations_en.json` - الإنجليزية
3. ✅ `wizard_plans_translations_de.json` - الألمانية
4. ✅ `wizard_plans_translations_tr.json` - التركية
5. ✅ `wizard_plans_translations_ru.json` - الروسية
6. ✅ `wizard_plans_translations_uk.json` - الأوكرانية
7. ✅ `wizard_plans_translations_it.json` - الإيطالية
8. ✅ `wizard_plans_translations_pl.json` - البولندية
9. ✅ `wizard_plans_translations_ro.json` - الرومانية

---

## 📋 طريقة الدمج

### الخطوة 1: فتح ملفات الترجمة الأساسية

افتح الملفات التالية في المحرر:
```
src/i18n/locales/ar.json
src/i18n/locales/en.json
src/i18n/locales/de.json
src/i18n/locales/tr.json
src/i18n/locales/ru.json
src/i18n/locales/uk.json
src/i18n/locales/it.json
src/i18n/locales/pl.json
src/i18n/locales/ro.json
```

### الخطوة 2: نسخ المحتوى

لكل لغة، انسخ محتوى قسم `"wizard"` من الملف المؤقت إلى الملف الأساسي.

---

## 🔧 التفاصيل لكل لغة

### 1️⃣ العربية (ar.json)

**افتح:**
- `src/i18n/locales/ar.json`
- `wizard_plans_translations_ar.json`

**ابحث عن قسم `"wizard"`** في `ar.json` وأضف المفاتيح الجديدة:

```json
{
  "wizard": {
    // ... المفاتيح الموجودة ...
    
    // 🆕 أضف هذه المفاتيح الجديدة:
    "step4Title": "اختر باقتك",
    "step4Description": "ابدأ بفترة تجريبية مجانية واختر الباقة المناسبة لك",
    "monthly": "شهري",
    "yearly": "سنوي",
    "month": "شهر",
    "year": "سنة",
    "save": "وفر",
    "discount50": "خصم 50% على الإطلاق",
    "freeMonths": "شهرين مجاناً",
    "mostPopular": "الأكثر شعبية",
    "selectPlan": "الرجاء اختيار الباقة",
    "planNote": "يمكنك تغيير الباقة أو الترقية في أي وقت من لوحة التحكم",
    
    "plans": {
      "starter": {
        "name": "الباقة الأساسية",
        "description": "مثالية للشركات الصغيرة والمشاريع الناشئة",
        "feature1": "شركة واحدة",
        "feature2": "5 مستخدمين",
        "feature3": "50 فرع",
        "feature4": "10 GB تخزين",
        "feature5": "14 يوم تجريبي"
      },
      "professional": {
        "name": "الباقة الاحترافية",
        "description": "للشركات المتنامية والمتوسطة",
        "feature1": "3 شركات",
        "feature2": "20 مستخدم",
        "feature3": "200 فرع",
        "feature4": "100 GB تخزين",
        "feature5": "30 يوم تجريبي",
        "feature6": "دعم ذو أولوية"
      },
      "enterprise": {
        "name": "باقة المؤسسات",
        "description": "للمؤسسات الكبيرة والشركات متعددة الفروع",
        "feature1": "غير محدود",
        "feature2": "500 GB تخزين",
        "feature3": "30 يوم تجريبي",
        "feature4": "White Label",
        "feature5": "API Access",
        "feature6": "دعم مخصص"
      }
    }
  }
}
```

---

### 2️⃣ الإنجليزية (en.json)

**انسخ من:** `wizard_plans_translations_en.json`  
**إلى:** `src/i18n/locales/en.json`

في قسم `"wizard"`:
```json
"step4Title": "Choose Your Plan",
"step4Description": "Start with a free trial and select the plan that suits you",
// ... باقي المفاتيح
```

---

### 3️⃣ الألمانية (de.json)

**انسخ من:** `wizard_plans_translations_de.json`  
**إلى:** `src/i18n/locales/de.json`

```json
"step4Title": "Wählen Sie Ihren Plan",
"step4Description": "Beginnen Sie mit einer kostenlosen Testversion...",
// ... باقي المفاتيح
```

---

### 4️⃣ التركية (tr.json)

**انسخ من:** `wizard_plans_translations_tr.json`  
**إلى:** `src/i18n/locales/tr.json`

```json
"step4Title": "Planınızı Seçin",
"step4Description": "Ücretsiz deneme ile başlayın...",
// ... باقي المفاتيح
```

---

### 5️⃣ الروسية (ru.json)

**انسخ من:** `wizard_plans_translations_ru.json`  
**إلى:** `src/i18n/locales/ru.json`

```json
"step4Title": "Выберите ваш план",
"step4Description": "Начните с бесплатной пробной версии...",
// ... باقي المفاتيح
```

---

### 6️⃣ الأوكرانية (uk.json)

**انسخ من:** `wizard_plans_translations_uk.json`  
**إلى:** `src/i18n/locales/uk.json`

```json
"step4Title": "Виберіть свій план",
"step4Description": "Почніть з безкоштовної пробної версії...",
// ... باقي المفاتيح
```

---

### 7️⃣ الإيطالية (it.json)

**انسخ من:** `wizard_plans_translations_it.json`  
**إلى:** `src/i18n/locales/it.json`

```json
"step4Title": "Scegli il tuo piano",
"step4Description": "Inizia con una prova gratuita...",
// ... باقي المفاتيح
```

---

### 8️⃣ البولندية (pl.json)

**انسخ من:** `wizard_plans_translations_pl.json`  
**إلى:** `src/i18n/locales/pl.json`

```json
"step4Title": "Wybierz swój plan",
"step4Description": "Rozpocznij od bezpłatnego okresu próbnego...",
// ... باقي المفاتيح
```

---

### 9️⃣ الرومانية (ro.json)

**انسخ من:** `wizard_plans_translations_ro.json`  
**إلى:** `src/i18n/locales/ro.json`

```json
"step4Title": "Alegeți planul dvs.",
"step4Description": "Începeți cu o perioadă de probă gratuită...",
// ... باقي المفاتيح
```

---

## ⚠️ ملاحظات مهمة

### 1. موقع الإضافة:
- **ابحث عن قسم `"wizard"`** في كل ملف
- **أضف المفاتيح الجديدة داخل هذا القسم**
- **لا تنشئ قسم `wizard` جديد** إذا كان موجوداً

### 2. التنسيق JSON:
```json
{
  "wizard": {
    "existingKey1": "...",
    "existingKey2": "...",
    
    // 🆕 أضف هنا - لا تنسَ الفاصلة
    "step4Title": "...",
    "step4Description": "...",
    "monthly": "...",
    // ... المفاتيح الجديدة
    
    "plans": {
      "starter": { ... },
      "professional": { ... },
      "enterprise": { ... }
    }
  }
}
```

### 3. الفواصل:
- ✅ ضع فاصلة `,` بعد كل مفتاح إلا الأخير
- ❌ لا تضع فاصلة بعد آخر مفتاح في القسم

### 4. الترميز:
- ✅ استخدم UTF-8 encoding
- ✅ احفظ الملفات بهذا الترميز

---

## 🧪 الاختبار

بعد الدمج، اختبر كل لغة:

### 1. تشغيل المشروع:
```bash
npm run dev
```

### 2. تبديل اللغات:
- افتح `/registration-wizard`
- بدّل بين اللغات من الـ Language Selector
- تحقق من ظهور الترجمات الصحيحة في الخطوة 5

### 3. تحقق من كل لغة:
```
- ar: اختر باقتك
- en: Choose Your Plan
- de: Wählen Sie Ihren Plan
- tr: Planınızı Seçin
- ru: Выберите ваш план
- uk: Виберіть свій план
- it: Scegli il tuo piano
- pl: Wybierz swój plan
- ro: Alegeți planul dvs.
```

---

## 🛠️ إذا واجهت أخطاء

### Error: "Translation key not found"
```
✅ الحل: تحقق من أن المفتاح موجود في قسم wizard
✅ الحل: تحقق من التنسيق JSON (فواصل، أقواس)
```

### Error: JSON Parse Error
```
✅ الحل: استخدم JSON Validator للتحقق من الملف
✅ الموقع: https://jsonlint.com/
```

### الترجمة لا تظهر:
```
✅ الحل: امسح cache المتصفح (Ctrl+Shift+R)
✅ الحل: أعد تشغيل dev server
✅ الحل: تحقق من Console للأخطاء
```

---

## 📊 حالة الدمج

### ✅ ملفات الترجمة جاهزة:
- [x] ar.json - العربية
- [x] en.json - الإنجليزية
- [x] de.json - الألمانية
- [x] tr.json - التركية
- [x] ru.json - الروسية
- [x] uk.json - الأوكرانية
- [x] it.json - الإيطالية
- [x] pl.json - البولندية
- [x] ro.json - الرومانية

### 🔄 يتطلب دمج:
- [ ] نسخ المحتوى لكل ملف
- [ ] اختبار كل لغة
- [ ] التحقق من عدم وجود أخطاء JSON

---

## 🎯 الخطوة التالية

بعد دمج الترجمات:
1. ✅ اختبر معالج التسجيل
2. ✅ تحقق من جميع اللغات
3. ✅ جرّب التسجيل بباقات مختلفة
4. ✅ تحقق من حفظ الباقة في DB

---

## 📞 للمساعدة

إذا احتجت مساعدة في الدمج:
1. تحقق من هذا الملف
2. راجع أمثلة التنسيق أعلاه
3. استخدم JSON Validator
4. تحقق من Console للأخطاء

---

**✅ بعد إتمام الدمج، يمكنك حذف ملفات `wizard_plans_translations_*.json` المؤقتة**

---

**📅 التاريخ:** 2026-01-24  
**✍️ المطور:** Next Revolution Company
