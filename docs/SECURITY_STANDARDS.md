# 🔐 معايير الأمان والعزل - TexaCore Platform

> **الإصدار:** 2.0  
> **تاريخ الإنشاء:** 2026-02-05  
> **آخر تحديث:** 2026-02-05

---

## 📋 جدول المحتويات

1. [مقدمة](#1-مقدمة)
2. [قاموس المصطلحات](#2-قاموس-المصطلحات)
3. [هرم الصلاحيات](#3-هرم-الصلاحيات)
4. [مصفوفة الصلاحيات](#4-مصفوفة-الصلاحيات)
5. [تصنيف الجداول](#5-تصنيف-الجداول)
6. [أنماط السياسات](#6-أنماط-السياسات)
7. [الدوال المساعدة](#7-الدوال-المساعدة)
8. [دليل إضافة جدول جديد](#8-دليل-إضافة-جدول-جديد)
9. [دليل إضافة مستخدم جديد](#9-دليل-إضافة-مستخدم-جديد)
10. [دليل إضافة وكيل جديد](#10-دليل-إضافة-وكيل-جديد)
11. [قائمة فحص قبل الإنتاج](#11-قائمة-فحص-قبل-الإنتاج)
12. [الأخطاء الشائعة وحلولها](#12-الأخطاء-الشائعة-وحلولها)
13. [سجل التغييرات](#13-سجل-التغييرات)

---

## 1. مقدمة

### 1.1 نظرة عامة على النظام

TexaCore Platform هي منصة SaaS متعددة المستأجرين (Multi-Tenant) تدعم **6 براندات** مختلفة، كل براند موجّه لصناعة محددة:

| البراند | الكود | الصناعة | الوصف |
|---------|-------|---------|-------|
| **TexaCore** | TEXACORE | الأقمشة والنسيج | نظام إدارة الأقمشة والإنتاج |
| **FinCore** | FINCORE | الصرافة والمال | نظام الصرافة وتبادل العملات |
| **MedCore** | MEDCORE | الرعاية الصحية | نظام المستشفيات والعيادات |
| **FleetCore** | FLEETCORE | النقل والأساطيل | نظام إدارة الأساطيل |
| **ERPCore** | ERPCORE | الأعمال العامة | نظام ERP شامل |
| **NexaCore** | NEXACORE | التقنية | نظام الشركات التقنية |

### 1.2 فلسفة العزل متعدد المستويات

النظام يطبّق **عزل هرمي من 3 مستويات**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Brand Level (البراند)                   │
│   عزل كامل بين البراندات - لا يمكن الوصول عبر البراندات    │
├─────────────────────────────────────────────────────────────┤
│                    Tenant Level (التينانت)                  │
│   كل مشترك معزول تماماً عن المشتركين الآخرين               │
├─────────────────────────────────────────────────────────────┤
│                   Company Level (الشركة)                    │
│   كل شركة معزولة داخل التينانت مع إمكانية الوصول المتعدد   │
└─────────────────────────────────────────────────────────────┘
```

**مبدأ العزل الأساسي:**
- مستخدم TexaCore **لا يرى أبداً** بيانات FinCore
- مشترك A **لا يرى أبداً** بيانات مشترك B (حتى في نفس البراند)
- موظف الشركة X **لا يرى** بيانات الشركة Y (إلا بتصريح خاص)

---

## 2. قاموس المصطلحات

| المصطلح العربي | English Term | التعريف | المستوى |
|---------------|--------------|---------|---------|
| **مالك المنصة** | Platform Owner | المستوى الأعلى - يملك المنصة بالكامل ويدير كل البراندات | 1 |
| **مدير المنصة** | Platform Admin | موظف المنصة بصلاحيات إدارية كاملة | 2 |
| **وكيل وايت ليبل** | WhiteLabel Partner | وكيل ببراند خاص يبيع تحت اسمه | 3 |
| **وكيل عادي** | Reseller | وكيل يبيع تحت براند المنصة الأصلي | 3 |
| **مالك الاشتراك** | Tenant Owner | صاحب الاشتراك/العميل النهائي | 4 |
| **مدير تينانت** | Tenant Admin | مدير داخل التينانت بصلاحيات إدارية | 4.5 |
| **مدير الشركة** | Company Admin | مدير شركة واحدة أو أكثر داخل التينانت | 5 |
| **موظف** | Company User | مستخدم عادي يعمل في شركة أو أكثر | 6 |
| **البراند** | Brand/Product | العلامة التجارية (TexaCore, FinCore, ...) | - |
| **التينانت** | Tenant | المستأجر/الاشتراك - وحدة العزل الرئيسية | - |
| **الشركة** | Company | شركة/فرع داخل التينانت | - |
| **الفرع** | Branch | فرع داخل الشركة | - |

### 2.1 الفرق بين الأدوار

```
Platform Owner vs Platform Admin:
├── Platform Owner: يمكنه إضافة/حذف Platform Admins
└── Platform Admin: لا يمكنه تعديل Platform Owners

WhiteLabel vs Reseller:
├── WhiteLabel: براند خاص + لوغو خاص + دومين خاص
└── Reseller: يعمل تحت براند المنصة الأصلي

Tenant Owner vs Tenant Admin:
├── Tenant Owner: صاحب الاشتراك الأصلي (owner_email)
└── Tenant Admin: موظف بصلاحيات إدارية داخل التينانت
```

---

## 3. هرم الصلاحيات

```
                    ┌─────────────────────┐
                    │   Platform Owner    │ ← المستوى 1
                    │   (مالك المنصة)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Platform Admin    │ ← المستوى 2
                    │   (مدير المنصة)     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                                         │
┌─────────▼─────────┐                   ┌───────────▼───────────┐
│ WhiteLabel Partner│ ← المستوى 3       │      Reseller         │
│  (وكيل وايت ليبل) │                   │    (وكيل عادي)        │
└─────────┬─────────┘                   └───────────┬───────────┘
          │                                         │
          └────────────────────┬────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Tenant Owner     │ ← المستوى 4
                    │   (مالك الاشتراك)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Company Admin    │ ← المستوى 5
                    │   (مدير الشركة)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Company User     │ ← المستوى 6
                    │      (موظف)         │
                    └─────────────────────┘
```

---

## 4. مصفوفة الصلاحيات

### 4.1 صلاحيات الوصول

| الدور | كل البراندات | براند واحد | كل التينانتات | تينانته | كل الشركات | شركاته |
|------|:------------:|:----------:|:-------------:|:-------:|:----------:|:------:|
| Platform Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Platform Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WhiteLabel Partner | ⚙️ | ✅ | 👥 | - | ❌ | ❌ |
| Reseller | ⚙️ | ✅ | 👥 | - | ❌ | ❌ |
| Tenant Owner | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Tenant Admin | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Company Admin | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Company User | ❌ | ✅ | ❌ | ✅ | ❌ | 🔑 |

**الرموز:**
- ✅ وصول كامل
- ❌ ممنوع
- ⚙️ حسب إعداد `partner_allowed_products`
- 👥 مشتركيه فقط
- 🔑 حسب الصلاحيات الممنوحة

### 4.2 صلاحيات الإدارة

| الإجراء | Platform Owner | Platform Admin | Partner | Tenant Owner | Company Admin | User |
|--------|:--------------:|:--------------:|:-------:|:------------:|:-------------:|:----:|
| إنشاء براند جديد | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء تينانت جديد | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| إنشاء شركة جديدة | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| إضافة مستخدم | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| تعديل صلاحيات | ✅ | ✅ | ❌ | ✅ | 🔒 | ❌ |
| حذف بيانات | ✅ | ✅ | ❌ | ✅ | 🔒 | ❌ |

**🔒** = ضمن نطاقه فقط

---

## 5. تصنيف الجداول

### 5.1 المجموعة أ: جداول المنصة (Platform Tables)

> **السياسة:** للقراءة من الجميع (authenticated)، التعديل لـ Platform Admin فقط

| # | الجدول | الوصف | حقول خاصة |
|---|--------|-------|-----------|
| 1 | `saas_products` | البراندات/المنتجات | code, name |
| 2 | `subscription_plans` | خطط الاشتراك | product_id |
| 3 | `plan_features` | مميزات الخطط | plan_id |
| 4 | `plan_modules` | وحدات الخطط | plan_id |
| 5 | `system_modules` | وحدات النظام | - |
| 6 | `module_permissions` | صلاحيات الوحدات | module_id |
| 7 | `super_admins` | مديرو المنصة | user_id |
| 8 | `coa_templates` | قوالب الحسابات | product_id |
| 9 | `coa_template_accounts` | حسابات القوالب | template_id |
| 10 | `saas_payments` | مدفوعات SaaS | tenant_id |
| 11 | `usage_metrics` | مقاييس الاستخدام | tenant_id |
| 12 | `system_settings` | إعدادات النظام | - |
| 13 | `email_templates` | قوالب البريد | - |
| 14 | `notification_templates` | قوالب الإشعارات | - |
| 15 | `countries` | الدول | - |
| 16 | `currencies` | العملات | - |
| 17 | `languages` | اللغات | - |
| 18 | `timezones` | المناطق الزمنية | - |

### 5.2 المجموعة ب: جداول الوكلاء (Partner Tables)

> **السياسة:** Platform Admin يرى الكل، الوكيل يرى بياناته فقط

| # | الجدول | الوصف | حقول خاصة |
|---|--------|-------|-----------|
| 1 | `partners` | الوكلاء | email, partner_type |
| 2 | `partner_allowed_products` | براندات الوكيل | partner_id, product_id |
| 3 | `agents` | ممثلو المبيعات | partner_id |
| 4 | `agent_commissions` | عمولات الممثلين | agent_id |
| 5 | `partner_payouts` | مدفوعات الوكلاء | partner_id |
| 6 | `partner_invoices` | فواتير الوكلاء | partner_id |
| 7 | `partner_contracts` | عقود الوكلاء | partner_id |

### 5.3 المجموعة ج: جداول التينانت (Tenant Tables)

> **السياسة:** عزل على مستوى التينانت + التحقق من البراند

| # | الجدول | الوصف | حقول رئيسية |
|---|--------|-------|-------------|
| 1 | `tenants` | المستأجرون | product_id, owner_email |
| 2 | `subscriptions` | الاشتراكات الفعّالة | tenant_id, plan_id |
| 3 | `roles` | الأدوار | tenant_id |
| 4 | `permissions` | الصلاحيات | role_id |
| 5 | `user_roles` | أدوار المستخدمين | tenant_id, user_id |
| 6 | `announcements` | الإعلانات | tenant_id |
| 7 | `audit_logs` | سجل التدقيق | tenant_id |
| 8 | `activity_logs` | سجل النشاط | tenant_id |
| 9 | `tenant_settings` | إعدادات التينانت | tenant_id |
| 10 | `tenant_modules` | وحدات التينانت | tenant_id |

### 5.4 المجموعة د: جداول الشركة (Company Tables)

> **السياسة:** عزل على مستوى الشركة مع دعم الوصول المتعدد

**الجداول الأساسية:**

| # | الجدول | الوصف |
|---|--------|-------|
| 1 | `companies` | الشركات |
| 2 | `branches` | الفروع |
| 3 | `user_profiles` | ملفات المستخدمين |
| 4 | `user_company_access` | وصول المستخدم للشركات |

**جداول المحاسبة:**

| # | الجدول | الوصف |
|---|--------|-------|
| 5 | `chart_of_accounts` | دليل الحسابات |
| 6 | `journal_entries` | القيود اليومية |
| 7 | `journal_entry_lines` | سطور القيود |
| 8 | `fiscal_years` | السنوات المالية |
| 9 | `accounting_periods` | الفترات المحاسبية |
| 10 | `cost_centers` | مراكز التكلفة |
| 11 | `budgets` | الميزانيات |

**جداول الخزينة:**

| # | الجدول | الوصف |
|---|--------|-------|
| 12 | `funds` | الصناديق |
| 13 | `fund_transactions` | حركات الصناديق |
| 14 | `bank_accounts` | الحسابات البنكية |
| 15 | `payment_receipts` | سندات القبض |
| 16 | `payment_vouchers` | سندات الصرف |

**جداول العملاء والموردين:**

| # | الجدول | الوصف |
|---|--------|-------|
| 17 | `customers` | العملاء |
| 18 | `customer_groups` | مجموعات العملاء |
| 19 | `suppliers` | الموردون |
| 20 | `supplier_groups` | مجموعات الموردين |

**جداول المخزون:**

| # | الجدول | الوصف |
|---|--------|-------|
| 21 | `products` | المنتجات |
| 22 | `product_categories` | تصنيفات المنتجات |
| 23 | `warehouses` | المستودعات |
| 24 | `stock_levels` | مستويات المخزون |
| 25 | `inventory_movements` | حركات المخزون |

**جداول المبيعات:**

| # | الجدول | الوصف |
|---|--------|-------|
| 26 | `sales_invoices` | فواتير المبيعات |
| 27 | `sales_invoice_items` | بنود فواتير المبيعات |
| 28 | `sales_orders` | أوامر البيع |
| 29 | `sales_quotations` | عروض الأسعار |

**جداول المشتريات:**

| # | الجدول | الوصف |
|---|--------|-------|
| 30 | `purchase_invoices` | فواتير المشتريات |
| 31 | `purchase_invoice_items` | بنود فواتير المشتريات |
| 32 | `purchase_orders` | أوامر الشراء |

*... (وباقي الـ 62 جدول)*

### 5.5 المجموعة هـ: جداول Lookup

> **السياسة:** للقراءة من الجميع، التعديل لـ Platform Admin فقط

| # | الجدول | الوصف | ملاحظات |
|---|--------|-------|---------|
| 1 | `countries` | الدول | ثابت |
| 2 | `currencies` | العملات | ثابت |
| 3 | `account_types` | أنواع الحسابات | ثابت |
| 4 | `uom` | وحدات القياس | ثابت |
| 5 | `payment_methods` | طرق الدفع | ثابت |
| 6 | `status_groups` | مجموعات الحالات | قابل للتخصيص |
| 7 | `custom_statuses` | الحالات المخصصة | قابل للتخصيص |
| 8 | `industry_types` | أنواع الصناعات | ثابت |

---

## 6. أنماط السياسات

### 6.1 نمط جداول المنصة

```sql
-- للقراءة من الجميع، التعديل لـ Platform Admin
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- قراءة
CREATE POLICY table_name_select_policy ON public.table_name
    FOR SELECT USING (true);

-- إضافة
CREATE POLICY table_name_insert_policy ON public.table_name
    FOR INSERT WITH CHECK (is_platform_admin());

-- تعديل
CREATE POLICY table_name_update_policy ON public.table_name
    FOR UPDATE USING (is_platform_admin());

-- حذف
CREATE POLICY table_name_delete_policy ON public.table_name
    FOR DELETE USING (is_platform_admin());
```

### 6.2 نمط جداول الوكلاء

```sql
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Platform Admin يرى الكل، الوكيل يرى نفسه
CREATE POLICY partners_select_policy ON public.partners
    FOR SELECT USING (
        is_platform_admin()
        OR email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY partners_insert_policy ON public.partners
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY partners_update_policy ON public.partners
    FOR UPDATE USING (
        is_platform_admin()
        OR email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY partners_delete_policy ON public.partners
    FOR DELETE USING (is_platform_admin());
```

### 6.3 نمط جداول التينانت

```sql
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_policy ON public.tenants
    FOR SELECT USING (
        is_platform_admin()
        OR (is_partner_or_reseller() AND id = ANY(get_partner_tenant_ids()))
        OR (is_same_brand(id) AND id = get_user_tenant_id())
    );

CREATE POLICY tenants_insert_policy ON public.tenants
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR is_partner_or_reseller()
    );

CREATE POLICY tenants_update_policy ON public.tenants
    FOR UPDATE USING (
        is_platform_admin()
        OR (is_tenant_owner() AND id = get_user_tenant_id())
    );

CREATE POLICY tenants_delete_policy ON public.tenants
    FOR DELETE USING (is_platform_admin());
```

### 6.4 نمط جداول الشركة

```sql
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select_policy ON public.companies
    FOR SELECT USING (
        is_platform_admin()
        OR (is_partner_or_reseller() AND tenant_id = ANY(get_partner_tenant_ids()))
        OR (is_same_brand(tenant_id) AND tenant_id = get_user_tenant_id() 
            AND (is_tenant_owner() OR can_access_company(id)))
    );

CREATE POLICY companies_insert_policy ON public.companies
    FOR INSERT WITH CHECK (
        is_platform_admin()
        OR (is_tenant_owner() AND tenant_id = get_user_tenant_id())
    );

CREATE POLICY companies_update_policy ON public.companies
    FOR UPDATE USING (
        is_platform_admin()
        OR (tenant_id = get_user_tenant_id() 
            AND (is_tenant_owner() OR is_company_admin(auth.uid(), id)))
    );

CREATE POLICY companies_delete_policy ON public.companies
    FOR DELETE USING (
        is_platform_admin()
        OR (is_tenant_owner() AND tenant_id = get_user_tenant_id())
    );
```

### 6.5 نمط الجداول العامة (tenant_id + company_id)

```sql
-- استخدم الدالة المساعدة
SELECT create_company_rls_policies('table_name', true, true);

-- أو يدوياً:
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY table_name_select_policy ON public.table_name
    FOR SELECT USING (
        is_platform_admin() 
        OR check_row_access(tenant_id, company_id)
    );

CREATE POLICY table_name_insert_policy ON public.table_name
    FOR INSERT WITH CHECK (
        is_platform_admin() 
        OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id))
    );

CREATE POLICY table_name_update_policy ON public.table_name
    FOR UPDATE USING (
        is_platform_admin() 
        OR (tenant_id = get_user_tenant_id() AND can_access_company(company_id))
    );

CREATE POLICY table_name_delete_policy ON public.table_name
    FOR DELETE USING (
        is_platform_admin() 
        OR (tenant_id = get_user_tenant_id() 
            AND can_access_company(company_id) 
            AND is_company_admin(auth.uid(), company_id))
    );
```

---

## 7. الدوال المساعدة

### 7.1 دوال المنصة

| الدالة | الوصف | المُدخلات | المُخرجات |
|--------|-------|----------|-----------|
| `is_platform_owner(user_id)` | هل المستخدم مالك المنصة؟ | UUID (اختياري) | BOOLEAN |
| `is_platform_admin(user_id)` | هل المستخدم مدير منصة؟ | UUID (اختياري) | BOOLEAN |

```sql
-- مثال الاستخدام
SELECT is_platform_owner(); -- للمستخدم الحالي
SELECT is_platform_owner('uuid-here'); -- لمستخدم محدد
```

### 7.2 دوال الوكلاء

| الدالة | الوصف | المُخرجات |
|--------|-------|-----------|
| `is_whitelabel_partner(user_id)` | هل وكيل وايت ليبل؟ | BOOLEAN |
| `is_reseller(user_id)` | هل وكيل عادي؟ | BOOLEAN |
| `is_partner_or_reseller(user_id)` | هل أي نوع من الوكلاء؟ | BOOLEAN |
| `get_partner_tenant_ids(user_id)` | قائمة تينانتات الوكيل | UUID[] |
| `get_partner_allowed_brand_ids(user_id)` | براندات الوكيل المسموحة | UUID[] |

### 7.3 دوال البراند

| الدالة | الوصف | المُخرجات |
|--------|-------|-----------|
| `get_user_brand_id(user_id)` | براند المستخدم | UUID |
| `get_user_product_id(user_id)` | نفس السابقة (alias) | UUID |
| `is_same_brand(tenant_id, user_id)` | هل التينانت من نفس البراند؟ | BOOLEAN |
| `get_brand_tenant_ids(product_id)` | كل تينانتات البراند | UUID[] |
| `get_current_brand_id()` | براند المستخدم الحالي | UUID |

### 7.4 دوال التينانت

| الدالة | الوصف | المُخرجات |
|--------|-------|-----------|
| `get_user_tenant_id(user_id)` | تينانت المستخدم | UUID |
| `is_tenant_owner(user_id)` | هل صاحب التينانت؟ | BOOLEAN |
| `is_tenant_admin(user_id)` | هل مدير تينانت؟ | BOOLEAN |
| `get_tenant_company_ids(tenant_id)` | كل شركات التينانت | UUID[] |

### 7.5 دوال الشركة

| الدالة | الوصف | المُخرجات |
|--------|-------|-----------|
| `get_user_company_id(user_id)` | شركة المستخدم الافتراضية | UUID |
| `is_company_admin(user_id, company_id)` | هل مدير الشركة؟ | BOOLEAN |
| `can_access_company(company_id, user_id)` | هل يمكنه الوصول للشركة؟ | BOOLEAN |
| `get_user_accessible_company_ids(user_id)` | كل شركات المستخدم | UUID[] |

### 7.6 الدالة الشاملة

```sql
check_row_access(tenant_id, company_id, user_id)
```

**الخطوات:**
1. ✅ Platform Admin → true
2. ✅ التحقق من البراند (is_same_brand)
3. ✅ التحقق من التينانت
4. ✅ التحقق من الشركة (can_access_company)

---

## 8. دليل إضافة جدول جديد

### 8.1 الخطوات

#### الخطوة أ: حدد المجموعة

```
سؤال: هل الجدول خاص بـ:
├── المنصة/النظام؟ → المجموعة أ
├── الوكلاء؟ → المجموعة ب
├── التينانت عموماً؟ → المجموعة ج
├── شركة محددة؟ → المجموعة د
└── بيانات مرجعية؟ → المجموعة هـ
```

#### الخطوة ب: أضف الأعمدة المطلوبة

```sql
-- للمجموعة ج (تينانت):
ALTER TABLE new_table ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- للمجموعة د (شركة):
ALTER TABLE new_table ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE new_table ADD COLUMN company_id UUID REFERENCES companies(id);
```

#### الخطوة ج: فعّل RLS

```sql
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
```

#### الخطوة د: أنشئ السياسات

```sql
-- استخدم الدالة المساعدة للمجموعة د
SELECT create_company_rls_policies('new_table', true, true);

-- أو أنشئ يدوياً
```

#### الخطوة هـ: أضف التريغرات

```sql
-- التعيين التلقائي
SELECT apply_auto_tenant_trigger('new_table');
SELECT apply_auto_company_trigger('new_table');
SELECT apply_brand_isolation_trigger('new_table');
```

#### الخطوة و: اختبر

```sql
-- اختبر بمستخدمين مختلفين
SELECT * FROM new_table; -- يجب أن يرى فقط بياناته
```

### 8.2 مثال كامل

```sql
-- 1. إنشاء الجدول
CREATE TABLE public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to UUID REFERENCES user_profiles(id),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. الفهارس
CREATE INDEX idx_project_tasks_tenant ON project_tasks(tenant_id);
CREATE INDEX idx_project_tasks_company ON project_tasks(company_id);

-- 3. تفعيل RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- 4. السياسات
SELECT create_company_rls_policies('project_tasks', true, true);

-- 5. التريغرات
SELECT apply_auto_tenant_trigger('project_tasks');
SELECT apply_auto_company_trigger('project_tasks');
SELECT apply_brand_isolation_trigger('project_tasks');

-- 6. تريغر updated_at
CREATE TRIGGER trg_update_timestamp_project_tasks
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 9. دليل إضافة مستخدم جديد

### 9.1 إنشاء مستخدم جديد

```sql
-- 1. إنشاء في auth.users (يتم من Supabase Auth)
-- الـ trigger يُنشئ تلقائياً سجل في user_profiles

-- 2. تحديث user_profiles
UPDATE user_profiles
SET 
    tenant_id = 'tenant-uuid',
    company_id = 'company-uuid',
    full_name = 'اسم المستخدم',
    role = 'user'
WHERE id = 'user-uuid';
```

### 9.2 منح وصول لشركات متعددة

```sql
-- إضافة وصول لشركة إضافية
INSERT INTO user_company_access (user_id, company_id, access_level)
VALUES ('user-uuid', 'company-uuid-2', 'read_write');
```

### 9.3 تعيين دور

```sql
INSERT INTO user_roles (user_id, role_id, tenant_id, company_id, is_active)
VALUES ('user-uuid', 'role-uuid', 'tenant-uuid', 'company-uuid', true);
```

---

## 10. دليل إضافة وكيل جديد

### 10.1 WhiteLabel Partner

```sql
-- 1. إنشاء الوكيل
INSERT INTO partners (
    email,
    company_name,
    partner_type,
    commission_rate,
    is_active
) VALUES (
    'partner@example.com',
    'اسم الشركة',
    'whitelabel',
    15.00,
    true
);

-- 2. تحديد البراندات المسموحة
INSERT INTO partner_allowed_products (partner_id, product_id)
SELECT 
    (SELECT id FROM partners WHERE email = 'partner@example.com'),
    id
FROM saas_products
WHERE code IN ('TEXACORE', 'FINCORE');
```

### 10.2 Reseller

```sql
-- نفس الخطوات مع partner_type = 'reseller'
INSERT INTO partners (
    email,
    company_name,
    partner_type,
    commission_rate,
    is_active
) VALUES (
    'reseller@example.com',
    'اسم الوكالة',
    'reseller',
    10.00,
    true
);
```

---

## 11. قائمة فحص قبل الإنتاج

### 11.1 فحص RLS

- [ ] كل الجداول لها `ENABLE ROW LEVEL SECURITY`
- [ ] كل الجداول لها سياسات SELECT/INSERT/UPDATE/DELETE
- [ ] لا يوجد `USING(true)` على جداول حساسة
- [ ] اختبار بمستخدمين من براندات مختلفة

### 11.2 فحص الهيكلية

- [ ] جداول المجموعة ج تحتوي `tenant_id`
- [ ] جداول المجموعة د تحتوي `tenant_id` + `company_id`
- [ ] الـ Foreign Keys صحيحة

### 11.3 فحص التريغرات

- [ ] `trg_auto_tenant_*` تعمل وتُعيّن tenant_id
- [ ] `trg_auto_company_*` تعمل وتُعيّن company_id
- [ ] `trg_brand_isolation_*` تمنع الوصول عبر البراندات
- [ ] `trg_protect_*` تحمي الحقول الحساسة

### 11.4 فحص الأمان

- [ ] لا يمكن للمستخدم تغيير `is_super_admin`
- [ ] لا يمكن للمستخدم تغيير `tenant_id` لنفسه
- [ ] لا يمكن للمستخدم تغيير صلاحياته
- [ ] لا يمكن نقل شركة بين تينانتات
- [ ] لا يمكن نقل تينانت بين براندات

### 11.5 فحص العزل

- [ ] مستخدم TexaCore لا يرى بيانات FinCore
- [ ] مشترك A لا يرى بيانات مشترك B
- [ ] موظف شركة X لا يرى بيانات شركة Y

---

## 12. الأخطاء الشائعة وحلولها

### 12.1 permission denied for table X

**السبب:** RLS يمنع الوصول

**الحل:**
```sql
-- تحقق من السياسات
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- تحقق من صلاحيات المستخدم
SELECT is_platform_admin();
SELECT get_user_tenant_id();
SELECT can_access_company('company-id');
```

### 12.2 new row violates row-level security

**السبب:** سياسة INSERT تمنع الإضافة

**الحل:**
```sql
-- تحقق من tenant_id و company_id
SELECT get_user_tenant_id();
SELECT get_user_company_id();

-- تأكد من تطابقها مع البيانات المُدخلة
```

### 12.3 cannot change tenant_id

**السبب:** التريغر يحمي الحقل

**الحل:**
- فقط Platform Admin يمكنه تغيير tenant_id
- أو استخدم SECURITY DEFINER function

### 12.4 cannot change product_id

**السبب:** التريغر يحمي البراند

**الحل:**
- فقط Platform Owner يمكنه تغيير product_id
- هذا تصميم متعمد لمنع نقل التينانتات

### 12.5 You cannot modify your own permissions

**السبب:** التريغر يمنع تعديل صلاحيات النفس

**الحل:**
- اطلب من مدير (Tenant Owner أو Company Admin) تعديل صلاحياتك

---

## 13. سجل التغييرات

### الإصدار 2.0 - 2026-02-05

**🆕 الجديد:**
- نظام عزل البراندات الكامل
- دعم 6 براندات (TexaCore, FinCore, MedCore, FleetCore, ERPCore, NexaCore)
- دوال مساعدة جديدة للبراندات
- تريغرات حماية شاملة
- سياسات RLS موحدة

**📁 الملفات:**
- `CREATE_helper_functions.sql` - الدوال المساعدة
- `CREATE_policies_platform.sql` - سياسات المنصة
- `CREATE_policies_partners.sql` - سياسات الوكلاء
- `CREATE_policies_tenant.sql` - سياسات التينانت
- `CREATE_policies_company.sql` - سياسات الشركة
- `CREATE_policies_lookup.sql` - سياسات Lookup
- `CREATE_protection_triggers.sql` - تريغرات الحماية

**📊 الإحصائيات:**
- 214+ تريغر
- 100+ سياسة RLS
- 20+ دالة مساعدة

---

### التحديثات المستقبلية

- [ ] إضافة API Logging
- [ ] إضافة Rate Limiting
- [ ] إضافة IP Whitelisting
- [ ] دعم 2FA على مستوى قاعدة البيانات
- [ ] تشفير الحقول الحساسة

---

> **📞 الدعم الفني:**  
> للاستفسارات والمشاكل التقنية، راجع فريق التطوير

> **⚠️ تحذير:**  
> لا تعدّل الدوال أو السياسات بدون فهم كامل للنظام
