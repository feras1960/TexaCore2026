# 📊 تقرير المسح الشامل لسياسات RLS والهيكلية
## TexaCore Multi-Brand ERP - 2026-02-05

---

## 📌 أولاً: خريطة الهيكلية الحالية

### 1. الجداول الهيكلية الموجودة:

| الجدول | الغرض | الأعمدة الرئيسية |
|--------|-------|------------------|
| `saas_products` | البراندات (TexaCore, FinCore, etc.) | `id, name, code` |
| `tenants` | المستأجرين | `id, name, owner_email, product_id, tenant_id` |
| `companies` | الشركات | `id, name, tenant_id` |
| `user_profiles` | ملفات المستخدمين | `id, email, tenant_id, company_id, role` |
| `roles` | الأدوار | `id, code, tenant_id, is_super_admin` |
| `user_roles` | ربط المستخدمين بالأدوار | `user_id, role_id, tenant_id, company_id, branch_id` |
| `branches` | الفروع | `id, company_id, tenant_id` |
| `tenant_users` | مستخدمي المستأجر | `tenant_id, user_id, role, is_active` |

### 2. خريطة العلاقات:

```
┌─────────────────────────────────────────────────────────────────┐
│                    saas_products (Brands)                        │
│  TexaCore | FinCore | MedCore | InduCore | ERPCore | NexaCore   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ product_id
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         tenants                                  │
│  - id                                                            │
│  - name                                                          │
│  - owner_email  ←── صاحب الاشتراك                                │
│  - product_id   ←── ربط بالبراند                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ tenant_id
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        companies                                 │
│  - id                                                            │
│  - tenant_id    ←── ربط بالمستأجر                                │
│  - name                                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ company_id
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       user_profiles                              │
│  - id                                                            │
│  - tenant_id    ←── ربط بالمستأجر                                │
│  - company_id   ←── ربط بالشركة (يمكن أن يكون NULL)              │
│  - email                                                         │
│  - role                                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3. البيانات الفعلية:

**البراندات (saas_products):**
| ID | Name | Code |
|----|------|------|
| 25fdcf30... | TexaCore | texacore |
| 6258216a... | NexaCore | nexacore |
| d346b9d4... | FinCore | fincore |
| 63a42c43... | MedCore | medcore |
| 0ff1f3aa... | ERPCore | erpcore |
| 20917ba4... | InduCore | inducore |
| f304226a... | ERP System | erp-saas |

**Tenants (عينة):**
| ID | Name | Owner Email | Product |
|----|------|-------------|---------|
| e3a8b7ef... | Default Tenant | default@erp.local | NexaCore |
| 681aa0e4... | NexRev Platform | - | NexaCore |
| 52f90c9b... | تيكستايل برو | - | - |

**Companies (عينة):**
| ID | Name | Tenant |
|----|------|--------|
| 14f19c82... | توم جينيراتورز | Default Tenant |
| 1313232a... | نيكست ريفوليوشن | NexRev Platform |
| 66656448... | Global Tech Co | NexRev Platform |

---

## 📌 ثانياً: جرد سياسات RLS

### 1. ملخص الأنماط المستخدمة:

| النمط | العدد | النسبة |
|-------|-------|--------|
| `tenant_id only` | 138 | 40.5% |
| `USING (true)` | 82 | 24% |
| `other` | 65 | 19% |
| `auth.uid() check` | 36 | 10.5% |
| `super_admin check` | 16 | 4.7% |
| `tenant_id + company_id` | 3 | 0.9% |
| `company_id only` | 1 | 0.3% |

### 2. سياسات الجداول الحرجة:

| الجدول | إجمالي السياسات | عزل tenant | عزل company | مفتوحة (true) |
|--------|-----------------|------------|-------------|---------------|
| `journal_entries` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `customers` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `chart_of_accounts` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `products` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `suppliers` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `warehouses` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `user_profiles` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `companies` | 4 | ❌ 0 | ❌ 0 | ⚠️ 3 |
| `sales_invoices` | 2 | ❌ 0 | ❌ 0 | ❌ 0 |
| `purchase_invoices` | 2 | ❌ 0 | ❌ 0 | ❌ 0 |
| `roles` | 2 | ❌ 0 | ❌ 0 | ❌ 0 |
| `tenants` | 2 | ❌ 0 | ❌ 0 | ❌ 0 |

### 3. تفاصيل السياسات الحرجة:

#### journal_entries:
```sql
-- SELECT: USING (true) - أي مستخدم مُصادق يرى كل القيود!
-- INSERT: بدون شرط
-- UPDATE: USING (true)
-- DELETE: USING (true)
```

#### companies:
```sql
-- SELECT: USING (true) - أي مستخدم مُصادق يرى كل الشركات!
-- INSERT: بدون شرط
-- UPDATE: USING (true)
-- DELETE: USING (true)
```

---

## 📌 ثالثاً: تحليل منطق السياسات الحالية

### 1. المعيار الحالي للعزل:

| السؤال | الإجابة |
|--------|---------|
| هل يوجد عزل على مستوى Brand/Product؟ | ❌ لا |
| هل يوجد عزل على مستوى Tenant؟ | ⚠️ جزئي (138 سياسة فقط) |
| هل يوجد عزل على مستوى Company؟ | ❌ شبه معدوم (4 سياسات فقط) |

### 2. التحقق من company_id:

**فقط 4 سياسات تتحقق من company_id!**
- `currency_exchanges`
- `mfa_company_settings`

**64 جدول يحتوي على tenant_id و company_id** لكن معظمها لا يستخدم company_id في السياسات!

### 3. التعامل مع Super Admin:

```sql
-- دالة is_super_admin() موجودة وتعمل:
SELECT COALESCE(
    (raw_user_meta_data->>'is_super_admin')::BOOLEAN,
    false
) FROM auth.users WHERE id = auth.uid();
```

✅ Super Admin يُحدد عبر `user_metadata.is_super_admin`

### 4. التعامل مع صاحب التيننت (Tenant Owner):

❌ **لا توجد دالة `is_tenant_owner()`!**

الطريقة الوحيدة حالياً هي مقارنة `owner_email` في جدول `tenants` مع email المستخدم.

### 5. جدول صلاحيات المستخدم على الشركات:

✅ **جدول `user_roles` موجود ويحتوي:**
- `user_id`
- `company_id` - للربط بالشركة
- `tenant_id`
- `branch_id`
- `is_active`

---

## 📌 رابعاً: اكتشاف التعارضات والمشاكل

### 1. ❌ مشاكل حرجة:

| المشكلة | التفاصيل | الخطورة |
|---------|----------|---------|
| **سياسات مفتوحة** | 82 سياسة تستخدم `USING (true)` | 🔴 حرج |
| **جداول محظورة** | 21 جدول بدون أي سياسات | 🔴 حرج |
| **عدم عزل الشركات** | معظم الجداول لا تتحقق من company_id | 🔴 حرج |

### 2. الجداول المحظورة (21 جدول):

```
agent_commission_rules    bin_locations
commission_entries        commission_rules
container_quotation_items container_quotations
container_reservations    correspondents
gold_items               gold_prices
incentive_plan_tiers     incentive_plans
remittances              retail_cuttings
saas_events              sample_cutting_items
sample_cuttings          serial_number_fields
serial_numbers           target_achievement_log
vendor_categories
```

### 3. سياسات متعارضة:

⚠️ بعض الجداول لديها سياسات بـ `{public}` role مع شرط `auth.uid()`:
- `purchase_invoices`
- `sales_invoices`
- `roles`
- `user_roles`
- `tenants`

هذا تناقض لأن `public` يشمل المستخدمين غير المُصادق عليهم!

---

## 📌 خامساً: تقييم الجاهزية لعزل الشركات

### 1. الجداول التي تحتوي company_id:

✅ **81 جدول** يحتوي على عمود `company_id`

### 2. جدول ربط المستخدمين بالشركات:

✅ **موجود:** `user_roles` مع `company_id`

✅ **دالة موجودة:** `get_user_companies()` - ترجع كل شركات المستخدم في نفس الـ Tenant

### 3. الدوال المساعدة المتوفرة:

| الدالة | الوصف | الحالة |
|--------|-------|--------|
| `get_user_tenant_id()` | tenant المستخدم | ✅ موجودة |
| `get_user_company_id()` | شركة المستخدم | ✅ موجودة |
| `is_super_admin()` | هل Super Admin | ✅ موجودة |
| `is_tenant_admin()` | هل Tenant Admin | ✅ موجودة |
| `is_company_admin()` | هل Company Admin | ✅ موجودة |
| `get_user_companies()` | شركات المستخدم | ✅ موجودة |
| `switch_user_company()` | تبديل الشركة | ✅ موجودة |
| `is_tenant_owner()` | هل صاحب الاشتراك | ❌ غير موجودة |

---

## 📌 سادساً: خطة إضافة عزل الشركات

### المرحلة 1: إنشاء الدوال المساعدة

```sql
-- 1. إنشاء is_tenant_owner()
CREATE OR REPLACE FUNCTION is_tenant_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    v_user_email TEXT;
    v_owner_email TEXT;
BEGIN
    IF is_super_admin(p_user_id) THEN RETURN true; END IF;
    
    SELECT up.email, t.owner_email 
    INTO v_user_email, v_owner_email
    FROM user_profiles up
    JOIN tenants t ON up.tenant_id = t.id
    WHERE up.id = p_user_id;
    
    RETURN v_user_email = v_owner_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. إنشاء can_access_company()
CREATE OR REPLACE FUNCTION can_access_company(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_company_id UUID;
    v_user_tenant_id UUID;
    v_company_tenant_id UUID;
BEGIN
    IF is_super_admin() THEN RETURN true; END IF;
    
    SELECT company_id, tenant_id INTO v_user_company_id, v_user_tenant_id
    FROM user_profiles WHERE id = auth.uid();
    
    SELECT tenant_id INTO v_company_tenant_id
    FROM companies WHERE id = p_company_id;
    
    -- Tenant Owner يرى كل شركات الـ Tenant
    IF is_tenant_owner() THEN
        RETURN v_user_tenant_id = v_company_tenant_id;
    END IF;
    
    -- المستخدم العادي يرى شركته فقط
    RETURN v_user_company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### المرحلة 2: تعديل السياسات للجداول الحرجة

**64 جدول يحتاج تعديل** (الجداول التي تحتوي tenant_id و company_id):

| المجموعة | الجداول | الأولوية |
|----------|---------|----------|
| **المحاسبة** | journal_entries, chart_of_accounts, fiscal_years | 🔴 عالية |
| **العملاء/الموردين** | customers, suppliers, customer_groups | 🔴 عالية |
| **المخزون** | products, warehouses, inventory_movements | 🔴 عالية |
| **المبيعات/المشتريات** | sales_invoices, purchase_invoices, orders | 🔴 عالية |
| **المالية** | payment_receipts, payment_vouchers, funds | 🟡 متوسطة |
| **الإعدادات** | user_profiles, branches, roles | 🟡 متوسطة |

### المرحلة 3: إصلاح الجداول المحظورة

**21 جدول** يحتاج إضافة سياسات أساسية.

---

## 📌 ملخص تنفيذي

### ✅ الإيجابيات:
1. هيكل العلاقات واضح (Brand → Tenant → Company → User)
2. الدوال المساعدة الأساسية موجودة
3. جدول `user_roles` يدعم الربط بـ company_id
4. 138 سياسة تستخدم عزل tenant_id

### 🔴 المشاكل:
1. **82 سياسة مفتوحة** - `USING (true)`
2. **21 جدول محظور** - بدون سياسات
3. **عزل الشركات غائب** - 4 سياسات فقط من 341
4. **دالة `is_tenant_owner()` غير موجودة**

### 🎯 الأولويات:
1. ✅ إنشاء `is_tenant_owner()` و `can_access_company()`
2. ⏳ تعديل سياسات الجداول الحرجة (64 جدول)
3. ⏳ إصلاح الجداول المحظورة (21 جدول)
4. ⏳ تحويل السياسات المفتوحة لاستخدام العزل

---

*تم إنشاء هذا التقرير عبر مسح CLI مباشر لقاعدة البيانات - 2026-02-05*
