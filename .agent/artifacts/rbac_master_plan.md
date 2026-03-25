# 🔐 خطة الصلاحيات الشاملة — TexaCore ERP
# RBAC Master Plan — Role-Based Access Control

> ⚠️ **هذا الملف أصبح مرجعاً تاريخياً (أرشيف)**
> **الخطة الرسمية الحالية:** `.agent/artifacts/next_phase_plan.md` — القسم: المرحلة 1
> تاريخ الأرشفة: 2026-02-18

> **تاريخ: 2026-02-18**
> **الإصدار:** 1.0
> **الحالة:** ~~مخطط~~ → أُدمج في الخطة الموحدة

---

## 📌 الفهرس

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [البنية التحتية الحالية](#2-البنية-التحتية-الحالية)
3. [هيكل الأدوار والمجموعات](#3-هيكل-الأدوار-والمجموعات)
4. [الصلاحيات العامة (Module Permissions)](#4-الصلاحيات-العامة)
5. [الصلاحيات الخاصة (Special Permissions)](#5-الصلاحيات-الخاصة)
6. [صلاحيات عرض البيانات (Column Visibility)](#6-صلاحيات-عرض-البيانات)
7. [صلاحيات الموارد (Resource Access)](#7-صلاحيات-الموارد)
8. [قواعد الإخفاء (Visibility Rules)](#8-قواعد-الإخفاء)
9. [واجهة إدارة الصلاحيات](#9-واجهة-إدارة-الصلاحيات)
10. [خطة التنفيذ](#10-خطة-التنفيذ)

---

## 1. ملخص تنفيذي

### ماذا نملك؟
نظام RBAC **مبني ومتكامل** يشمل:
- ✅ 7 جداول (roles, user_roles, role_delegations, visibility_rules, user_resource_access, brands, notifications)
- ✅ 10 أدوار افتراضية
- ✅ 5 SQL Functions للتحقق
- ✅ 4 ملفات خدمية (rbacService.ts, useRBAC.ts, useTradePermissions.ts, RolesManagementTab.tsx)
- ✅ واجهة إدارة أدوار في الإعدادات
- ✅ فلترة الـ Sidebar حسب الدور
- ✅ PermissionGuard + HiddenField components

### ماذا ينقص؟
| الفئة | الوصف | الأولوية |
|-------|-------|----------|
| **صلاحيات خاصة** | تعديل مرحّل / فترة مقفلة / حذف مرحّل | 🔴 عالية |
| **فحص فعلي في الخدمات** | الخدمات لا تفحص الصلاحيات — الواجهة فقط تخفي | 🔴 عالية |
| **إدارة المستخدمين** | لا توجد شاشة لإدارة المستخدمين وأدوارهم | 🟡 متوسطة |
| **إدارة الموارد** | لا توجد شاشة لربط المستخدمين بالفروع/المستودعات | 🟡 متوسطة |
| **تقارير الصلاحيات** | لا يوجد تقرير "من يملك صلاحية X" | 🟢 منخفضة |
| **سجل تغييرات الصلاحيات** | لا يوجد تتبع لمن غيّر صلاحية مَن | 🟢 منخفضة |

---

## 2. البنية التحتية الحالية

### 2.1 الجداول

```
┌──────────────────────┐     ┌──────────────────────┐
│       roles           │     │     user_roles        │
│──────────────────────│     │──────────────────────│
│ id UUID PK           │←────│ role_id UUID FK       │
│ tenant_id UUID FK    │     │ user_id UUID FK       │
│ company_id UUID FK   │     │ tenant_id UUID FK     │
│ code VARCHAR(50)     │     │ company_id UUID FK    │
│ name_ar / name_en    │     │ assigned_by UUID FK   │
│ level (6 مستويات)    │     │ is_active BOOLEAN     │
│ permissions JSONB    │     │ expires_at TIMESTAMPTZ│
│ visible_modules TEXT[]│     └──────────────────────┘
│ is_system BOOLEAN    │
│ can_be_deleted BOOL  │     ┌──────────────────────┐
│ icon / color         │     │ visibility_rules      │
└──────────────────────┘     │──────────────────────│
                              │ rule_type (5 أنواع)  │
┌──────────────────────┐     │ target_type           │
│ user_resource_access  │     │ target_name           │
│──────────────────────│     │ visible_to_roles UUID[]│
│ user_id UUID FK      │     │ hidden_from_roles UUID[]│
│ resource_type (5)    │     │ mask_value VARCHAR    │
│ resource_id UUID     │     └──────────────────────┘
│ permissions JSONB    │
│ is_primary BOOLEAN   │     ┌──────────────────────┐
└──────────────────────┘     │ role_delegations      │
                              │──────────────────────│
                              │ delegator_role_id FK │
                              │ delegatee_role_id FK │
                              │ can_create_roles     │
                              │ can_manage_users     │
                              │ max_delegable_level  │
                              └──────────────────────┘
```

### 2.2 SQL Functions

| الدالة | الغرض | مُستخدمة في |
|--------|-------|-------------|
| `check_user_permission(user_id, module, permission)` | فحص صلاحية مستخدم | RLS Policies |
| `check_user_resource_access(user_id, type, id, perm)` | فحص وصول لمورد | RLS Policies |
| `check_visibility(user_id, rule_type, target_type, name)` | فحص قاعدة إخفاء | RLS Policies |
| `get_user_permissions(user_id)` | كل الصلاحيات | Frontend Hook |
| `can_delegate_to_role(user_id, target_role_id)` | فحص تفويض | تفويض الأدوار |

### 2.3 ملفات الكود

| الملف | السطور | الدور |
|-------|--------|-------|
| `src/services/rbacService.ts` | 1173 | الخدمة الرئيسية — CRUD للأدوار والموارد |
| `src/hooks/useRBAC.ts` | 518 | React Hook — فحص الصلاحيات + PermissionGuard + HiddenField |
| `src/hooks/useTradePermissions.ts` | 215 | Hook متخصص — صلاحيات الأعمدة والأفعال التجارية |
| `src/features/settings/components/RolesManagementTab.tsx` | 631 | واجهة إدارة الأدوار |
| `src/components/layout/Sidebar.tsx` | — | فلترة الموديولات حسب visible_modules |

---

## 3. هيكل الأدوار والمجموعات

### 3.1 الهرم التنظيمي (6 مستويات)

```
المستوى 1: system    ← مدير المنصة (أنت) — غير مرئي للعملاء
  │
المستوى 2: tenant    ← مالك المستأجر (المشترك) — أعلى صلاحية للعميل
  │
المستوى 3: company   ← مدير الشركة — يدير شركة واحدة
  │
المستوى 4: branch    ← مدير الفرع — يدير فرع واحد
  │
المستوى 5: operations ← أدوار وظيفية (محاسب، كاشير، مستودع...)
  │
المستوى 6: custom    ← أدوار مخصصة يُنشئها العميل
```

### 3.2 الأدوار الافتراضية (10 أدوار)

| # | الكود | العربي | المستوى | اللون | الأيقونة | النطاق |
|---|-------|--------|---------|-------|----------|--------|
| 1 | `super_admin` | مدير المنصة | system | 🔴 red | ShieldCheck | **كل شيء** — tenant_id = NULL |
| 2 | `tenant_owner` | مالك المستأجر | tenant | 🟣 purple | Crown | tenant_id = NULL (عام) |
| 3 | `company_admin` | مدير الشركة | company | 🔵 blue | Building2 | tenant_id = X (لكل tenant) |
| 4 | `branch_manager` | مدير الفرع | branch | 🟢 green | Store | tenant_id = X |
| 5 | `accountant` | محاسب | operations | 🟡 amber | Calculator | tenant_id = X |
| 6 | `cashier` | أمين صندوق | operations | 🔵 cyan | Wallet | tenant_id = X |
| 7 | `warehouse_manager` | مدير مستودع | operations | 🟠 orange | Warehouse | tenant_id = X |
| 8 | `sales_rep` | مندوب مبيعات | operations | 🩷 pink | UserCircle | tenant_id = X |
| 9 | `purchasing_manager` | مسؤول مشتريات | operations | 🟢 lime | ShoppingCart | tenant_id = X |
| 10 | `viewer` | مشاهد فقط | custom | ⚪ gray | Eye | tenant_id = X |

### 3.3 أدوار مقترحة (مستقبلية)

| الكود | العربي | المستوى | الاستخدام |
|-------|--------|---------|-----------|
| `sales_manager` | مدير المبيعات | operations | يرى هوامش الربح + يعطي خصومات |
| `auditor` | مراقب حسابات | operations | قراءة فقط + وصول لسجل التعديلات |
| `hr_manager` | مدير الموارد البشرية | operations | إدارة الموظفين والرواتب |
| `driver` | سائق | operations | تطبيق الموبايل — تسليم/استلام |
| `cutting_center` | مركز القص | operations | تطبيق الموبايل — قص الأقمشة |

---

## 4. الصلاحيات العامة (Module Permissions)

### 4.1 الأنواع الحالية

```typescript
export type Permission = 'read' | 'write' | 'delete';
```

### 4.2 مصفوفة الصلاحيات الافتراضية

| الموديول | super_admin | tenant_owner | company_admin | branch_mgr | accountant | cashier | warehouse | sales_rep | purchaser | viewer |
|----------|:-----------:|:------------:|:-------------:|:----------:|:----------:|:-------:|:---------:|:---------:|:---------:|:------:|
| accounting | all | RWD | RWD | RW | RWD | — | — | — | — | R |
| treasury | all | RWD | RWD | RW | RW | RWD | — | R | — | R |
| sales | all | RWD | RWD | RWD | R | RW | R | RWD | — | R |
| purchases | all | RWD | RWD | RW | RW | — | R | — | RWD | R |
| inventory | all | RWD | RWD | RW | R | — | RWD | R | R | R |
| warehouse | all | RWD | RWD | RW | — | — | RWD | — | — | — |
| customers | all | RWD | RWD | RWD | — | — | — | RW | — | R |
| suppliers | all | RWD | RWD | R | R | — | — | — | RWD | — |
| employees | all | RWD | RWD | — | — | — | — | — | — | — |
| reports | all | RWD | RW | R | R | R | R | R | R | R |
| settings | all | RWD | RW | — | — | — | — | — | — | — |
| permissions | all | RWD | RW | — | — | — | — | — | — | — |

> **R** = read, **W** = write, **D** = delete, **—** = لا صلاحية

### 4.3 الموديولات المتاحة (AVAILABLE_MODULES)

```
dashboard, accounting, treasury, sales, purchases, inventory, 
warehouse, fabric, pharmacy, healthcare, doctors, restaurant, 
gold, shipments, crm, pos, real_estate, exchange, manufacturing, 
hr, e-commerce, saas, ai_analytics, activity_log, component_lab, 
system_config, reports, settings, finance
```

---

## 5. الصلاحيات الخاصة (Special Permissions) — **جديد**

### 5.1 المفهوم

إضافة حقل `special_permissions JSONB` في جدول `roles` لصلاحيات لا تندرج تحت read/write/delete:

```json
{
  "can_edit_posted_purchases": true,
  "can_edit_posted_sales": true,
  "can_edit_posted_journal": true,
  "can_edit_closed_period": false,
  "can_delete_posted": false,
  "can_void_documents": true,
  "can_unpost": true,
  "can_approve_discount": true,
  "can_set_discount_above_limit": false,
  "can_change_document_date": true,
  "can_change_period": false,
  "can_manage_users": true,
  "can_manage_roles": false,
  "can_export_data": true,
  "can_import_data": false,
  "can_view_audit_log": true,
  "can_view_edit_history": true,
  "can_merge_accounts": false,
  "can_close_period": false,
  "can_reopen_period": false
}
```

### 5.2 تصنيف الصلاحيات الخاصة

#### 📝 صلاحيات التعديل (Edit Permissions)

| الصلاحية | الوصف بالعربي | الوصف بالإنجليزي |
|----------|---------------|------------------|
| `can_edit_posted_purchases` | تعديل فاتورة مشتريات مرحّلة | Edit posted purchase invoices |
| `can_edit_posted_sales` | تعديل فاتورة مبيعات مرحّلة | Edit posted sales invoices |
| `can_edit_posted_journal` | تعديل قيد محاسبي مرحّل | Edit posted journal entries |
| `can_edit_closed_period` | تعديل في فترة محاسبية مقفلة | Edit in closed accounting period |
| `can_change_document_date` | تغيير تاريخ المستند | Change document date |

#### 🗑️ صلاحيات الحذف والإلغاء (Delete & Void)

| الصلاحية | الوصف بالعربي | الوصف بالإنجليزي |
|----------|---------------|------------------|
| `can_delete_posted` | حذف مستندات مرحّلة | Delete posted documents |
| `can_void_documents` | إلغاء مستندات (Void) | Void documents |
| `can_unpost` | إلغاء ترحيل | Unpost entries |

#### 📊 صلاحيات المحاسبة (Accounting)

| الصلاحية | الوصف بالعربي | الوصف بالإنجليزي |
|----------|---------------|------------------|
| `can_close_period` | إقفال فترة محاسبية | Close accounting period |
| `can_reopen_period` | فتح فترة محاسبية مقفلة | Reopen closed period |
| `can_merge_accounts` | دمج حسابات | Merge chart of accounts |
| `can_change_period` | تغيير السنة المالية | Change fiscal year |

#### 💰 صلاحيات المبيعات (Sales)

| الصلاحية | الوصف بالعربي | الوصف بالإنجليزي |
|----------|---------------|------------------|
| `can_approve_discount` | اعتماد خصم | Approve discount |
| `can_set_discount_above_limit` | خصم أعلى من الحد | Set discount above limit |

#### 👥 صلاحيات الإدارة (Administration)

| الصلاحية | الوصف بالعربي | الوصف بالإنجليزي |
|----------|---------------|------------------|
| `can_manage_users` | إدارة المستخدمين | Manage users |
| `can_manage_roles` | إدارة الأدوار | Manage roles |
| `can_export_data` | تصدير البيانات | Export data |
| `can_import_data` | استيراد البيانات | Import data |
| `can_view_audit_log` | عرض سجل المراجعة | View audit log |
| `can_view_edit_history` | عرض سجل التعديلات | View edit history |

### 5.3 مصفوفة الصلاحيات الخاصة الافتراضية

| الصلاحية | super | tenant | company | branch | account | cashier | wh_mgr | sales | purch | viewer |
|----------|:-----:|:------:|:-------:|:------:|:-------:|:-------:|:------:|:-----:|:-----:|:------:|
| **التعديل** | | | | | | | | | | |
| edit_posted_purchases | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| edit_posted_sales | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit_posted_journal | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit_closed_period | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| change_document_date | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **الحذف والإلغاء** | | | | | | | | | | |
| delete_posted | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| void_documents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| unpost | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **المحاسبة** | | | | | | | | | | |
| close_period | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reopen_period | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| merge_accounts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **المبيعات** | | | | | | | | | | |
| approve_discount | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| discount_above_limit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **الإدارة** | | | | | | | | | | |
| manage_users | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| manage_roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| export_data | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| import_data | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view_audit_log | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view_edit_history | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 6. صلاحيات عرض البيانات (Column Visibility)

### 6.1 الوضع الحالي

`useTradePermissions.ts` يتحكم في رؤية 10 أعمدة حساسة:

| العمود | super/tenant/co. admin | محاسب | مدير مشتريات | مدير مبيعات | مندوب | مستودع | موظف |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| unit_price | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| cost_price | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| profit_margin | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| total_cost | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| discount | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| tax | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| supplier_price | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| shipping_cost | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| expenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| net_profit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 6.2 التحسينات المقترحة

1. **نقل قواعد الأعمدة إلى `visibility_rules`** بدلاً من hardcode في الكود
2. **دعم mask_value** لكل عمود (مثلاً `***` بدل إخفاء كامل)
3. **إضافة أعمدة جديدة:**
   - `purchase_price` — سعر الشراء في فاتورة المبيعات
   - `customer_balance` — رصيد العميل
   - `supplier_balance` — رصيد المورد
   - `salary` — الراتب (HR)

---

## 7. صلاحيات الموارد (Resource Access)

### 7.1 أنواع الموارد

```typescript
export type ResourceType = 'branch' | 'warehouse' | 'cash_account' | 'bank_account' | 'cost_center';
```

### 7.2 كيف تعمل

```
┌──────────────────────────────────────────────────────────┐
│  المستخدم: أحمد (محاسب)                                  │
│  الموارد المربوطة:                                         │
│  ├── branch: الفرع الرئيسي ✅ (primary)                   │
│  ├── branch: فرع جدة ✅                                   │
│  ├── warehouse: المستودع المركزي ✅ (read + write)         │
│  ├── cash_account: صندوق الفرع الرئيسي ✅ (read + write)  │
│  └── bank_account: بنك الراجحي ✅ (read only)             │
│                                                           │
│  نتيجة: أحمد يرى فقط البيانات المرتبطة بهذه الفروع       │
│  والمستودعات والحسابات                                     │
└──────────────────────────────────────────────────────────┘
```

### 7.3 التحسينات المقترحة

1. **واجهة ربط الموارد** — شاشة في الإعدادات لربط المستخدمين بالفروع والمستودعات
2. **فلترة RLS** — إضافة `user_resource_access` في سياسات RLS للفواتير والمخزون
3. **وراثة الموارد** — مدير الفرع يرث وصول كل موظفي فرعه

---

## 8. قواعد الإخفاء (Visibility Rules)

### 8.1 أنواع القواعد

| النوع | الأمثلة |
|-------|---------|
| `page` | إخفاء صفحة تقرير الأرباح عن غير المديرين |
| `field` | إخفاء عمود سعر التكلفة عن المبيعات |
| `module` | إخفاء قسم الموردين عن المستودعات |
| `report` | إخفاء تقرير الميزانية عن غير المحاسبين |
| `action` | إخفاء زر الحذف عن غير المديرين |

### 8.2 القواعد الافتراضية المسجلة

| القاعدة | النوع | مَن يراها |
|---------|-------|-----------|
| تقرير الأرباح والخسائر | report | tenant_owner فقط |
| هامش الربح على الفواتير | field | tenant_owner + company_admin |
| سعر تكلفة المنتجات | field | tenant_owner + company_admin + accountant |
| قسم الموردين | module | tenant_owner + company_admin + accountant + purchasing_manager |

### 8.3 التحسينات المقترحة

1. **واجهة إدارة القواعد** — شاشة لإضافة/تعديل/حذف قواعد الإخفاء
2. **قواعد على مستوى الشركة** — كل شركة لها قواعد مختلفة
3. **أولوية القواعد** — قاعدة ذات أولوية أعلى تتجاوز الأدنى

---

## 9. واجهة إدارة الصلاحيات

### 9.1 الوضع الحالي

`RolesManagementTab.tsx` (631 سطر) — يدعم:
- ✅ عرض قائمة الأدوار
- ✅ إنشاء دور جديد
- ✅ تعديل دور (الاسم، المستوى، اللون، الأيقونة)
- ✅ تبديل صلاحيات الموديولات (read/write/delete)
- ✅ تبديل الموديولات المرئية
- ✅ تكرار دور
- ✅ حذف دور (غير نظامي)

### 9.2 الشاشات المطلوبة

#### شاشة A: إدارة المستخدمين والأدوار
```
┌─────────────────────────────────────────────────────────┐
│ 👥 إدارة المستخدمين                                     │
├─────────────────────────────────────────────────────────┤
│ 🔍 بحث: [___________]      فلتر الدور: [كل الأدوار ▾]  │
├─────────────────────────────────────────────────────────┤
│ ┌────┬──────────┬──────────────┬────────────┬─────────┐ │
│ │ #  │ المستخدم │ الدور        │ الفرع      │ الحالة  │ │
│ ├────┼──────────┼──────────────┼────────────┼─────────┤ │
│ │ 1  │ أحمد     │ 🟡 محاسب    │ الرئيسي    │ ✅ نشط  │ │
│ │ 2  │ محمد     │ 🟢 مدير فرع │ جدة        │ ✅ نشط  │ │
│ │ 3  │ سارة     │ 🩷 مبيعات   │ الرئيسي    │ ✅ نشط  │ │
│ │ 4  │ خالد     │ 🟠 مستودع   │ المركزي    │ ⏸️ معلق │ │
│ └────┴──────────┴──────────────┴────────────┴─────────┘ │
│                                                         │
│ [➕ إضافة مستخدم]  [📥 استيراد]  [📤 تصدير]            │
└─────────────────────────────────────────────────────────┘
```

---

#### شاشة B: تعديل دور — مع الصلاحيات الخاصة
```
┌─────────────────────────────────────────────────────────┐
│ ✏️ تعديل الدور: مدير الشركة                             │
├─────────────────────────────────────────────────────────┤
│ تبويب: [عام] [صلاحيات الموديولات] [👉 صلاحيات خاصة]    │
│                                          [الموارد]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📝 صلاحيات التعديل                                      │
│ ┌────────────────────────────┬────────────┐              │
│ │ تعديل مشتريات مرحّلة      │ [✅ مفعّل] │              │
│ │ تعديل مبيعات مرحّلة        │ [✅ مفعّل] │              │
│ │ تعديل قيود مرحّلة          │ [✅ مفعّل] │              │
│ │ تعديل في فترة مقفلة       │ [❌ معطل]  │              │
│ │ تغيير تاريخ المستند        │ [✅ مفعّل] │              │
│ └────────────────────────────┴────────────┘              │
│                                                         │
│ 🗑️ صلاحيات الحذف والإلغاء                              │
│ ┌────────────────────────────┬────────────┐              │
│ │ حذف مستندات مرحّلة         │ [❌ معطل]  │              │
│ │ إلغاء مستندات              │ [✅ مفعّل] │              │
│ │ إلغاء ترحيل                │ [✅ مفعّل] │              │
│ └────────────────────────────┴────────────┘              │
│                                                         │
│ 📊 صلاحيات المحاسبة                                     │
│ ┌────────────────────────────┬────────────┐              │
│ │ إقفال فترة محاسبية         │ [✅ مفعّل] │              │
│ │ فتح فترة مقفلة             │ [❌ معطل]  │              │
│ │ دمج حسابات                 │ [❌ معطل]  │              │
│ └────────────────────────────┴────────────┘              │
│                                                         │
│                            [💾 حفظ]  [إلغاء]            │
└─────────────────────────────────────────────────────────┘
```

---

#### شاشة C: ربط الموارد بالمستخدم
```
┌─────────────────────────────────────────────────────────┐
│ 🔗 موارد المستخدم: أحمد (محاسب)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🏢 الفروع                                               │
│ ┌──────────────┬──────────┬─────────────┬──────────────┐ │
│ │ الفرع        │ الرئيسي؟ │ الصلاحيات   │              │ │
│ ├──────────────┼──────────┼─────────────┼──────────────┤ │
│ │ الفرع الرئيسي│ ⭐       │ قراءة+كتابة │ [🗑️ إزالة]  │ │
│ │ فرع جدة      │          │ قراءة فقط   │ [🗑️ إزالة]  │ │
│ └──────────────┴──────────┴─────────────┴──────────────┘ │
│ [➕ إضافة فرع]                                          │
│                                                         │
│ 🏭 المستودعات                                           │
│ ┌──────────────┬──────────┬─────────────┬──────────────┐ │
│ │ المستودع     │ الرئيسي؟ │ الصلاحيات   │              │ │
│ ├──────────────┼──────────┼─────────────┼──────────────┤ │
│ │ المركزي      │ ⭐       │ قراءة+كتابة │ [🗑️ إزالة]  │ │
│ └──────────────┴──────────┴─────────────┴──────────────┘ │
│ [➕ إضافة مستودع]                                       │
│                                                         │
│ 💰 الصناديق والحسابات                                   │
│ ┌──────────────┬──────────┬─────────────┬──────────────┐ │
│ │ الحساب       │ النوع    │ الصلاحيات   │              │ │
│ ├──────────────┼──────────┼─────────────┼──────────────┤ │
│ │ صندوق الفرع  │ نقدي     │ قراءة+كتابة │ [🗑️ إزالة]  │ │
│ │ بنك الراجحي  │ بنكي     │ قراءة فقط   │ [🗑️ إزالة]  │ │
│ └──────────────┴──────────┴─────────────┴──────────────┘ │
│ [➕ إضافة حساب]                                         │
│                                                         │
│                            [💾 حفظ]  [إلغاء]            │
└─────────────────────────────────────────────────────────┘
```

---

## 10. خطة التنفيذ

### المرحلة R-1: الصلاحيات الخاصة (Special Permissions) — ⏱️ 1 ساعة
> **الاعتمادية:** لا شيء — مستقل

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-1.1 | SQL Migration: إضافة `special_permissions` + تحديث الأدوار | `20260219_special_permissions.sql` | 10 دق |
| R-1.2 | SQL Function: `check_special_permission()` | نفس الملف | 5 دق |
| R-1.3 | تحديث `rbacService.ts` — إضافة `checkSpecialPermission()` | `rbacService.ts` | 10 دق |
| R-1.4 | تحديث `useRBAC.ts` — إضافة `hasSpecialPermission()` | `useRBAC.ts` | 10 دق |
| R-1.5 | تحديث `useTradePermissions.ts` — استبدال hardcode بـ specialPermissions | `useTradePermissions.ts` | 15 دق |
| R-1.6 | دمج في `inPlaceEditService.ts` — فحص الصلاحية قبل السماح بالتعديل | `inPlaceEditService.ts` | 10 دق |

### المرحلة R-2: واجهة الصلاحيات الخاصة — ⏱️ 45 دقيقة
> **الاعتمادية:** R-1

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-2.1 | تبويب "صلاحيات خاصة" في RolesManagementTab | `RolesManagementTab.tsx` | 30 دق |
| R-2.2 | تصنيف الصلاحيات في مجموعات (تعديل / حذف / محاسبة / مبيعات / إدارة) | نفس الملف | 15 دق |

### المرحلة R-3: إدارة المستخدمين — ⏱️ 2 ساعة
> **الاعتمادية:** R-1

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-3.1 | شاشة قائمة المستخدمين مع فلتر بالدور | `UsersManagementTab.tsx` (جديد) | 45 دق |
| R-3.2 | Sheet تعيين/تغيير دور مستخدم | نفس الملف | 30 دق |
| R-3.3 | Sheet ربط الموارد (فروع / مستودعات / حسابات) | `UserResourcesSheet.tsx` (جديد) | 30 دق |
| R-3.4 | دمج التبويب في SystemConfigPage | `SystemConfigPage.tsx` | 15 دق |

### المرحلة R-4: فحص Backend (Server-side Enforcement) — ⏱️ 1 ساعة
> **الاعتمادية:** R-1

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-4.1 | فحص صلاحيات التعديل في `inPlaceEditService.ts` | `inPlaceEditService.ts` | 15 دق |
| R-4.2 | فحص صلاحيات الترحيل/إلغاء الترحيل في `purchaseAccountingService.ts` | `purchaseAccountingService.ts` | 15 دق |
| R-4.3 | فحص صلاحيات الحذف في `purchaseTransactionService.ts` | `purchaseTransactionService.ts` | 10 دق |
| R-4.4 | فحص صلاحيات الحذف في `salesTransactionService.ts` | `salesTransactionService.ts` | 10 دق |
| R-4.5 | فحص صلاحيات القيود في `journalEntriesService.ts` | `journalEntriesService.ts` | 10 دق |

### المرحلة R-5: فلترة RLS بالموارد — ⏱️ 45 دقيقة
> **الاعتمادية:** R-3

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-5.1 | RLS Policy: فواتير المشتريات حسب الفرع | SQL Migration | 15 دق |
| R-5.2 | RLS Policy: فواتير المبيعات حسب الفرع | SQL Migration | 10 دق |
| R-5.3 | RLS Policy: حركات المخزون حسب المستودع | SQL Migration | 10 دق |
| R-5.4 | RLS Policy: عمليات الخزينة حسب الصندوق/البنك | SQL Migration | 10 دق |

### المرحلة R-6: واجهة قواعد الإخفاء — ⏱️ 1 ساعة
> **الاعتمادية:** R-1

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-6.1 | شاشة قائمة قواعد الإخفاء | `VisibilityRulesTab.tsx` (جديد) | 30 دق |
| R-6.2 | Sheet إنشاء/تعديل قاعدة + اختيار الأدوار | نفس الملف | 20 دق |
| R-6.3 | دمج التبويب في SystemConfigPage | `SystemConfigPage.tsx` | 10 دق |

### المرحلة R-7: تقارير وسجل الصلاحيات — ⏱️ 30 دقيقة
> **الاعتمادية:** R-3

| # | المهمة | الملف | الوقت |
|---|--------|-------|-------|
| R-7.1 | تقرير "من يملك صلاحية X" | `PermissionsReportTab.tsx` (جديد) | 20 دق |
| R-7.2 | سجل تغييرات الصلاحيات (audit) | `rbacService.ts` | 10 دق |

---

## ⏱️ ملخص الجهد الإجمالي

| المرحلة | الوصف | الوقت | الأولوية |
|---------|-------|-------|----------|
| **R-1** | الصلاحيات الخاصة (Backend) | 1 ساعة | 🔴 عالية |
| **R-2** | واجهة الصلاحيات الخاصة | 45 دقيقة | 🔴 عالية |
| **R-3** | إدارة المستخدمين | 2 ساعة | 🟡 متوسطة |
| **R-4** | فحص Backend | 1 ساعة | 🔴 عالية |
| **R-5** | فلترة RLS بالموارد | 45 دقيقة | 🟡 متوسطة |
| **R-6** | واجهة قواعد الإخفاء | 1 ساعة | 🟡 متوسطة |
| **R-7** | تقارير وسجل | 30 دقيقة | 🟢 منخفضة |
| | **المجموع** | **~7 ساعات** | |

---

## 📊 مخطط التبعيات

```
R-1 (الصلاحيات الخاصة)
  ├──→ R-2 (واجهة الصلاحيات الخاصة)
  ├──→ R-4 (فحص Backend)  
  └──→ R-6 (قواعد الإخفاء)

R-3 (إدارة المستخدمين) — مستقل عن R-1
  ├──→ R-5 (فلترة RLS بالموارد)
  └──→ R-7 (تقارير وسجل)
```

**يمكن العمل بالتوازي:**
- R-1 → R-2 → R-4 (مسار الصلاحيات)
- R-3 → R-5 → R-7 (مسار المستخدمين والموارد)

---

## 📌 ملاحظات مهمة

> **1. التوافق العكسي:** كل التغييرات إضافية — لا يتأثر أي شيء موجود

> **2. Super Admin:** يتجاوز كل الفحوصات تلقائياً (`permissions.all = true`)

> **3. العلاقة مع Phase 6B-D:** المراحل D-2, D-3, D-4 (التعديل المباشر) تعتمد على R-1 (الصلاحيات الخاصة) لفحص `can_edit_posted_*` قبل السماح بالتعديل

> **4. العلاقة مع `useTradePermissions`:** سيتم تحديثه في R-1.5 ليقرأ الصلاحيات من `special_permissions` بدلاً من hardcode

> **5. الموبايل (`TexaMobile`):** التطبيق يستخدم نفس الـ API ونفس جداول الصلاحيات — لا يحتاج تعديل منفصل
