# دليل تطبيق التحديثات على قاعدة البيانات
# Database Migration Guide

## 📋 نظرة عامة / Overview

هذا الدليل يوضح كيفية تطبيق التحديثات على قاعدة البيانات الحالية لتتوافق مع الهيكلية الجديدة.

---

## ⚠️ تحذيرات مهمة / Important Warnings

1. **نسخ احتياطي:** قم بعمل نسخة احتياطية كاملة من قاعدة البيانات قبل البدء
2. **البيئة:** جرب التحديثات أولاً على بيئة تطوير/اختبار
3. **الترتيب:** يجب تطبيق ملفات Migration بالترتيب المحدد
4. **التحقق:** بعد كل migration، تحقق من أن البيانات محفوظة بشكل صحيح

---

## 📝 خطوات التطبيق / Application Steps

### المرحلة 1: إعداد نظام Multi-Tenant

```sql
-- تطبيق Migration 1
\i supabase/migrations/00002_add_tenant_system.sql
```

**ما يفعله:**
- إنشاء جداول SaaS (tenants, subscriptions, etc.)
- إنشاء tenant افتراضي للبيانات الحالية
- إدراج البيانات الأساسية (products, modules)

**التحقق:**
```sql
SELECT * FROM tenants WHERE code = 'default';
SELECT COUNT(*) FROM saas_products;
```

---

### المرحلة 2: تحديث الجداول الموجودة

```sql
-- تطبيق Migration 2
\i supabase/migrations/00003_update_existing_tables.sql
```

**ما يفعله:**
- إضافة `tenant_id` لـ companies, branches, currencies
- إضافة حقول جديدة للجداول الموجودة
- تحديث RLS policies

**التحقق:**
```sql
SELECT COUNT(*) FROM companies WHERE tenant_id IS NOT NULL;
SELECT COUNT(*) FROM branches WHERE tenant_id IS NOT NULL;
```

---

### المرحلة 3: إضافة جداول المحاسبة

```sql
-- تطبيق Migration 3
\i supabase/migrations/00004_add_accounting_tables.sql
```

**ما يفعله:**
- إنشاء `account_types`, `chart_of_accounts`
- إنشاء `journal_entries`, `journal_entry_lines`
- إنشاء `fiscal_years`, `accounting_periods`
- إنشاء `cost_centers`, `cash_accounts`, `cash_transactions`
- إنشاء `tax_rates`

**التحقق:**
```sql
SELECT COUNT(*) FROM account_types;
SELECT COUNT(*) FROM chart_of_accounts;
```

---

### المرحلة 4: نقل بيانات accounts

```sql
-- تطبيق Migration 4
\i supabase/migrations/00005_migrate_accounts_to_chart_of_accounts.sql
```

**ما يفعله:**
- نقل جميع البيانات من `accounts` إلى `chart_of_accounts`
- إنشاء view للتوافق مع الكود الحالي (`accounts_compatibility_view`)

**التحقق:**
```sql
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM chart_of_accounts;
-- يجب أن يكون العدد متساوي
```

---

### المرحلة 5: إضافة الموديولات الأساسية

```sql
-- تطبيق Migration 5
\i supabase/migrations/00006_add_core_modules.sql
```

**ما يفعله:**
- إنشاء جداول العملاء والموردين
- إنشاء `units_of_measure`, `sequences`, `audit_logs`
- إنشاء `price_lists`

**التحقق:**
```sql
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM suppliers;
```

---

### المرحلة 6: إضافة المخزون والمنتجات

```sql
-- تطبيق Migration 6
\i supabase/migrations/00007_add_inventory_and_products.sql
```

**ما يفعله:**
- إنشاء جداول المنتجات والمخزون
- إنشاء `warehouses`, `products`, `inventory_stock`, etc.

---

### المرحلة 7: إضافة المبيعات والمشتريات

```sql
-- تطبيق Migration 7
\i supabase/migrations/00008_add_sales_and_purchases.sql
```

**ما يفعله:**
- إنشاء جداول المبيعات والمشتريات
- إنشاء `quotations`, `sales_orders`, `sales_invoices`
- إنشاء `purchase_orders`, `purchase_invoices`
- إنشاء `payment_receipts`, `payment_vouchers`

---

### المرحلة 8: إضافة موديول الأقمشة (اختياري)

```sql
-- تطبيق Migration 8 (فقط إذا كان الموديول مفعّل)
\i supabase/migrations/00009_add_fabric_module.sql
```

**ملاحظة:** هذا الموديول اختياري. طبق فقط إذا كنت تحتاج موديول الأقمشة.

---

### المرحلة 9: إضافة موديول الصرافة (اختياري)

```sql
-- تطبيق Migration 9 (فقط إذا كان الموديول مفعّل)
\i supabase/migrations/00010_add_exchange_module.sql
```

**ملاحظة:** هذا الموديول اختياري. طبق فقط إذا كنت تحتاج موديول الصرافة.

---

### المرحلة 10: إضافة Functions و Triggers

```sql
-- تطبيق Migration 10
\i supabase/migrations/00011_add_functions_and_triggers.sql
```

**ما يفعله:**
- إضافة functions: `generate_sequence_number`, `get_account_id`, `post_journal_entry`
- إضافة triggers: تحديث أرصدة المخزون، تحديث أرصدة العملاء، etc.

---

## 🔄 تحديث الكود / Code Updates

بعد تطبيق Migrations، قد تحتاج لتحديث الكود:

### 1. تحديث accountsService

```typescript
// بدلاً من:
.from('accounts')

// استخدم:
.from('chart_of_accounts')
// أو
.from('accounts_compatibility_view') // للتوافق المؤقت
```

### 2. إضافة tenant_id في الاستعلامات

```typescript
// جميع الاستعلامات يجب أن تتضمن tenant_id
.eq('tenant_id', tenantId)
```

### 3. تحديث Journal Entries

```typescript
// استخدام journal_entries و journal_entry_lines
// بدلاً من أي جداول مؤقتة
```

---

## ✅ قائمة التحقق / Checklist

- [ ] نسخة احتياطية من قاعدة البيانات
- [ ] تطبيق Migration 00002 (Tenant System)
- [ ] التحقق من إنشاء tenant افتراضي
- [ ] تطبيق Migration 00003 (Update Existing Tables)
- [ ] التحقق من إضافة tenant_id للجداول
- [ ] تطبيق Migration 00004 (Accounting Tables)
- [ ] تطبيق Migration 00005 (Migrate Accounts)
- [ ] التحقق من نقل البيانات بشكل صحيح
- [ ] تطبيق Migration 00006 (Core Modules)
- [ ] تطبيق Migration 00007 (Inventory)
- [ ] تطبيق Migration 00008 (Sales & Purchases)
- [ ] تطبيق Migration 00009 (Fabric - اختياري)
- [ ] تطبيق Migration 00010 (Exchange - اختياري)
- [ ] تطبيق Migration 00011 (Functions & Triggers)
- [ ] تحديث الكود للتوافق مع الجداول الجديدة
- [ ] اختبار جميع الوظائف

---

## 🐛 حل المشاكل / Troubleshooting

### مشكلة: خطأ في tenant_id
**الحل:** تأكد من تطبيق Migration 00002 أولاً

### مشكلة: بيانات accounts لم تُنقل
**الحل:** تحقق من وجود جدول `accounts` وتطبيق Migration 00005

### مشكلة: RLS policies تمنع الوصول
**الحل:** تحديث policies لتشمل tenant_id في الشروط

---

## 📞 الدعم / Support

إذا واجهت أي مشاكل، تحقق من:
1. ترتيب تطبيق Migrations
2. وجود البيانات الأساسية (tenants, account_types)
3. RLS policies محدثة
4. الكود متوافق مع الجداول الجديدة

---

**تاريخ الدليل:** 2026-01-19
**الإصدار:** 1.0
