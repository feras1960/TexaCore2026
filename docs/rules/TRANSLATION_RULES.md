# 🌍 قواعد الترجمة الصارمة - Texa Core

## ⚠️ القاعدة الأساسية الصارمة

> **يُمنع منعاً باتاً كتابة أي نص ثابت (Hardcoded String) في الواجهات.**
> 
> **جميع النصوص يجب أن تستخدم دالة الترجمة `t('key.path')`**

---

## 🌐 اللغات المدعومة (9 لغات)

| الكود | اللغة | الاتجاه |
|-------|-------|---------|
| `ar` | العربية | RTL |
| `en` | English | LTR |
| `de` | Deutsch | LTR |
| `tr` | Türkçe | LTR |
| `ru` | Русский | LTR |
| `uk` | Українська | LTR |
| `it` | Italiano | LTR |
| `pl` | Polski | LTR |
| `ro` | Română | LTR |

---

## 📝 استخدام دالة الترجمة

### الطريقة الصحيحة

```typescript
import { useLanguage } from '@/app/providers/LanguageProvider';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      {/* ✅ صحيح */}
      <h1>{t('accounting.dashboard.title')}</h1>
      <p>{t('common.welcome')}</p>
      <Button>{t('common.save')}</Button>
      <Input placeholder={t('placeholders.enterName')} />
      
      {/* ✅ مع معاملات */}
      <p>{t('messages.itemCount', { count: 5 })}</p>
    </div>
  );
}
```

### الطريقة الخاطئة

```typescript
// ❌ ممنوع - نص عربي ثابت
<h1>لوحة التحكم</h1>

// ❌ ممنوع - نص إنجليزي ثابت
<Button>Save</Button>

// ❌ ممنوع - placeholder ثابت
<Input placeholder="أدخل الاسم" />

// ❌ ممنوع - ternary للغة
{language === 'ar' ? 'حفظ' : 'Save'}
```

---

## 🏗️ هيكلية مفاتيح الترجمة

### القاعدة: `section.feature.action`

```
القسم (section)
├── الميزة (feature)
│   ├── العنوان (title)
│   ├── الوصف (description)
│   └── الإجراءات (actions)
│       ├── add
│       ├── edit
│       ├── delete
│       └── save
```

### أمثلة صحيحة

```typescript
// المحاسبة
t('accounting.accounts.title')           // "الحسابات"
t('accounting.accounts.add')             // "إضافة حساب"
t('accounting.journal.entries')          // "القيود"
t('accounting.reports.balanceSheet')     // "الميزانية العمومية"

// SaaS
t('saas.tenants.title')                  // "المشتركين"
t('saas.tenants.add')                    // "إضافة مشترك"
t('saas.plans.features')                 // "المميزات"

// مشترك
t('common.save')                         // "حفظ"
t('common.cancel')                       // "إلغاء"
t('common.delete')                       // "حذف"
t('common.edit')                         // "تعديل"
t('common.search')                       // "بحث"
t('common.filter')                       // "فلترة"
t('common.loading')                      // "جاري التحميل..."
t('common.noData')                       // "لا توجد بيانات"

// الرسائل
t('messages.saved')                      // "تم الحفظ بنجاح"
t('messages.deleted')                    // "تم الحذف"
t('messages.error')                      // "حدث خطأ"
t('messages.confirmDelete')              // "هل أنت متأكد من الحذف؟"

// الأخطاء
t('errors.required')                     // "هذا الحقل مطلوب"
t('errors.invalidEmail')                 // "البريد الإلكتروني غير صحيح"
t('errors.networkError')                 // "خطأ في الاتصال"

// الجداول
t('table.noData')                        // "لا توجد بيانات"
t('table.loading')                       // "جاري التحميل..."
t('table.rowsPerPage')                   // "عدد الصفوف"
t('table.showing')                       // "عرض"
t('table.of')                            // "من"

// التنقل
t('navigation.dashboard')                // "لوحة التحكم"
t('navigation.settings')                 // "الإعدادات"
```

---

## 📁 ملفات الترجمة

### المسار
```
src/i18n/locales/
├── ar.json    # العربية (اللغة الأساسية)
├── en.json    # English
├── de.json    # Deutsch
├── tr.json    # Türkçe
├── ru.json    # Русский
├── uk.json    # Українська
├── it.json    # Italiano
├── pl.json    # Polski
└── ro.json    # Română
```

### هيكل الملف

```json
{
  "accounting": {
    "title": "المحاسبة",
    "accounts": {
      "title": "الحسابات",
      "add": "إضافة حساب",
      "edit": "تعديل الحساب"
    }
  },
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء"
  },
  "messages": {
    "saved": "تم الحفظ بنجاح"
  }
}
```

---

## 🔄 قاعدة التزامن الصارمة

> **جميع ملفات الترجمة الـ 9 يجب أن تحتوي على نفس المفاتيح بالضبط.**

### عند إضافة مفتاح جديد:

1. ✅ أضفه في **جميع** ملفات الـ 9 لغات
2. ✅ استخدم `npm run sync:translations` للتحقق
3. ✅ لا تترك أي مفتاح بـ `__NEEDS_TRANSLATION__`

### سكريبت التحقق

```bash
# فحص المفاتيح المفقودة
npm run check:translations

# مزامنة المفاتيح
npm run sync:translations
```

---

## 🛠️ أدوات الأتمتة

### 1. i18next-scanner

```bash
# مسح الكود واستخراج المفاتيح
npm run scan

# مسح قسم المحاسبة فقط
npm run scan:accounting
```

### 2. ESLint Rule

```javascript
// .eslintrc.cjs
'i18next/no-literal-string': ['error', { 
  markupOnly: true,
  // ... إعدادات
}]
```

### 3. Pre-commit Hook

```bash
# يتم تشغيله تلقائياً قبل كل commit
npm run check:translations
```

---

## 🚫 الممنوعات

### 1. النصوص الثابتة

```typescript
// ❌ ممنوع
<span>مرحباً</span>
<span>Hello</span>
```

### 2. Ternary للغة

```typescript
// ❌ ممنوع
{language === 'ar' ? 'مرحباً' : 'Hello'}

// ✅ صحيح
{t('common.welcome')}
```

### 3. Template Literals الثابتة

```typescript
// ❌ ممنوع
const message = `مرحباً ${name}`;

// ✅ صحيح
const message = t('messages.welcome', { name });
```

### 4. Console Messages الظاهرة للمستخدم

```typescript
// ❌ ممنوع (إذا كانت ستظهر للمستخدم)
toast.success('تم الحفظ');

// ✅ صحيح
toast.success(t('messages.saved'));
```

---

## 📋 قائمة فحص قبل Commit

- [ ] جميع النصوص تستخدم `t('key')`
- [ ] لا توجد نصوص ثابتة في JSX
- [ ] لا توجد ternary للغة
- [ ] المفتاح موجود في **جميع** ملفات الـ 9 لغات
- [ ] هيكل المفتاح يتبع `section.feature.action`
- [ ] `npm run check:translations` يمر بنجاح
- [ ] `npm run lint` يمر بنجاح

---

## 🔍 استثناءات مسموحة

### 1. الثوابت التقنية

```typescript
// ✅ مسموح - لن تظهر للمستخدم
const API_URL = 'https://api.example.com';
const DATE_FORMAT = 'YYYY-MM-DD';
```

### 2. أسماء العلامات التجارية

```typescript
// ✅ مسموح - علامة تجارية ثابتة
<span>Texa</span>
<span>Core</span>

// ولكن يفضل استخدام
{/* eslint-disable-next-line i18next/no-literal-string -- Brand name */}
<span>TexaCore</span>
```

### 3. الأكواد والمعرفات

```typescript
// ✅ مسموح
<span>INV-001</span>
<span>#ACC-12345</span>
```

---

## 📚 المراجع

- `docs/TRANSLATION_GUIDELINES.md`
- `i18next-scanner.config.cjs`
- `.eslintrc.cjs`
