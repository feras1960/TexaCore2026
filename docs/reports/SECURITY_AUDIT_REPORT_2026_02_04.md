# 🔒 تقرير المسح الأمني الشامل
## لهيكلية SaaS متعددة العلامات التجارية
### تاريخ: 2026-02-04

---

## 📊 الإحصائيات العامة

| المقياس | القيمة | الملاحظات |
|---------|--------|-----------|
| إجمالي الجداول | **172** | |
| جداول بـ RLS مفعل | **122** (70%) | ✅ جيد |
| جداول بـ RLS معطل | **50** (30%) | ⚠️ يحتاج إصلاح |
| جداول RLS بدون سياسات | **33** | 🔴 حرج - محجوبة! |
| سياسات RLS | **297** | |
| دوال SECURITY DEFINER | **158** | ⚠️ كثيرة |

---

## 🏗️ مخطط الهيكلية

```
Platform (Super Admin)
│
└── ❌ Brand (غير موجود في الهيكلية!)
    │
    └── Tenant (tenants)
        │   ├── id (PK)
        │   ├── name, email
        │   └── brand_slug (للتمييز فقط)
        │
        └── Company (companies)
            │   ├── id (PK)
            │   ├── tenant_id (FK)
            │   └── name, settings
            │
            ├── Branch (branches)
            │   ├── tenant_id, company_id
            │   └── name, code
            │
            └── User (user_profiles)
                ├── id (PK = auth.uid)
                ├── tenant_id (FK)
                ├── company_id (FK)
                └── user_role_assignments → user_roles
```

### 🔴 ملاحظة حرجة:
**لا يوجد جدول `brands` منفصل!** العلامات التجارية (TexaCore, FinCore...) هي مجرد `brand_slug` في جدول `tenants`.

---

## 🚨 جدول الثغرات الأمنية

### 🔴 ثغرات حرجة (Critical)

| # | المشكلة | الجداول المتأثرة | التأثير | الأولوية |
|---|---------|------------------|---------|----------|
| 1 | **RLS معطل على جداول مالية** | `payment_receipts`, `payment_vouchers`, `sales_invoices`, `sales_invoice_items`, `exchange_rates` | أي مستخدم يمكنه قراءة/تعديل بيانات مالية لأي tenant | 🔴 P0 |
| 2 | **RLS مفعل بدون سياسات** (33 جدول) | `account_invoices`, `billing_payments`, `funds`, `currency_exchanges`... | الوصول محجوب تماماً - قد يسبب أخطاء! | 🔴 P0 |
| 3 | **لا يوجد عزل Brand** | جميع الـ 172 جدول | TexaCore يمكنه رؤية بيانات FinCore | 🔴 P0 |
| 4 | **جداول بدون tenant_id** | `agents`, `account_types`, `business_industries`... (~40 جدول) | لا يوجد عزل على الإطلاق | 🟠 P1 |

### 🟠 ثغرات مهمة (High)

| # | المشكلة | الجداول المتأثرة | التأثير |
|---|---------|------------------|---------|
| 5 | **RLS معطل على SaaS** | `subscription_plans`, `white_label_*`, `saas_products` | أي مستخدم يرى إعدادات SaaS |
| 6 | **RLS معطل على الإشعارات** | `notifications`, `in_app_notifications` | تسرب معلومات |
| 7 | **158 دالة SECURITY DEFINER** | متعددة | تحتاج مراجعة لمنع privilege escalation |

### 🟡 ثغرات متوسطة (Medium)

| # | المشكلة | الجداول المتأثرة |
|---|---------|------------------|
| 8 | **جداول Templates بدون RLS** | `chart_templates`, `coa_template_*` |
| 9 | **جداول Config بدون RLS** | `country_configurations`, `system_modules` |

---

## 🛡️ مصفوفة العزل الحالية

### الحالة الفعلية:

| المستوى | قراءة | كتابة | حذف | الملاحظات |
|---------|:-----:|:-----:|:---:|-----------|
| **نفس الشركة (Company)** | ✅ | ✅ | ✅ | عزل جيد في معظم الجداول |
| **نفس الـ Tenant** | ✅ | ✅ | ⚠️ | عزل جيد، لكن بعض الجداول بدون RLS |
| **نفس الـ Brand** | ❌ | ❌ | ❌ | **لا يوجد عزل!** |
| **بين الـ Brands** | ❌ | ❌ | ❌ | **يمكن الوصول المتبادل!** |

### المشكلة الجوهرية:
```
⚠️ مستخدم TexaCore يمكنه نظرياً الوصول لبيانات FinCore!
السبب: لا يوجد عمود brand_id في أي جدول
```

---

## 📋 الجداول بـ RLS معطل (50 جدول)

### 🔴 حرج - بيانات مالية:
```
account_transfers, payment_receipts, payment_vouchers, 
sales_invoices, sales_invoice_items, exchange_rates,
bank_account_limits, inventory_movements
```

### 🟠 مهم - بيانات SaaS:
```
subscription_plans, subscription_alerts, saas_products,
saas_settings, white_label_configs, white_label_domains,
white_label_payments, white_label_stats, tenant_referrals
```

### 🟡 متوسط - بيانات إدارية:
```
notifications, in_app_notifications, support_tickets,
ticket_replies, reviews, usage_analytics, usage_stats
```

### ⚪ منخفض - جداول مرجعية:
```
countries, country_configurations, business_industries,
system_modules, plan_modules, chart_templates, coa_templates,
coa_template_items, coa_template_cash_accounts
```

---

## 📋 جداول RLS مفعل بدون سياسات (33 جدول) 🔴

**هذه الجداول محجوبة تماماً - لا يمكن لأحد الوصول إليها!**

```
account_invoice_items, account_invoices, agent_commission_rules,
billing_payments, bin_locations, commission_entries, commission_rules,
container_quotation_items, container_quotations, container_reservations,
correspondents, currency_exchanges, customer_groups, funds,
gold_items, gold_prices, incentive_plan_tiers, incentive_plans,
product_categories, recurring_entry_executions, recurring_entry_templates,
remittances, reservation_items, reservations, retail_cuttings,
saas_events, sample_cutting_items, sample_cuttings, serial_number_fields,
serial_numbers, supplier_groups, target_achievement_log, vendor_categories
```

---

## 📋 جداول بدون tenant_id (~40 جدول)

**هذه الجداول لا يمكن عزلها على مستوى Tenant:**

```
account_types, agents, agent_bonuses, agent_events, agent_messages,
agent_targets, agent_tiers, agent_withdrawals, bin_locations,
business_industries, changelog, coa_templates, coa_template_items,
coa_template_cash_accounts, commission_entries, commission_rules,
company_countries, container_quotation_items, correspondents,
countries, country_configurations, currency_exchanges, fabric_groups,
fabric_materials, fabric_rolls, funds, gold_items, gold_prices,
marketing_materials, module_features, modules, plan_modules,
plan_ui_tabs, product_categories, promotional_discounts,
referral_program, remittances, saas_products, saas_settings,
serial_number_fields, serial_numbers, subscription_plans,
supplier_groups, system_languages, system_modules, tenants,
ticket_replies, ui_tabs, uom, vendor_categories, webhook_endpoints,
webhook_logs, white_label_configs, white_label_domains,
white_label_payments, white_label_stats
```

---

## ✅ توصيات الإصلاح

### المرحلة 1: إصلاح فوري (P0)

#### 1.1 تفعيل RLS على الجداول المالية الحرجة
```sql
-- سيتم إنشاء ملف منفصل للإصلاح
```

#### 1.2 إضافة سياسات للجداول المحجوبة (33 جدول)
```sql
-- سيتم إنشاء ملف منفصل للإصلاح
```

### المرحلة 2: تحسين العزل (P1)

#### 2.1 إضافة brand_id للجداول الأساسية
```sql
-- يتطلب تخطيط معماري
```

### المرحلة 3: تنظيف (P2)

#### 3.1 مراجعة دوال SECURITY DEFINER
#### 3.2 إضافة tenant_id للجداول الناقصة

---

## 📁 ملفات الإصلاح المرفقة

سيتم إنشاء الملفات التالية:
1. `SECURITY_FIX_enable_rls_critical.sql` - تفعيل RLS للجداول الحرجة
2. `SECURITY_FIX_add_policies_blocked.sql` - إضافة سياسات للجداول المحجوبة
3. `SECURITY_FIX_brand_isolation.sql` - إضافة عزل العلامات التجارية (اختياري)

---

*تم إعداد التقرير في: 2026-02-04 00:21 UTC*
