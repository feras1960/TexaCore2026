# ملفات Migration لقاعدة البيانات
# Database Migration Files

## 📁 الملفات المتوفرة / Available Files

### 1. تقرير المقارنة
- `DATABASE_COMPARISON_REPORT.md` - تقرير شامل يوضح الفروقات بين الهيكلية الحالية والجديدة

### 2. ملفات Migration (بالترتيب)

#### 00002_add_tenant_system.sql
إضافة نظام Multi-Tenant (SaaS)
- جداول: `tenants`, `saas_products`, `subscriptions`, `system_modules`
- إنشاء tenant افتراضي

#### 00003_update_existing_tables.sql
تحديث الجداول الموجودة
- إضافة `tenant_id` لـ companies, branches, currencies
- إضافة حقول جديدة

#### 00004_add_accounting_tables.sql
إضافة جداول المحاسبة الجديدة
- `account_types`, `chart_of_accounts`
- `journal_entries`, `journal_entry_lines`
- `fiscal_years`, `accounting_periods`
- `cost_centers`, `cash_accounts`, `tax_rates`

#### 00005_migrate_accounts_to_chart_of_accounts.sql
نقل بيانات accounts إلى chart_of_accounts
- نقل جميع البيانات
- إنشاء view للتوافق

#### 00006_add_core_modules.sql
إضافة الموديولات الأساسية
- العملاء والموردين
- وحدات القياس، التسلسلات، سجل التدقيق
- قوائم الأسعار

#### 00007_add_inventory_and_products.sql
إضافة المخزون والمنتجات
- `warehouses`, `products`, `inventory_stock`
- `inventory_movements`, `inventory_batches`, `inventory_serials`

#### 00008_add_sales_and_purchases.sql
إضافة المبيعات والمشتريات
- `quotations`, `sales_orders`, `sales_invoices`
- `purchase_orders`, `purchase_invoices`
- `payment_receipts`, `payment_vouchers`

#### 00009_add_fabric_module.sql (اختياري)
إضافة موديول الأقمشة
- `fabric_materials`, `fabric_rolls`
- `roll_movements`, `fabric_samples`

#### 00010_add_exchange_module.sql (اختياري)
إضافة موديول الصرافة
- `exchange_rates`, `exchange_transactions`
- `remittances`, `currency_vaults`
- `exchange_agents`

#### 00011_add_functions_and_triggers.sql
إضافة Functions و Triggers
- `generate_sequence_number`
- `post_journal_entry`
- Triggers لتحديث الأرصدة تلقائياً

---

## 🚀 كيفية التطبيق / How to Apply

### الطريقة 1: تطبيق يدوي (psql)

```bash
# الاتصال بقاعدة البيانات
psql -h your-host -U your-user -d your-database

# تطبيق الملفات بالترتيب
\i supabase/migrations/00002_add_tenant_system.sql
\i supabase/migrations/00003_update_existing_tables.sql
\i supabase/migrations/00004_add_accounting_tables.sql
\i supabase/migrations/00005_migrate_accounts_to_chart_of_accounts.sql
\i supabase/migrations/00006_add_core_modules.sql
\i supabase/migrations/00007_add_inventory_and_products.sql
\i supabase/migrations/00008_add_sales_and_purchases.sql
\i supabase/migrations/00009_add_fabric_module.sql  # اختياري
\i supabase/migrations/00010_add_exchange_module.sql  # اختياري
\i supabase/migrations/00011_add_functions_and_triggers.sql
```

### الطريقة 2: تطبيق من Supabase Dashboard

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى كل ملف
4. نفذ بالترتيب

### الطريقة 3: استخدام Supabase CLI

```bash
supabase db reset
supabase migration up
```

---

## ⚠️ تحذيرات / Warnings

1. **نسخ احتياطي:** قم بعمل نسخة احتياطية قبل البدء
2. **الترتيب:** يجب تطبيق الملفات بالترتيب المحدد
3. **البيئة:** جرب أولاً على بيئة تطوير
4. **التحقق:** بعد كل migration، تحقق من البيانات

---

## 📊 ملخص التغييرات / Summary

- ✅ إضافة نظام Multi-Tenant
- ✅ تحديث الجداول الموجودة
- ✅ إضافة 60+ جدول جديد
- ✅ نقل بيانات accounts
- ✅ إضافة Functions و Triggers
- ✅ تحديث RLS Policies

---

**للمزيد من التفاصيل، راجع:**
- `DATABASE_COMPARISON_REPORT.md` - تقرير المقارنة الشامل
- `MIGRATION_GUIDE.md` - دليل التطبيق التفصيلي
