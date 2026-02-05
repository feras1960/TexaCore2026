# 📊 تقرير المسح الشامل لقاعدة البيانات
## TexaCore ERP Database - 2026-02-05

---

## 📌 ملخص الإحصائيات

| المتر | القيمة |
|-------|--------|
| **إجمالي الجداول** | 182 |
| **جداول تحتوي tenant_id** | 119 (65%) |
| **جداول تحتوي company_id** | 78 (43%) |
| **جداول تحتوي brand_id/product_id** | 31 (17%) |
| **جداول بـ RLS مفعّل** | 147 (81%) |
| **جداول تحتوي tenant_id + company_id** | 62 (34%) |
| **إجمالي الدوال** | 248 |
| **إجمالي التريغرات** | 62 |

---

## 📌 1. تصنيف الجداول

### 🔷 جداول المنصة (Platform) - 24 جدول
*لا تحتاج tenant_id - تُدار بواسطة Platform Admin*

| الجدول | الوصف |
|--------|-------|
| `saas_products` | البراندات (TexaCore, FinCore, etc.) |
| `saas_payments` | مدفوعات الاشتراكات |
| `saas_events` | أحداث المنصة |
| `saas_settings` | إعدادات المنصة |
| `countries` | الدول (Lookup) |
| `currencies` | العملات (Lookup) |
| `account_types` | أنواع الحسابات (Lookup) |
| `business_industries` | الصناعات (Lookup) |
| `modules` | الموديولات المتاحة |
| `module_features` | ميزات الموديولات |
| `system_languages` | اللغات المتاحة |
| `system_modules` | موديولات النظام |
| `plan_modules` | موديولات الخطط |
| `plan_module_features` | ميزات خطط الموديولات |
| `plan_ui_tabs` | تابات الخطط |
| `ui_tabs` | التابات المتاحة |
| `coa_templates` | قوالب شجرة الحسابات |
| `coa_template_items` | عناصر قوالب الحسابات |
| `coa_template_cash_accounts` | حسابات نقدية للقوالب |
| `country_configurations` | إعدادات الدول |
| `white_label_configs` | إعدادات White Label |
| `white_label_domains` | دومينات White Label |
| `white_label_payments` | مدفوعات White Label |
| `white_label_stats` | إحصائيات White Label |

---

### 🔷 جداول الوكلاء (Partners/Agents) - 9 جداول
*تحتاج agent_id للعزل*

| الجدول | tenant_id | company_id | RLS |
|--------|-----------|------------|-----|
| `agents` | ❌ | ✅ | ✅ |
| `agent_bonuses` | ❌ | ❌ | ❌ |
| `agent_commission_rules` | ❌ | ❌ | ✅ |
| `agent_commissions` | ✅ | ❌ | ✅ |
| `agent_events` | ❌ | ❌ | ❌ |
| `agent_messages` | ❌ | ❌ | ❌ |
| `agent_targets` | ❌ | ❌ | ❌ |
| `agent_tiers` | ❌ | ❌ | ❌ |
| `agent_withdrawals` | ❌ | ❌ | ❌ |

---

### 🔷 جداول المستأجرين (Tenant Level) - 57 جدول
*تحتوي tenant_id فقط (بدون company_id)*

| الجدول | RLS | الوصف |
|--------|-----|-------|
| `tenants` | ✅ | المستأجرين |
| `tenant_users` | ✅ | مستخدمي المستأجر |
| `tenant_modules` | ✅ | موديولات المستأجر |
| `tenant_subscriptions` | ✅ | اشتراكات المستأجر |
| `tenant_languages` | ✅ | لغات المستأجر |
| `roles` | ✅ | الأدوار |
| `announcements` | ✅ | الإعلانات |
| `audit_logs` | ✅ | سجلات التدقيق |
| `notifications` | ✅ | الإشعارات |
| `documents` | ✅ | المستندات |
| `billing_invoices` | ✅ | فواتير الفوترة |
| `billing_payments` | ✅ | مدفوعات الفوترة |
| `subscriptions` | ✅ | الاشتراكات |
| `storage_quotas` | ✅ | حصص التخزين |
| `chart_templates` | ❌ | قوالب شجرة الحسابات |
| `coupon_usage` | ❌ | استخدام الكوبونات |
| `support_tickets` | ❌ | تذاكر الدعم |
| `usage_analytics` | ❌ | تحليلات الاستخدام |
| `usage_stats` | ❌ | إحصائيات الاستخدام |
| `webhook_endpoints` | ❌ | نقاط Webhook |
| ... | ... | (وغيرها) |

---

### 🔷 جداول الشركة (Company Level) - 62 جدول
*تحتوي tenant_id + company_id*

| الجدول | RLS | الوصف |
|--------|-----|-------|
| `companies` | ✅ | الشركات |
| `branches` | ✅ | الفروع |
| `user_profiles` | ✅ | ملفات المستخدمين |
| `user_roles` | ✅ | أدوار المستخدمين |
| `chart_of_accounts` | ✅ | شجرة الحسابات |
| `journal_entries` | ✅ | القيود اليومية |
| `journal_entry_lines` | ✅ | سطور القيود |
| `fiscal_years` | ✅ | السنوات المالية |
| `accounting_periods` | ✅ | الفترات المحاسبية |
| `customers` | ✅ | العملاء |
| `customer_groups` | ✅ | مجموعات العملاء |
| `suppliers` | ✅ | الموردين |
| `supplier_groups` | ✅ | مجموعات الموردين |
| `products` | ✅ | المنتجات |
| `warehouses` | ✅ | المستودعات |
| `inventory_movements` | ✅ | حركات المخزون |
| `sales_invoices` | ✅ | فواتير المبيعات |
| `sales_invoice_items` | ✅ | بنود فواتير المبيعات |
| `purchase_invoices` | ✅ | فواتير المشتريات |
| `purchase_invoice_items` | ✅ | بنود فواتير المشتريات |
| `purchase_orders` | ✅ | أوامر الشراء |
| `orders` | ✅ | الطلبات |
| `order_items` | ✅ | بنود الطلبات |
| `payment_receipts` | ✅ | سندات القبض |
| `payment_vouchers` | ✅ | سندات الصرف |
| `cash_accounts` | ✅ | الحسابات النقدية |
| `cash_transactions` | ✅ | المعاملات النقدية |
| `budgets` | ✅ | الميزانيات |
| `budget_lines` | ✅ | بنود الميزانيات |
| `cost_centers` | ✅ | مراكز التكلفة |
| `exchange_rates` | ✅ | أسعار الصرف |
| `tax_rates` | ✅ | معدلات الضرائب |
| `price_lists` | ✅ | قوائم الأسعار |
| `price_list_items` | ✅ | بنود قوائم الأسعار |
| `containers` | ✅ | الحاويات |
| `container_items` | ✅ | بنود الحاويات |
| `container_expenses` | ✅ | مصاريف الحاويات |
| `delivery_notes` | ✅ | إشعارات التسليم |
| `delivery_note_items` | ✅ | بنود إشعارات التسليم |
| `fabric_rolls` | ✅ | لفات القماش |
| `fabric_colors` | ✅ | ألوان القماش |
| `fabric_materials` | ✅ | خامات القماش |
| ... | ... | (وغيرها) |

---

### 🔷 جداول Lookup (للقراءة فقط) - 8 جداول
*بيانات مرجعية ثابتة*

| الجدول | الوصف |
|--------|-------|
| `countries` | الدول |
| `currencies` | العملات |
| `account_types` | أنواع الحسابات |
| `business_industries` | الصناعات |
| `system_languages` | اللغات |
| `uom` | وحدات القياس |
| `ui_tabs` | التابات |
| `modules` | الموديولات |

---

### 🔷 جداول تحتاج تصنيف - 43 جدول
*تنقصها أعمدة tenant_id*

| الجدول | company_id | الحالة المقترحة |
|--------|------------|-----------------|
| `funds` | ✅ | ⚠️ يحتاج tenant_id |
| `gold_items` | ✅ | ⚠️ يحتاج tenant_id |
| `gold_prices` | ✅ | ⚠️ يحتاج tenant_id |
| `commission_entries` | ✅ | ⚠️ يحتاج tenant_id |
| `commission_rules` | ✅ | ⚠️ يحتاج tenant_id |
| `correspondents` | ✅ | ⚠️ يحتاج tenant_id |
| `remittances` | ✅ | ⚠️ يحتاج tenant_id |
| `serial_numbers` | ✅ | ⚠️ يحتاج tenant_id |
| `product_categories` | ✅ | ⚠️ يحتاج tenant_id |
| `mfa_company_settings` | ✅ | ⚠️ يحتاج tenant_id |
| `company_accounting_settings` | ✅ | Platform table |
| `company_countries` | ✅ | Platform table |
| `retail_cuttings` | ✅ | ⚠️ يحتاج tenant_id |
| `sample_cuttings` | ✅ | ⚠️ يحتاج tenant_id |
| `sample_cutting_items` | ❌ | ⚠️ يحتاج tenant_id + company_id |
| `bin_locations` | ❌ | ⚠️ يحتاج tenant_id + company_id |
| `currency_exchanges` | ✅ | ⚠️ يحتاج tenant_id |
| `subscription_plans` | product_id | Platform table |
| `tenant_referrals` | ❌ | Platform level |
| `referral_program` | ❌ | Platform level |
| `promotional_discounts` | ❌ | Platform level |
| `shopping_cart_items` | product_id | Linked to cart |
| `stock_count_items` | product_id | Linked to stock_counts |
| `container_quotation_items` | product_id | Linked to quotations |
| `mfa_pending_otps` | user_id | User level |
| `mfa_system_settings` | ❌ | Platform level |
| `mfa_user_settings` | user_id | User level |
| `mfa_verification_log` | user_id | User level |
| `serial_number_fields` | product_id | Product related |
| `changelog` | product_id | Platform level |
| `marketing_materials` | product_id | Platform level |
| `ticket_replies` | ❌ | Linked to tickets |
| `webhook_logs` | ❌ | System logs |
| `agent_*` (8 جداول) | ❌ | Agent system |

---

## 📌 2. العلاقات الرئيسية (Foreign Keys)

### هيكل العلاقات الأساسي:

```
saas_products (Brands)
       │
       ├──→ subscription_plans (الخطط)
       │
       └──→ tenants (المستأجرين)
               │
               ├──→ companies (الشركات)
               │       │
               │       ├──→ branches (الفروع)
               │       ├──→ chart_of_accounts (شجرة الحسابات)
               │       ├──→ journal_entries (القيود)
               │       ├──→ customers (العملاء)
               │       ├──→ suppliers (الموردين)
               │       ├──→ products (المنتجات)
               │       ├──→ warehouses (المستودعات)
               │       └──→ fiscal_years (السنوات المالية)
               │
               ├──→ user_profiles (المستخدمين)
               │       └──→ user_roles (أدوار المستخدمين)
               │
               ├──→ roles (الأدوار)
               │
               └──→ subscriptions (الاشتراكات)
```

### أهم العلاقات:

| من الجدول | العمود | إلى الجدول |
|-----------|--------|------------|
| `tenants` | `product_id` | `saas_products` |
| `companies` | `tenant_id` | `tenants` |
| `branches` | `company_id` | `companies` |
| `user_profiles` | `tenant_id` | `tenants` |
| `user_profiles` | `company_id` | `companies` |
| `chart_of_accounts` | `company_id` | `companies` |
| `journal_entries` | `company_id` | `companies` |
| `customers` | `company_id` | `companies` |
| `products` | `company_id` | `companies` |
| `warehouses` | `company_id` | `companies` |

---

## 📌 3. التريغرات (Triggers) - 62 تريغر

### حسب الجدول:

| الجدول | التريغرات | الوظيفة |
|--------|-----------|---------|
| `journal_entries` | 6 | توليد رقم القيد، التحقق من التوازن، التدقيق |
| `journal_entry_lines` | 5 | تعيين tenant_id، تحديث مراكز التكلفة |
| `companies` | 5 | إنشاء إعدادات، حماية الحقول، التدقيق |
| `tenants` | 3 | إعداد القوالب، حماية الحقول |
| `budget_lines` | 4 | التحقق من الحد الأقصى، تحديث المجاميع |
| `chart_of_accounts` | 3 | التدقيق |
| `subscriptions` | 3 | التدقيق |
| `saas_payments` | 3 | تفعيل الاشتراك |
| `user_profiles` | 3 | حماية الحقول |
| `user_role_assignments` | 3 | حماية التعيينات |

---

## 📌 4. الدوال (Functions) - 248 دالة

### حسب الفئة:

| الفئة | العدد | أمثلة |
|-------|-------|-------|
| `tenant_functions` | 37 | get_user_tenant_id, is_tenant_admin |
| `get_functions` | 28 | get_user_companies, get_account_balance |
| `user_functions` | 21 | get_user_roles, get_user_permissions |
| `product_functions` | 18 | get_products_for_store |
| `update_triggers` | 17 | update_updated_at_column |
| `create_functions` | 13 | create_journal_entry |
| `company_functions` | 12 | get_user_company_id, is_company_admin |
| `subscription_functions` | 11 | activate_subscription |
| `journal_functions` | 9 | post_journal_entry |
| `check_functions` | 7 | check_budget_threshold |
| `validation_functions` | 6 | is_super_admin |
| `admin_functions` | 6 | get_admin_statistics |
| `mfa_functions` | 4 | is_mfa_enabled_for_user |
| `auth_functions` | 2 | - |
| `invoice_functions` | 1 | - |
| `other` | 56 | متنوعة |

---

## 📌 5. الجداول التي تنقصها أعمدة

### تنقصها `tenant_id` (يجب إضافتها):

| الجدول | لديها company_id | الأولوية |
|--------|-----------------|----------|
| `funds` | ✅ | 🔴 عالية |
| `gold_items` | ✅ | 🟡 متوسطة |
| `gold_prices` | ✅ | 🟡 متوسطة |
| `commission_entries` | ✅ | 🟡 متوسطة |
| `commission_rules` | ✅ | 🟡 متوسطة |
| `correspondents` | ✅ | 🟡 متوسطة |
| `remittances` | ✅ | 🟡 متوسطة |
| `serial_numbers` | ✅ | 🟡 متوسطة |
| `product_categories` | ✅ | 🔴 عالية |
| `mfa_company_settings` | ✅ | 🟢 منخفضة |
| `retail_cuttings` | ✅ | 🟡 متوسطة |
| `sample_cuttings` | ✅ | 🟡 متوسطة |

### تنقصها `tenant_id` و `company_id`:

| الجدول | الأولوية |
|--------|----------|
| `bin_locations` | 🔴 عالية |
| `sample_cutting_items` | 🟡 متوسطة |
| `agent_bonuses` | 🟢 منخفضة |
| `agent_events` | 🟢 منخفضة |
| `agent_messages` | 🟢 منخفضة |
| `agent_targets` | 🟢 منخفضة |
| `agent_tiers` | 🟢 منخفضة |
| `agent_withdrawals` | 🟢 منخفضة |

---

## 📌 6. ملخص التوصيات

### المرحلة 1: إصلاحات حرجة
1. إضافة `tenant_id` لـ: `funds`, `product_categories`, `bin_locations`
2. إصلاح 21 جدول محظور (RLS بدون سياسات)
3. إصلاح 82 سياسة `USING (true)`

### المرحلة 2: عزل الشركات
1. إنشاء دالة `is_tenant_owner()`
2. إنشاء دالة `can_access_company()`
3. تعديل سياسات 62 جدول لإضافة عزل company_id

### المرحلة 3: تنظيف
1. إضافة `tenant_id` للجداول الناقصة
2. توحيد أنماط السياسات
3. مراجعة جداول الوكلاء

---

*تم إنشاء هذا التقرير عبر مسح CLI مباشر - 2026-02-05*
