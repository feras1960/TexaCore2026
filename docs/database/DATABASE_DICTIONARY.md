# 📚 قاموس البيانات - Database Dictionary
# TexaCore ERP Complete Schema Reference

**تاريخ التحديث**: 2 فبراير 2026  
**إجمالي الجداول**: 172 جدول

---

## 📋 فهرس المحتويات

1. [المحاسبة (23 جدول)](#1-المحاسبة)
2. [المستودعات (27 جدول)](#2-المستودعات)
3. [المبيعات (19 جدول)](#3-المبيعات)
4. [المشتريات (6 جداول)](#4-المشتريات)
5. [الوكلاء (12 جدول)](#5-الوكلاء)
6. [Multi-Tenant (16 جدول)](#6-multi-tenant)
7. [SaaS Platform (24 جدول)](#7-saas-platform)
8. [جداول أخرى](#8-جداول-أخرى)

---

## 1. المحاسبة

### 1.1 chart_of_accounts (دليل الحسابات)

**الوصف**: الهيكل الشجري لكل الحسابات المحاسبية.

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف الأساسي |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `account_code` | VARCHAR(20) | NO | كود الحساب (فريد) |
| `account_name` | VARCHAR(255) | NO | اسم الحساب (EN) |
| `name_ar` | VARCHAR(255) | YES | اسم الحساب (AR) |
| `account_type` | VARCHAR(50) | NO | نوع الحساب |
| `parent_id` | UUID | YES | FK → chart_of_accounts |
| `level` | INTEGER | YES | مستوى العمق |
| `is_active` | BOOLEAN | YES | نشط؟ |
| `is_system` | BOOLEAN | YES | حساب نظام؟ |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `notes` | TEXT | YES | ملاحظات |
| `created_at` | TIMESTAMPTZ | YES | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | YES | تاريخ التحديث |

**الفهارس**:
- `PRIMARY KEY (id)`
- `UNIQUE (tenant_id, company_id, account_code)`
- `INDEX (parent_id)`
- `INDEX (account_type)`

---

### 1.2 journal_entries (القيود المحاسبية)

**الوصف**: سجل القيود المحاسبية في دفتر اليومية.

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف الأساسي |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `entry_number` | VARCHAR(50) | NO | رقم القيد (فريد) |
| `entry_date` | DATE | NO | تاريخ القيد |
| `description` | TEXT | YES | الوصف |
| `status` | VARCHAR(20) | YES | الحالة |
| `reference_type` | VARCHAR(50) | YES | نوع المرجع |
| `reference_id` | UUID | YES | معرّف المرجع |
| `total_debit` | DECIMAL(18,2) | YES | إجمالي المدين |
| `total_credit` | DECIMAL(18,2) | YES | إجمالي الدائن |
| `created_by` | UUID | YES | المُنشئ |
| `posted_by` | UUID | YES | الناشر |
| `posted_at` | TIMESTAMPTZ | YES | تاريخ النشر |

**الحالات**: `draft`, `posted`, `reversed`

---

### 1.3 journal_entry_lines (بنود القيود)

**الوصف**: تفاصيل كل قيد محاسبي.

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف الأساسي |
| `journal_entry_id` | UUID | NO | FK → journal_entries |
| `account_id` | UUID | NO | FK → chart_of_accounts |
| `debit` | DECIMAL(18,2) | YES | مبلغ المدين |
| `credit` | DECIMAL(18,2) | YES | مبلغ الدائن |
| `description` | TEXT | YES | وصف البند |
| `cost_center_id` | UUID | YES | FK → cost_centers |

---

### 1.4 account_types (أنواع الحسابات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف الأساسي |
| `code` | VARCHAR(20) | NO | الكود |
| `name` | VARCHAR(100) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(100) | YES | الاسم (AR) |
| `category` | VARCHAR(50) | NO | الفئة |
| `is_debit_balance` | BOOLEAN | YES | رصيد مدين؟ |

---

### 1.5 fiscal_years (السنوات المالية)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `name` | VARCHAR(100) | NO | اسم السنة |
| `start_date` | DATE | NO | بداية السنة |
| `end_date` | DATE | NO | نهاية السنة |
| `status` | VARCHAR(20) | YES | الحالة |

**الحالات**: `active`, `closed`

---

### 1.6 accounting_periods (الفترات المحاسبية)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `fiscal_year_id` | UUID | NO | FK → fiscal_years |
| `name` | VARCHAR(100) | NO | اسم الفترة |
| `start_date` | DATE | NO | البداية |
| `end_date` | DATE | NO | النهاية |
| `status` | VARCHAR(20) | YES | الحالة |

---

### 1.7 budgets (الموازنات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `name` | VARCHAR(255) | NO | اسم الموازنة |
| `fiscal_year_id` | UUID | YES | FK → fiscal_years |
| `total_amount` | DECIMAL(18,2) | YES | الإجمالي |
| `status` | VARCHAR(20) | YES | الحالة |

---

### 1.8 budget_lines (بنود الموازنة)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `budget_id` | UUID | NO | FK → budgets |
| `account_id` | UUID | NO | FK → chart_of_accounts |
| `amount` | DECIMAL(18,2) | NO | المبلغ |
| `period_id` | UUID | YES | FK → accounting_periods |

---

### 1.9 cost_centers (مراكز التكلفة)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(20) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم |
| `parent_id` | UUID | YES | الأب |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 1.10 cash_accounts (حسابات النقدية)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم |
| `account_type` | VARCHAR(20) | NO | النوع (cash/bank) |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `current_balance` | DECIMAL(18,2) | YES | الرصيد |
| `account_id` | UUID | YES | FK → chart_of_accounts |

---

### 1.11 tax_rates (معدلات الضرائب)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `name` | VARCHAR(100) | NO | الاسم |
| `rate` | DECIMAL(5,2) | NO | النسبة |
| `is_default` | BOOLEAN | YES | افتراضي؟ |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

## 2. المستودعات

### 2.1 warehouses (المستودعات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(20) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `address` | TEXT | YES | العنوان |
| `warehouse_type` | VARCHAR(20) | YES | النوع |
| `is_active` | BOOLEAN | YES | نشط؟ |

**أنواع المستودعات**: `main`, `branch`, `store`, `van`

---

### 2.2 bin_locations (مواقع التخزين)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `warehouse_id` | UUID | NO | FK → warehouses |
| `code` | VARCHAR(50) | NO | الكود (A-01-03-05) |
| `aisle` | VARCHAR(10) | YES | الممر |
| `rack` | VARCHAR(10) | YES | الرف |
| `shelf` | VARCHAR(10) | YES | الرفة |
| `bin` | VARCHAR(10) | YES | الخانة |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 2.3 fabric_materials (المواد)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `group_id` | UUID | YES | FK → fabric_groups |
| `description` | TEXT | YES | الوصف |
| `unit_cost` | DECIMAL(18,4) | YES | سعر التكلفة |
| `sale_price` | DECIMAL(18,4) | YES | سعر البيع |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 2.4 fabric_rolls (الرولونات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `roll_number` | VARCHAR(50) | NO | رقم الرولون (فريد) |
| `material_id` | UUID | NO | FK → fabric_materials |
| `warehouse_id` | UUID | YES | FK → warehouses |
| `location_id` | UUID | YES | FK → bin_locations |
| `color_id` | UUID | YES | FK → fabric_colors |
| `dye_lot` | VARCHAR(50) | YES | دفعة الصبغ |
| `batch_id` | UUID | YES | FK → batches |
| `initial_length` | DECIMAL(15,3) | NO | الطول الأولي |
| `current_length` | DECIMAL(15,3) | NO | الطول الحالي |
| `reserved_length` | DECIMAL(15,3) | YES | المحجوز |
| `width` | DECIMAL(10,2) | YES | العرض |
| `weight` | DECIMAL(10,2) | YES | الوزن |
| `quality_grade` | VARCHAR(10) | YES | درجة الجودة |
| `status` | VARCHAR(20) | YES | الحالة |
| `unit_cost` | DECIMAL(18,4) | YES | تكلفة الوحدة |
| `received_date` | DATE | YES | تاريخ الاستلام |
| `container_item_id` | UUID | YES | FK → container_items |

**الحالات**: `available`, `reserved`, `on_hold`, `sold`, `damaged`
**درجات الجودة**: `A`, `B`, `C`

---

### 2.5 containers (الكونتينرات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `container_number` | VARCHAR(50) | NO | رقم الكونتينر |
| `supplier_id` | UUID | YES | FK → suppliers |
| `order_date` | DATE | YES | تاريخ الطلب |
| `expected_arrival` | DATE | YES | الوصول المتوقع |
| `actual_arrival` | DATE | YES | الوصول الفعلي |
| `status` | VARCHAR(30) | YES | الحالة |
| `total_value` | DECIMAL(18,2) | YES | القيمة الإجمالية |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `total_rolls` | INTEGER | YES | عدد الرولونات |
| `total_quantity` | DECIMAL(15,2) | YES | الكمية الإجمالية |

**الحالات**: `ordered`, `shipped`, `in_transit`, `arrived`, `receiving`, `completed`, `cancelled`

---

### 2.6 container_items (بنود الكونتينر)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `container_id` | UUID | NO | FK → containers |
| `material_id` | UUID | NO | FK → fabric_materials |
| `quantity` | DECIMAL(15,2) | NO | الكمية |
| `unit_cost` | DECIMAL(18,4) | YES | سعر الوحدة |
| `allocated_cost` | DECIMAL(18,4) | YES | التكلفة الموزعة |
| `final_cost` | DECIMAL(18,4) | YES | التكلفة النهائية |
| `received_quantity` | DECIMAL(15,2) | YES | الكمية المستلمة |

---

### 2.7 container_expenses (مصاريف الكونتينر)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `container_id` | UUID | NO | FK → containers |
| `expense_type` | VARCHAR(50) | NO | نوع المصروف |
| `amount` | DECIMAL(18,2) | NO | المبلغ |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `description` | TEXT | YES | الوصف |
| `is_allocated` | BOOLEAN | YES | موزّع؟ |

**أنواع المصاريف**: `shipping`, `customs`, `insurance`, `handling`, `other`

---

### 2.8 reservations (الحجوزات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `reservation_number` | VARCHAR(50) | NO | رقم الحجز |
| `customer_id` | UUID | NO | FK → customers |
| `reservation_date` | DATE | NO | تاريخ الحجز |
| `expiry_date` | DATE | YES | تاريخ الانتهاء |
| `status` | VARCHAR(20) | YES | الحالة |
| `deposit_amount` | DECIMAL(18,2) | YES | العربون |
| `notes` | TEXT | YES | ملاحظات |

**الحالات**: `active`, `fulfilled`, `expired`, `cancelled`

---

### 2.9 delivery_notes (إذونات التسليم)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `delivery_number` | VARCHAR(50) | NO | رقم الإذن |
| `customer_id` | UUID | NO | FK → customers |
| `delivery_date` | DATE | NO | تاريخ التسليم |
| `warehouse_id` | UUID | YES | FK → warehouses |
| `status` | VARCHAR(20) | YES | الحالة |
| `requires_approval` | BOOLEAN | YES | يحتاج موافقة؟ |
| `approved_by` | UUID | YES | المُعتمد |
| `driver_name` | VARCHAR(255) | YES | اسم السائق |
| `vehicle_number` | VARCHAR(50) | YES | رقم المركبة |

---

### 2.10 stock_counts (الجرد)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `count_number` | VARCHAR(50) | NO | رقم الجرد |
| `warehouse_id` | UUID | NO | FK → warehouses |
| `location_id` | UUID | YES | FK → bin_locations |
| `count_date` | DATE | NO | تاريخ الجرد |
| `count_type` | VARCHAR(30) | YES | نوع الجرد |
| `status` | VARCHAR(20) | YES | الحالة |
| `total_items` | INTEGER | YES | إجمالي البنود |
| `counted_items` | INTEGER | YES | المعدود |
| `variance_count` | INTEGER | YES | عدد الفروقات |

**أنواع الجرد**: `full`, `partial`, `cycle`, `random`, `by_material`
**الحالات**: `planned`, `in_progress`, `completed`, `cancelled`

---

### 2.11 stock_count_items (بنود الجرد)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `stock_count_id` | UUID | NO | FK → stock_counts |
| `roll_id` | UUID | YES | FK → fabric_rolls |
| `material_id` | UUID | YES | FK → fabric_materials |
| `system_quantity` | DECIMAL(15,3) | YES | كمية النظام |
| `actual_quantity` | DECIMAL(15,3) | YES | الكمية الفعلية |
| `variance` | DECIMAL(15,3) | YES | الفرق (محسوب) |
| `is_counted` | BOOLEAN | YES | تم العد؟ |
| `counted_at` | TIMESTAMPTZ | YES | وقت العد |

---

### 2.12 inventory_movements (حركات المخزون)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `movement_type` | VARCHAR(30) | NO | نوع الحركة |
| `roll_id` | UUID | YES | FK → fabric_rolls |
| `warehouse_id` | UUID | YES | FK → warehouses |
| `quantity` | DECIMAL(15,3) | NO | الكمية |
| `reference_type` | VARCHAR(50) | YES | نوع المرجع |
| `reference_id` | UUID | YES | معرّف المرجع |
| `movement_date` | TIMESTAMPTZ | YES | تاريخ الحركة |

**أنواع الحركات**: `receive`, `sale`, `transfer`, `cut`, `return`, `adjustment`, `sample`

---

## 3. المبيعات

### 3.1 customers (العملاء)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | كود العميل |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `email` | VARCHAR(255) | YES | البريد |
| `phone` | VARCHAR(50) | YES | الهاتف |
| `address` | TEXT | YES | العنوان |
| `customer_type` | VARCHAR(30) | YES | النوع |
| `credit_limit` | DECIMAL(18,2) | YES | حد الائتمان |
| `balance` | DECIMAL(18,2) | YES | الرصيد |
| `price_list_id` | UUID | YES | FK → price_lists |
| `group_id` | UUID | YES | FK → customer_groups |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 3.2 sales_invoices (فواتير المبيعات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `invoice_number` | VARCHAR(50) | NO | رقم الفاتورة |
| `customer_id` | UUID | NO | FK → customers |
| `invoice_date` | DATE | NO | التاريخ |
| `due_date` | DATE | YES | تاريخ الاستحقاق |
| `subtotal` | DECIMAL(18,2) | YES | المجموع الفرعي |
| `discount_amount` | DECIMAL(18,2) | YES | الخصم |
| `tax_amount` | DECIMAL(18,2) | YES | الضريبة |
| `total_amount` | DECIMAL(18,2) | YES | الإجمالي |
| `paid_amount` | DECIMAL(18,2) | YES | المدفوع |
| `status` | VARCHAR(20) | YES | الحالة |
| `agent_id` | UUID | YES | FK → agents |
| `warehouse_id` | UUID | YES | FK → warehouses |

**الحالات**: `draft`, `posted`, `partial`, `paid`, `cancelled`

---

### 3.3 sales_invoice_items (بنود الفاتورة)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `invoice_id` | UUID | NO | FK → sales_invoices |
| `roll_id` | UUID | YES | FK → fabric_rolls |
| `material_id` | UUID | YES | FK → fabric_materials |
| `description` | TEXT | YES | الوصف |
| `quantity` | DECIMAL(15,3) | NO | الكمية |
| `unit_price` | DECIMAL(18,4) | NO | سعر الوحدة |
| `discount_percent` | DECIMAL(5,2) | YES | نسبة الخصم |
| `line_total` | DECIMAL(18,2) | YES | إجمالي البند |

---

### 3.4 price_lists (قوائم الأسعار)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `is_default` | BOOLEAN | YES | افتراضي؟ |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

## 4. المشتريات

### 4.1 suppliers (الموردين)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `email` | VARCHAR(255) | YES | البريد |
| `phone` | VARCHAR(50) | YES | الهاتف |
| `country` | VARCHAR(100) | YES | البلد |
| `balance` | DECIMAL(18,2) | YES | الرصيد |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 4.2 purchase_invoices (فواتير المشتريات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `invoice_number` | VARCHAR(50) | NO | رقم الفاتورة |
| `supplier_id` | UUID | NO | FK → suppliers |
| `invoice_date` | DATE | NO | التاريخ |
| `container_id` | UUID | YES | FK → containers |
| `subtotal` | DECIMAL(18,2) | YES | المجموع الفرعي |
| `tax_amount` | DECIMAL(18,2) | YES | الضريبة |
| `total_amount` | DECIMAL(18,2) | YES | الإجمالي |
| `paid_amount` | DECIMAL(18,2) | YES | المدفوع |
| `status` | VARCHAR(20) | YES | الحالة |

---

## 5. الوكلاء

### 5.1 agents (الوكلاء)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `email` | VARCHAR(255) | YES | البريد |
| `phone` | VARCHAR(50) | YES | الهاتف |
| `commission_rate` | DECIMAL(5,2) | YES | نسبة العمولة |
| `tier_id` | UUID | YES | FK → agent_tiers |
| `available_balance` | DECIMAL(18,2) | YES | الرصيد المتاح |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 5.2 agent_commissions (عمولات الوكلاء)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `agent_id` | UUID | NO | FK → agents |
| `invoice_id` | UUID | YES | FK → sales_invoices |
| `sales_amount` | DECIMAL(18,2) | NO | قيمة المبيعات |
| `commission_rate` | DECIMAL(5,2) | NO | النسبة |
| `commission_amount` | DECIMAL(18,2) | NO | مبلغ العمولة |
| `status` | VARCHAR(20) | YES | الحالة |

---

## 6. Multi-Tenant

### 6.1 tenants (المستأجرين)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(50) | NO | الكود (فريد) |
| `name` | VARCHAR(255) | NO | الاسم |
| `email` | VARCHAR(255) | YES | البريد |
| `phone` | VARCHAR(50) | YES | الهاتف |
| `status` | VARCHAR(20) | YES | الحالة |
| `subscription_plan_id` | UUID | YES | FK → subscription_plans |
| `trial_ends_at` | TIMESTAMPTZ | YES | انتهاء التجربة |

---

### 6.2 companies (الشركات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | NO | FK → tenants |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `commercial_registration` | VARCHAR(100) | YES | السجل التجاري |
| `tax_number` | VARCHAR(100) | YES | الرقم الضريبي |
| `is_default` | BOOLEAN | YES | افتراضي؟ |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 6.3 user_profiles (المستخدمين)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | YES | FK → tenants |
| `email` | VARCHAR(255) | YES | البريد |
| `full_name` | VARCHAR(255) | YES | الاسم الكامل |
| `preferred_language` | VARCHAR(10) | YES | اللغة المفضلة |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 6.4 roles (الأدوار)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `tenant_id` | UUID | YES | FK → tenants |
| `name` | VARCHAR(100) | NO | الاسم |
| `description` | TEXT | YES | الوصف |
| `is_system` | BOOLEAN | YES | دور نظام؟ |

---

## 7. SaaS Platform

### 7.1 subscription_plans (خطط الاشتراك)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `monthly_price` | DECIMAL(18,2) | YES | السعر الشهري |
| `yearly_price` | DECIMAL(18,2) | YES | السعر السنوي |
| `max_users` | INTEGER | YES | أقصى عدد مستخدمين |
| `max_companies` | INTEGER | YES | أقصى عدد شركات |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

### 7.2 modules (الوحدات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(50) | NO | الكود |
| `name` | VARCHAR(255) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(255) | YES | الاسم (AR) |
| `description` | TEXT | YES | الوصف |
| `icon` | VARCHAR(100) | YES | الأيقونة |
| `display_order` | INTEGER | YES | ترتيب العرض |
| `is_active` | BOOLEAN | YES | نشط؟ |

---

## 8. جداول أخرى

### 8.1 currencies (العملات)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(10) | NO | الكود (USD, EUR) |
| `name` | VARCHAR(100) | NO | الاسم |
| `symbol` | VARCHAR(10) | YES | الرمز |
| `decimal_places` | INTEGER | YES | الخانات العشرية |

---

### 8.2 countries (الدول)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(10) | NO | كود الدولة (ISO) |
| `name` | VARCHAR(100) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(100) | YES | الاسم (AR) |
| `currency_code` | VARCHAR(10) | YES | العملة |
| `phone_code` | VARCHAR(10) | YES | كود الهاتف |

---

### 8.3 uom (وحدات القياس)

| العمود | النوع | Null | الوصف |
|--------|-------|------|-------|
| `id` | UUID | NO | المُعرِّف |
| `code` | VARCHAR(20) | NO | الكود |
| `name` | VARCHAR(100) | NO | الاسم (EN) |
| `name_ar` | VARCHAR(100) | YES | الاسم (AR) |
| `category` | VARCHAR(50) | YES | الفئة |

---

## 📊 ملخص الجداول

| القسم | عدد الجداول | أهم الجداول |
|-------|-------------|-------------|
| المحاسبة | 23 | chart_of_accounts, journal_entries |
| المستودعات | 27 | warehouses, fabric_rolls, containers |
| المبيعات | 19 | customers, sales_invoices |
| المشتريات | 6 | suppliers, purchase_invoices |
| الوكلاء | 12 | agents, agent_commissions |
| Multi-Tenant | 16 | tenants, companies, user_profiles |
| SaaS | 24 | subscription_plans, modules |
| أخرى | 45 | currencies, countries, uom |
| **الإجمالي** | **172** | - |

---

**© 2026 TexaCore ERP**
