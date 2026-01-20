# القواعد الإلزامية للتطوير - Mandatory Development Rules
# ⚠️ يجب الالتزام بهذه القواعد في جميع التطويرات بدون استثناء

---

## 🚫 القاعدة الإلزامية الأولى: الترجمة (Translation)

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

### 📋 Checklist إلزامي:

- [ ] **هل استوردت `useLanguage` hook؟**
- [ ] **هل استخدمت `t()` لكل نص؟**
- [ ] **هل أضفت المفاتيح في جميع ملفات اللغات (9 ملفات)؟**
- [ ] **هل لا توجد نصوص ثابتة (hardcoded)؟**
- [ ] **هل اختبرت مع تغيير اللغة؟**

---

## 🚫 القاعدة الإلزامية الثانية: Services

### ❌ ممنوع تماماً:

```typescript
// ❌ خطأ - استخدام Supabase مباشرة
const { data } = await supabase
  .from('journal_entries')
  .select('*')
  .eq('company_id', companyId);
```

### ✅ صحيح دائماً:

```typescript
// ✅ صحيح - استخدام Services
import { journalEntriesService } from '@/services/journalEntriesService';
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { companyId } = useAuth();
  
  const loadEntries = async () => {
    const entries = await journalEntriesService.getAll(companyId);
  };
}
```

### 📋 Checklist إلزامي:

- [ ] **هل استوردت Service المطلوب؟**
- [ ] **هل استخدمت Service بدلاً من Supabase مباشرة؟**
- [ ] **هل Service يتعامل مع tenant_id تلقائياً؟**

---

## 🚫 القاعدة الإلزامية الثالثة: Authentication

### ❌ ممنوع تماماً:

```typescript
// ❌ خطأ - استخدام localStorage مباشرة
const tenantId = localStorage.getItem('tenant_id');
const companyId = localStorage.getItem('company_id');
```

### ✅ صحيح دائماً:

```typescript
// ✅ صحيح - استخدام useAuth hook
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { tenantId, companyId, isSuperAdmin, authUser } = useAuth();
  
  if (!companyId) {
    return <div>No company selected</div>;
  }
  
  // استخدام tenantId و companyId
}
```

### 📋 Checklist إلزامي:

- [ ] **هل استوردت `useAuth` hook؟**
- [ ] **هل استخدمت `tenantId` و `companyId` من hook؟**
- [ ] **هل لا تستخدم localStorage مباشرة؟**

---

## 🚫 القاعدة الإلزامية الرابعة: Error Handling

### ❌ ممنوع تماماً:

```typescript
// ❌ خطأ - بدون error handling
const entries = await journalEntriesService.getAll(companyId);
```

### ✅ صحيح دائماً:

```typescript
// ✅ صحيح - مع error handling وترجمة
const { t } = useLanguage();
const [error, setError] = useState<string | null>(null);

try {
  const entries = await journalEntriesService.getAll(companyId);
  setEntries(entries);
} catch (err) {
  console.error('Error:', err);
  setError(t('errors.network.loadFailed'));
}
```

### 📋 Checklist إلزامي:

- [ ] **هل استخدمت try/catch؟**
- [ ] **هل استخدمت `t()` لرسائل الخطأ؟**
- [ ] **هل عرضت رسالة خطأ للمستخدم؟**

---

## 📝 خطوات إضافة ترجمات جديدة (إلزامي)

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

// ... باقي اللغات (7 ملفات أخرى)
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

## ✅ Template Component (نموذج)

```typescript
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { serviceName } from '@/services/serviceName';

export default function FeatureComponent() {
  // 1. الترجمة (إلزامي)
  const { t } = useLanguage();
  
  // 2. Authentication (إلزامي)
  const { companyId, tenantId } = useAuth();
  
  // 3. State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 4. Load Data (مع error handling)
  const loadData = async () => {
    if (!companyId) {
      setError(t('errors.validation.companyRequired'));
      return;
    }
    
    setLoading(true);
    try {
      const result = await serviceName.getAll(companyId);
      setData(result);
    } catch (err) {
      console.error('Error:', err);
      setError(t('errors.network.loadFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, [companyId]);
  
  // 5. Render (جميع النصوص تستخدم t())
  return (
    <div>
      <h1>{t('feature.title')}</h1>
      
      {loading && <p>{t('common.loading')}</p>}
      {error && <p className="error">{error}</p>}
      
      {data.length === 0 && !loading && (
        <p>{t('common.noData')}</p>
      )}
      
      <button onClick={loadData}>
        {t('common.refresh')}
      </button>
    </div>
  );
}
```

---

## 🔍 كيفية التحقق من الالتزام

### 1. البحث عن نصوص ثابتة

```bash
# في Terminal - البحث عن نصوص عربية
grep -r ">[^<]*[أ-ي]" src/features/

# البحث عن نصوص إنجليزية
grep -r ">[^<]*[A-Za-z]" src/features/
```

### 2. التحقق من استخدام t()

```bash
# البحث عن Components بدون useLanguage
grep -r "useLanguage" src/features/ --include="*.tsx"
```

### 3. اختبار تغيير اللغة

```typescript
// في أي Component
const { setLanguage } = useLanguage();

// تغيير اللغة واختبار
setLanguage('en');
setLanguage('ar');
setLanguage('ru');
```

---

## 📚 المراجع الإلزامية

**قبل أي تطوير، اقرأ:**

1. `PROJECT_CONSTITUTION.md` ⚠️ **دستور المشروع**
2. `TRANSLATION_GUIDELINES.md` ⚠️ **دليل الترجمة الشامل**
3. `DEVELOPMENT_RULES.md` ⚠️ **قواعد التطوير**
4. `MANDATORY_RULES.md` ⚠️ **هذا الملف**

---

## ⚠️ تذكر دائماً

### القاعدة الذهبية:
> **لا تضع أي نص مباشر في Component - استخدم `t()` دائماً**

### قبل أي تطوير:
1. فكر في جميع النصوص
2. أضف المفاتيح في جميع ملفات اللغات (9 ملفات)
3. استخدم `t()` في Component
4. اختبر مع تغيير اللغة

### هذا يضمن:
- ✅ دعم كامل لتعدد اللغات
- ✅ سهولة الصيانة
- ✅ تجربة مستخدم متسقة
- ✅ جودة عالية في الكود

---

## 🚨 عقوبات عدم الالتزام

**إذا لم تلتزم بالقواعد:**
- ❌ الكود سيتم رفضه
- ❌ يجب إعادة كتابته
- ❌ سيتم إضافة النصوص المفقودة في جميع اللغات

**الالتزام إلزامي 100% - لا استثناءات!**

---

**⚠️ أي نص بدون `t()` = خطأ يجب إصلاحه فوراً!**

**⚠️ أي استعلام بدون Service = خطأ يجب إصلاحه فوراً!**

**⚠️ أي استخدام لـ localStorage مباشرة = خطأ يجب إصلاحه فوراً!**

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
