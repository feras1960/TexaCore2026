# 📚 توثيق هيكلية SaaS Multi-Brand
## تاريخ التحديث: 2026-02-04

---

## 🏢 الهيكل العام

```
                    ┌─────────────────────┐
                    │   saas_products     │  ← البراندات/المنتجات
                    │ (TexaCore, FinCore) │
                    └─────────┬───────────┘
                              │ id
                              ↓
                    ┌─────────────────────┐
                    │      tenants        │  ← المستأجرين
                    │   product_id ───────┤
                    └─────────┬───────────┘
                              │ id
                              ↓
                    ┌─────────────────────┐
                    │     companies       │  ← الشركات
                    │   tenant_id ────────┤
                    └─────────┬───────────┘
                              │ id
                              ↓
                    ┌─────────────────────┐
                    │   user_profiles     │  ← المستخدمين
                    │   tenant_id ────────┤
                    │   company_id ───────┤
                    └─────────────────────┘
```

---

## 📋 قاموس الجداول الأساسية

### 1. جداول SaaS الأساسية

| الجدول | الغرض | الربط |
|--------|-------|-------|
| `saas_products` | 🏷️ البراندات/المنتجات (TexaCore, FinCore, MedCore) | - |
| `tenants` | 🏢 المستأجرين (الشركات الرئيسية) | `product_id → saas_products.id` |
| `tenant_subscriptions` | 📋 اشتراكات المستأجرين | `tenant_id → tenants.id` |
| `tenant_modules` | 📦 موديولات المستأجر | `tenant_id → tenants.id` |
| `tenant_users` | 👥 مستخدمي المستأجر | `tenant_id → tenants.id` |
| `tenant_languages` | 🌐 لغات المستأجر | `tenant_id → tenants.id` |
| `tenant_referrals` | 🔗 إحالات المستأجر | `tenant_id → tenants.id` |

### 2. جداول White Label (للوكلاء)

| الجدول | الغرض |
|--------|-------|
| `white_label_configs` | إعدادات العلامة البيضاء للوكلاء |
| `white_label_domains` | دومينات الوكلاء |
| `white_label_payments` | مدفوعات الوكلاء |
| `white_label_stats` | إحصائيات الوكلاء |

### 3. جداول الباقات والاشتراكات

| الجدول | الغرض |
|--------|-------|
| `subscription_plans` | 📊 خطط الاشتراك (Basic, Pro, Enterprise) |
| `system_modules` | 📦 موديولات النظام المتاحة |

---

## 🏷️ البراندات الحالية (saas_products)

| Code | Name | الاسم العربي | اللون | الموديولات |
|------|------|-------------|-------|-----------|
| `texacore` | TexaCore | تيكساكور - إدارة الأقمشة | 🟣 #8B5CF6 | core, inventory, fabric, sales, purchases, accounting |
| `fincore` | FinCore | فين كور - الصرافة والحوالات | 🟢 #10B981 | core, exchange, accounting, customers |
| `erpcore` | ERPCore | إي آر بي كور - نظام متكامل | 🔵 #3B82F6 | core, inventory, sales, purchases, accounting |
| `nexacore` | NexaCore | نيكساكور | 🔵 #3B82F6 | core, companies, accounting, sales, purchases |
| `inducore` | InduCore | انديوكور | 🟠 #F59E0B | core, users, companies, inventory, manufacturing |
| `medcore` | MedCore | ميد كور | 🔴 #EF4444 | core, users, companies, accounting, inventory, healthcare |

---

## 🔐 مستويات العزل

| المستوى | العمود | الجداول | الحالة |
|---------|--------|---------|--------|
| **Brand** | `product_id` | tenants → saas_products | ✅ جاهز |
| **Tenant** | `tenant_id` | معظم الجداول | ✅ جاهز |
| **Company** | `company_id` | جداول العمليات | ✅ جاهز |
| **Branch** | `branch_id` | بعض الجداول | ✅ جاهز |

---

## 🔗 العلاقات الأساسية

```sql
-- البراند → المستأجر
tenants.product_id → saas_products.id

-- المستأجر → الشركة
companies.tenant_id → tenants.id

-- الشركة → الفرع
branches.company_id → companies.id

-- المستخدم → المستأجر/الشركة
user_profiles.tenant_id → tenants.id
user_profiles.company_id → companies.id
```

---

## 📝 ملاحظات هامة

1. **`saas_products`** = جدول البراندات (وليس `brands` الذي هو للعلامات التجارية للمنتجات)
2. **`brands`** = علامات تجارية للمنتجات (Nike, Apple) - مختلف تماماً!
3. **`white_label_*`** = للوكلاء الذين يريدون التسويق بعلامتهم التجارية

---

## ✅ قائمة التحقق

- [x] جدول البراندات موجود (`saas_products`)
- [x] البراندات الأساسية مدخلة (TexaCore, FinCore, MedCore, etc.)
- [x] الربط مع tenants موجود (`product_id`)
- [x] الدومينات معرفة لبعض البراندات
- [x] RLS على `saas_products` - يحتاج تحقق
- [ ] ربط بعض tenants الناقصة

---

## 🔐 نظام التحقق بخطوتين (2FA/MFA)

### الجداول:

| الجدول | الغرض |
|--------|-------|
| `mfa_system_settings` | إعدادات 2FA على مستوى النظام |
| `mfa_company_settings` | إعدادات 2FA على مستوى الشركة |
| `mfa_user_settings` | حالة 2FA لكل مستخدم |
| `mfa_verification_log` | سجل محاولات التحقق |
| `mfa_pending_otps` | OTPs المؤقتة (للبريد/SMS) |

### طرق التحقق المدعومة:

| الطريقة | الوصف | المتطلبات |
|---------|-------|----------|
| **TOTP** | Google Authenticator, Authy | لا شيء |
| **Email OTP** | كود عبر البريد | إعداد SMTP |
| **SMS OTP** | كود عبر رسالة | Twilio |

### الدوال المساعدة:

```sql
-- التحقق إذا 2FA مطلوب
is_mfa_required(user_id) → BOOLEAN

-- التحقق إذا 2FA مفعل
is_mfa_enabled_for_user(user_id) → BOOLEAN

-- الطرق المتاحة
get_available_mfa_methods() → TABLE
```

### الملفات:

| الملف | الغرض |
|-------|-------|
| `src/hooks/useMfa.ts` | Hooks للتعامل مع 2FA |
| `src/components/settings/MfaSettings.tsx` | UI components |
| `SETUP_mfa_system.sql` | Migration script |

### الحالة الافتراضية:

- ❌ 2FA **معطل** بشكل افتراضي
- ✅ TOTP متاح
- ✅ Email OTP متاح
- ❌ SMS OTP معطل (يحتاج Twilio)
