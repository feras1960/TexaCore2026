# قواعد التطوير الإلزامية - Mandatory Development Rules
# ⚠️ يجب الالتزام بهذه القواعد في جميع التطويرات

---

## 🚫 القاعدة الأولى: لا نصوص ثابتة (NO HARDCODED TEXT)

### ❌ ممنوع تماماً:

```typescript
// ❌ خطأ - نص ثابت بالعربية
<button>حفظ</button>
<div>إجمالي المبيعات</div>
<h1>لوحة التحكم</h1>

// ❌ خطأ - نص ثابت بالإنجليزية
<button>Save</button>
<div>Total Sales</div>

// ❌ خطأ - نص ثابت في متغير
const title = 'القيود اليومية';
const errorMessage = 'حدث خطأ';
```

### ✅ صحيح دائماً:

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

// ✅ صحيح - في متغير
const { t } = useLanguage();
const title = t('accounting.journalEntries');
const errorMessage = t('errors.general');
```

---

## 📋 Checklist إلزامي قبل أي تطوير

### قبل كتابة أي Component:

- [ ] **هل فكرت في جميع النصوص التي سأستخدمها؟**
- [ ] **هل أضفت المفاتيح في جميع ملفات اللغات (9 ملفات)؟**
- [ ] **هل المفاتيح منظمة بشكل منطقي (category.subcategory.key)؟**

### أثناء كتابة Component:

- [ ] **هل استوردت `useLanguage` hook؟**
- [ ] **هل استخدمت `t()` لكل نص؟**
- [ ] **هل لا توجد نصوص ثابتة (hardcoded)؟**

### بعد كتابة Component:

- [ ] **هل اختبرت مع تغيير اللغة؟**
- [ ] **هل جميع النصوص تظهر بشكل صحيح؟**
- [ ] **هل لا توجد warnings في Console عن مفاتيح مفقودة؟**

---

## 🔑 هيكلية مفاتيح الترجمة

### التسمية (Naming Convention)

```
category.subcategory.key
```

**أمثلة:**
```
common.save                    → عمليات عامة
navigation.dashboard          → التنقل
accounting.journalEntries     → المحاسبة
inventory.products            → المخزون
errors.validation.required    → الأخطاء
messages.success.created      → رسائل النجاح
```

### الفئات الرئيسية

#### 1. common (عمليات عامة)
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

#### 2. navigation (التنقل)
```json
{
  "navigation": {
    "dashboard": "لوحة التحكم",
    "accounting": "المحاسبة",
    "inventory": "المخزون",
    "sales": "المبيعات",
    "purchases": "المشتريات"
  }
}
```

#### 3. accounting (المحاسبة)
```json
{
  "accounting": {
    "journalEntries": {
      "title": "القيود اليومية",
      "create": "إنشاء قيد جديد",
      "post": "ترحيل القيد"
    },
    "chartOfAccounts": {
      "title": "دليل الحسابات"
    }
  }
}
```

#### 4. errors (الأخطاء)
```json
{
  "errors": {
    "validation": {
      "required": "هذا الحقل مطلوب",
      "invalidEmail": "البريد الإلكتروني غير صحيح"
    },
    "network": {
      "connectionFailed": "فشل الاتصال بالخادم"
    }
  }
}
```

---

## 📝 خطوات إضافة ترجمات جديدة

### الخطوة 1: إضافة المفتاح في جميع ملفات اللغات

**يجب إضافة المفتاح في 9 ملفات:**
1. `src/i18n/locales/ar.json` ✅
2. `src/i18n/locales/en.json` ✅
3. `src/i18n/locales/ru.json` ✅
4. `src/i18n/locales/uk.json` ✅
5. `src/i18n/locales/tr.json` ✅
6. `src/i18n/locales/de.json` ✅
7. `src/i18n/locales/pl.json` ✅
8. `src/i18n/locales/ro.json` ✅
9. `src/i18n/locales/it.json` ✅

**مثال:**

```json
// ar.json
{
  "accounting": {
    "newFeature": {
      "title": "عنوان الميزة الجديدة",
      "description": "وصف الميزة الجديدة"
    }
  }
}

// en.json
{
  "accounting": {
    "newFeature": {
      "title": "New Feature Title",
      "description": "New Feature Description"
    }
  }
}

// ... باقي اللغات
```

### الخطوة 2: استخدام المفتاح في Component

```typescript
import { useLanguage } from '@/app/providers/LanguageProvider';

function NewFeature() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('accounting.newFeature.title')}</h1>
      <p>{t('accounting.newFeature.description')}</p>
    </div>
  );
}
```

---

## 🎯 أمثلة عملية

### مثال 1: Button Component

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
const { t } = useLanguage();
if (!email) {
  setError(t('errors.validation.emailRequired'));
}
```

### مثال 4: عناوين الصفحات

```typescript
// ❌ خطأ
<h1>القيود اليومية</h1>

// ✅ صحيح
const { t } = useLanguage();
<h1>{t('accounting.journalEntries.title')}</h1>
```

---

## ✅ قواعد إضافية

### 1. استخدام Services دائماً

```typescript
// ✅ صحيح
import { journalEntriesService } from '@/services/journalEntriesService';
const entries = await journalEntriesService.getAll(companyId);

// ❌ خطأ
const { data } = await supabase.from('journal_entries').select('*');
```

### 2. استخدام useAuth دائماً

```typescript
// ✅ صحيح
const { tenantId, companyId, isSuperAdmin } = useAuth();

// ❌ خطأ
const tenantId = localStorage.getItem('tenant_id');
```

### 3. Error Handling دائماً

```typescript
// ✅ صحيح
try {
  const data = await service.getAll(companyId);
} catch (error) {
  console.error('Error:', error);
  setError(t('errors.network.loadFailed'));
}

// ❌ خطأ
const data = await service.getAll(companyId); // بدون try/catch
```

---

## 🔍 كيفية التحقق

### 1. اختبار تغيير اللغة

```typescript
const { setLanguage } = useLanguage();

// في Console أو Component
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

### 3. البحث عن نصوص ثابتة

```bash
# في Terminal
grep -r ">[^<]*[أ-ي]" src/features/  # البحث عن نصوص عربية
grep -r ">[^<]*[A-Za-z]" src/features/  # البحث عن نصوص إنجليزية
```

---

## 📚 المراجع

- `TRANSLATION_GUIDELINES.md` - دليل شامل للترجمة
- `PROJECT_CONSTITUTION.md` - دستور المشروع
- `FRONTEND_INTEGRATION_GUIDE.md` - دليل ربط Frontend

---

## ⚠️ تذكر دائماً

**القاعدة الذهبية:**
> **لا تضع أي نص مباشر في Component - استخدم `t()` دائماً**

**قبل أي تطوير:**
1. فكر في جميع النصوص
2. أضف المفاتيح في جميع ملفات اللغات
3. استخدم `t()` في Component

**هذا يضمن:**
- ✅ دعم كامل لتعدد اللغات
- ✅ سهولة الصيانة
- ✅ تجربة مستخدم متسقة

---

**⚠️ أي نص بدون `t()` = خطأ يجب إصلاحه فوراً!**
