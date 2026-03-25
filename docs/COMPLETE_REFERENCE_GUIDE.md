# 📖 المرجع الشامل لنظام TexaCore ERP
# Complete Reference Guide - TexaCore ERP System

> **آخر تحديث:** يناير 2026  
> **الإصدار:** 2.0.0  
> **المؤلف:** فريق التطوير

---

# 📋 جدول المحتويات

1. [نظرة عامة على النظام](#-القسم-1-نظرة-عامة-على-النظام)
2. [هيكلية Multi-Tenant SaaS](#-القسم-2-هيكلية-multi-tenant-saas)
3. [الأدوار والصلاحيات](#-القسم-3-الأدوار-والصلاحيات)
4. [تدفق التسجيل](#-القسم-4-تدفق-التسجيل)
5. [إعداد Platform Owner](#-القسم-5-إعداد-platform-owner)
6. [قاعدة البيانات](#-القسم-6-قاعدة-البيانات)
7. [قواعد التطوير الإلزامية](#-القسم-7-قواعد-التطوير-الإلزامية)
8. [نظام الترجمة](#-القسم-8-نظام-الترجمة)
9. [الخدمات والـ Services](#-القسم-9-الخدمات-والـ-services)
10. [نظام التحكم في الموديولات والميزات](#-القسم-10-نظام-التحكم-في-الموديولات-والميزات)
11. [خطة التطوير](#-القسم-11-خطة-التطوير)
12. [استكشاف الأخطاء](#-القسم-12-استكشاف-الأخطاء)
13. [الملفات المهمة](#-القسم-13-الملفات-المهمة)
14. [دليل الصيانة](#-القسم-14-دليل-الصيانة)

---

# 🎯 القسم 1: نظرة عامة على النظام

## معلومات المشروع

| الخاصية | القيمة |
|---------|--------|
| **الاسم** | TexaCore ERP System |
| **الشعار** | TexaCore - جودة تستحق الثقة |
| **الإصدار** | 2.0.0 |
| **النوع** | SaaS Multi-Tenant ERP System |
| **التقنيات** | React + TypeScript + Vite + Supabase |

## المميزات الرئيسية

- ✅ **Multi-Tenant Architecture** - كل مشترك له Tenant خاص
- ✅ **Accounting Module** - المحاسبة الكاملة
- ✅ **SaaS Management System** - إدارة المشتركين
- ✅ **Agent/Reseller System** - نظام الوكلاء
- ✅ **White Label System** - تخصيص العلامة التجارية
- ✅ **Multi-language Support** - 9 لغات مدعومة
- ✅ **Dark Mode** - الوضع الليلي
- ✅ **Responsive Design** - تصميم متجاوب

## اللغات المدعومة

| اللغة | الكود | الاتجاه |
|-------|-------|---------|
| العربية | ar | RTL |
| English | en | LTR |
| Русский | ru | LTR |
| Українська | uk | LTR |
| Türkçe | tr | LTR |
| Deutsch | de | LTR |
| Polski | pl | LTR |
| Română | ro | LTR |
| Italiano | it | LTR |

## هيكل المشروع

```
src/
├── app/              # App providers and configuration
├── components/       # Shared components
│   ├── common/      # Logo, ErrorBoundary
│   ├── layout/      # Header, Sidebar, MainLayout
│   ├── shared/      # Shared Components
│   └── ui/          # Base UI Components (shadcn)
├── features/         # Feature modules
│   ├── accounting/   # المحاسبة
│   ├── inventory/    # المخزون
│   ├── sales/        # المبيعات
│   ├── saas/         # إدارة SaaS
│   └── auth/         # Authentication
├── hooks/            # Custom React hooks
├── services/         # API Services
├── lib/              # Utilities & Supabase Client
├── i18n/             # Translations (9 languages)
└── types/            # TypeScript Types
```

---

# 🏢 القسم 2: هيكلية Multi-Tenant SaaS

## المفهوم الأساسي

**قاعدة بيانات واحدة مشتركة (Shared Database)** - لا ننشئ قاعدة بيانات جديدة لكل مشترك!

```
┌─────────────────────────────────────┐
│  قاعدة بيانات واحدة (Supabase)     │
│  Shared Database                    │
├─────────────────────────────────────┤
│  Tenant 1 (tenant_id)               │
│  ├── Company A                      │
│  └── Company B                      │
│                                     │
│  Tenant 2 (tenant_id)               │
│  ├── Company X                      │
│  └── Company Y                      │
│                                     │
│  Tenant 3 (tenant_id)               │
│  └── Company Z                      │
└─────────────────────────────────────┘

→ تحديث واحد يطبق على الجميع ✅
```

## هيكلية المستويات

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         🔝 المستوى الأعلى: Super Admin                      │
│                                                                             │
│    👤 feras1960@gmail.com                                                   │
│    ├── صلاحية: is_super_admin = true                                        │
│    ├── يرى: جميع المشتركين والبيانات                                         │
│    ├── يتحكم في: لوحة SaaS (/saas)                                          │
│    └── مرتبط بـ: NexRev Platform (لإدارة أعماله)                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         🏢 المستوى الثاني: Tenants                          │
│                                                                             │
│    ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐ │
│    │ 🔹 NexRev Platform  │   │ 🔸 Tenant A        │   │ 🔸 Tenant B     │ │
│    │   (Platform Owner)  │   │   (مشترك عادي)     │   │   (مشترك عادي)  │ │
│    │                     │   │                     │   │                 │ │
│    │ • Next Revolution   │   │ • شركة 1           │   │ • شركة 1        │ │
│    │ • (شركات أخرى)      │   │ • شركة 2           │   │                 │ │
│    └─────────────────────┘   └─────────────────────┘   └─────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         📊 المستوى الثالث: Companies                        │
│                                                                             │
│    كل Tenant يمكنه إنشاء عدة شركات، كل شركة تحتوي على:                       │
│    • المحاسبة (دفتر الأستاذ، القيود، الحسابات)                               │
│    • العملاء والموردين                                                       │
│    • المخزون والمنتجات                                                       │
│    • الفواتير والمدفوعات                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         👥 المستوى الرابع: Users                            │
│                                                                             │
│    كل شركة يمكن أن يكون لها عدة مستخدمين بأدوار مختلفة                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## العزل والأمان

### Row Level Security (RLS)

```sql
-- Supabase يطبق RLS تلقائياً
-- المستخدم يرى فقط بيانات tenant الخاص به
CREATE POLICY "Users see their tenant data"
ON customers
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM companies 
        WHERE id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
);
```

### العزل المزدوج

كل جدول رئيسي يحتوي على:
```sql
tenant_id UUID NOT NULL REFERENCES tenants(id)
company_id UUID NOT NULL REFERENCES companies(id)
```

---

# 🔐 القسم 3: الأدوار والصلاحيات

## 1. Super Admin (مدير النظام)

| الخاصية | القيمة |
|---------|--------|
| **التعريف** | `is_super_admin = true` في `user_metadata` |
| **المكان** | `auth.users.raw_user_meta_data` |
| **الصلاحيات** | كل شيء - يرى جميع البيانات |
| **الوصول** | `/saas/*` + جميع الصفحات |

```sql
-- التحقق من Super Admin
SELECT raw_user_meta_data->>'is_super_admin' FROM auth.users WHERE email = 'xxx';
```

## 2. Tenant Admin (مدير المشترك)

| الخاصية | القيمة |
|---------|--------|
| **التعريف** | `role = 'admin'` في `user_profiles` |
| **الصلاحيات** | إدارة Tenant الخاص به وشركاته |
| **الوصول** | `/dashboard/*` + صفحات الإدارة |

## 3. Company User (مستخدم الشركة)

| الخاصية | القيمة |
|---------|--------|
| **التعريف** | مرتبط بـ `company_id` في `user_profiles` |
| **الصلاحيات** | حسب الدور المحدد |
| **الأدوار** | Admin, Accountant, Salesperson, Viewer |

---

# 🔄 القسم 4: تدفق التسجيل

## خطوات التسجيل

```
┌─────────────────────────────────────────────────────────────────┐
│                    تدفق تسجيل مشترك جديد                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ المستخدم يملأ نموذج التسجيل                                │
│      ↓                                                          │
│  2️⃣ supabase.auth.signUp() → إنشاء حساب في Auth                │
│      ↓                                                          │
│  3️⃣ استدعاء register_new_subscriber()                          │
│      │                                                          │
│      ├── 3a. assign_available_tenant()                          │
│      │       • البحث عن tenant بحالة 'available'                │
│      │       • تحويله إلى 'active'                              │
│      │       • تحديث بيانات المشترك                             │
│      │                                                          │
│      ├── 3b. create_default_company_for_tenant()                │
│      │       • إنشاء شركة افتراضية                              │
│      │       • ربطها بالـ tenant                                │
│      │                                                          │
│      └── 3c. إنشاء/تحديث user_profile                           │
│              • ربط المستخدم بالـ tenant و company               │
│              • تعيين role = 'admin'                             │
│      ↓                                                          │
│  4️⃣ النتيجة: مشترك جديد جاهز للعمل!                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## الدوال المستخدمة

| الدالة | الوظيفة | الملف |
|--------|---------|-------|
| `register_new_subscriber()` | الدالة الرئيسية للتسجيل | STEP_28 |
| `assign_available_tenant()` | تخصيص tenant للمشترك | STEP_28 |
| `create_default_company_for_tenant()` | إنشاء شركة | STEP_28 |

## حالات Tenant

| الحالة | الوصف |
|--------|-------|
| `available` | جاهز للتخصيص لمشترك جديد |
| `active` | مستخدم حالياً |
| `inactive` | معطل مؤقتاً |
| `suspended` | موقوف |
| `expired` | منتهي الصلاحية |

---

# 🏠 القسم 5: إعداد Platform Owner

## المعلومات الحالية

| العنصر | القيمة |
|--------|--------|
| **Super Admin Email** | `feras1960@gmail.com` |
| **Tenant Code** | `nexrev-platform` |
| **Tenant Name** | `NexRev Platform` |
| **Company Code** | `NEXREV-001` |
| **Company Name** | `نيكست ريفوليوشن` / `Next Revolution` |

## الصلاحيات

```
👤 feras1960@gmail.com
│
├── 🔑 Super Admin
│   └── يتحكم في: /saas (جميع المشتركين)
│
└── 🏢 NexRev Platform (Tenant)
    └── 📊 Next Revolution (Company)
        ├── المحاسبة
        ├── العملاء
        ├── الفواتير
        ├── المخزون
        └── مراكز التكلفة:
            • TexaCore
            • FinCore
            • General
```

## كيفية الوصول

| المسار | الغرض |
|--------|-------|
| `/saas` | لوحة التحكم بالمشتركين |
| `/saas/subscribers` | إدارة المشتركين |
| `/saas/packages` | إدارة الباقات |
| `/dashboard` | لوحة شركتك |
| `/accounting/*` | المحاسبة |

---

# 🗄️ القسم 6: قاعدة البيانات

## الجداول الرئيسية

### هيكلية العلاقات

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    tenants      │────<│   companies     │────<│  user_profiles  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ code (UNIQUE)   │     │ tenant_id (FK)  │     │ tenant_id (FK)  │
│ name            │     │ code            │     │ company_id (FK) │
│ email           │     │ name            │     │ email           │
│ status          │     │ name_en         │     │ full_name       │
│ settings (JSON) │     │ default_currency│     │ role            │
│ created_at      │     │ ...             │     │ ...             │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### جداول المحاسبة

| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|-----------------|
| `chart_of_accounts` | شجرة الحسابات | 35 حقل، 9 لغات |
| `journal_entries` | القيود المحاسبية | entry_number, entry_date, status |
| `journal_entry_lines` | سطور القيود | account_id, debit, credit |
| `fiscal_years` | السنوات المالية | start_date, end_date |
| `accounting_periods` | الفترات المحاسبية | period_number, status |
| `cost_centers` | مراكز التكلفة | code, name |
| `cash_accounts` | حسابات الصندوق | account_id, balance |
| `cash_transactions` | حركات الصندوق | amount, type |

### جداول العملاء والموردين

| الجدول | الوصف |
|--------|-------|
| `customers` | العملاء (9 لغات) |
| `customer_addresses` | عناوين العملاء |
| `suppliers` | الموردين (9 لغات) |
| `supplier_contacts` | جهات اتصال الموردين |

### جداول المخزون

| الجدول | الوصف |
|--------|-------|
| `warehouses` | المستودعات |
| `warehouse_locations` | مواقع المستودعات |
| `products` | المنتجات |
| `inventory_stock` | أرصدة المخزون |
| `inventory_movements` | حركات المخزون |

### جداول SaaS

| الجدول | الوصف |
|--------|-------|
| `agents` | الوكلاء |
| `agent_tiers` | مستويات الوكلاء |
| `agent_commissions` | العمولات |
| `support_tickets` | تذاكر الدعم |
| `announcements` | الإعلانات |
| `discount_coupons` | الكوبونات |

---

# ⚠️ القسم 7: قواعد التطوير الإلزامية

## القاعدة 1: الترجمة (Translation) - إلزامي 100%

### ❌ ممنوع تماماً:

```typescript
// ❌ خطأ - نص ثابت
<button>حفظ</button>
<div>إجمالي المبيعات</div>
<h1>لوحة التحكم</h1>

// ❌ خطأ - نص ثابت في متغير
const title = 'القيود اليومية';
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
```

## القاعدة 2: Services - إلزامي 100%

### ❌ ممنوع:

```typescript
// ❌ خطأ - استخدام Supabase مباشرة
const { data } = await supabase
  .from('journal_entries')
  .select('*');
```

### ✅ صحيح:

```typescript
// ✅ صحيح - استخدام Services
import { journalEntriesService } from '@/services/journalEntriesService';
const entries = await journalEntriesService.getAll(companyId);
```

## القاعدة 3: Authentication - إلزامي 100%

### ❌ ممنوع:

```typescript
// ❌ خطأ - استخدام localStorage مباشرة
const tenantId = localStorage.getItem('tenant_id');
```

### ✅ صحيح:

```typescript
// ✅ صحيح - استخدام useAuth hook
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { tenantId, companyId, isSuperAdmin } = useAuth();
}
```

## القاعدة 4: Error Handling - إلزامي 100%

### ✅ صحيح:

```typescript
const { t } = useLanguage();

try {
  const entries = await journalEntriesService.getAll(companyId);
} catch (error) {
  console.error('Error:', error);
  setError(t('errors.network.loadFailed'));
}
```

## Checklist إلزامي

### قبل أي تطوير:
- [ ] هل جميع النصوص ستستخدم `t()` function؟
- [ ] هل أضفت المفاتيح في جميع ملفات اللغات (9 ملفات)؟
- [ ] هل استوردت `useLanguage` و `useAuth`؟

### أثناء التطوير:
- [ ] هل استخدمت Services بدلاً من Supabase مباشرة؟
- [ ] هل أضفت Error Handling؟
- [ ] هل أضفت Loading States؟

### بعد التطوير:
- [ ] هل اختبرت مع تغيير اللغة؟
- [ ] هل لا توجد نصوص ثابتة (hardcoded)؟
- [ ] هل لا توجد warnings في Console؟

---

# 🌍 القسم 8: نظام الترجمة

## هيكلية مفاتيح الترجمة

```
category.subcategory.key
```

### البادئات المعتمدة

| البادئة | الاستخدام |
|---------|----------|
| `common.*` | العمليات والنصوص العامة |
| `navigation.*` | قائمة التنقل |
| `accounting.*` | قسم المحاسبة |
| `sales.*` | قسم المبيعات |
| `inventory.*` | قسم المخزون |
| `saas.*` | قسم إدارة SaaS |
| `filters.*` | الفلاتر والتصفية |
| `status.*` | حالات السجلات |
| `errors.*` | رسائل الأخطاء |
| `messages.*` | رسائل النجاح والتنبيهات |

## ملفات الترجمة

**الموقع:** `src/i18n/locales/`

**الملفات (9 ملفات):**
- `ar.json` - العربية
- `en.json` - English
- `ru.json` - Русский
- `uk.json` - Українська
- `tr.json` - Türkçe
- `de.json` - Deutsch
- `pl.json` - Polski
- `ro.json` - Română
- `it.json` - Italiano

## إضافة ترجمات جديدة

### الخطوة 1: إضافة المفتاح في جميع الملفات

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
```

### الخطوة 2: استخدام المفتاح

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

# 💼 القسم 9: الخدمات والـ Services

## هيكلية الخدمات

```
src/services/
├── Core Services
│   ├── accountsService.ts       # شجرة الحسابات
│   ├── journalEntriesService.ts # القيود اليومية
│   ├── companiesService.ts      # الشركات
│   ├── productsService.ts       # المنتجات
│   └── warehousesService.ts     # المستودعات
│
├── SaaS Services
│   ├── agentsService.ts         # الوكلاء
│   ├── tenantsService.ts        # المشتركين
│   └── whiteLabelService.ts     # White Label
│
└── Auth Services
    └── authService.ts           # المصادقة
```

## نمط Service

```typescript
export const serviceName = {
  async getAll(companyId: string, filters?: {...}): Promise<Type[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID');
    
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId);
    
    if (error) throw error;
    return data || [];
  },
  
  async create(input: CreateInput): Promise<Type> {
    // Implementation
  },
  
  async update(id: string, updates: Partial<CreateInput>): Promise<Type> {
    // Implementation
  },
  
  async delete(id: string): Promise<void> {
    // Implementation
  },
};
```

## الاستخدام في Components

```typescript
import { journalEntriesService } from '@/services/journalEntriesService';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';

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
    </div>
  );
}
```

---

# 🎛️ القسم 10: نظام التحكم في الموديولات والميزات

## نظرة عامة

نظام متكامل للتحكم الديناميكي في الموديولات، الميزات، اللغات، والتبويبات.

```
┌─────────────────────────────────────────────────────────────────┐
│                   نظام التحكم الشامل                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 Modules (الموديولات)                                        │
│  ├── Accounting (المحاسبة)                                      │
│  ├── Sales (المبيعات)                                           │
│  ├── Inventory (المخزون)                                        │
│  ├── Fabric (الأقمشة)                                           │
│  └── ... (يمكن إخفاء/إظهار حسب الباقة)                         │
│                                                                 │
│  ⚙️ Features (الميزات)                                          │
│  ├── Export PDF                                                 │
│  ├── AI Analysis                                                │
│  ├── Multi Currency                                             │
│  └── ... (كل ميزة تُربط بباقة معينة)                            │
│                                                                 │
│  🌍 Languages (اللغات)                                          │
│  ├── حد أقصى حسب الباقة (Starter: 2, Pro: 3, Enterprise: 5)    │
│  ├── اختيار ديناميكي من 9 لغات متاحة                            │
│  └── دعم اللغات الإضافية المدفوعة                                │
│                                                                 │
│  📑 UI Tabs (التبويبات)                                         │
│  └── إخفاء/إظهار تبويبات حسب الباقة والميزات                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hooks الجاهزة للاستخدام

### 1. useModules()

```typescript
import { useModules } from '@/hooks/useModules';

const { modules, hasModule, sidebar } = useModules();

if (hasModule('accounting')) {
  // إظهار قسم المحاسبة
}
```

### 2. useFeatures()

```typescript
import { useFeatures } from '@/hooks/useFeatures';

const { hasFeature } = useFeatures();

const canExport = await hasFeature('accounting', 'export_pdf');
```

### 3. useLanguages()

```typescript
import { useLanguages } from '@/hooks/useLanguages';

const { 
  getEnabledLanguageCodes, 
  enableLanguage,
  limitInfo 
} = useLanguages();

// الحصول على اللغات المفعلة فقط
const langs = getEnabledLanguageCodes(); // ['ar', 'en', 'uk']
```

### 4. useAllowedTabs()

```typescript
import { useAllowedTabs } from '@/hooks/useAllowedTabs';

const { tabs, hasTab } = useAllowedTabs('invoice_details');

if (hasTab('ai_analysis')) {
  // إظهار تبويب التحليل الذكي
}
```

---

## Services المتاحة

| Service | الوظيفة |
|---------|---------|
| `modulesService` | إدارة الموديولات |
| `featuresService` | التحقق من الميزات |
| `languagesService` | إدارة اللغات |

---

## الجداول الجديدة

| الجدول | الوصف |
|-------|-------|
| `module_features` | الميزات المتاحة |
| `plan_module_features` | ربط الميزات بالباقات |
| `ui_tabs` | تبويبات الواجهة |
| `plan_ui_tabs` | ربط التبويبات بالباقات |
| `system_languages` | اللغات المتاحة (9 لغات) |
| `tenant_languages` | اللغات المفعلة لكل tenant |

---

## Migration Files

| الملف | الوظيفة |
|------|---------|
| `STEP_32_modules_and_features_system.sql` | نظام الموديولات والميزات |
| `STEP_32_B_multi_language_system.sql` | نظام اللغات المتعددة |
| `06_modules_and_features_data.sql` | البيانات التجريبية |

---

## التوثيق التفصيلي

للمزيد من المعلومات، راجع:
📘 **[docs/MODULES_AND_FEATURES_SYSTEM.md](./MODULES_AND_FEATURES_SYSTEM.md)**

---

# 📊 القسم 11: خطة التطوير

## حالة الإنجاز

### Backend

| القسم | الحالة | النسبة |
|-------|--------|--------|
| النظام الأساسي | ✅ | 100% |
| المحاسبة | ✅ | 100% |
| الكونتينرات | ✅ | 100% |
| الأقمشة | ✅ | 100% |
| العملاء والموردين | ✅ | 100% |
| المخزون | ✅ | 80% |
| SaaS | ✅ | 90% |

### Frontend

| القسم | الحالة | النسبة |
|-------|--------|--------|
| المحاسبة | 🟡 | 80% |
| الكونتينرات | ❌ | 0% |
| الأقمشة | ❌ | 10% |
| المبيعات | ❌ | 0% |
| المشتريات | ❌ | 0% |
| المخزون | ❌ | 10% |
| SaaS | 🟡 | 30% |

## هيكل التبويبات

```
TexaCore ERP System
│
├── 🏠 Dashboard (لوحة التحكم)
│
├── 📊 Accounting (المحاسبة)
│   ├── Dashboard
│   ├── Chart of Accounts (شجرة الحسابات)
│   ├── Journal Entries (القيود اليومية)
│   ├── General Ledger (الأستاذ العام)
│   ├── Funds Management (إدارة الصناديق)
│   ├── Reports (التقارير)
│   └── Settings (الإعدادات)
│
├── 📦 Inventory (المخزون)
│   ├── Products (المنتجات)
│   ├── Warehouses (المستودعات)
│   ├── Stock Movements (حركات المخزون)
│   └── Reports
│
├── 🧵 Fabric (الأقمشة)
│   ├── Materials (المواد)
│   ├── Colors (الألوان)
│   ├── Rolls (الرولونات)
│   └── Reports
│
├── 🚢 Containers (الكونتينرات)
│   ├── Containers List
│   ├── Expenses (المصاريف)
│   ├── Landed Cost
│   └── Reports
│
├── 🛒 Sales (المبيعات)
│   ├── Customers (العملاء)
│   ├── Quotations (عروض الأسعار)
│   ├── Sales Invoices (الفواتير)
│   └── Reports
│
├── 🛍️ Purchases (المشتريات)
│   ├── Suppliers (الموردين)
│   ├── Purchase Orders
│   ├── Purchase Invoices
│   └── Reports
│
├── ⚙️ Settings (الإعدادات)
│   ├── Company Settings
│   ├── User Management
│   └── System Settings
│
└── 👑 SaaS Management
    ├── Subscribers (المشتركين)
    ├── Agents (الوكلاء)
    ├── Packages (الباقات)
    └── Support (الدعم)
```

---

# 🔧 القسم 12: استكشاف الأخطاء

## المشاكل الشائعة

### 1. البرنامج لا يعمل

**الحلول:**

```bash
# 1. تحقق من Console (F12)
# 2. تحقق من Dev Server
npm run dev

# 3. تحقق من .env
cat .env

# 4. امسح Cache
rm -rf node_modules .vite
npm install
npm run dev
```

### 2. خطأ في الـ Imports

**المشكلة:** `Cannot find module '@/...'`

**الحل:**
- تأكد من وجود `tsconfig.json`
- أعد تشغيل TypeScript Server في VS Code

### 3. خطأ في Services

**المشكلة:** البيانات لا تُحمل

**الحل:**
- تحقق من `.env` مع Supabase credentials
- تحقق من RLS Policies في Supabase

### 4. خطأ في الترجمة

**المشكلة:** النصوص تظهر كمفاتيح

**الحل:**
- تأكد من وجود المفاتيح في جميع ملفات اللغات
- تحقق من `LanguageProvider` في `App.tsx`

## خطوات التشخيص

```bash
# 1. فحص الأخطاء
npm run build

# 2. فحص TypeScript
npx tsc --noEmit

# 3. فحص Linter
npm run lint
```

## الأخطاء الشائعة

| الخطأ | الحل |
|-------|------|
| `Cannot find module` | أعد تثبيت node_modules |
| `Auth session missing` | طبيعي - تم إخفاؤه |
| `RLS Policy violation` | تحقق من RLS Policies |
| `Invalid hook call` | استخدم hooks داخل Components فقط |

---

# 📁 القسم 13: الملفات المهمة

## ملفات SQL (supabase/migrations/)

| الملف | الوظيفة |
|-------|---------|
| `STEP_01_create_tenants.sql` | إنشاء جدول tenants |
| `STEP_12_create_super_admin.sql` | نظام Super Admin |
| `STEP_13_pre_provisioned_tenants.sql` | Tenants جاهزة |
| `STEP_28_complete_registration_system.sql` | نظام التسجيل الكامل |
| `STEP_29_setup_platform_owner.sql` | إعداد Platform Owner |

## ملفات Frontend (src/)

| الملف | الوظيفة |
|-------|---------|
| `features/auth/Register.tsx` | صفحة التسجيل |
| `features/saas/SaaS.tsx` | لوحة SaaS الرئيسية |
| `features/saas/Subscribers.tsx` | إدارة المشتركين |
| `hooks/useAuth.ts` | Hook للمصادقة |
| `lib/supabase.ts` | اتصال Supabase |

## ملفات التوثيق

| الملف | الوظيفة |
|-------|---------|
| `docs/COMPLETE_REFERENCE_GUIDE.md` | **هذا الملف** - المرجع الشامل |
| `PROJECT_CONSTITUTION.md` | دستور المشروع - القواعد الإلزامية |
| `README.md` | تعليمات التثبيت والتشغيل |
| `.cursorrules` | قواعد التصميم للـ AI |

---

# 🔧 القسم 14: دليل الصيانة

## إضافة Super Admin جديد

```sql
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) 
    || '{"is_super_admin": true}'::jsonb
WHERE email = 'new-admin@example.com';
```

## إزالة صلاحية Super Admin

```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'is_super_admin'
WHERE email = 'user@example.com';
```

## إضافة Tenants جاهزة

```sql
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO tenants (code, name, email, status, default_language)
        VALUES (
            'tenant-' || LPAD(i::TEXT, 3, '0'),
            'Tenant ' || i,
            'tenant' || i || '@erp.local',
            'available',
            'ar'
        )
        ON CONFLICT (code) DO NOTHING;
    END LOOP;
END $$;
```

## التحقق من حالة النظام

```sql
-- عدد Tenants حسب الحالة
SELECT status, COUNT(*) FROM tenants GROUP BY status;

-- عدد المشتركين النشطين
SELECT COUNT(*) FROM tenants WHERE status = 'active';

-- Super Admins
SELECT email, raw_user_meta_data->>'is_super_admin' 
FROM auth.users 
WHERE raw_user_meta_data->>'is_super_admin' = 'true';

-- إحصائيات الشركات
SELECT 
  t.name as tenant_name,
  COUNT(c.id) as companies_count
FROM tenants t
LEFT JOIN companies c ON c.tenant_id = t.id
GROUP BY t.id, t.name;
```

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| "لا يوجد Tenants متاحة" | أضف tenants جديدة بحالة `available` |
| "غير مصرح" في /saas | تأكد من `is_super_admin = true` |
| لا تظهر البيانات | تحقق من `tenant_id` و `company_id` |
| خطأ في التسجيل | شغّل STEP_28 في Supabase |

---

# 📞 معلومات الاتصال

| المعلومة | القيمة |
|----------|--------|
| **Platform Owner** | feras1960@gmail.com |
| **Tenant** | NexRev Platform |
| **Company** | Next Revolution |

---

# 📝 سجل التغييرات

| التاريخ | التغيير |
|---------|---------|
| 2026-01-23 | إنشاء المرجع الشامل |
| 2026-01-23 | إعداد Platform Owner |
| 2026-01-23 | تفعيل نظام التسجيل الكامل |

---

> 💡 **ملاحظة:** هذا الملف يجب تحديثه عند أي تغيير في الهيكلية أو القواعد.

---

**⚠️ تذكر دائماً:**
- **أي نص بدون `t()` = خطأ يجب إصلاحه!**
- **أي استعلام بدون Service = خطأ يجب إصلاحه!**
- **أي استخدام لـ localStorage مباشرة = خطأ يجب إصلاحه!**

---

**هذا الملف هو المرجع الشامل للمشروع - ارجع إليه دائماً عند التطوير! 📖**
