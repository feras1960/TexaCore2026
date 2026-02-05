# 📋 توثيق إصلاحات نظام التسجيل وإدارة المشتركين
## تاريخ: 2026-02-03

---

## 🔧 الملفات المُعدّلة

### 1. AuthGuard.tsx
**المسار:** `src/components/auth/AuthGuard.tsx`

**الغرض:** حماية المسارات المحمية والتحقق من صلاحية الـ Tenant

**التغييرات:**
- إضافة فحص صلاحية الـ tenant للمستخدمين
- السماح للمستخدمين الجدد بالوصول لمعالج التسجيل
- تسجيل خروج المستخدمين الذين تم حذف tenant-هم
- توجيه المستخدمين للصفحة المناسبة حسب حالتهم

**المنطق:**
```
مستخدم جديد بدون tenant → registration-wizard
مستخدم في صفحة المعالج → يُسمح له بالوصول
مستخدم عادي tenant محذوف → login + رسالة خطأ
Super Admin → يدخل بدون قيود
```

---

### 2. FabricRegistrationWizard.tsx
**المسار:** `src/features/auth/FabricRegistrationWizard.tsx`

**الغرض:** معالج تسجيل المشتركين الجدد

**التغييرات:**
- إضافة `refreshSession()` بعد إتمام التسجيل
- تأخير صغير (500ms) لضمان تحديث الـ session قبل التوجيه
- إضافة `p_local_currency` لتمرير العملة المحلية

---

### 3. Login.tsx
**المسار:** `src/features/auth/Login.tsx`

**الغرض:** صفحة تسجيل الدخول

**التغييرات:**
- إضافة فحص URL parameter `error=tenant_deleted`
- عرض رسالة خطأ واضحة للمستخدم

---

### 4. ar.json (الترجمات)
**المسار:** `src/i18n/locales/ar.json`

**التغييرات:**
- إضافة `auth.errors.tenantDeleted`
- إضافة ترجمات `wizard.fabric.*`
- إضافة ترجمات `wizard.labels.*`
- إضافة ترجمات `wizard.steps.*`
- إضافة ترجمات `wizard.actions.*`

---

## 📁 ملفات SQL الجديدة

### 1. FIX_tenant_delete_function.sql
**المسار:** `supabase/migrations/FIX_tenant_delete_function.sql`

**الغرض:** دالة RPC آمنة لحذف Tenant وجميع البيانات المرتبطة

### 2. FIX_currencies_registration.sql ⭐ جديد
**المسار:** `supabase/migrations/FIX_currencies_registration.sql`

**الغرض:** تحديث دالة التسجيل لربط العملات المختارة بالشركة

**الميزات:**
- تمرير `p_local_currency` كـ parameter جديد
- إنشاء `company_accounting_settings` مع `supported_currencies`
- تجنب تكرار العملات (إذا كانت العملة الرئيسية = المحلية)

**مثال:**
```sql
-- إذا اختار المستخدم:
-- p_currency = 'USD'
-- p_local_currency = 'EUR'
-- 
-- سيتم إنشاء:
-- supported_currencies = ['USD', 'EUR']
```

---

## 🆕 ملفات Frontend جديدة

### 1. useCompanyCurrencies.ts
**المسار:** `src/hooks/useCompanyCurrencies.ts`

**الغرض:** Hook لجلب العملات المفعّلة للشركة

**الاستخدام:**
```typescript
const { baseCurrency, supportedCurrencies, loading } = useCompanyCurrencies();
// supportedCurrencies = ['USD', 'EUR']
```

### 2. CurrencySelector.tsx (محدّث)
**المسار:** `src/features/accounting/components/shared/CurrencySelector.tsx`

**التغييرات:**
- دعم جلب العملات من `company_accounting_settings`
- إضافة `SmartCurrencySelector` component
- Loading state أثناء جلب العملات

**الاستخدام:**
```tsx
// يعرض فقط عملات الشركة
<SmartCurrencySelector
  value={currency}
  onValueChange={setCurrency}
/>

// يعرض عملات محددة يدوياً
<CurrencySelector
  value={currency}
  onValueChange={setCurrency}
  options={['USD', 'EUR', 'SAR']}
/>
```

---

## 🚀 خطوات التطبيق

1. **تنفيذ SQL:**
   ```sql
   -- في Supabase SQL Editor
   -- انسخ من: supabase/migrations/FIX_currencies_registration.sql
   ```

2. **اختبار التسجيل:**
   - سجّل مستخدم جديد
   - اختر عملات مختلفة (Local vs Main)
   - تأكد أن الشركة تعرض العملات المختارة فقط

---

## 📅 سجل التغييرات

| التاريخ | الإصلاح |
|---------|---------|
| 2026-02-03 | إصلاح توجيه المستخدمين بعد حذف tenant |
| 2026-02-03 | إصلاح معالج التسجيل وتحديث metadata |
| 2026-02-03 | إضافة ترجمات المعالج المفقودة |
| 2026-02-03 | ربط العملات المختارة بالشركة الافتراضية |
| 2026-02-03 | إنشاء useCompanyCurrencies hook |
| 2026-02-03 | تحديث CurrencySelector لدعم العملات الديناميكية |

---

## 🔐 إصلاحات RLS سابقة

### SECURITY_FIX_saas_panel_complete.sql
- سياسات RLS شاملة لجميع جداول لوحة SaaS Admin
- تشمل: tenants, companies, subscription_plans, tenant_subscriptions, agents

### SECURITY_FIX_tenants_rls.sql
- سياسات RLS لجدول tenants
- السماح لـ Super Admin بعرض جميع المشتركين

---

## ⚠️ ملاحظات مهمة

1. **ترتيب التنفيذ:**
   - يجب تنفيذ `FIX_register_update_metadata.sql` قبل تسجيل أي مستخدم جديد

2. **التوافق:**
   - الدوال تعمل مع Supabase Auth
   - تتطلب `SECURITY DEFINER` للوصول لـ `auth.users`

3. **الاختبار:**
   - بعد التطبيق، اختبر تسجيل مستخدم جديد
   - تأكد من توجيهه للمعالج ثم للتطبيق

---

## 📅 سجل التغييرات

| التاريخ | الإصلاح |
|---------|---------|
| 2026-02-03 | إصلاح توجيه المستخدمين بعد حذف tenant |
| 2026-02-03 | إصلاح معالج التسجيل وتحديث metadata |
| 2026-02-03 | إضافة ترجمات المعالج المفقودة |
