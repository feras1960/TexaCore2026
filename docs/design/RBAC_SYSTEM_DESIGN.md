# 🔐 نظام الصلاحيات المتكامل (RBAC System)
## التصميم التقني الشامل - TexaCore ERP

---

## 📋 جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [التسلسل الهرمي](#-التسلسل-الهرمي)
3. [المجموعات الافتراضية](#-المجموعات-الافتراضية-roles)
4. [هيكل الصلاحيات](#-هيكل-الصلاحيات)
5. [نظام الإخفاء](#-نظام-الإخفاء-data-masking)
6. [قاعدة البيانات](#-قاعدة-البيانات)
7. [الخدمات (Services)](#-الخدمات-services)
8. [واجهة المستخدم](#-واجهة-المستخدم)
9. [أمثلة عملية](#-أمثلة-عملية)

---

## 🎯 نظرة عامة

### الهدف
إنشاء نظام صلاحيات متكامل يسمح بـ:
- إدارة الأدوار والمجموعات
- تطبيق صلاحيات بسيطة (قراءة/كتابة/حذف)
- ربط المستخدمين بالموارد (فروع/مستودعات/صناديق)
- إخفاء البيانات الحساسة حسب الدور
- تفويض صلاحيات الإدارة للمستويات الأدنى

### النطاق
- **المستأجر (Tenant)**: صلاحيات كاملة على كل شركاته
- **الشركة (Company)**: صلاحيات ضمن الشركة فقط
- **المستخدم (User)**: صلاحيات حسب دوره وما رُبط به

---

## 🏗 التسلسل الهرمي

```
┌─────────────────────────────────────────────────────────────┐
│                    🏢 مالك المستأجر                          │
│                    (Tenant Owner)                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • صلاحيات كاملة على جميع الشركات                  │   │
│   │  • إدارة جميع المستخدمين والأدوار                  │   │
│   │  • رؤية جميع البيانات بما فيها الأرباح             │   │
│   │  • تفويض صلاحيات للمديرين                          │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    🏭 مدير الشركة                            │
│                    (Company Admin)                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • صلاحيات كاملة على شركته فقط                     │   │
│   │  • إنشاء أدوار جديدة (إذا مُفوّض)                  │   │
│   │  • إدارة المستخدمين (إذا مُفوّض)                   │   │
│   │  • رؤية الموردين وبياناتهم                         │   │
│   │  • الأرباح: حسب إعدادات الإخفاء                    │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  🏪 مدير الفرع   │ │  💼 المحاسب      │ │  📦 مدير المستودع │
│  (Branch Mgr)    │ │  (Accountant)    │ │  (Warehouse Mgr) │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤
│ • إدارة فرعه     │ │ • العمليات       │ │ • إدارة مستودعه  │
│ • رؤية الموردين  │ │   المحاسبية      │ │ • الجرد والنقل   │
│ • صلاحيات فرعية  │ │ • رؤية الموردين  │ │ • لا يرى الموردين│
└──────────────────┘ └──────────────────┘ └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    👤 مستخدم عادي                            │
│                    (Regular User)                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • صلاحيات محدودة حسب دوره                         │   │
│   │  • الموارد المرتبطة به فقط                         │   │
│   │  • لا يرى الأرباح/التكاليف/الموردين               │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 المجموعات الافتراضية (Roles)

### ⚠️ تنويه مهم: التسلسل الهرمي للأدوار

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 super_admin (مدير المنصة)                                   │
│      ─ أنت فقط كمالك للمنصة بالكامل                             │
│      ─ لا يظهر للعملاء ولا يمكن إنشاؤه                          │
│      ─ وصول كامل لجميع التينانتس والشركات                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🟠 tenant_owner (مالك التينانت/المستأجر)                       │
│      ─ أعلى دور متاح للعملاء                                    │
│      ─ يدير جميع شركاته وفروعه                                  │
│      ─ يرى جميع البيانات ضمن التينانت الخاص به                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🟡 company_admin (مدير الشركة)                                 │
│  🟢 branch_manager (مدير الفرع)                                 │
│  🔵 accountant, cashier, warehouse_manager... (أدوار العمليات) │
└─────────────────────────────────────────────────────────────────┘
```

### الأدوار الثابتة (System Roles)

#### 🔴 أدوار النظام (لا تظهر للعملاء)

| الكود | الاسم | الوصف | متاح للعملاء |
|-------|-------|-------|--------------|
| `super_admin` | مدير المنصة | أنت فقط - إدارة كاملة للمنصة | ❌ لا |

#### 🟠 أدوار التينانت (متاحة للعملاء)

| الكود | الاسم بالعربية | الاسم بالإنجليزية | المستوى | قابل للحذف |
|-------|---------------|-------------------|---------|------------|
| `tenant_owner` | مالك المستأجر | Tenant Owner | tenant | ❌ |
| `company_admin` | مدير الشركة | Company Admin | company | ❌ |
| `branch_manager` | مدير الفرع | Branch Manager | branch | ❌ |
| `accountant` | محاسب | Accountant | operations | ❌ |
| `cashier` | أمين صندوق | Cashier | operations | ❌ |
| `warehouse_manager` | مدير مستودع | Warehouse Manager | operations | ❌ |
| `sales_rep` | مندوب مبيعات | Sales Representative | operations | ❌ |
| `purchasing_manager` | مسؤول المشتريات | Purchasing Manager | operations | ❌ |
| `viewer` | مشاهد فقط | Viewer | custom | ❌ |

### الأدوار القابلة للإنشاء (Custom Roles)

- يمكن لمالك التينانت أو مدير الشركة المُفوّض إنشاء أدوار جديدة
- الأدوار المخصصة مرتبطة بالتينانت أو الشركة
- يمكن نسخ دور موجود كقالب

---

## � إخفاء الموديولات حسب الدور (Module Visibility)

### المفهوم
كل دور يرى فقط الموديولات المسموح له العمل بها. هذا يحقق:
- واجهة مستخدم نظيفة ومركزة
- أمان أفضل (لا يرى ما لا يحتاجه)
- تجربة مستخدم محسّنة

### مصفوفة الموديولات حسب الدور (على مستوى التينانت)

> **ملاحظة**: هذه المصفوفة للأدوار المتاحة للعملاء. `super_admin` (مدير المنصة) يرى كل شيء ولا يظهر هنا.

| الموديول | مالك التينانت | مدير الشركة | مدير الفرع | المحاسب | أمين الصندوق | مدير المستودع | مندوب المبيعات | مسؤول المشتريات |
|----------|--------------|-------------|------------|---------|--------------|---------------|----------------|--------------------|
| لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| المحاسبة | ✅ | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ | ❌ |
| الخزينة | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 👁️ | ❌ |
| المبيعات | ✅ | ✅ | ✅ | 👁️ | ✅ | 👁️ | ✅ | ❌ |
| المشتريات | ✅ | ✅ | ✅ | ✅ | ❌ | 👁️ | ❌ | ✅ |
| المخزون | ✅ | ✅ | ✅ | 👁️ | ❌ | ✅ | 👁️ | ✅ |
| المستودعات | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | 👁️ |
| العملاء (CRM) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| الموردين | ✅ | ✅ | 👁️ | ✅ | ❌ | ❌ | ❌ | ✅ |
| نقاط البيع | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| التصنيع | ✅ | ✅ | 👁️ | ❌ | ❌ | ✅ | ❌ | ✅ |
| الشحنات | ✅ | ✅ | 👁️ | ❌ | ❌ | ✅ | ❌ | ✅ |
| الموارد البشرية | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| التقارير | ✅ | ✅ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ | 👁️ |
| الإعدادات | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| الصلاحيات | ✅ | ⚙️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ✅ = وصول كامل | 👁️ = قراءة فقط | ❌ = مخفي | ⚙️ = يمكن تفويضه

### مثال: واجهة مدير المستودع

```
┌─────────────────────────────────────┐
│ 🏠 الموديولات المتاحة              │
├─────────────────────────────────────┤
│ 📊 لوحة التحكم                     │
│ 📦 المخزون                         │
│ 🏭 المستودعات                      │
│ 🛒 المشتريات (قراءة فقط)           │
│ 🏭 التصنيع                         │
│ 📋 التقارير (قراءة فقط)            │
└─────────────────────────────────────┘
```

### مثال: واجهة مندوب المبيعات

```
┌─────────────────────────────────────┐
│ 🏠 الموديولات المتاحة              │
├─────────────────────────────────────┤
│ 📊 لوحة التحكم                     │
│ 🛒 المبيعات                        │
│ 👥 العملاء (CRM)                   │
│ 🏪 نقاط البيع                      │
│ 📦 المخزون (قراءة فقط)             │
│ 💰 الخزينة (قراءة فقط)             │
└─────────────────────────────────────┘
```

---

## 🏷️ التحكم بالموديولات حسب البراند (Brand Configuration)

### المفهوم
النظام يدعم علامات تجارية متعددة (Brands)، كل براند له موديولات مختلفة:

| البراند | الوصف | الموديولات المتاحة |
|---------|-------|-------------------|
| **TexaCore** | نظام ERP عام | جميع الموديولات الأساسية |
| **FinCore** | نظام مالي متقدم | المحاسبة، الخزينة، التقارير المالية، الصرافة |
| **TexaFabric** | إدارة الأقمشة | المخزون، الأقمشة، الشحنات، المبيعات، المشتريات |
| **TexaPharma** | الصيدليات | الصيدليات، المخزون، المبيعات، العملاء |
| **TexaHealth** | المشافي | المشافي، الأطباء، العملاء |
| **TexaGold** | الذهب والمجوهرات | الذهب، المخزون، المبيعات، المشتريات |
| **TexaFood** | المطاعم | المطاعم، المخزون، نقاط البيع |
| **TexaReal** | العقارات | العقارات، العملاء، المالية |

### مصفوفة الموديولات حسب البراند

| الموديول | TexaCore | FinCore | TexaFabric | TexaPharma | TexaGold |
|----------|----------|---------|------------|------------|----------|
| لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ |
| المحاسبة | ✅ | ✅ | ✅ | ✅ | ✅ |
| الخزينة | ✅ | ✅ | ✅ | ✅ | ✅ |
| المبيعات | ✅ | ❌ | ✅ | ✅ | ✅ |
| المشتريات | ✅ | ❌ | ✅ | ✅ | ✅ |
| المخزون | ✅ | ❌ | ✅ | ✅ | ✅ |
| الأقمشة | ❌ | ❌ | ✅ | ❌ | ❌ |
| الشحنات | ✅ | ❌ | ✅ | ❌ | ❌ |
| الصيدليات | ❌ | ❌ | ❌ | ✅ | ❌ |
| المشافي | ❌ | ❌ | ❌ | ✅ | ❌ |
| الذهب | ❌ | ❌ | ❌ | ❌ | ✅ |
| الصرافة | ❌ | ✅ | ❌ | ❌ | ✅ |
| التصنيع | ✅ | ❌ | ✅ | ❌ | ✅ |
| نقاط البيع | ✅ | ❌ | ✅ | ✅ | ✅ |

### هيكل البراند في قاعدة البيانات

```sql
-- جدول البراندات
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    logo_url TEXT,
    primary_color VARCHAR(20),
    available_modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ربط الشركة بالبراند
ALTER TABLE companies ADD COLUMN brand_id UUID REFERENCES brands(id);
```

### منطق الفلترة المُركّب (Compound Filtering)

```typescript
// الموديولات المرئية = 
//   (موديولات البراند) ∩ (موديولات الدور) ∩ (موديولات الاشتراك)

const getVisibleModules = (
  allModules: Module[],
  brandModules: string[],
  roleModules: string[],
  subscriptionModules: string[]
): Module[] => {
  return allModules.filter(module => 
    brandModules.includes(module.code) &&
    roleModules.includes(module.code) &&
    subscriptionModules.includes(module.code)
  );
};
```

### مثال عملي

```
شركة "نسيج الشرق" مسجلة على براند TexaFabric
↓
الموديولات المتاحة للبراند: [dashboard, accounting, treasury, sales, purchases, inventory, fabric, shipments, manufacturing, pos]
↓
المستخدم: "أحمد" - مدير مستودع
↓
موديولات الدور: [dashboard, inventory, warehouse, purchases (read), manufacturing, reports (read)]
↓
الموديولات النهائية المرئية:
[dashboard, inventory, purchases (read), manufacturing]
```

---

## �🔑 هيكل الصلاحيات

### الصلاحيات البسيطة (Simple Permissions)

```typescript
type Permission = 'read' | 'write' | 'delete';

interface ModulePermissions {
  module: string;
  permissions: Permission[];
}
```

### الموديولات المتاحة

| الموديول | الكود | الوصف |
|----------|-------|-------|
| المحاسبة | `accounting` | دفتر اليومية، دليل الحسابات |
| المالية | `finance` | التقارير المالية |
| الخزينة | `treasury` | الصناديق والبنوك |
| المبيعات | `sales` | الفواتير، العروض |
| المشتريات | `purchases` | أوامر الشراء، الموردين |
| المخزون | `inventory` | المنتجات، الحركات |
| المستودعات | `warehouse` | إدارة المستودعات |
| العملاء | `customers` | إدارة العملاء |
| الموردين | `suppliers` | إدارة الموردين |
| الموظفين | `employees` | إدارة الموظفين |
| التقارير | `reports` | التقارير العامة |
| الإعدادات | `settings` | إعدادات النظام |

### مصفوفة الصلاحيات الافتراضية

| الدور | accounting | treasury | sales | purchases | inventory | suppliers | reports |
|-------|------------|----------|-------|-----------|-----------|-----------|---------|
| مالك المستأجر | RWD | RWD | RWD | RWD | RWD | RWD | RWD |
| مدير الشركة | RWD | RWD | RWD | RWD | RWD | RWD | RW |
| مدير الفرع | RW | RW | RWD | RW | RW | R | R |
| محاسب | RWD | RW | R | RW | R | R | R |
| أمين صندوق | R | RWD | RW | - | - | - | R |
| مدير مستودع | - | - | R | R | RWD | - | R |
| مندوب مبيعات | - | R | RWD | - | R | - | R |
| مشاهد | R | R | R | R | R | R | R |

> **R** = Read (قراءة) | **W** = Write (كتابة) | **D** = Delete (حذف) | **-** = لا يوجد

---

## 🔒 نظام الإخفاء (Data Masking)

### أنواع الإخفاء

#### 1. إخفاء الصفحات (Page Hiding)
```typescript
interface PageVisibility {
  page: string;
  visible_to_roles: string[];
}
```

| الصفحة | مالك | مدير الشركة | محاسب | باقي الأدوار |
|--------|------|-------------|-------|--------------|
| تقرير الأرباح والخسائر | ✅ | ⚙️ | ❌ | ❌ |
| تقرير هوامش الربح | ✅ | ⚙️ | ❌ | ❌ |
| إدارة الموردين | ✅ | ✅ | ✅ | ❌ |
| تكاليف الشراء | ✅ | ✅ | ⚙️ | ❌ |

> ⚙️ = قابل للتحديد من المالك

#### 2. إخفاء الحقول (Field Hiding)
```typescript
interface FieldVisibility {
  table: string;
  field: string;
  visible_to_roles: string[];
  mask_value?: string; // قيمة بديلة للإخفاء
}
```

| الحقل | الجدول | يظهر لـ | القيمة البديلة |
|-------|--------|---------|---------------|
| سعر التكلفة | products | مالك، مدير، محاسب | `***` |
| هامش الربح | sales_invoices | مالك، مدير | `***` |
| بيانات المورد | purchase_orders | مالك، مدير، محاسب | إخفاء كامل |

---

## 🗄 قاعدة البيانات

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    roles     │       │  user_roles  │       │    users     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │◄──────│ role_id      │       │ id           │
│ tenant_id    │       │ user_id      │──────►│ tenant_id    │
│ company_id   │       │ tenant_id    │       │ company_id   │
│ code         │       │ assigned_by  │       │ full_name    │
│ name_ar      │       │ is_active    │       └──────────────┘
│ name_en      │       └──────────────┘
│ level        │
│ permissions  │       ┌──────────────────────┐
│ is_system    │       │  role_delegations    │
│ is_custom    │       ├──────────────────────┤
└──────────────┘       │ id                   │
                       │ delegator_role_id    │
                       │ delegatee_role_id    │
                       │ can_create_roles     │
                       │ can_manage_users     │
                       │ max_level            │
                       └──────────────────────┘

┌──────────────────────┐   ┌──────────────────────┐
│  visibility_rules    │   │  user_resource_access│
├──────────────────────┤   ├──────────────────────┤
│ id                   │   │ id                   │
│ tenant_id            │   │ user_id              │
│ company_id           │   │ resource_type        │
│ rule_type            │   │ resource_id          │
│ target_type          │   │ permissions          │
│ target_name          │   │ is_primary           │
│ visible_to_roles[]   │   └──────────────────────┘
│ mask_value           │
└──────────────────────┘
```

### الجداول التفصيلية

#### 1. `roles` - الأدوار
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    level VARCHAR(20) NOT NULL DEFAULT 'operations',
    -- level: 'tenant' | 'company' | 'branch' | 'operations' | 'custom'
    permissions JSONB NOT NULL DEFAULT '{}',
    -- { "accounting": ["read", "write"], "sales": ["read"] }
    is_system BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, company_id, code)
);
```

#### 2. `user_roles` - ربط المستخدمين بالأدوار
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id, company_id)
);
```

#### 3. `role_delegations` - تفويض الصلاحيات
```sql
CREATE TABLE role_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    delegator_role_id UUID NOT NULL REFERENCES roles(id),
    delegatee_role_id UUID NOT NULL REFERENCES roles(id),
    can_create_roles BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_assign_roles BOOLEAN DEFAULT false,
    max_delegable_level VARCHAR(20) DEFAULT 'operations',
    -- المستوى الأقصى الذي يمكن تفويضه
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(delegator_role_id, delegatee_role_id)
);
```

#### 4. `visibility_rules` - قواعد الإخفاء
```sql
CREATE TABLE visibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL,
    -- 'page' | 'field' | 'module'
    target_type VARCHAR(50) NOT NULL,
    -- للصفحات: 'profit_loss_report'
    -- للحقول: 'products.cost_price'
    target_name VARCHAR(100) NOT NULL,
    visible_to_roles UUID[] NOT NULL DEFAULT '{}',
    hidden_from_roles UUID[] DEFAULT '{}',
    mask_value VARCHAR(50),
    -- القيمة البديلة عند الإخفاء
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `user_resource_access` - ربط المستخدمين بالموارد
```sql
CREATE TABLE user_resource_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    resource_type VARCHAR(30) NOT NULL,
    -- 'branch' | 'warehouse' | 'cash_account'
    resource_id UUID NOT NULL,
    permissions JSONB DEFAULT '{"read": true}',
    -- {"read": true, "write": true, "delete": false}
    is_primary BOOLEAN DEFAULT false,
    -- هل هو المورد الرئيسي للمستخدم
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, resource_type, resource_id)
);
```

---

## ⚙️ الخدمات (Services)

### 1. `rbacService.ts` - الخدمة الرئيسية

```typescript
// الوظائف الأساسية
interface RBACService {
  // إدارة الأدوار
  getRoles(filters?: RoleFilters): Promise<Role[]>;
  createRole(data: CreateRoleDTO): Promise<Role>;
  updateRole(id: string, data: UpdateRoleDTO): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  duplicateRole(id: string, newCode: string): Promise<Role>;
  
  // إدارة المستخدمين
  getUserRoles(userId: string): Promise<UserRole[]>;
  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  
  // ربط الموارد
  getUserResources(userId: string, type?: ResourceType): Promise<UserResource[]>;
  assignResourceToUser(userId: string, type: ResourceType, resourceId: string, permissions: Permissions): Promise<void>;
  removeResourceFromUser(userId: string, type: ResourceType, resourceId: string): Promise<void>;
  
  // التحقق من الصلاحيات
  checkPermission(userId: string, module: string, permission: Permission): Promise<boolean>;
  checkResourceAccess(userId: string, type: ResourceType, resourceId: string): Promise<boolean>;
  
  // التفويض
  getDelegations(roleId: string): Promise<Delegation[]>;
  createDelegation(data: CreateDelegationDTO): Promise<Delegation>;
  
  // الإخفاء
  getVisibilityRules(companyId: string): Promise<VisibilityRule[]>;
  createVisibilityRule(data: CreateVisibilityRuleDTO): Promise<VisibilityRule>;
  checkFieldVisibility(field: string, userRoles: string[]): Promise<boolean>;
  checkPageVisibility(page: string, userRoles: string[]): Promise<boolean>;
}
```

### 2. `useRBAC.ts` - React Hook

```typescript
interface UseRBACReturn {
  // الحالة
  roles: Role[];
  userPermissions: UserPermissions;
  loading: boolean;
  
  // التحقق
  hasPermission: (module: string, permission: Permission) => boolean;
  hasResourceAccess: (type: ResourceType, id: string) => boolean;
  canSee: (target: string) => boolean; // للصفحات والحقول
  
  // الإجراءات
  refreshPermissions: () => Promise<void>;
}
```

---

## 🖥 واجهة المستخدم

### هيكل الصفحة الرئيسية

```
إعدادات الصلاحيات (/settings/permissions)
│
├── 📁 تبويب: إدارة الأدوار
│   ├── قائمة الأدوار (جدول)
│   │   ├── كود الدور
│   │   ├── الاسم
│   │   ├── المستوى
│   │   ├── عدد المستخدمين
│   │   └── الإجراءات (تعديل/حذف/نسخ)
│   ├── إنشاء دور جديد (زر)
│   └── تعديل دور (Sheet)
│       ├── البيانات الأساسية
│       └── مصفوفة الصلاحيات (Checkbox Grid)
│
├── 👥 تبويب: إدارة المستخدمين
│   ├── قائمة المستخدمين (جدول)
│   │   ├── الاسم
│   │   ├── البريد
│   │   ├── الدور/الأدوار
│   │   ├── الموارد المرتبطة
│   │   └── الإجراءات (تعديل)
│   └── تعديل مستخدم (Sheet)
│       ├── تحديد الأدوار
│       ├── ربط الفروع
│       ├── ربط المستودعات
│       └── ربط الصناديق
│
├── 🔗 تبويب: ربط الموارد (اختياري)
│   ├── مصفوفة المستخدمين × الفروع
│   ├── مصفوفة المستخدمين × المستودعات
│   └── مصفوفة المستخدمين × الصناديق
│
├── 🔒 تبويب: قواعد الإخفاء
│   ├── إخفاء الصفحات
│   │   └── قائمة: الصفحة ← الأدوار المسموحة
│   └── إخفاء الحقول
│       └── قائمة: الحقل ← الأدوار المسموحة
│
└── 🔄 تبويب: التفويضات
    └── مصفوفة: من يستطيع إدارة من
```

---

## 📝 أمثلة عملية

### مثال 1: تفويض المحاسب لإدارة صلاحيات الصرافين

```typescript
// 1. إنشاء تفويض
await rbacService.createDelegation({
  delegator_role_id: 'company_admin_role_id',
  delegatee_role_id: 'accountant_role_id',
  can_manage_users: true,
  can_assign_roles: true,
  max_delegable_level: 'operations' // فقط أدوار العمليات
});

// 2. الآن المحاسب يستطيع
await rbacService.assignRoleToUser('new_cashier_id', 'cashier_role_id');
```

### مثال 2: إخفاء تقرير الأرباح عن الجميع ماعدا المالك

```typescript
await rbacService.createVisibilityRule({
  rule_type: 'page',
  target_type: 'report',
  target_name: 'profit_loss_report',
  visible_to_roles: ['tenant_owner_role_id'],
  hidden_from_roles: [] // يُخفى عن الجميع ماعدا المحددين
});
```

### مثال 3: إخفاء قسم الموردين عن المستودعات والمبيعات

```typescript
await rbacService.createVisibilityRule({
  rule_type: 'module',
  target_type: 'module',
  target_name: 'suppliers',
  visible_to_roles: ['tenant_owner', 'company_admin', 'accountant'],
  hidden_from_roles: ['warehouse_manager', 'sales_rep', 'cashier']
});
```

---

## 🚀 خطة التنفيذ

### المرحلة 1: قاعدة البيانات ✅
- [ ] إنشاء/تحديث جداول RBAC
- [ ] إضافة الأدوار الافتراضية
- [ ] إنشاء RLS policies
- [ ] إنشاء الدوال المساعدة

### المرحلة 2: الخدمات (Backend)
- [ ] إنشاء `rbacService.ts`
- [ ] إنشاء `useRBAC.ts` hook
- [ ] إنشاء `PermissionGuard` component
- [ ] اختبار الخدمات

### المرحلة 3: واجهة المستخدم (Frontend)
- [ ] صفحة إدارة الأدوار
- [ ] صفحة إدارة المستخدمين
- [ ] صفحة قواعد الإخفاء
- [ ] تكامل مع الموديولات الأخرى

### المرحلة 4: التحسينات
- [ ] تحسين الأداء
- [ ] إضافة التدقيق (Audit Log)
- [ ] تحسين UX

---

## 📚 المراجع

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [RBAC Best Practices](https://docs.microsoft.com/en-us/azure/role-based-access-control)

---

**آخر تحديث**: 2026-02-05
**المؤلف**: TexaCore Development Team
