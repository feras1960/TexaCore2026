# 📚 التوثيق الشامل لـ TexaCore ERP
# Complete System Documentation

<div align="center">

![TexaCore ERP](https://img.shields.io/badge/TexaCore-ERP-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0-green?style=for-the-badge)
![Tables](https://img.shields.io/badge/Tables-172-orange?style=for-the-badge)
![Features](https://img.shields.io/badge/Features-85+-purple?style=for-the-badge)

**نظام تخطيط موارد المؤسسات المتكامل لتجارة الأقمشة**

تاريخ التحديث: 2 فبراير 2026

</div>

---

## 📋 فهرس المحتويات الرئيسي

### الجزء الأول: نظرة عامة
1. [مقدمة](#1-مقدمة)
2. [البنية التقنية](#2-البنية-التقنية)
3. [الإحصائيات](#3-الإحصائيات)

### الجزء الثاني: الأقسام التفصيلية
4. [المحاسبة](#4-قسم-المحاسبة)
5. [المستودعات](#5-قسم-المستودعات)
6. [المبيعات](#6-قسم-المبيعات)
7. [المشتريات](#7-قسم-المشتريات)
8. [الوكلاء](#8-قسم-الوكلاء)
9. [Multi-Tenant](#9-نظام-multi-tenant)
10. [SaaS Platform](#10-منصة-saas)

### الجزء الثالث: المراجع
11. [قاموس البيانات](#11-قاموس-البيانات)
12. [قواعد الأعمال](#12-قواعد-الأعمال)
13. [API Reference](#13-api-reference)
14. [قاموس المصطلحات](#14-قاموس-المصطلحات)

---

# الجزء الأول: نظرة عامة

## 1. مقدمة

### 1.1 ما هو TexaCore ERP؟

TexaCore ERP هو نظام متكامل لإدارة موارد المؤسسات مُصمم خصيصاً لتجارة الأقمشة. يعمل كمنصة SaaS متعددة المستأجرين توفر:

- ✅ إدارة محاسبية متكاملة
- ✅ إدارة مستودعات متقدمة مع تتبع الرولونات
- ✅ نظام مبيعات ومشتريات
- ✅ نظام وكلاء وعمولات
- ✅ عزل بيانات كامل (Multi-Tenant)
- ✅ جاهز للبيع كخدمة (SaaS Ready)
- ✅ White Label Support

### 1.2 الفئة المستهدفة

| الفئة | الاستخدام |
|-------|-----------|
| تجار الجملة | إدارة الكونتينرات والمستودعات |
| تجار التجزئة | المبيعات وإدارة العملاء |
| المصانع | تتبع المواد الخام والإنتاج |
| الموزعين | إدارة الوكلاء والعمولات |

### 1.3 اللغات المدعومة

| اللغة | الكود | الاتجاه |
|-------|-------|---------|
| العربية | ar | RTL |
| English | en | LTR |
| Українська | uk | LTR |
| Русский | ru | LTR |
| Türkçe | tr | LTR |
| 中文 | zh | LTR |
| Français | fr | LTR |
| Español | es | LTR |
| Deutsch | de | LTR |

---

## 2. البنية التقنية

### 2.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                     TEXACORE ERP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Frontend      │  │    Backend      │  │   Database      │  │
│  │   ─────────     │  │    ────────     │  │   ──────────    │  │
│  │   React 18      │  │   Supabase      │  │   PostgreSQL    │  │
│  │   TypeScript    │  │   Edge Funcs    │  │   RLS Enabled   │  │
│  │   Vite          │  │   REST API      │  │   172 Tables    │  │
│  │   Tailwind      │  │   Realtime      │  │   400+ Indexes  │  │
│  │   AG-Grid       │  │                 │  │                 │  │
│  │   shadcn/ui     │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                              ↓                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Mobile       │  │    Auth         │  │    Storage      │  │
│  │    ─────────    │  │    ────────     │  │    ──────────   │  │
│  │   React Native  │  │   Supabase Auth │  │   Supabase      │  │
│  │   Expo          │  │   JWT Tokens    │  │   Storage       │  │
│  │   TexaMobile    │  │   RLS Policies  │  │   CDN           │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 هيكل المشروع

```
erpsystem supabase/
├── src/
│   ├── components/          # React Components
│   │   ├── accounting/      # Accounting Module
│   │   ├── warehouse/       # Warehouse Module
│   │   ├── sales/           # Sales Module
│   │   └── ui/              # Shared UI Components
│   ├── services/            # API Service Layer
│   │   ├── accountingService.ts
│   │   ├── warehouseService.ts
│   │   └── ...
│   ├── hooks/               # React Custom Hooks
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript Types
├── supabase/
│   ├── migrations/          # Database Migrations
│   └── functions/           # Edge Functions
├── public/                  # Static Assets
└── package.json
```

---

## 3. الإحصائيات

### 3.1 إحصائيات قاعدة البيانات

| البند | القيمة |
|-------|--------|
| **إجمالي الجداول** | 172 جدول |
| **الفهارس** | 400+ فهرس |
| **العلاقات (FK)** | 150+ علاقة |
| **سياسات RLS** | 100+ سياسة |
| **Functions** | 50+ function |
| **Triggers** | 30+ trigger |

### 3.2 تصنيف الجداول

| القسم | عدد الجداول | نسبة |
|-------|-------------|------|
| المحاسبة | 23 | 13.4% |
| المستودعات | 27 | 15.7% |
| المبيعات | 19 | 11.0% |
| المشتريات | 6 | 3.5% |
| الوكلاء | 12 | 7.0% |
| Multi-Tenant | 16 | 9.3% |
| SaaS | 24 | 14.0% |
| أخرى | 45 | 26.1% |
| **الإجمالي** | **172** | **100%** |

### 3.3 إحصائيات الميزات

| القسم | عدد الميزات |
|-------|-------------|
| المحاسبة | 15 |
| المستودعات | 20 |
| المبيعات | 12 |
| المشتريات | 8 |
| الوكلاء | 10 |
| Multi-Tenant | 8 |
| SaaS | 12 |
| **الإجمالي** | **85+** |

---

# الجزء الثاني: الأقسام التفصيلية

## 4. قسم المحاسبة

### 4.1 نظرة عامة

قسم المحاسبة يوفر نظام محاسبي متكامل يتضمن:
- دليل حسابات شجري متعدد المستويات
- قيود محاسبية مزدوجة
- فترات مالية مع إمكانية الإقفال
- موازنات وتنبيهات
- ضرائب متعددة

### 4.2 الجداول (23 جدول)

| الجدول | الوصف | السجلات |
|--------|-------|---------|
| `chart_of_accounts` | دليل الحسابات | 136 |
| `journal_entries` | القيود المحاسبية | 38 |
| `journal_entry_lines` | بنود القيود | 82 |
| `account_types` | أنواع الحسابات | 12 |
| `fiscal_years` | السنوات المالية | 1 |
| `accounting_periods` | الفترات المحاسبية | - |
| `budgets` | الموازنات | 1 |
| `budget_lines` | بنود الموازنة | 12 |
| `budget_alerts` | تنبيهات الموازنة | 1 |
| `cost_centers` | مراكز التكلفة | - |
| `cash_accounts` | حسابات النقدية | 32 |
| `cash_transactions` | المعاملات النقدية | - |
| `bank_account_limits` | حدود البنوك | 1 |
| `account_transfers` | التحويلات | - |
| `tax_rates` | معدلات الضرائب | - |
| `tax_payment_schedules` | جداول الضرائب | - |
| `recurring_entries` | القيود الدورية | 1 |
| `recurring_entry_lines` | بنود القيود الدورية | 2 |

### 4.3 الميزات (15 ميزة)

#### ✅ دليل الحسابات الشجري
- هيكل هرمي متعدد المستويات
- تصنيف حسب النوع (أصول/خصوم/إيرادات/مصروفات)
- دعم العملات المتعددة

#### ✅ القيود المحاسبية
- قيود مزدوجة مع تحقق من التوازن
- حالات: مسودة، مرحّل، ملغي
- ربط بالمستندات المصدر

#### ✅ الفترات المالية
- سنوات وفترات محاسبية
- إقفال الفترات ومنع التعديل

#### ✅ مراكز التكلفة
- توزيع المصروفات على المراكز
- تقارير حسب المركز

#### ✅ الموازنات
- موازنات سنوية/شهرية
- تتبع الفعلي مقابل المخطط
- تنبيهات عند التجاوز

#### ✅ الضرائب
- معدلات ضريبية متعددة
- جداول دفع الضرائب

### 4.4 العلاقات

```
chart_of_accounts
    ├── parent_id → chart_of_accounts (self-reference)
    ├── company_id → companies
    └── tenant_id → tenants

journal_entries
    ├── company_id → companies
    ├── lines → journal_entry_lines[]
    └── reference_id → (sales_invoices | purchase_invoices | ...)

journal_entry_lines
    ├── journal_entry_id → journal_entries
    ├── account_id → chart_of_accounts
    └── cost_center_id → cost_centers
```

### 4.5 قواعد الأعمال

| الكود | القاعدة |
|-------|---------|
| BR-ACC-001 | مجموع المدين = مجموع الدائن في كل قيد |
| BR-ACC-002 | منع التعديل على الفترات المغلقة |
| BR-ACC-003 | كود الحساب فريد ضمن الشركة |
| BR-ACC-004 | الحساب الأب يجب أن يكون موجوداً |
| BR-ACC-005 | لا يمكن حذف حساب له حركات |

---

## 5. قسم المستودعات

### 5.1 نظرة عامة

قسم المستودعات هو القلب النابض للنظام، مُصمم خصيصاً لتجارة الأقمشة:
- تتبع فردي لكل رولون
- نظام Dye Lot للتحكم في ألوان الأقمشة
- إدارة الكونتينرات من الطلب للاستلام
- حجوزات وعينات
- جرد متعدد الأنواع

### 5.2 الجداول (27 جدول)

| الجدول | الوصف | السجلات |
|--------|-------|---------|
| `warehouses` | المستودعات | 1 |
| `warehouse_settings` | الإعدادات | - |
| `warehouse_assignments` | تعيينات الموظفين | - |
| `bin_locations` | مواقع التخزين | - |
| `fabric_materials` | المواد | 9 |
| `fabric_groups` | تصنيفات الأقمشة | 5 |
| `fabric_colors` | الألوان | 10 |
| `fabric_rolls` | الرولونات | - |
| `containers` | الكونتينرات | 3 |
| `container_items` | بنود الكونتينر | 18 |
| `container_expenses` | مصاريف الكونتينر | 12 |
| `container_cost_allocations` | توزيع التكلفة | - |
| `container_reservations` | حجوزات الكونتينر | 4 |
| `container_quotations` | عروض الأسعار | 3 |
| `delivery_notes` | إذونات التسليم | - |
| `delivery_note_items` | بنود التسليم | - |
| `reservations` | الحجوزات | - |
| `reservation_items` | بنود الحجز | - |
| `sample_cuttings` | العينات | - |
| `sample_cutting_items` | بنود العينات | - |
| `inventory_movements` | حركات المخزون | - |
| `batches` | الدفعات | - |
| `stock_ledger` | سجل المخزون | - |
| `stock_counts` | الجرد | - |
| `stock_count_items` | بنود الجرد | - |

### 5.3 الميزات (20 ميزة)

#### ✅ إدارة المستودعات
```
warehouses
├── main      (المستودع الرئيسي)
├── branch    (فرع)
├── store     (نقطة بيع)
└── van       (مركبة توزيع)
```

#### ✅ مواقع التخزين (Bin Locations)
نظام تحديد المواقع بصيغة: **الممر/الرف/الرفة/الخانة**
```
A-01-03-05
│  │  │  └── الخانة (Bin)
│  │  └───── الرفة (Shelf)
│  └──────── الرف (Rack)
└─────────── الممر (Aisle)
```

#### ✅ إدارة الرولونات
كل رولون له:
- رقم فريد (Roll Number)
- المادة والمورد
- الطول الأولي والحالي
- الكمية المحجوزة
- Dye Lot (دفعة الصباغة)
- درجة الجودة (A/B/C)
- الحالة (متاح/محجوز/مباع)

#### ✅ تتبع Dye Lot
```
الرولونات من نفس الـ Dye Lot لها نفس درجة اللون
مهم جداً لتجنب فروقات اللون في الطلب الواحد
```

#### ✅ نظام الكونتينرات
```
حالات الكونتينر:
ordered → shipped → in_transit → arrived → receiving → completed
   ↓                                           ↓
cancelled                                   ينشئ رولونات
```

#### ✅ نظام الحجوزات
- حجز كميات لعميل معين
- تاريخ انتهاء تلقائي
- عربون اختياري
- إلغاء تلقائي عند الانتهاء

#### ✅ نظام الجرد
```
أنواع الجرد:
├── full        (جرد كامل)
├── partial     (جرد جزئي)
├── cycle       (جرد دوري)
├── random      (جرد عشوائي)
└── by_material (جرد حسب المادة)
```

### 5.4 العلاقات

```
fabric_rolls
    ├── material_id → fabric_materials
    ├── warehouse_id → warehouses
    ├── location_id → bin_locations
    ├── color_id → fabric_colors
    ├── batch_id → batches
    └── container_item_id → container_items

containers
    ├── supplier_id → suppliers
    ├── items → container_items[]
    └── expenses → container_expenses[]

reservations
    ├── customer_id → customers
    └── items → reservation_items[] → fabric_rolls
```

### 5.5 قواعد الأعمال

| الكود | القاعدة |
|-------|---------|
| BR-ROLL-001 | الكمية الحالية لا يمكن أن تكون سالبة |
| BR-ROLL-002 | المحجوز لا يتجاوز المتاح |
| BR-ROLL-003 | رقم الرولون فريد ضمن الشركة |
| BR-RES-001 | الحجز له تاريخ انتهاء |
| BR-RES-002 | إلغاء الحجز يُرجع الكمية |
| BR-CNT-001 | حالات الكونتينر متسلسلة |

---

## 6. قسم المبيعات

### 6.1 نظرة عامة

نظام مبيعات متكامل يشمل:
- إدارة العملاء والمجموعات
- طلبات وفواتير
- قوائم أسعار متعددة
- خصومات ترويجية
- تكامل مع المستودعات والمحاسبة

### 6.2 الجداول (19 جدول)

| الجدول | الوصف |
|--------|-------|
| `customers` | العملاء |
| `customer_groups` | مجموعات العملاء |
| `orders` | الطلبات |
| `order_items` | بنود الطلبات |
| `sales_invoices` | فواتير المبيعات |
| `sales_invoice_items` | بنود الفواتير |
| `price_lists` | قوائم الأسعار |
| `price_list_items` | بنود الأسعار |
| `promotional_discounts` | الخصومات |

### 6.3 الميزات (12 ميزة)

#### ✅ إدارة العملاء
- بيانات كاملة (اسم، هاتف، عنوان، ضريبي)
- حد ائتمان لكل عميل
- رصيد محدّث تلقائياً
- ربط بقوائم أسعار خاصة

#### ✅ قوائم الأسعار
- قوائم متعددة (جملة، تجزئة، VIP)
- ربط بمجموعات العملاء
- تاريخ صلاحية

#### ✅ الخصومات الترويجية
- خصومات بفترات وشروط
- خصومات على المنتجات أو الفئات
- حد أدنى للشراء

### 6.4 تدفق العمل

```
طلب (Order)
    ↓ تأكيد
فاتورة (Invoice)
    ↓ ترحيل
    ├── قيد محاسبي (Journal Entry)
    ├── خصم من المخزون
    └── تحديث رصيد العميل
    ↓
إذن تسليم (Delivery Note)
    ↓ تسليم
تأكيد الاستلام
```

---

## 7. قسم المشتريات

### 7.1 نظرة عامة

نظام مشتريات متكامل مع الكونتينرات:
- إدارة الموردين
- أوامر الشراء
- فواتير المشتريات
- تكلفة الوحدة الفعلية

### 7.2 الجداول (6 جداول)

| الجدول | الوصف |
|--------|-------|
| `suppliers` | الموردين |
| `supplier_groups` | مجموعات الموردين |
| `vendor_categories` | فئات الموردين |
| `purchase_orders` | أوامر الشراء |
| `purchase_invoices` | فواتير المشتريات |
| `purchase_invoice_items` | بنود الفواتير |

### 7.3 حساب التكلفة

```
تكلفة الوحدة النهائية = (سعر الشراء + المصاريف الموزعة) ÷ الكمية

مثال:
سعر الشراء: $5.00/م
مصاريف موزعة: $0.50/م
─────────────────────
التكلفة النهائية: $5.50/م
```

---

## 8. قسم الوكلاء

### 8.1 نظرة عامة

نظام وكلاء متكامل:
- مستويات (Bronze → Silver → Gold → Platinum)
- أهداف شهرية وسنوية
- عمولات تلقائية
- مكافآت وحوافز
- سحوبات

### 8.2 الجداول (12 جدول)

| الجدول | الوصف |
|--------|-------|
| `agents` | الوكلاء |
| `agent_tiers` | المستويات |
| `agent_targets` | الأهداف |
| `agent_commissions` | العمولات |
| `agent_commission_rules` | قواعد العمولات |
| `agent_bonuses` | المكافآت |
| `agent_withdrawals` | السحوبات |

### 8.3 حساب العمولة

```
العمولة = قيمة المبيعات × نسبة العمولة

نسب العمولة حسب المستوى:
├── Bronze:   5%
├── Silver:   7%
├── Gold:    10%
└── Platinum: 12%
```

---

## 9. نظام Multi-Tenant

### 9.1 نظرة عامة

نظام عزل بيانات متكامل:
- كل مستأجر له بيانات معزولة تماماً
- شركات متعددة لكل مستأجر
- فروع متعددة لكل شركة
- أدوار وصلاحيات

### 9.2 الهيكل

```
Tenant (مستأجر)
    ├── Companies (شركات)
    │   ├── Branches (فروع)
    │   ├── Warehouses (مستودعات)
    │   └── Data (بيانات)
    └── Users (مستخدمين)
        └── Roles (أدوار)
```

### 9.3 Row Level Security (RLS)

```sql
-- كل جدول له سياسة RLS
CREATE POLICY tenant_isolation ON table_name
    USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- المستخدم يرى فقط بيانات مستأجره
```

---

## 10. منصة SaaS

### 10.1 نظرة عامة

منصة SaaS متكاملة:
- خطط اشتراك متعددة
- فوترة تلقائية
- White Label
- تتبع الاستخدام

### 10.2 خطط الاشتراك

| الخطة | الميزات | السعر/شهر |
|-------|---------|-----------|
| Starter | محاسبة + مستودع | $29 |
| Business | كل الوحدات | $99 |
| Enterprise | كل شيء + API | $299 |

### 10.3 White Label

- تخصيص الشعار والألوان
- نطاق مخصص
- إعدادات خاصة

---

# الجزء الثالث: المراجع

## 11. قاموس البيانات

راجع ملف: [DATABASE_DICTIONARY.md](./DATABASE_DICTIONARY.md)

## 12. قواعد الأعمال

راجع ملف: [BUSINESS_RULES.md](./BUSINESS_RULES.md)

## 13. API Reference

راجع ملف: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 14. قاموس المصطلحات

راجع ملف: [GLOSSARY.md](./GLOSSARY.md)

---

# الملاحق

## ملحق أ: قائمة الجداول الكاملة (172 جدول)

<details>
<summary>اضغط لعرض القائمة الكاملة</summary>

### المحاسبة (23)
1. account_invoice_items
2. account_invoices
3. account_transfers
4. account_types
5. accounting_periods
6. accounts
7. bank_account_limits
8. budget_alerts
9. budget_lines
10. budgets
11. cash_accounts
12. cash_transactions
13. chart_of_accounts
14. chart_templates
15. coa_template_cash_accounts
16. coa_template_items
17. coa_templates
18. cost_centers
19. fiscal_years
20. journal_entries
21. journal_entry_lines
22. tax_payment_schedules
23. tax_rates

### المستودعات (27)
24. batches
25. bin_locations
26. container_cost_allocations
27. container_expense_allocations
28. container_expenses
29. container_items
30. container_quotation_items
31. container_quotations
32. container_reservations
33. containers
34. delivery_note_items
35. delivery_notes
36. fabric_colors
37. fabric_groups
38. fabric_materials
39. fabric_rolls
40. inventory_movements
41. reservation_items
42. reservations
43. retail_cuttings
44. sample_cutting_items
45. sample_cuttings
46. stock_count_items
47. stock_counts
48. stock_ledger
49. warehouse_assignments
50. warehouse_settings
51. warehouses

### المبيعات (19)
52. category_customer_access
53. customer_groups
54. customers
55. order_items
56. orders
57. price_list_items
58. price_lists
59. product_customer_access
60. promotional_discounts
61. sales_invoice_items
62. sales_invoices

### المشتريات (6)
63. purchase_invoice_items
64. purchase_invoices
65. purchase_orders
66. supplier_groups
67. suppliers
68. vendor_categories

### الوكلاء (12)
69. agent_bonuses
70. agent_commission_rules
71. agent_commissions
72. agent_events
73. agent_messages
74. agent_targets
75. agent_tiers
76. agent_withdrawals
77. agents
78. commission_entries
79. commission_rules
80. employee_commissions

### Multi-Tenant (16)
81. branches
82. companies
83. company_accounting_settings
84. company_countries
85. roles
86. tenant_languages
87. tenant_modules
88. tenant_referrals
89. tenant_subscriptions
90. tenant_users
91. tenants
92. user_feature_permissions
93. user_module_permissions
94. user_profiles
95. user_role_assignments
96. user_roles

### SaaS (24)
97-120. (subscription_plans, modules, etc.)

### أخرى (45+)
121-172. (currencies, countries, products, etc.)

</details>

---

## ملحق ب: مخطط العلاقات

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tenants   │────<│  companies  │────<│  branches   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ├────<│ customers │
       │                   ├────<│ suppliers │
       │                   ├────<│ warehouses│
       │                   │           │
       │                   │           └────<│ fabric_rolls │
       │                   │                       │
       │                   ├────<│ sales_invoices │─┘
       │                   │
       │                   └────<│ journal_entries │
       │
       └────<│ user_profiles │
                   │
                   └────<│ user_roles │
```

---

**© 2026 TexaCore ERP. All Rights Reserved.**

**تم إنشاء هذا التوثيق بواسطة Antigravity AI**
