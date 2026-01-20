# دليل الترجمة والتدويل - Translation Guidelines
# القواعد الإلزامية لدعم تعدد اللغات

---

## ⚠️ قاعدة أساسية إلزامية

**جميع النصوص في النظام يجب أن تستخدم نظام الترجمة (i18n)**
**NO HARDCODED TEXT - جميع النصوص يجب أن تكون قابلة للترجمة**

---

## 📋 القواعد الإلزامية

### 1. ❌ ممنوع تماماً

```typescript
// ❌ خطأ - نص ثابت
<button>حفظ</button>
<div>إجمالي المبيعات</div>
<h1>لوحة التحكم</h1>

// ❌ خطأ - نص ثابت بالإنجليزية
<button>Save</button>
<div>Total Sales</div>
```

### 2. ✅ صحيح دائماً

```typescript
// ✅ صحيح - استخدام t() function
import { useLanguage } from '@/app/providers/LanguageProvider';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <button>{t('common.save')}</button>
    <div>{t('dashboard.totalSales')}</div>
    <h1>{t('navigation.dashboard')}</h1>
  );
}
```

---

## 🔑 هيكلية مفاتيح الترجمة

### 1. التسمية (Naming Convention)

```
category.subcategory.key
```

**أمثلة:**
- `common.save` - أزرار وعمليات عامة
- `navigation.dashboard` - قائمة التنقل
- `accounting.journalEntries` - المحاسبة
- `inventory.products` - المخزون
- `auth.login` - المصادقة
- `errors.validation.required` - رسائل الأخطاء

### 2. الفئات الرئيسية

#### common (عمليات عامة)
```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "create": "إنشاء",
    "update": "تحديث",
    "search": "بحث",
    "filter": "تصفية",
    "loading": "جاري التحميل...",
    "noData": "لا توجد بيانات",
    "error": "حدث خطأ",
    "success": "تمت العملية بنجاح"
  }
}
```

#### navigation (التنقل)
```json
{
  "navigation": {
    "dashboard": "لوحة التحكم",
    "accounting": "المحاسبة",
    "inventory": "المخزون",
    "sales": "المبيعات"
  }
}
```

#### accounting (المحاسبة)
```json
{
  "accounting": {
    "journalEntries": "القيود اليومية",
    "chartOfAccounts": "دليل الحسابات",
    "trialBalance": "ميزان المراجعة",
    "balanceSheet": "الميزانية العمومية",
    "incomeStatement": "قائمة الدخل"
  }
}
```

#### errors (الأخطاء)
```json
{
  "errors": {
    "validation": {
      "required": "هذا الحقل مطلوب",
      "invalidEmail": "البريد الإلكتروني غير صحيح",
      "minLength": "يجب أن يكون على الأقل {min} أحرف"
    },
    "network": {
      "connectionFailed": "فشل الاتصال بالخادم",
      "timeout": "انتهت مهلة الاتصال"
    }
  }
}
```

---

## 📝 كيفية إضافة ترجمات جديدة

### الخطوة 1: إضافة المفتاح في ملفات الترجمة

#### في `src/i18n/locales/ar.json`:
```json
{
  "accounting": {
    "newFeature": {
      "title": "عنوان الميزة الجديدة",
      "description": "وصف الميزة الجديدة",
      "button": "زر الإجراء"
    }
  }
}
```

#### في `src/i18n/locales/en.json`:
```json
{
  "accounting": {
    "newFeature": {
      "title": "New Feature Title",
      "description": "New Feature Description",
      "button": "Action Button"
    }
  }
}
```

**⚠️ مهم:** يجب إضافة المفتاح في **جميع** ملفات اللغات:
- `ar.json` ✅
- `en.json` ✅
- `ru.json` ✅
- `uk.json` ✅
- `tr.json` ✅
- `de.json` ✅
- `pl.json` ✅
- `ro.json` ✅
- `it.json` ✅

### الخطوة 2: استخدام المفتاح في Component

```typescript
import { useLanguage } from '@/app/providers/LanguageProvider';

function NewFeature() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('accounting.newFeature.title')}</h1>
      <p>{t('accounting.newFeature.description')}</p>
      <button>{t('accounting.newFeature.button')}</button>
    </div>
  );
}
```

---

## 🎯 أمثلة عملية

### مثال 1: Component بسيط

```typescript
// ❌ خطأ
function SaveButton() {
  return <button>حفظ</button>;
}

// ✅ صحيح
function SaveButton() {
  const { t } = useLanguage();
  return <button>{t('common.save')}</button>;
}
```

### مثال 2: Component مع معاملات

```typescript
// ❌ خطأ
function WelcomeMessage({ name }: { name: string }) {
  return <div>مرحباً {name}</div>;
}

// ✅ صحيح
function WelcomeMessage({ name }: { name: string }) {
  const { t } = useLanguage();
  return <div>{t('common.welcome', { name })}</div>;
}

// في ar.json:
{
  "common": {
    "welcome": "مرحباً {name}"
  }
}
```

### مثال 3: رسائل الخطأ

```typescript
// ❌ خطأ
if (!email) {
  setError('البريد الإلكتروني مطلوب');
}

// ✅ صحيح
if (!email) {
  setError(t('errors.validation.emailRequired'));
}

// في ar.json:
{
  "errors": {
    "validation": {
      "emailRequired": "البريد الإلكتروني مطلوب"
    }
  }
}
```

### مثال 4: عناوين الصفحات

```typescript
// ❌ خطأ
<h1>القيود اليومية</h1>

// ✅ صحيح
<h1>{t('accounting.journalEntries')}</h1>
```

---

## 📚 هيكلية ملفات الترجمة

### التنظيم الموصى به

```json
{
  "app": {
    "name": "...",
    "brand": { ... }
  },
  "navigation": { ... },
  "common": { ... },
  "auth": { ... },
  "accounting": {
    "journalEntries": { ... },
    "chartOfAccounts": { ... }
  },
  "inventory": { ... },
  "sales": { ... },
  "purchases": { ... },
  "errors": {
    "validation": { ... },
    "network": { ... },
    "permission": { ... }
  },
  "messages": {
    "success": { ... },
    "warning": { ... },
    "info": { ... }
  }
}
```

---

## ✅ Checklist قبل إضافة أي Component

### قبل كتابة الكود:
- [ ] هل جميع النصوص ستستخدم `t()` function؟
- [ ] هل أضفت المفاتيح في جميع ملفات اللغات؟
- [ ] هل المفاتيح منظمة بشكل منطقي؟

### بعد كتابة الكود:
- [ ] هل جميع النصوص قابلة للترجمة؟
- [ ] هل اختبرت مع تغيير اللغة؟
- [ ] هل لا توجد نصوص ثابتة (hardcoded)؟

---

## 🔍 كيفية التحقق من الترجمة

### 1. اختبار تغيير اللغة

```typescript
// في أي Component
const { setLanguage, locale } = useLanguage();

// تغيير اللغة
setLanguage('en'); // English
setLanguage('ar'); // العربية
setLanguage('ru'); // Русский
```

### 2. التحقق من المفاتيح المفقودة

```typescript
// في Console
const { t } = useLanguage();
t('non.existing.key'); // سيظهر warning في Console
```

### 3. استخدام Translation Keys في Console

```typescript
// في أي Component
console.log('Current locale:', locale);
console.log('Translation test:', t('common.save'));
```

---

## 🚫 ما يجب تجنبه

### 1. نصوص ثابتة
```typescript
// ❌ خطأ
const title = 'القيود اليومية';
const buttonText = 'حفظ';

// ✅ صحيح
const { t } = useLanguage();
const title = t('accounting.journalEntries');
const buttonText = t('common.save');
```

### 2. استخدام locale مباشرة
```typescript
// ❌ خطأ
{locale === 'ar' ? 'حفظ' : 'Save'}

// ✅ صحيح
{t('common.save')}
```

### 3. نصوص في Comments فقط
```typescript
// ✅ صحيح - Comments يمكن أن تكون بأي لغة
// هذا Component يعرض القيود اليومية
function JournalEntries() {
  const { t } = useLanguage();
  return <h1>{t('accounting.journalEntries')}</h1>;
}
```

---

## 📖 أمثلة شاملة

### مثال: Journal Entries Component

```typescript
import { useLanguage } from '@/app/providers/LanguageProvider';
import { journalEntriesService } from '@/services/journalEntriesService';
import { useAuth } from '@/hooks/useAuth';

export default function JournalEntries() {
  const { t } = useLanguage();
  const { companyId } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    if (!companyId) {
      setError(t('errors.validation.companyRequired'));
      return;
    }

    setLoading(true);
    try {
      const data = await journalEntriesService.getAll(companyId);
      setEntries(data);
    } catch (err) {
      setError(t('errors.network.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('accounting.journalEntries.title')}</h1>
      
      {loading && <p>{t('common.loading')}</p>}
      {error && <p className="error">{error}</p>}
      
      <button onClick={loadEntries}>
        {t('common.refresh')}
      </button>
      
      {entries.length === 0 && (
        <p>{t('common.noData')}</p>
      )}
    </div>
  );
}
```

**الترجمات المطلوبة:**

```json
// ar.json
{
  "accounting": {
    "journalEntries": {
      "title": "القيود اليومية"
    }
  },
  "errors": {
    "validation": {
      "companyRequired": "يجب اختيار شركة"
    },
    "network": {
      "loadFailed": "فشل تحميل البيانات"
    }
  }
}

// en.json
{
  "accounting": {
    "journalEntries": {
      "title": "Journal Entries"
    }
  },
  "errors": {
    "validation": {
      "companyRequired": "Company is required"
    },
    "network": {
      "loadFailed": "Failed to load data"
    }
  }
}
```

---

## 🎨 Brand & Logo Translations

### الشعار: TexaCore

**الترجمات موجودة في:**
```json
{
  "app": {
    "brand": {
      "name": "TexaCore",
      "slogan": "جودة تستحق الثقة", // أو "Quality You Can Trust"
      "fullName": "TexaCore - نظام إدارة موارد المؤسسات"
    }
  }
}
```

**الاستخدام:**
```typescript
const { t } = useLanguage();
const brandName = t('app.brand.name'); // "TexaCore"
const slogan = t('app.brand.slogan'); // "جودة تستحق الثقة"
```

---

## 🔄 إضافة لغة جديدة

### الخطوة 1: إنشاء ملف الترجمة

```bash
# إنشاء ملف جديد
src/i18n/locales/fr.json  # للفرنسية
```

### الخطوة 2: نسخ الهيكلية من `en.json`

```json
{
  "app": {
    "name": "Système de planification des ressources d'entreprise",
    "shortName": "Système ERP",
    "version": "1.0.0",
    "brand": {
      "name": "TexaCore",
      "slogan": "Qualité à laquelle vous pouvez faire confiance",
      "fullName": "TexaCore - Système de planification des ressources d'entreprise"
    }
  },
  // ... باقي الترجمات
}
```

### الخطوة 3: إضافة اللغة في `src/i18n/config.ts`

```typescript
export const SUPPORTED_LANGUAGES = [
  // ... اللغات الموجودة
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
];
```

---

## ✅ قائمة التحقق النهائية

### لكل Component جديد:
- [ ] جميع النصوص تستخدم `t()`
- [ ] لا توجد نصوص ثابتة (hardcoded)
- [ ] المفاتيح موجودة في جميع ملفات اللغات
- [ ] تم اختبار تغيير اللغة
- [ ] الترجمات صحيحة وواضحة

### لكل Feature جديد:
- [ ] جميع النصوص قابلة للترجمة
- [ ] رسائل الخطأ قابلة للترجمة
- [ ] رسائل النجاح قابلة للترجمة
- [ ] العناوين والأوصاف قابلة للترجمة

---

## 🎯 الخلاصة

**القاعدة الذهبية:**
> **لا تضع أي نص مباشر في Component - استخدم `t()` دائماً**

**قبل كتابة أي Component:**
1. فكر في جميع النصوص التي ستستخدمها
2. أضف المفاتيح في جميع ملفات اللغات
3. استخدم `t()` في Component

**هذا يضمن:**
- ✅ دعم كامل لتعدد اللغات
- ✅ سهولة الصيانة
- ✅ تجربة مستخدم متسقة

---

**⚠️ تذكر: أي نص بدون `t()` = خطأ يجب إصلاحه!**
