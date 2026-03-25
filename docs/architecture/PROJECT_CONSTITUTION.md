# 📜 دستور المشروع - Project Constitution
# TexaCore ERP System v2.0

> **⚠️ هذا الملف يحتوي على القواعد الإلزامية فقط**  
> **📖 للمرجع الشامل راجع:** `docs/COMPLETE_REFERENCE_GUIDE.md`

---

## 🎯 معلومات المشروع

| الخاصية | القيمة |
|---------|--------|
| **الاسم** | TexaCore ERP System |
| **الشعار** | TexaCore - جودة تستحق الثقة |
| **الإصدار** | 2.0.0 |
| **النوع** | SaaS Multi-Tenant ERP System |
| **التقنيات** | React + TypeScript + Vite + Supabase |

---

## ⚠️ القواعد الأربع الإلزامية

### 1️⃣ الترجمة (Translation) - إلزامي 100%

```typescript
// ❌ ممنوع - نص ثابت
<button>حفظ</button>

// ✅ صحيح - استخدام t()
import { useLanguage } from '@/app/providers/LanguageProvider';
const { t } = useLanguage();
<button>{t('common.save')}</button>
```

**📋 Checklist:**
- [ ] استخدم `t()` لكل نص
- [ ] أضف المفاتيح في 9 ملفات ترجمة
- [ ] اختبر مع تغيير اللغة

---

### 2️⃣ Services - إلزامي 100%

```typescript
// ❌ ممنوع - Supabase مباشرة
const { data } = await supabase.from('table').select('*');

// ✅ صحيح - استخدام Services
import { journalEntriesService } from '@/services/journalEntriesService';
const entries = await journalEntriesService.getAll(companyId);
```

---

### 3️⃣ Authentication - إلزامي 100%

```typescript
// ❌ ممنوع - localStorage مباشرة
const tenantId = localStorage.getItem('tenant_id');

// ✅ صحيح - استخدام useAuth
import { useAuth } from '@/hooks/useAuth';
const { tenantId, companyId, isSuperAdmin } = useAuth();
```

---

### 4️⃣ Error Handling - إلزامي 100%

```typescript
// ✅ صحيح - مع try/catch وترجمة
const { t } = useLanguage();
try {
  const data = await service.getAll(companyId);
} catch (error) {
  console.error('Error:', error);
  setError(t('errors.network.loadFailed'));
}
```

---

### 5️⃣ Performance (الأداء) - إلزامي 100%

#### 5.1 نمط "Keep Visited Mounted" للتبويبات الرئيسية

> **⚠️ إلزامي لكل أقسام التطبيق (محاسبة، مستودعات، مبيعات، مشتريات)**

```typescript
// ⚡ "Keep Visited Mounted" — النمط المعتمد الوحيد للتبويبات
// التاب يُحمّل أول مرة فقط عند زيارته، ثم يبقى mounted في الـ DOM

const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set([getActiveTab()])
);

// عند تغيير التاب — سجّله كمزور
const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        return new Set(prev).add(tabId);
    });
    navigate(path, { replace: true });
};

// في الـ render — فقط التابات المُزارة تعمل mount
{tabs.map((tab) => {
    if (!visitedTabs.has(tab.id)) return null; // ← لم يُزَر بعد = لا mount

    return (
        <div
            key={tab.id}
            className={activeTab === tab.id ? 'block' : 'hidden'}
            style={{
                contain: activeTab === tab.id ? 'none' : 'strict',
                contentVisibility: activeTab === tab.id ? 'visible' : 'hidden',
            }}
        >
            <TabComponent />
        </div>
    );
})}
```

```typescript
// ❌ ممنوع — switch/case + lazy (يسبب flicker و re-mount)
const renderContent = () => {
    switch (activeTab) {
        case 'tab1': return <Tab1 />;
        case 'tab2': return <Tab2 />;
    }
};
<Suspense fallback={<Loader />}>{renderContent()}</Suspense>

// ❌ ممنوع — mount الكل بدون visitedTabs (يُطلق كل الاستعلامات فوراً)
{tabs.map((tab) => (
    <div className={isActive ? 'block' : 'hidden'}>
        <TabComponent />  {/* ← الكل يعمل mount معاً! */}
    </div>
))}
```

#### 5.2 الوصول لبيانات المستخدم — `useAuth()` فقط

```typescript
// ❌ ممنوع — supabase.auth.getUser() (network call بطيء: 2-5 ثوانٍ)
const { data: { user } } = await supabase.auth.getUser();
const tenantId = user?.user_metadata?.tenant_id;

// ✅ صحيح — useAuth() (فوري من الكاش: 0ms)
const { user, tenantId, companyId } = useAuth();
```

> **ملاحظة:** `supabase.auth.getUser()` يقوم بـ network call كل مرة!
> `useAuth()` يقرأ من session المحفوظة في localStorage — فوري تماماً.

#### 5.3 React Query — سياسة الكاش

```typescript
// ✅ كل useQuery يجب أن يحتوي على staleTime
const query = useQuery({
    queryKey: ['module', 'entity', companyId],
    queryFn: () => service.getAll(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,  // ← إلزامي! (0 = refetch كل مرة)
    gcTime: 30 * 60 * 1000,    // ← يحافظ على البيانات بعد unmount
});
```

| نوع البيانات | staleTime | أمثلة |
|---|---|---|
| ثابتة | `Infinity` | branches, company settings |
| شبه ثابتة | `10 min` | warehouses, materials, accounts |
| ديناميكية | `2 min` | movements, transactions |
| حيّة | `1 min` | dashboard stats |

#### 5.4 Realtime — قواعد الاشتراك

```typescript
// ✅ صحيح — اشتراك واحد لكل جدول
useRealtimeInvalidation({
    table: 'table_name',
    companyId,
    queryKeys: [['module', 'entity', companyId]],
});

// ❌ ممنوع — اشتراكين على نفس الجدول في نفس الصفحة
```

**📋 قواعد الأداء الشاملة:**
- [ ] استخدم `visitedTabs` pattern لكل صفحة رئيسية
- [ ] لا تستخدم `supabase.auth.getUser()` — استخدم `useAuth()`
- [ ] كل `useQuery` يحتوي على `staleTime` (default 0 = بطيء!)
- [ ] لا تستخدم `Lazy/Suspense` للتبويبات الداخلية
- [ ] استخدم `contain: strict` و `contentVisibility: hidden` للتابات المخفية
- [ ] وحّد `queryKey` للبيانات المشتركة (مثل `dashboard-stats`)
- [ ] استخدم `select('col1, col2')` بدل `select('*')` قدر الإمكان
- [ ] استخدم `useMemo` و `useCallback` لمنع re-renders

---

### 6️⃣ Typography (الخطوط) - إلزامي 100%

```css
/* العناوين الرئيسية */
.heading { font-family: Cairo; font-weight: 700; }

/* المحتوى والنصوص */
.content { font-family: Tajawal; }

/* الأرقام والأكواد */
.numbers { font-family: monospace; }

/* التسميات الصغيرة */
.labels { font-size: 12px; /* text-xs */ }
```

**📋 معايير الخطوط:**

| العنصر | الخط | الـ class |
|--------|------|-----------|
| العناوين | Cairo | `font-cairo font-bold` |
| المحتوى | Tajawal | `font-tajawal` |
| الأرقام | Mono | `font-mono` |
| التسميات | - | `text-xs text-muted-foreground` |
| المبالغ | Mono + Color | `font-mono font-bold text-erp-teal` |

## 🌍 اللغات المدعومة (9 لغات)

| اللغة | الكود | الملف |
|-------|-------|-------|
| العربية | ar | `ar.json` |
| English | en | `en.json` |
| Русский | ru | `ru.json` |
| Українська | uk | `uk.json` |
| Türkçe | tr | `tr.json` |
| Deutsch | de | `de.json` |
| Polski | pl | `pl.json` |
| Română | ro | `ro.json` |
| Italiano | it | `it.json` |

**📁 الموقع:** `src/i18n/locales/`

---

## 🏢 هيكلية Multi-Tenant

```
Super Admin (feras1960@gmail.com)
    └── يتحكم في: /saas (جميع المشتركين)

Tenants (المشتركين)
    └── كل tenant له شركاته الخاصة

Companies (الشركات)
    └── كل شركة لها بياناتها المعزولة

Users (المستخدمين)
    └── كل مستخدم مرتبط بشركة وtenant
```

---

## 📁 هيكل المشروع

```
src/
├── app/              # Providers
├── components/       # Components
├── features/         # Feature Modules
├── hooks/            # Custom Hooks
├── services/         # API Services
├── lib/              # Utilities
└── i18n/             # Translations

docs/
└── COMPLETE_REFERENCE_GUIDE.md  # 📖 المرجع الشامل

supabase/
└── migrations/       # Database Migrations
```

---

## 📖 المراجع

| الملف | المحتوى |
|-------|---------|
| `docs/COMPLETE_REFERENCE_GUIDE.md` | **المرجع الشامل** - 13 قسم |
| `README.md` | تعليمات التثبيت والتشغيل |
| `.cursorrules` | قواعد التصميم للـ AI |

---

## ✅ Template Component

```typescript
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { serviceName } from '@/services/serviceName';

export default function MyComponent() {
  const { t } = useLanguage();
  const { companyId } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const result = await serviceName.getAll(companyId);
      setData(result);
    } catch (err) {
      setError(t('errors.network.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [companyId]);

  return (
    <div>
      <h1>{t('feature.title')}</h1>
      {loading && <p>{t('common.loading')}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## 🚨 تذكر دائماً

| ❌ الخطأ | ✅ الصحيح |
|---------|----------|
| نص ثابت | `t('key')` |
| Supabase مباشرة | Services |
| localStorage | `useAuth` |
| بدون try/catch | مع Error Handling |

---

**📖 للتفاصيل الكاملة:** راجع `docs/COMPLETE_REFERENCE_GUIDE.md`

---

**آخر تحديث:** فبراير 2026  
**الإصدار:** 2.1.0 — إضافة نمط التحميل الموحد ومعايير الأداء
