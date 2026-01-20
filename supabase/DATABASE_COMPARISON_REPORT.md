# تقرير مقارنة قاعدة البيانات
# Database Schema Comparison Report

## 📊 ملخص التنفيذي / Executive Summary

تم مقارنة الهيكلية الحالية للمشروع مع الهيكلية الجديدة المقترحة من ملفات `claudi/`. هذا التقرير يوضح الفروقات والتعديلات المطلوبة.

---

## 🔍 الفروقات الرئيسية / Key Differences

### 1. نظام Multi-Tenant (SaaS)

**الحالي:**
- ❌ لا يوجد نظام multi-tenant
- ❌ الجداول مرتبطة مباشرة بـ `company_id` فقط

**الجديد:**
- ✅ نظام multi-tenant كامل مع جدول `tenants`
- ✅ جميع الجداول مرتبطة بـ `tenant_id` + `company_id`
- ✅ جداول: `saas_products`, `subscription_plans`, `subscriptions`, `system_modules`, `tenant_modules`

**التأثير:**
- يتطلب إضافة `tenant_id` لجميع الجداول الموجودة
- إنشاء tenant افتراضي للبيانات الحالية

---

### 2. جدول الحسابات (Chart of Accounts)

**الحالي:**
- جدول `accounts` بسيط:
  - `account_type`: VARCHAR (asset, liability, etc.)
  - `code`, `name`, `name_en`
  - `parent_id`, `level`, `is_group`
  - `currency_code`, `opening_balance`, `current_balance`

**الجديد:**
- جدول `chart_of_accounts` مع `account_types` منفصل:
  - `account_type_id` → يرجع إلى `account_types(id)`
  - `account_code` بدلاً من `code`
  - حقول إضافية: `is_bank_account`, `is_cash_account`, `is_receivable`, `is_payable`
  - `full_code` للكود الكامل
  - `is_detail` للتفريق بين المجموعات والتفاصيل

**التأثير:**
- يحتاج migration script لتحويل `accounts` → `chart_of_accounts`
- إنشاء جدول `account_types` وإدراج البيانات الافتراضية

---

### 3. القيود المحاسبية (Journal Entries)

**الحالي:**
- ⚠️ قد يكون موجود في الكود لكن غير موجود في قاعدة البيانات
- الكود يستخدم `journal_entries` في `JournalEntryForm.tsx`

**الجديد:**
- ✅ جدول `journal_entries` كامل مع:
  - `entry_number`, `entry_date`
  - `fiscal_year_id`, `period_id`
  - `entry_type`, `reference_type`, `reference_id`
  - `total_debit`, `total_credit`
  - `is_posted`, `posted_at`, `posted_by`
  - `is_reversed`, `reversal_entry_id`
- ✅ جدول `journal_entry_lines` مع:
  - `debit`, `credit`
  - `currency`, `exchange_rate`
  - `cost_center_id`
  - `party_type`, `party_id`

**التأثير:**
- إنشاء الجداول الجديدة
- ربطها مع `chart_of_accounts`

---

### 4. العملاء والموردين

**الحالي:**
- ❌ لا يوجد جداول للعملاء أو الموردين

**الجديد:**
- ✅ `customers` مع:
  - `customer_groups`
  - `customer_addresses`
  - `customer_contacts`
  - KYC fields
  - `balance`, `total_sales`, `total_payments`
- ✅ `suppliers` مع:
  - `supplier_groups`
  - `supplier_contacts`
  - معلومات بنكية
  - `balance`, `total_purchases`, `total_payments`

**التأثير:**
- إنشاء جداول جديدة كاملة

---

### 5. المخزون والمنتجات

**الحالي:**
- ⚠️ قد يكون موجود في الكود لكن غير موجود في قاعدة البيانات

**الجديد:**
- ✅ `products` مع:
  - `product_categories`, `brands`
  - `product_variants`, `product_attributes`
  - `warehouses`, `warehouse_locations`
  - `inventory_stock`, `inventory_movements`
  - `inventory_batches`, `inventory_serials`

**التأثير:**
- إنشاء جداول جديدة كاملة

---

### 6. المبيعات والمشتريات

**الحالي:**
- ❌ لا يوجد جداول للمبيعات أو المشتريات

**الجديد:**
- ✅ `quotations`, `sales_orders`, `sales_invoices`
- ✅ `sales_invoice_items` (مشترك)
- ✅ `purchase_orders`, `purchase_invoices`
- ✅ `purchase_invoice_items`
- ✅ `payment_receipts`, `payment_vouchers`
- ✅ `payment_receipt_allocations`

**التأثير:**
- إنشاء جداول جديدة كاملة

---

### 7. موديول الأقمشة

**الحالي:**
- ❌ لا يوجد

**الجديد:**
- ✅ `fabric_groups`, `fabric_colors`, `fabric_materials`
- ✅ `fabric_material_colors`
- ✅ `fabric_rolls`, `roll_movements`
- ✅ `fabric_samples`, `roll_reservations`

**التأثير:**
- إنشاء جداول جديدة (اختياري - فقط إذا كان الموديول مفعّل)

---

### 8. موديول الصرافة

**الحالي:**
- ❌ لا يوجد

**الجديد:**
- ✅ `exchange_rates`
- ✅ `exchange_transactions`
- ✅ `exchange_agents`
- ✅ `remittances`
- ✅ `currency_vaults`, `vault_movements`
- ✅ `agent_balances`, `agent_movements`, `agent_settlements`

**التأثير:**
- إنشاء جداول جديدة (اختياري - فقط إذا كان الموديول مفعّل)

---

### 9. جداول إضافية

**الجديد:**
- ✅ `fiscal_years`, `accounting_periods`
- ✅ `cost_centers`
- ✅ `cash_accounts`, `cash_transactions`
- ✅ `tax_rates`
- ✅ `price_lists`, `price_list_items`
- ✅ `units_of_measure`
- ✅ `sequences` (للتسلسلات التلقائية)
- ✅ `audit_logs`

---

## 📋 الجداول الموجودة التي تحتاج تحديث

### 1. `companies`
**التعديلات المطلوبة:**
- إضافة `tenant_id UUID NOT NULL`
- إضافة `code VARCHAR(50) NOT NULL`
- تغيير `name` → `name_ar`
- إضافة حقول: `name_en`, `legal_name`, `registration_number`, `country`, `city`, `postal_code`, `mobile`, `website`, `default_currency`, `fiscal_year_start`, `settings`, `is_active`
- تحديث UNIQUE constraint: `UNIQUE(tenant_id, code)`

### 2. `branches`
**التعديلات المطلوبة:**
- إضافة `tenant_id UUID NOT NULL`
- إضافة `code VARCHAR(50) NOT NULL`
- تغيير `name` → `name_ar`
- إضافة حقول: `name_en`, `branch_type`, `country`, `city`, `manager_id`, `default_warehouse_id`, `default_currency`, `working_hours`, `is_active`
- تحديث UNIQUE constraint: `UNIQUE(tenant_id, company_id, code)`

### 3. `currencies`
**التعديلات المطلوبة:**
- إضافة `tenant_id UUID NOT NULL`
- تغيير `name` → `name_ar`
- إضافة حقول: `name_en`, `symbol_position`, `decimal_places`, `thousands_separator`, `decimal_separator`, `is_base`, `exchange_rate`
- تحديث UNIQUE constraint: `UNIQUE(tenant_id, code)`

### 4. `user_profiles`
**ملاحظة:** النظام الجديد يستخدم جدول `users` منفصل عن `auth.users`
**الخيارات:**
- **الخيار 1:** الاحتفاظ بـ `user_profiles` وإضافة `tenant_id`
- **الخيار 2:** إنشاء جدول `users` جديد وربطه بـ `user_profiles`

---

## 📝 الجداول الجديدة المطلوبة

### Core Tables
1. `tenants` - عملاء SaaS
2. `saas_products` - المنتجات (TexaCore, FinCore)
3. `system_modules` - الموديولات
4. `subscription_plans` - الباقات
5. `subscriptions` - الاشتراكات
6. `tenant_modules` - الموديولات المفعلة
7. `users` - المستخدمين (إذا لم نستخدم user_profiles)
8. `roles` - الأدوار
9. `user_roles` - ربط المستخدمين بالأدوار
10. `units_of_measure` - وحدات القياس
11. `sequences` - التسلسلات
12. `audit_logs` - سجل التدقيق

### Accounting Tables
13. `account_types` - أنواع الحسابات
14. `chart_of_accounts` - دليل الحسابات (بدلاً من accounts)
15. `fiscal_years` - السنوات المالية
16. `accounting_periods` - الفترات المحاسبية
17. `journal_entries` - القيود اليومية
18. `journal_entry_lines` - بنود القيود
19. `cost_centers` - مراكز التكلفة
20. `cash_accounts` - الخزائن والصناديق
21. `cash_transactions` - سندات القبض والصرف
22. `tax_rates` - إعدادات الضرائب

### Customers & Suppliers
23. `customer_groups` - مجموعات العملاء
24. `customers` - العملاء
25. `customer_addresses` - عناوين العملاء
26. `customer_contacts` - جهات اتصال العملاء
27. `supplier_groups` - مجموعات الموردين
28. `suppliers` - الموردين
29. `supplier_contacts` - جهات اتصال الموردين
30. `price_lists` - قوائم الأسعار
31. `price_list_items` - أسعار المنتجات

### Inventory & Products
32. `warehouses` - المستودعات
33. `warehouse_locations` - مواقع التخزين
34. `product_categories` - تصنيفات المنتجات
35. `brands` - العلامات التجارية
36. `products` - المنتجات
37. `product_attributes` - خصائص المتغيرات
38. `product_variants` - متغيرات المنتج
39. `inventory_stock` - أرصدة المخزون
40. `inventory_movements` - حركات المخزون
41. `inventory_batches` - الدفعات
42. `inventory_serials` - الأرقام التسلسلية

### Sales & Purchases
43. `quotations` - عروض الأسعار
44. `sales_orders` - أوامر البيع
45. `sales_invoices` - فواتير المبيعات
46. `sales_invoice_items` - بنود المبيعات
47. `purchase_orders` - أوامر الشراء
48. `purchase_invoices` - فواتير المشتريات
49. `purchase_invoice_items` - بنود المشتريات
50. `payment_receipts` - سندات القبض
51. `payment_receipt_allocations` - توزيع سندات القبض
52. `payment_vouchers` - سندات الصرف

### Fabric Module (اختياري)
53. `fabric_groups` - مجموعات الأقمشة
54. `fabric_colors` - ألوان الأقمشة
55. `fabric_materials` - أنواع الأقمشة
56. `fabric_material_colors` - ربط الألوان بالمواد
57. `fabric_rolls` - الرولونات
58. `roll_movements` - حركات الرولونات
59. `fabric_samples` - عينات الأقمشة
60. `roll_reservations` - حجوزات الرولونات

### Exchange Module (اختياري)
61. `exchange_rates` - أسعار الصرف
62. `exchange_transactions` - عمليات الصرف
63. `exchange_agents` - الوكلاء والمراسلين
64. `remittances` - الحوالات
65. `currency_vaults` - خزائن العملات
66. `vault_movements` - حركات خزائن العملات
67. `agent_balances` - أرصدة الوكلاء
68. `agent_movements` - حركات أرصدة الوكلاء
69. `agent_settlements` - تسويات الوكلاء

---

## 🔄 خطة التحديث / Migration Plan

### المرحلة 1: إعداد نظام Multi-Tenant
1. إنشاء جدول `tenants`
2. إنشاء tenant افتراضي
3. إضافة `tenant_id` للجداول الموجودة

### المرحلة 2: تحديث الجداول الأساسية
1. تحديث `companies` (إضافة حقول + tenant_id)
2. تحديث `branches` (إضافة حقول + tenant_id)
3. تحديث `currencies` (إضافة حقول + tenant_id)

### المرحلة 3: تحديث نظام المحاسبة
1. إنشاء `account_types`
2. إنشاء `chart_of_accounts`
3. Migration من `accounts` → `chart_of_accounts`
4. إنشاء `journal_entries` و `journal_entry_lines`
5. إنشاء `fiscal_years`, `accounting_periods`
6. إنشاء `cost_centers`

### المرحلة 4: إضافة الموديولات الأساسية
1. العملاء والموردين
2. المخزون والمنتجات
3. المبيعات والمشتريات

### المرحلة 5: الموديولات المتخصصة (اختياري)
1. موديول الأقمشة
2. موديول الصرافة

---

## ⚠️ ملاحظات مهمة / Important Notes

1. **الحفاظ على البيانات:** جميع scripts migration تحافظ على البيانات الموجودة
2. **Backward Compatibility:** قد تحتاج تحديث الكود ليتوافق مع الجداول الجديدة
3. **RLS Policies:** يجب تحديث Row Level Security policies للجداول الجديدة
4. **Indexes:** جميع الجداول الجديدة تحتوي على indexes محسّنة
5. **Triggers & Functions:** النظام الجديد يحتوي على triggers و functions متقدمة

---

## 📄 الملفات المطلوبة

1. `migration_001_add_tenant_system.sql` - إضافة نظام multi-tenant
2. `migration_002_update_existing_tables.sql` - تحديث الجداول الموجودة
3. `migration_003_add_accounting_tables.sql` - إضافة جداول المحاسبة
4. `migration_004_migrate_accounts_data.sql` - نقل بيانات accounts
5. `migration_005_add_core_modules.sql` - إضافة الموديولات الأساسية
6. `migration_006_add_specialized_modules.sql` - إضافة الموديولات المتخصصة (اختياري)

---

**تاريخ التقرير:** 2026-01-19
**الإصدار:** 1.0
