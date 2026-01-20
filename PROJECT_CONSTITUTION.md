# دستور المشروع - Project Constitution
# المرجع الشامل لتطويرات ERP System

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الهيكلية المعمارية](#الهيكلية-المعمارية)
3. [المعايير والتوجيهات](#المعايير-والتوجيهات)
4. [البنية التحتية](#البنية-التحتية)
5. [قواعد التطوير](#قواعد-التطوير)
6. [الخدمات والوظائف](#الخدمات-والوظائف)
7. [المكونات والواجهات](#المكونات-والواجهات)
8. [قواعد البيانات](#قواعد-البيانات)
9. [الأمان والصلاحيات](#الأمان-والصلاحيات)
10. [الترجمة والتدويل](#الترجمة-والتدويل)

---

## 🎯 نظرة عامة

### معلومات المشروع

- **الاسم:** TexaCore ERP System
- **الشعار:** TexaCore - جودة تستحق الثقة
- **الإصدار:** 1.0.0
- **النوع:** SaaS Multi-Tenant ERP System
- **التقنيات:** React + TypeScript + Vite + Supabase

### الهدف

نظام ERP شامل ومتكامل يدعم:
- ✅ Multi-Tenant Architecture
- ✅ المحاسبة المالية
- ✅ إدارة المستودعات والمخزون
- ✅ المبيعات والمشتريات
- ✅ إدارة العملاء والموردين
- ✅ الصرافة والتحويلات
- ✅ التصنيع والنسيج
- ✅ نقاط البيع

---

## 🏗️ الهيكلية المعمارية

### 1. Multi-Tenant Architecture

```
┌─────────────────────────────────────┐
│         Supabase (Shared DB)        │
├─────────────────────────────────────┤
│  Tenant 1  │  Tenant 2  │  Tenant 3 │
│  Company A │  Company B │  Company C│
│  Company B │  Company D │  Company E│
└─────────────────────────────────────┘
```

**العزل:**
- `tenant_id` → عزل المشتركين
- `company_id` → عزل الشركات داخل Tenant
- RLS Policies → حماية تلقائية

### 2. Frontend Architecture

```
src/
├── app/              # Providers & App Setup
├── components/       # UI Components
│   ├── common/      # Logo, ErrorBoundary
│   ├── layout/     # Header, Sidebar, MainLayout
│   ├── shared/     # Shared Components
│   └── ui/         # Base UI Components
├── features/        # Feature Modules
│   ├── accounting/  # المحاسبة
│   ├── inventory/   # المخزون
│   ├── sales/       # المبيعات
│   └── auth/        # Authentication
├── hooks/           # Custom Hooks
├── services/        # API Services
├── lib/             # Utilities & Supabase Client
├── i18n/            # Translations
└── types/           # TypeScript Types
```

### 3. Backend Architecture (Supabase)

```
supabase/
├── migrations/      # Database Migrations
│   ├── STEP_01-05  # Core Setup
│   ├── STEP_12-15  # Super Admin & Tenants
│   └── STEP_20-22  # RLS & Verification
└── functions/      # Edge Functions (if needed)
```

---

## 📐 المعايير والتوجيهات

### ⚠️ القاعدة الإلزامية الأولى: الترجمة (MANDATORY)

**جميع النصوص في النظام يجب أن تستخدم نظام الترجمة (i18n)**
**NO HARDCODED TEXT - لا نصوص ثابتة أبداً!**

#### ❌ ممنوع تماماً:
```typescript
// ❌ خطأ - نص ثابت
<button>حفظ</button>
<div>إجمالي المبيعات</div>
<h1>لوحة التحكم</h1>
const title = 'القيود اليومية';
```

#### ✅ صحيح دائماً:
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

#### Checklist إلزامي قبل أي تطوير:
- [ ] هل جميع النصوص ستستخدم `t()` function؟
- [ ] هل أضفت المفاتيح في جميع ملفات اللغات (9 ملفات)؟
- [ ] هل المفاتيح منظمة بشكل منطقي (category.subcategory.key)؟
- [ ] هل اختبرت مع تغيير اللغة؟

**راجع:** `TRANSLATION_GUIDELINES.md` و `DEVELOPMENT_RULES.md` للتفاصيل الكاملة

---

### 1. Naming Conventions

#### Files & Folders
- **Components:** `PascalCase.tsx` (e.g., `JournalEntries.tsx`)
- **Services:** `camelCase.ts` (e.g., `journalEntriesService.ts`)
- **Hooks:** `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- **Types:** `camelCase.ts` (e.g., `index.ts`)

#### Code
- **Variables:** `camelCase` (e.g., `tenantId`, `companyId`)
- **Functions:** `camelCase` (e.g., `getAll`, `create`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `VITE_SUPABASE_URL`)
- **Types/Interfaces:** `PascalCase` (e.g., `JournalEntry`, `AuthUser`)

### 2. Code Style

#### TypeScript
```typescript
// ✅ Good
interface JournalEntry {
  id: string;
  tenant_id: string;
  company_id: string;
}

// ❌ Bad
interface journalEntry {
  id: string;
  tenantId: string; // Use snake_case for DB fields
}
```

#### React Components
```typescript
// ✅ Good
export default function JournalEntries() {
  const { companyId } = useAuth();
  // ...
}

// ❌ Bad
export const journalEntries = () => {
  // ...
}
```

### 3. File Organization

```
feature/
├── FeatureName.tsx          # Main component
├── FeatureDashboard.tsx     # Dashboard view
├── components/              # Feature-specific components
│   └── FeatureForm.tsx
├── data/                   # Mock data (if needed)
└── index.ts                # Exports
```

---

## 🔧 البنية التحتية

### 1. Environment Variables

```env
VITE_SUPABASE_URL=https://wzkklenfsaepegymfxfz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

**ملاحظات:**
- لا ترفع `.env` إلى Git
- استخدم `.env.example` كقالب
- جميع المتغيرات تبدأ بـ `VITE_`

### 2. Supabase Client

**الموقع:** `src/lib/supabase.ts`

**الاستخدام:**
```typescript
import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';
```

**Helper Functions:**
- `getCurrentTenantId()` - الحصول على tenant_id
- `getCurrentTenantIdAsync()` - الحصول من السيرفر
- `getCurrentCompanyId()` - الحصول على company_id
- `isSuperAdmin()` - التحقق من Super Admin

### 3. Authentication

**الموقع:** `src/services/authService.ts`

**الاستخدام:**
```typescript
import { signInWithMetadata } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

const { tenantId, companyId, isSuperAdmin, authUser } = useAuth();
```

---

## 💼 الخدمات والوظائف

### ⚠️ القاعدة الإلزامية: استخدام Services

**جميع الاستعلامات إلى قاعدة البيانات يجب أن تمر عبر Services**
**لا تستخدم Supabase مباشرة في Components**

#### ❌ ممنوع:
```typescript
// ❌ خطأ
const { data } = await supabase.from('journal_entries').select('*');
```

#### ✅ صحيح:
```typescript
// ✅ صحيح
import { journalEntriesService } from '@/services/journalEntriesService';
const entries = await journalEntriesService.getAll(companyId);
```

### 1. Services Structure

جميع Services في `src/services/`:

```
services/
├── authService.ts           # Authentication
├── accountsService.ts        # Chart of Accounts
├── journalEntriesService.ts # Journal Entries
├── companiesService.ts      # Companies
├── productsService.ts       # Products
├── warehousesService.ts     # Warehouses
└── index.ts                 # Exports
```

### 2. Service Pattern

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

### 3. Available Services

#### ✅ Accounts Service
- `getAll(companyId)` - جلب جميع الحسابات
- `getById(id)` - جلب حساب محدد
- `getByType(companyId, type)` - جلب حسب النوع
- `create(input)` - إنشاء حساب
- `update(id, updates)` - تحديث حساب
- `delete(id)` - حذف حساب

#### ✅ Journal Entries Service
- `getAll(companyId, filters?)` - جلب جميع القيود
- `getById(id)` - جلب قيد مع بنوده
- `create(input)` - إنشاء قيد جديد
- `post(entryId, userId)` - ترحيل القيد
- `update(id, updates)` - تحديث القيد
- `delete(id)` - حذف القيد

#### ✅ Companies Service
- `getAll()` - جلب جميع الشركات
- `getById(id)` - جلب شركة محددة
- `create(input)` - إنشاء شركة
- `update(id, updates)` - تحديث شركة

---

## 🎨 المكونات والواجهات

### ⚠️ القاعدة الإلزامية: Component Structure

**جميع Components يجب أن:**
1. تستخدم `useLanguage` للترجمة
2. تستخدم `useAuth` للحصول على tenant_id و company_id
3. تستخدم Services للوصول إلى البيانات
4. لا تحتوي على نصوص ثابتة

### 1. Component Structure

```typescript
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { serviceName } from '@/services/serviceName';
import { useLanguage } from '@/app/providers/LanguageProvider';

export default function ComponentName() {
  const { t, direction } = useLanguage();
  const { companyId, tenantId } = useAuth();
  
  // Component logic
  
  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

### 2. Common Components

#### Logo Component
**الموقع:** `src/components/common/Logo.tsx`

**الاستخدام:**
```typescript
import Logo from '@/components/common/Logo';

<Logo size="lg" showText={true} variant="dark" animated={true} />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `showText`: boolean
- `variant`: 'dark' | 'light'
- `animated`: boolean

#### Layout Components
- `MainLayout` - Layout رئيسي
- `Header` - Header مع Logo
- `Sidebar` - Navigation Sidebar

### 3. UI Components

جميع UI Components في `src/components/ui/`:
- `Button`, `Input`, `Card`, `Dialog`, `Sheet`, etc.

**الاستخدام:**
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
```

---

## 🗄️ قواعد البيانات

### 1. Core Tables

#### Tenants
```sql
tenants (
  id UUID PRIMARY KEY,
  code VARCHAR UNIQUE,
  name VARCHAR,
  status VARCHAR, -- 'active', 'available', 'suspended'
  owner_email VARCHAR,
  ...
)
```

#### Companies
```sql
companies (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR,
  name VARCHAR,
  ...
)
```

#### User Profiles
```sql
user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  company_id UUID REFERENCES companies(id),
  ...
)
```

### 2. Accounting Tables

#### Chart of Accounts
```sql
chart_of_accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_id UUID NOT NULL,
  account_code VARCHAR,
  account_name VARCHAR,
  account_type VARCHAR,
  parent_id UUID,
  level INT,
  is_group BOOLEAN,
  current_balance DECIMAL,
  ...
)
```

#### Journal Entries
```sql
journal_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_id UUID NOT NULL,
  entry_number VARCHAR,
  entry_date DATE,
  description TEXT,
  total_debit DECIMAL,
  total_credit DECIMAL,
  status VARCHAR, -- 'draft', 'posted', 'cancelled'
  is_posted BOOLEAN,
  ...
)
```

#### Journal Entry Lines
```sql
journal_entry_lines (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entry_id UUID REFERENCES journal_entries(id),
  line_number INT,
  account_id UUID REFERENCES chart_of_accounts(id),
  debit DECIMAL,
  credit DECIMAL,
  ...
)
```

### 3. Inventory Tables

- `warehouses` - المستودعات
- `products` - المنتجات
- `inventory_stock` - أرصدة المخزون
- `inventory_movements` - حركات المخزون

### 4. Sales & Purchases Tables

- `customers` - العملاء
- `suppliers` - الموردين
- `sales_invoices` - فواتير المبيعات
- `purchase_invoices` - فواتير المشتريات

---

## 🔒 الأمان والصلاحيات

### 1. Row Level Security (RLS)

**كيف يعمل:**
- RLS Policies تتحقق من `tenant_id` تلقائياً
- لا حاجة لإضافة `.eq('tenant_id', ...)` يدوياً
- Super Admin يمكنه رؤية جميع البيانات

**السياسات:**
```sql
CREATE POLICY table_name_tenant_isolation ON table_name
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() 
  OR is_super_admin()
);
```

### 2. Super Admin System

**التحقق:**
```typescript
const { isSuperAdmin } = useAuth();
// أو
const isSuper = await isSuperAdmin();
```

**الصلاحيات:**
- رؤية جميع Tenants
- الوصول إلى جميع البيانات
- إدارة المستخدمين
- إدارة النظام

### 3. User Metadata

بعد تسجيل الدخول، يتم تحديث metadata تلقائياً:
```json
{
  "tenant_id": "uuid",
  "company_id": "uuid",
  "is_super_admin": false
}
```

---

## 🌍 الترجمة والتدويل

### ⚠️ قاعدة إلزامية

**جميع النصوص في النظام يجب أن تستخدم نظام الترجمة (i18n)**
**NO HARDCODED TEXT - لا نصوص ثابتة أبداً!**

### 1. Supported Languages

- العربية (ar) - Default
- English (en)
- Русский (ru)
- Українська (uk)
- Türkçe (tr)
- Deutsch (de)
- Polski (pl)
- Română (ro)
- Italiano (it)

### 2. Translation Files

**الموقع:** `src/i18n/locales/`

**الاستخدام:**
```typescript
import { useLanguage } from '@/app/providers/LanguageProvider';

const { t, locale, direction } = useLanguage();
const text = t('common.save'); // "حفظ" أو "Save"
```

### 3. القواعد الإلزامية

#### ❌ ممنوع:
```typescript
// ❌ خطأ - نص ثابت
<button>حفظ</button>
<div>إجمالي المبيعات</div>
```

#### ✅ صحيح:
```typescript
// ✅ صحيح - استخدام t()
const { t } = useLanguage();
<button>{t('common.save')}</button>
<div>{t('dashboard.totalSales')}</div>
```

### 4. هيكلية مفاتيح الترجمة (إلزامي)

```
module.section.key
```

**⚠️ القاعدة الصارمة: كل مفتاح يجب أن يبدأ بمعرف الوحدة (module prefix)**

**الأمثلة الصحيحة ✅:**
- `common.save` - عمليات عامة
- `common.search` - بحث
- `navigation.dashboard` - التنقل
- `accounting.journalEntries` - المحاسبة
- `accounting.entry.debit` - حقول القيد
- `filters.today` - الفلاتر
- `errors.validation.required` - الأخطاء
- `saas.agents.title` - قسم SaaS

**الأمثلة الخاطئة ❌:**
- `save` - بدون بادئة!
- `today` - بدون بادئة!
- `generalLedger` - يجب أن تكون `accounting.generalLedger`!
- `debit` - يجب أن تكون `accounting.entry.debit`!

**⚠️ القاعدة الذهبية:**
> **لا تستخدم مفتاح بدون بادئة (prefix) أبداً!**
> كل مفتاح يجب أن يتبع النمط: `module.section.key`

**البادئات المعتمدة:**
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
| `table.*` | عناصر الجداول |
| `auth.*` | المصادقة |

### 5. إضافة ترجمات جديدة

**يجب إضافة المفتاح في جميع ملفات اللغات:**
- `ar.json` ✅
- `en.json` ✅
- `ru.json` ✅
- `uk.json` ✅
- `tr.json` ✅
- `de.json` ✅
- `pl.json` ✅
- `ro.json` ✅
- `it.json` ✅

### 6. Brand Translations

**الشعار:** TexaCore
**الشعارات (Slogans):**
- العربية: "جودة تستحق الثقة"
- English: "Quality You Can Trust"
- Русский: "Качество, которому можно доверять"
- ... (جميع اللغات)

**الاستخدام:**
```typescript
const { t } = useLanguage();
const brandName = t('app.brand.name'); // "TexaCore"
const slogan = t('app.brand.slogan'); // "جودة تستحق الثقة"
```

### 7. دليل الترجمة الكامل

**راجع:** `TRANSLATION_GUIDELINES.md` للتفاصيل الكاملة

---

## 📖 مراجع إضافية

- `TRANSLATION_GUIDELINES.md` - دليل شامل للترجمة
- `FRONTEND_INTEGRATION_GUIDE.md` - دليل ربط Frontend
- `READY_FOR_DEVELOPMENT.md` - جاهزية النظام

---

## 📝 قواعد التطوير الإلزامية

### ⚠️ القواعد الأساسية (MANDATORY)

#### 1. الترجمة (Translation) - إلزامي
- ✅ استخدم `t()` function دائماً
- ❌ لا تضع نصوص ثابتة (hardcoded)
- ✅ أضف المفاتيح في جميع ملفات اللغات (9 ملفات)
- ✅ اختبر مع تغيير اللغة

#### 2. Services - إلزامي
- ✅ استخدم Services دائماً
- ❌ لا تستخدم Supabase مباشرة
- ✅ Services تتعامل مع tenant_id تلقائياً

#### 3. Authentication - إلزامي
- ✅ استخدم `useAuth` hook
- ❌ لا تستخدم localStorage مباشرة
- ✅ استخدم `tenantId` و `companyId` من hook

#### 4. Error Handling - إلزامي
- ✅ استخدم try/catch دائماً
- ✅ استخدم `t()` لرسائل الخطأ
- ❌ لا تترك errors بدون معالجة

### 1. استخدام Services

```typescript
// ✅ صحيح
import { journalEntriesService } from '@/services/journalEntriesService';
const entries = await journalEntriesService.getAll(companyId);

// ❌ خطأ
const { data } = await supabase.from('journal_entries').select('*');
```

### 2. استخدام useAuth

```typescript
// ✅ صحيح
const { tenantId, companyId, isSuperAdmin } = useAuth();
if (!companyId) return null;

// ❌ خطأ
const tenantId = localStorage.getItem('tenant_id');
```

### 3. Error Handling

```typescript
// ✅ صحيح
try {
  const entries = await journalEntriesService.getAll(companyId);
} catch (error) {
  console.error('Error:', error);
  // عرض رسالة خطأ للمستخدم
}

// ❌ خطأ
const entries = await journalEntriesService.getAll(companyId); // بدون try/catch
```

### 4. Loading States

```typescript
// ✅ صحيح
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    const data = await service.getAll(companyId);
    setData(data);
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 المبادئ الأساسية (إلزامية)

### 1. Multi-Tenant First ⚠️ إلزامي
- جميع البيانات معزولة بـ `tenant_id`
- RLS Policies تعمل تلقائياً
- لا تنسى `tenant_id` في أي استعلام
- استخدم `useAuth` للحصول على `tenantId`

### 2. Service Layer ⚠️ إلزامي
- استخدم Services دائماً
- لا تستخدم Supabase مباشرة في Components
- Services تتعامل مع `tenant_id` تلقائياً
- جميع الاستعلامات تمر عبر Services

### 3. Internationalization ⚠️ إلزامي
- **استخدم `t()` function للترجمة دائماً**
- **لا تكتب نصوص ثابتة في Components أبداً**
- **أضف الترجمات لجميع اللغات (9 ملفات)**
- **اختبر مع تغيير اللغة**

### 4. Type Safety ⚠️ إلزامي
- استخدم TypeScript بشكل صحيح
- حدد Types/Interfaces لجميع البيانات
- استخدم `as` فقط عند الضرورة

### 5. Error Handling ⚠️ إلزامي
- استخدم try/catch دائماً
- استخدم `t()` لرسائل الخطأ
- لا تترك errors بدون معالجة

---

## 📚 المراجع

### ملفات مهمة (يجب قراءتها)

1. **التطوير والترجمة (إلزامي):**
   - `TRANSLATION_GUIDELINES.md` ⚠️ **إلزامي - دليل الترجمة الشامل**
   - `DEVELOPMENT_RULES.md` ⚠️ **إلزامي - قواعد التطوير**
   - `PROJECT_CONSTITUTION.md` ⚠️ **إلزامي - هذا الملف**

2. **Frontend Integration:**
   - `FRONTEND_INTEGRATION_GUIDE.md`
   - `ENV_SETUP.md`
   - `RUN_PROJECT.md`
   - `READY_FOR_DEVELOPMENT.md`

3. **Database:**
   - `supabase/migrations/README.md`
   - `supabase/migrations/STEP_BY_STEP_GUIDE.md`
   - `supabase/MIGRATION_GUIDE.md`

4. **Architecture:**
   - `supabase/migrations/MULTI_TENANT_EXPLANATION.md`
   - `supabase/migrations/SAAS_ARCHITECTURE_CONFIRMED.md`

### Services Documentation

- `src/services/authService.ts` - Authentication
- `src/services/journalEntriesService.ts` - Journal Entries
- `src/services/accountsService.ts` - Chart of Accounts

### Translation Files

- `src/i18n/locales/ar.json` - العربية
- `src/i18n/locales/en.json` - English
- `src/i18n/locales/ru.json` - Русский
- `src/i18n/locales/uk.json` - Українська
- `src/i18n/locales/tr.json` - Türkçe
- `src/i18n/locales/de.json` - Deutsch
- `src/i18n/locales/pl.json` - Polski
- `src/i18n/locales/ro.json` - Română
- `src/i18n/locales/it.json` - Italiano

---

## ✅ Checklist للتطوير (إلزامي)

### قبل البدء:
- [ ] قراءة هذا الملف
- [ ] قراءة `TRANSLATION_GUIDELINES.md`
- [ ] قراءة `DEVELOPMENT_RULES.md`
- [ ] فهم Multi-Tenant Architecture
- [ ] فهم RLS Policies
- [ ] فهم Services Pattern
- [ ] فهم نظام الترجمة (i18n)

### أثناء التطوير:
- [ ] **استخدام `t()` function لكل نص** ⚠️ إلزامي
- [ ] **إضافة المفاتيح في جميع ملفات اللغات (9 ملفات)** ⚠️ إلزامي
- [ ] استخدام Services دائماً
- [ ] استخدام `useAuth` hook
- [ ] إضافة Error Handling
- [ ] إضافة Loading States
- [ ] **لا توجد نصوص ثابتة (hardcoded)** ⚠️ إلزامي

### بعد التطوير:
- [ ] **اختبار مع تغيير اللغة** ⚠️ إلزامي
- [ ] **التحقق من عدم وجود نصوص ثابتة** ⚠️ إلزامي
- [ ] اختبار مع بيانات حقيقية
- [ ] اختبار Multi-Tenant isolation
- [ ] اختبار RLS Policies
- [ ] **جميع النصوص قابلة للترجمة** ⚠️ إلزامي

---

## 🚀 الخطوات التالية

1. **اختبار النظام:**
   - تسجيل الدخول
   - جلب البيانات
   - إنشاء قيود جديدة

2. **تطوير Features:**
   - استخدام Services الموجودة
   - اتباع المعايير
   - إضافة الترجمات

3. **التوثيق:**
   - توثيق Components الجديدة
   - تحديث هذا الملف عند الحاجة

---

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع هذا الملف
2. راجع ملفات التوثيق الأخرى
3. تحقق من Console للأخطاء
4. تحقق من RLS Policies

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0

---

## 🎨 Brand Guidelines

### Logo: TexaCore

**الشعار:**
- **الاسم:** TexaCore
- **الألوان:**
  - Texa: `#047857` (Emerald-700)
  - Core: `#f59e0b` (Amber-500)
- **الشعارات (من ملفات الترجمة):**
  - العربية: "جودة تستحق الثقة"
  - English: "Quality You Can Trust"
  - جميع اللغات الأخرى

**الاستخدام:**
```typescript
import Logo from '@/components/common/Logo';

// Full logo with text (يستخدم الترجمات تلقائياً)
<Logo size="lg" showText={true} />

// Icon only
<LogoIcon size={48} animated={true} />
```

**الترجمة:**
```typescript
const { t } = useLanguage();
const brandName = t('app.brand.name'); // "TexaCore"
const slogan = t('app.brand.slogan'); // "جودة تستحق الثقة" أو "Quality You Can Trust"
```

---

## ⚠️ القواعد الإلزامية النهائية

### 1. الترجمة (Translation) - إلزامي 100%
- ✅ **استخدم `t()` function دائماً**
- ❌ **لا تضع نصوص ثابتة أبداً**
- ✅ **أضف المفاتيح في جميع ملفات اللغات (9 ملفات)**
- ✅ **اختبر مع تغيير اللغة**

### 2. Services - إلزامي 100%
- ✅ **استخدم Services دائماً**
- ❌ **لا تستخدم Supabase مباشرة**

### 3. Authentication - إلزامي 100%
- ✅ **استخدم `useAuth` hook**
- ❌ **لا تستخدم localStorage مباشرة**

### 4. Error Handling - إلزامي 100%
- ✅ **استخدم try/catch دائماً**
- ✅ **استخدم `t()` لرسائل الخطأ**

---

## 📖 المراجع الإلزامية

**قبل أي تطوير، اقرأ بالترتيب:**
1. `MANDATORY_RULES.md` ⚠️ **إلزامي - القواعد الأساسية**
2. `PROJECT_CONSTITUTION.md` ⚠️ **إلزامي - دستور المشروع (هذا الملف)**
3. `TRANSLATION_GUIDELINES.md` ⚠️ **إلزامي - دليل الترجمة الشامل**
4. `DEVELOPMENT_RULES.md` ⚠️ **إلزامي - قواعد التطوير**

---

**هذا الملف هو المرجع الدستوري للمشروع - رجعه دائماً عند التطوير! 📖**

**⚠️ تذكر: أي نص بدون `t()` = خطأ يجب إصلاحه فوراً!**
