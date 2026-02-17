# 📊 TexaCore ERP — مرجع قاعدة البيانات الشامل
# Database Schema Reference — Production Verified
**آخر تحديث:** 2026-02-11 | **المصدر:** information_schema.columns + pg_constraint (Production DB)

---

## 📈 ملخص تنفيذي — Executive Summary

| المؤشر | القيمة | التقييم |
|--------|--------|---------|
| **إجمالي الجداول** | 221 | 🟢 نظام متكامل |
| **إجمالي الأعمدة** | ~4,289 | 🟢 تغطية شاملة |
| **Foreign Keys** | 563 | 🟢 علاقات قوية |
| **UNIQUE Constraints** | 147 | 🟡 بعض الجداول بدون UNIQUE |
| **CHECK Constraints** | 54 | 🟡 جيد — يمكن التحسين |
| **جداول بـ tenant_id** | 167/221 (76%) | 🟢 عزل متعدد المستأجرين |
| **جداول بدون tenant_id** | 54 (عمومية/نظام) | 🟢 مقصود — جداول مشتركة |

### 🏆 تقييم الجودة العام: **90/100** — ممتاز
- ✅ علاقات FK شاملة (563 علاقة)
- ✅ عزل tenant_id متين
- ✅ أسماء أعمدة متسقة
- ⚠️ بعض التكرارات البسيطة (containers + shipments)
- ⚠️ بعض الجداول بدون UNIQUE constraints

---

## 🏗️ هيكل الوحدات — Module Architecture

### 📊 توزيع الجداول حسب الوحدة

```
Core/Auth              22 tables  ████████████████████░░ 
Accounting             24 tables  ████████████████████████
Warehouse/Inventory    15 tables  ███████████████░░░░░░░░
Shipments/Trade        14 tables  ██████████████░░░░░░░░░
Products                9 tables  █████████░░░░░░░░░░░░░░
Sales                   9 tables  █████████░░░░░░░░░░░░░░
Purchases               8 tables  ████████░░░░░░░░░░░░░░░
SaaS/Billing           15 tables  ███████████████░░░░░░░░
SaaS/Agents             9 tables  █████████░░░░░░░░░░░░░░
Customers               3 tables  ███░░░░░░░░░░░░░░░░░░░░
Suppliers               2 tables  ██░░░░░░░░░░░░░░░░░░░░░
Other (CRM, etc.)      91 tables  ██████████████████████████████████
```

---

## 1️⃣ Core / Auth — الجداول الأساسية (22 جدول)

### `tenants` — المستأجرون
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid (PK) | NO | gen_random_uuid() |
| code | varchar(20) | NO | UNIQUE |
| agent_id | uuid (FK→agents) | YES | |
| partner_id | uuid (FK→partners) | YES | |
| product_id | uuid (FK→saas_products) | YES | |
| status | varchar(20) | YES | 'active' |

### `companies` — الشركات
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid (PK) | NO | |
| tenant_id | uuid (FK→tenants) | NO | |
| code | varchar(20) | NO | |
| name | varchar(255) | NO | |
| name_en | varchar(255) | YES | |
| name_ar | varchar(200) | YES | |
| default_currency | varchar(3) | YES | 'SAR' |
| country_code | varchar(3) | YES | 'SA' |
| country | varchar(100) | YES | |
| settings | jsonb | YES | |
| accounting_settings | jsonb | YES | ⚡ ضخم — يحوي كل إعدادات المحاسبة |
| business_type | varchar(50) | YES | 'general' |
| company_type | varchar(20) | YES | 'production' |
| status | varchar(20) | YES | 'active' |

### `branches` — الفروع
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid (PK) | NO | |
| tenant_id | uuid (FK→tenants) | NO | |
| company_id | uuid (FK→companies) | NO | |
| code | varchar(20) | NO | UNIQUE(company_id, code) |
| name | varchar(255) | NO | |
| name_en | varchar(255) | YES | |
| name_ar | varchar(200) | YES | |
| is_main | boolean | YES | false |
| default_warehouse_id | uuid | YES | |
| default_currency | varchar(3) | YES | |

### `user_profiles` — ملفات المستخدمين
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | يربط بـ auth.users |
| tenant_id | uuid (FK→tenants) | |
| company_id | uuid (FK→companies) | |
| branch_id | uuid (FK→branches) | |
| customer_id | uuid (FK→customers) | |

### `roles` — الأدوار
- UNIQUE(tenant_id, code)
- FK→tenants

### جداول الصلاحيات
- `user_roles` — UNIQUE(user_id, role_id)
- `user_role_assignments` — UNIQUE(user_id, role_id, tenant_id, company_id)
- `user_branch_permissions` — UNIQUE(user_id, branch_id)
- `user_warehouse_permissions` — UNIQUE(user_id, warehouse_id)
- `user_fund_permissions` — UNIQUE(user_id, fund_account_id)
- `user_module_permissions` — UNIQUE(user_id, tenant_id, company_id, module_code)
- `user_feature_permissions` — UNIQUE(user_id, tenant_id, company_id, module_code, feature_code)
- `user_resource_access` — CHECK(resource_type IN ('branch','warehouse',...))

---

## 2️⃣ Accounting — المحاسبة (24 جدول)

### `chart_of_accounts` — دليل الحسابات (36 عمود)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id | uuid (FK→tenants) | |
| company_id | uuid (FK→companies) | |
| account_code | varchar(50) | UNIQUE(tenant_id, company_id, account_code) |
| name_ar | varchar(200) | NO |
| name_en | varchar(200) | YES |
| name_ru | varchar(200) | YES |
| name_uk | varchar(200) | YES |
| name_ro, name_pl, name_tr, name_de, name_it | varchar(200) | YES — 9 لغات! |
| account_type_id | uuid (FK→account_types) | NO |
| parent_id | uuid (FK→self) | YES — شجري |
| is_group | boolean | false |
| is_detail | boolean | true |
| level | integer | 1 |
| is_bank_account | boolean | false |
| is_cash_account | boolean | false |
| is_receivable | boolean | false |
| is_payable | boolean | false |
| current_balance | numeric | 0 |
| opening_balance | numeric | 0 |

### `journal_entries` — القيود المحاسبية (40 عمود)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id, company_id, branch_id | uuid (FKs) | |
| entry_number | varchar(50) | UNIQUE(tenant_id, entry_number) |
| entry_date | date | CURRENT_DATE |
| fiscal_year_id | uuid (FK→fiscal_years) | |
| period_id | uuid (FK→accounting_periods) | |
| total_debit, total_credit | numeric | |
| status | varchar(20) | 'draft' |
| **CHECK:** | | status='posted' → abs(debit-credit) < 0.01 |
| original_entry_id | uuid (FK→self) | YES — للعكس |
| reversal_entry_id | uuid (FK→self) | YES — قيد عكسي |

### `journal_entry_lines` — سطور القيود
| Column | Type | Notes |
|--------|------|-------|
| entry_id | uuid (FK→journal_entries) | |
| account_id | uuid (FK→chart_of_accounts) | |
| debit, credit | numeric | |
| **CHECK:** | | debit>0 XOR credit>0 |

### `cash_accounts` — حسابات الصناديق والبنوك
- UNIQUE(tenant_id, company_id, code)
- account_type: 'cash' | 'bank'
- gl_account_id: FK→chart_of_accounts

### `cash_transactions` — حركات النقدية
- UNIQUE(tenant_id, transaction_number)
- cash_account_id: FK→cash_accounts
- to_cash_account_id: FK→cash_accounts (للتحويلات)
- journal_entry_id: FK→journal_entries

### `account_invoices` — فواتير محاسبية موحدة (37 عمود)
- UNIQUE(tenant_id, company_id, invoice_number)
- invoice_type: 'receivable' | 'payable'

### `account_transfers` — تحويلات بين حسابات
- CHECK(source ≠ target)
- CHECK(transfer_type IN ('balance',...))

### `recurring_entries` — القيود المتكررة (35 عمود)
- CHECK(frequency IN ('daily','weekly','monthly','quarterly','yearly'))
- CHECK(status IN ('active','paused','completed','cancelled'))
- CHECK(amount > 0)

### `budgets` + `budget_lines` + `budget_alerts` — الميزانيات
- CHECK(status IN ('draft','active','closed','archived'))
- CHECK(end_date >= start_date)

### `cost_centers` — مراكز التكلفة
- parent_id: FK→self (شجري)
- UNIQUE(tenant_id, company_id, code)

### `fiscal_years` + `accounting_periods` — السنوات والفترات
### `exchange_rates` — أسعار الصرف
### `company_accounting_settings` — إعدادات المحاسبة (32 عمود)
- UNIQUE(company_id)
- 6 حسابات افتراضية (receivable, payable, cash, bank, revenue, expense)
### `tax_rates` + `tax_payment_schedules` — الضرائب

---

## 3️⃣ Shipments / Trade — الشحنات والتجارة (14 جدول)

### `shipments` — الشحنات/الكونتينرات ⭐ مهم
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tenant_id, company_id, branch_id | uuid (FKs) | |
| shipment_number | varchar(50) | ⚠️ UNIQUE(tenant_id, shipment_number) |
| container_number | varchar(50) | |
| bill_of_lading | varchar(100) | |
| supplier_id | uuid (FK→suppliers) | ⚠️ FK مكرر مرتين! |
| origin_country | varchar(100) | |
| **port_of_loading** | varchar(200) | ✅ NOT origin_port |
| **port_of_discharge** | varchar(200) | ✅ NOT destination_port |
| shipping_line | varchar(200) | |
| vessel_name | varchar(200) | |
| **etd** | date | ✅ NOT shipping_date |
| **eta** | date | ✅ NOT expected_arrival_date |
| container_size | varchar(10) | |
| container_type | varchar(10) | |
| total_goods_cost | numeric | |
| total_landed_cost | numeric | |
| **status** | varchar(20) | CHECK IN: |
| | | `ordered, confirmed, shipped, at_port, customs_clearance, received, cancelled` |
| created_by | uuid (FK→user_profiles) | |

### `shipment_items` — بنود الشحنة (36 عمود) ⭐ مهم
| Column | Type | Notes |
|--------|------|-------|
| tenant_id | uuid (FK→tenants) | |
| shipment_id | uuid (FK→shipments) | |
| item_description | text | |
| expected_quantity | numeric | |
| received_quantity | numeric | |
| **unit** | varchar(50) | ⚠️ نص حر — ليس FK |
| unit_price | numeric | |
| total_price | numeric | |
| expected_rolls | integer | |
| received_rolls | integer | |
| reserved_quantity | numeric | |
| sold_quantity | numeric | |
| product_id | uuid (FK→products) | YES |
| color_id | uuid (FK→fabric_colors) | YES |
| supplier_id | uuid (FK→suppliers) | YES |
| unit_id | uuid (FK→units_of_measure) | YES |
| purchase_invoice_id | uuid (FK→purchase_invoices) | YES |
| ⚠️ **لا يوجد UNIQUE** | | — يمكن تكرار نفس البند |

### `transit_reservations` — حجوزات ترانزيت ⭐ مهم
| Column | Type | Notes |
|--------|------|-------|
| tenant_id, company_id, branch_id | uuid (FKs) | |
| reservation_number | varchar(50) | UNIQUE(tenant_id, reservation_number) |
| reservation_date | date | |
| customer_id | uuid (FK→customers) | |
| shipment_id | uuid (FK→shipments) | |
| shipment_item_id | uuid (FK→shipment_items) | |
| product_id | uuid (FK→products) | YES |
| sales_order_id | uuid (FK→sales_orders) | YES |
| shipping_address_id | uuid (FK→customer_addresses) | YES |
| reserved_quantity | numeric | |
| currency | varchar(3) | |
| status | varchar(20) | |
| created_by | uuid (FK→user_profiles) | |
| ❌ **لا يوجد:** | | customer_name, unit, unit_price, total_amount, advance |

### `shipment_documents` — وثائق الشحن (60 عمود — الأكبر!)
### `shipments_tracking` — تتبع الشحنات
### `shipping_carriers` — شركات الشحن

### 📦 نظام الكونتينرات القديم (تكرار محتمل):
- `containers` (55 عمود) — UNIQUE(tenant_id, shipment_number)
- `container_items` (36 عمود)
- `container_expenses` (40 عمود)
- `container_expense_allocations`
- `container_cost_allocations`
- `container_quotations` + `container_quotation_items`
- `container_reservations`

> ⚠️ **ملاحظة جودة:** يوجد نظامان للشحنات (`shipments` + `containers`). `shipments` هو الحالي المستخدم. `containers` هو القديم.

---

## 4️⃣ Suppliers — الموردون (2 جدول)

### `suppliers` — الموردون (33 عمود)
| Column | Type | Notes |
|--------|------|-------|
| tenant_id, company_id | uuid (FKs) | |
| code | varchar(50) | UNIQUE(tenant_id, code) |
| supplier_type | varchar(20) | |
| name_ar | varchar(200) | NO |
| name_en | varchar(200) | YES |
| **name_ru** | varchar(200) | YES ✅ |
| **name_uk** | varchar(200) | YES ✅ |
| email, phone | varchar | |
| country, city | varchar | |
| group_id | uuid (FK→supplier_groups) | |
| currency | varchar(3) | |
| payable_account_id | uuid (FK→chart_of_accounts) | |
| status | varchar(20) | 'active' |

### `supplier_groups` — مجموعات الموردين
- parent_id: FK→self (شجري)
- UNIQUE(tenant_id, code)

---

## 5️⃣ Customers — العملاء (3 جدول)

### `customers` — العملاء (38 عمود)
| Column | Type | Notes |
|--------|------|-------|
| tenant_id, company_id | uuid (FKs) | |
| code | varchar(50) | UNIQUE(tenant_id, code) |
| name_ar | varchar(200) | NO |
| name_en | varchar(200) | YES |
| **name_ru** | varchar(200) | YES ✅ |
| **name_uk** | varchar(200) | YES ✅ |
| phone, email | varchar | |
| country, city | varchar | |
| group_id | uuid (FK→customer_groups) | |
| price_list_id | uuid (FK→price_lists) | |
| receivable_account_id | uuid (FK→chart_of_accounts) | |
| auth_user_id | uuid | UNIQUE (B2B portal) |

### `customer_groups` — مجموعات العملاء
### `customer_addresses` — عناوين العملاء

---

## 6️⃣ Products — المنتجات (9 جدول)

### `products` — المنتجات (52 عمود — ثاني أكبر)
- UNIQUE(company_id, sku)
- category_id → product_categories
- income_account_id, expense_account_id, inventory_account_id → accounts

### `product_categories` — فئات المنتجات
### `product_variants` — أنواع المنتجات
### `product_uom_conversions` — تحويلات وحدات القياس
### `price_lists` + `price_list_items` — قوائم الأسعار
### `product_reviews` + `product_review_stats` + `review_votes` — المراجعات

---

## 7️⃣ Sales — المبيعات (9 جدول)

### `quotations` — عروض الأسعار (40 عمود)
### `sales_orders` — أوامر البيع (39 عمود)
### `sales_invoices` — فواتير المبيعات (47 عمود — كبير)
- UNIQUE(tenant_id, company_id, invoice_number)
### `sales_deliveries` + `sales_delivery_items` — أذونات التسليم
### `sales_returns` — مرتجعات المبيعات
### `delivery_notes` + `delivery_note_items`

---

## 8️⃣ Purchases — المشتريات (8 جدول)

### `purchase_invoices` — فواتير المشتريات (30 عمود)
| Column | Type | Notes |
|--------|------|-------|
| tenant_id, company_id, branch_id | uuid (FKs) | |
| invoice_number | varchar(50) | ⚠️ UNIQUE(tenant_id, **company_id**, invoice_number) |
| supplier_id | uuid (FK→suppliers) | |
| supplier_name | varchar(200) | |
| shipment_id | uuid (FK→shipments) | YES |
| subtotal, tax_amount, total_amount | numeric | |
| status | varchar(20) | |

### `purchase_orders` — أوامر الشراء
- CHECK(status IN ('draft','sent','confirmed','received','cancelled'))
- UNIQUE(tenant_id, company_id, order_number)

### `purchase_quotations` — عروض أسعار الشراء
### `purchase_requests` — طلبات الشراء
### `purchase_receipts` + `purchase_receipt_items` — إيصالات الاستلام
### `purchase_returns` — مرتجعات المشتريات
### `purchase_invoice_items` — بنود فواتير المشتريات

---

## 9️⃣ Warehouse / Inventory — المستودعات (15 جدول)

### `warehouses` — المستودعات
- UNIQUE(company_id, code)
- CHECK(warehouse_type IN ('regular','transit','damaged','sample'))

### `bin_locations` — مواقع التخزين
### `fabric_materials` — المواد (48 عمود)
### `fabric_groups` — مجموعات الأقمشة
### `fabric_colors` — ألوان الأقمشة
### `fabric_rolls` — رولونات الأقمشة (33 عمود)
### `batches` — الدفعات
### `serial_numbers` + `serial_number_fields`
### `inventory_movements` — حركات المخزون
### `stock_ledger` — دفتر المخزون
### `stock_counts` + `stock_count_items` — الجرد
### `units_of_measure` — وحدات القياس
- UNIQUE(tenant_id, code)
- type: 'length' | 'weight' | 'quantity'

### `uom` — وحدات القياس (قديم)
- UNIQUE(code)
- ⚠️ جدول مكرر مع units_of_measure

---

## 🔟 SaaS / Billing — (15 جدول)

### `subscription_plans` — خطط الاشتراك (36 عمود)
### `tenant_subscriptions` — اشتراكات المستأجرين
### `billing_invoices` + `billing_payments` — فواتير ومدفوعات
### `saas_products` + `saas_payments` + `saas_events` + `saas_settings`
### `plan_modules` + `plan_module_features` + `plan_ui_tabs`
### `system_modules` + `module_features`

---

## ⚠️ تحليل الجودة — Quality Analysis

### 🔴 مشاكل يجب إصلاحها (Critical)

| # | المشكلة | الجدول | التفاصيل |
|---|---------|--------|----------|
| 1 | **FK مكرر** | `shipments` | `supplier_id` FK مُعرّف مرتين (`shipments_supplier_id_fkey` + `fk_shipments_supplier`) |
| 2 | **نظام مكرر** | `shipments` + `containers` | نظامان لإدارة الشحنات — يجب توحيدهما أو إزالة القديم |
| 3 | **وحدات مكررة** | `units_of_measure` + `uom` | جدولان لنفس الغرض |

### 🟡 تحسينات مقترحة (Warnings)

| # | المشكلة | التفاصيل |
|---|---------|----------|
| 1 | **80 جدول بدون UNIQUE** | مثل: shipment_items, journal_entry_lines, sales_invoice_items |
| 2 | **33 جدول بدون FK** | معظمها جداول نظام عمومية (account_types, countries, modules) — مقبول |
| 3 | **shipment_items.unit** | نص حر — يفضل FK→units_of_measure |
| 4 | **companies.default_currency = 'SAR'** | يجب تغييره لـ 'UAH' أو جعله ديناميكياً |

### 🟢 نقاط قوة (Strengths)

| # | الميزة | التفاصيل |
|---|--------|----------|
| 1 | **563 FK** | تغطية ممتازة للعلاقات |
| 2 | **167 جدول بـ tenant_id** | عزل متعدد المستأجرين قوي |
| 3 | **9 لغات في chart_of_accounts** | دعم لغوي استثنائي |
| 4 | **4 لغات في suppliers/customers** | ar, en, ru, uk |
| 5 | **CHECK constraints** | 54 قيد — تضمن سلامة البيانات |
| 6 | **شجرة ذاتية** | chart_of_accounts, cost_centers, product_categories, customer_groups, supplier_groups, fabric_groups |

---

## 📋 الأعمدة الصحيحة — Quick Reference

### ⚡ shipments (الأعمدة المعتمدة):
```
port_of_loading     ← ✅ NOT origin_port
port_of_discharge   ← ✅ NOT destination_port  
etd                 ← ✅ NOT shipping_date
eta                 ← ✅ NOT expected_arrival_date
status              ← ordered|confirmed|shipped|at_port|customs_clearance|received|cancelled
```

### ⚡ transit_reservations (الأعمدة المعتمدة):
```
reservation_number, reservation_date, customer_id, shipment_id, 
shipment_item_id, product_id, sales_order_id, shipping_address_id,
reserved_quantity, currency, status, notes, created_by
❌ NO: customer_name, unit, unit_price, total_amount, advance_amount
```

### ⚡ purchase_invoices (UNIQUE الصحيح):
```
UNIQUE(tenant_id, company_id, invoice_number)  ← 3 أعمدة وليس 2!
```

### ⚡ suppliers (الأعمدة المعتمدة):
```
code, supplier_type, name_ar, name_en, name_ru, name_uk,
email, phone, country, city, group_id, currency, payable_account_id, status
```

### ⚡ customers (الأعمدة المعتمدة):
```
code, name_ar, name_en, name_ru, name_uk,
phone, email, country, city, group_id, receivable_account_id, auth_user_id
```

---

## 🔗 خريطة العلاقات الرئيسية — Core Relationships

```
tenants (1)
  ├── companies (N)
  │     ├── branches (N)
  │     │     ├── warehouses (N)
  │     │     │     ├── bin_locations (N)
  │     │     │     └── fabric_rolls (N)
  │     │     ├── journal_entries (N)
  │     │     ├── cash_transactions (N)
  │     │     └── sales_invoices (N)
  │     ├── chart_of_accounts (N) ←→ self (parent)
  │     ├── customers (N)
  │     │     ├── customer_addresses (N)
  │     │     ├── sales_orders (N)
  │     │     ├── transit_reservations (N)
  │     │     └── quotations (N)
  │     ├── suppliers (N)
  │     │     ├── shipments (N)
  │     │     │     ├── shipment_items (N)
  │     │     │     │     └── transit_reservations (N)
  │     │     │     ├── shipment_documents (N)
  │     │     │     └── purchase_invoices (N)
  │     │     └── purchase_orders (N)
  │     ├── products (N)
  │     │     ├── product_variants (N)
  │     │     ├── fabric_rolls (N)
  │     │     └── price_list_items (N)
  │     ├── fabric_materials (N)
  │     │     └── fabric_groups (N) ←→ self (parent)
  │     └── cost_centers (N) ←→ self (parent)
  ├── user_profiles (N)
  │     ├── roles (N)
  │     ├── user_roles (N)
  │     └── user_branch_permissions (N)
  └── tenant_subscriptions (N)
        └── subscription_plans (1)
              └── saas_products (1)
```

---

## 📊 أكبر 10 جداول (حسب عدد الأعمدة)

| # | الجدول | الأعمدة | الوحدة |
|---|--------|---------|--------|
| 1 | shipment_documents | 60 | Shipments |
| 2 | containers | 55 | Shipments (قديم) |
| 3 | products | 52 | Products |
| 4 | contacts | 50 | CRM |
| 5 | companies | 49 | Core |
| 6 | fabric_materials | 48 | Inventory |
| 7 | sales_invoices | 47 | Sales |
| 8 | remittances | 43 | Treasury |
| 9 | reservations | 42 | Accounting |
| 10 | delivery_notes | 42 | Sales |

---

## 🔑 قيود UNIQUE الرئيسية — للاستخدام في ON CONFLICT

```sql
-- ✅ صحيح — استخدم هذه في ON CONFLICT
ON CONFLICT (tenant_id, shipment_number)           -- shipments
ON CONFLICT (tenant_id, code)                       -- suppliers, customers, units_of_measure
ON CONFLICT (tenant_id, reservation_number)         -- transit_reservations ✅
ON CONFLICT (tenant_id, company_id, invoice_number) -- purchase_invoices ⚠️ 3 أعمدة!
ON CONFLICT (tenant_id, company_id, invoice_number) -- sales_invoices ⚠️ 3 أعمدة!
ON CONFLICT (tenant_id, company_id, invoice_number) -- account_invoices ⚠️ 3 أعمدة!
ON CONFLICT (tenant_id, entry_number)               -- journal_entries
ON CONFLICT (tenant_id, transaction_number)         -- cash_transactions
ON CONFLICT (tenant_id, company_id, code)           -- chart_of_accounts, cost_centers
ON CONFLICT (company_id, code)                       -- branches, warehouses, agents
```

---

## 🗓️ سجل التحديثات

| التاريخ | التحديث |
|---------|---------|
| 2026-02-11 | إنشاء التوثيق من production schema — 221 جدول, 563 FK, 147 UNIQUE |
| 2026-02-11 | تصحيح أعمدة shipments (port_of_loading, etd, eta) |
| 2026-02-11 | تأكيد أعمدة transit_reservations (بدون customer_name, unit_price) |
| 2026-02-11 | اكتشاف purchase_invoices UNIQUE = 3 أعمدة وليس 2 |
