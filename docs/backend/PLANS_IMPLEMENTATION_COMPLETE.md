# 🎯 نظام الباقات - دليل التنفيذ الكامل
# Subscription Plans System - Complete Implementation Guide

**التاريخ:** 24 يناير 2026  
**الحالة:** ✅ Backend جاهز 100%

---

## 📊 **ملخص التنفيذ:**

### **✅ ما تم إنجازه:**

1. ✅ إنشاء 3 باقات افتراضية (Starter, Professional, Enterprise)
2. ✅ تحديث `register_new_subscriber()` لدعم الباقات
3. ✅ دالة `check_plan_limits()` للتحقق من الحدود
4. ✅ دوال CRUD كاملة للباقات
5. ✅ دعم الـ Trial Period
6. ✅ ربط الموديولات بالباقات

---

## 🎯 **الباقات الثلاثة:**

### **1. Starter (الباقة الأساسية)**

```json
{
  "code": "starter",
  "name_ar": "الباقة الأساسية",
  "name_en": "Starter Plan",
  "price_monthly": 299.00,
  "price_yearly": 2990.00,
  "currency": "SAR",
  "trial_days": 14,
  "limits": {
    "max_users": 5,
    "max_companies": 1,
    "max_branches": 2,
    "max_warehouses": 2,
    "max_products": 1000,
    "storage_gb": 5
  },
  "included_modules": [
    "accounting",
    "sales",
    "purchases",
    "inventory"
  ],
  "features": {
    "multi_currency": false,
    "advanced_reports": false,
    "api_access": false,
    "white_label": false,
    "priority_support": false,
    "export_excel": false,
    "export_pdf": false,
    "mobile_app": false
  }
}
```

---

### **2. Professional (الباقة الاحترافية)** ⭐

```json
{
  "code": "professional",
  "name_ar": "الباقة الاحترافية",
  "name_en": "Professional Plan",
  "price_monthly": 799.00,
  "price_yearly": 7990.00,
  "currency": "SAR",
  "trial_days": 14,
  "is_popular": true,
  "limits": {
    "max_users": 15,
    "max_companies": 3,
    "max_branches": 5,
    "max_warehouses": 5,
    "max_products": 5000,
    "storage_gb": 20
  },
  "included_modules": [
    "accounting",
    "sales",
    "purchases",
    "inventory",
    "hr",
    "crm",
    "fabric",
    "pos"
  ],
  "features": {
    "multi_currency": true,
    "advanced_reports": true,
    "api_access": false,
    "white_label": false,
    "priority_support": true,
    "export_excel": true,
    "export_pdf": true,
    "sms_notifications": true,
    "mobile_app": true
  }
}
```

---

### **3. Enterprise (باقة الأعمال)**

```json
{
  "code": "enterprise",
  "name_ar": "باقة الأعمال",
  "name_en": "Enterprise Plan",
  "price_monthly": 1999.00,
  "price_yearly": 19990.00,
  "currency": "SAR",
  "trial_days": 30,
  "limits": {
    "max_users": 50,
    "max_companies": 10,
    "max_branches": 20,
    "max_warehouses": 20,
    "max_products": -1,
    "storage_gb": 100
  },
  "included_modules": [
    "accounting",
    "sales",
    "purchases",
    "inventory",
    "hr",
    "crm",
    "fabric",
    "pos",
    "healthcare",
    "exchange",
    "manufacturing",
    "projects"
  ],
  "features": {
    "multi_currency": true,
    "advanced_reports": true,
    "api_access": true,
    "white_label": true,
    "priority_support": true,
    "export_excel": true,
    "export_pdf": true,
    "sms_notifications": true,
    "mobile_app": true,
    "dedicated_manager": true,
    "custom_integrations": true,
    "on_premise_option": true
  }
}
```

**ملاحظة:** `-1` في `max_products` يعني غير محدود.

---

## 🔧 **الدوال المتاحة:**

### **1. get_subscription_plans()**

```sql
-- الحصول على جميع الباقات النشطة
SELECT * FROM get_subscription_plans(true);

-- الحصول على جميع الباقات (نشطة + غير نشطة)
SELECT * FROM get_subscription_plans(false);
```

**Returns:**
```typescript
{
  id: UUID,
  code: string,
  name_ar: string,
  name_en: string,
  max_users: number,
  max_companies: number,
  price_monthly: number,
  trial_days: number,
  included_modules: string[],
  features: object,
  // ...
}
```

---

### **2. create_subscription_plan()**

```sql
-- إنشاء باقة جديدة (Platform Owner فقط)
SELECT create_subscription_plan(
    'custom_plan',           -- code
    'باقة مخصصة',           -- name_ar
    'Custom Plan',           -- name_en
    'باقة للشركات المتوسطة', -- description
    10,                      -- max_users
    2,                       -- max_companies
    3,                       -- max_branches
    3,                       -- max_warehouses
    3000,                    -- max_products
    15,                      -- storage_gb
    '["accounting", "sales", "inventory"]'::jsonb, -- modules
    '{"advanced_reports": true}'::jsonb,          -- features
    499.00,                  -- price_monthly
    4990.00,                 -- price_yearly
    'SAR',                   -- currency
    14,                      -- trial_days
    false,                   -- is_popular
    2                        -- display_order
);
```

**Returns:**
```json
{
  "success": true,
  "plan_id": "uuid-here",
  "code": "custom_plan",
  "message": "تم إنشاء الباقة بنجاح"
}
```

---

### **3. update_subscription_plan()**

```sql
-- تحديث باقة موجودة (Platform Owner فقط)
SELECT update_subscription_plan(
    'plan-uuid-here',        -- plan_id
    p_name_ar := 'اسم جديد',
    p_price_monthly := 599.00,
    p_trial_days := 30,
    p_max_companies := 5
);
```

**ملاحظة:** فقط الحقول المحددة سيتم تحديثها (NULL = لا تغيير)

---

### **4. toggle_plan_status()**

```sql
-- تفعيل/تعطيل باقة
SELECT toggle_plan_status('plan-uuid-here', false); -- تعطيل
SELECT toggle_plan_status('plan-uuid-here', true);  -- تفعيل
```

---

### **5. check_plan_limits()**

```sql
-- التحقق من حد الشركات
SELECT check_plan_limits('tenant-uuid', 'companies');

-- التحقق من حد المستخدمين
SELECT check_plan_limits('tenant-uuid', 'users');

-- التحقق من حد الفروع
SELECT check_plan_limits('tenant-uuid', 'branches');

-- التحقق من حد المخازن
SELECT check_plan_limits('tenant-uuid', 'warehouses');

-- التحقق من حد المنتجات
SELECT check_plan_limits('tenant-uuid', 'products');

-- التحقق من المساحة التخزينية
SELECT check_plan_limits('tenant-uuid', 'storage');
```

**Returns:**
```json
{
  "allowed": true,
  "limit_type": "companies",
  "current": 2,
  "max": 3,
  "remaining": 1,
  "plan_code": "professional",
  "plan_name_ar": "الباقة الاحترافية",
  "plan_name_en": "Professional Plan"
}
```

**أو إذا وصل للحد:**
```json
{
  "allowed": false,
  "limit_type": "companies",
  "current": 3,
  "max": 3,
  "remaining": 0,
  "plan_code": "professional"
}
```

---

## 🔄 **Flow التسجيل مع الباقات:**

### **Option 1: تسجيل مباشر (بدون اختيار باقة مسبقاً)**

```typescript
// Frontend: /register
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      full_name: formData.name
    }
  }
});

// ثم في Wizard:
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: authData.user.id,
  p_user_email: formData.email,
  p_user_name: formData.name,
  p_company_name: formData.companyName,
  p_phone: formData.phone,
  p_business_type: formData.businessType,
  p_currency: formData.localCurrency,
  p_country_code: formData.country,
  p_plan_code: 'starter' // ✅ افتراضي
});
```

---

### **Option 2: تسجيل من صفحة Pricing**

```typescript
// Frontend: /pricing
const handleSelectPlan = (planCode: string) => {
  navigate(`/register?plan=${planCode}`);
};

// في /register:
const searchParams = new URLSearchParams(location.search);
const selectedPlan = searchParams.get('plan') || 'starter';

// في Wizard:
const { data, error } = await supabase.rpc('register_new_subscriber', {
  // ... نفس الحقول
  p_plan_code: selectedPlan // ✅ من URL
});
```

---

## 📱 **Frontend - الواجهات المطلوبة:**

### **Phase 1: صفحة Pricing (/pricing)**

```typescript
// src/features/saas/Pricing.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Plan {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  price_monthly: number;
  price_yearly: number;
  max_companies: number;
  max_users: number;
  trial_days: number;
  is_popular: boolean;
  included_modules: string[];
  features: Record<string, boolean>;
}

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { i18n, t } = useTranslation();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase.rpc('get_subscription_plans', {
      p_active_only: true
    });

    if (!error && data) {
      setPlans(data);
    }
    setLoading(false);
  };

  return (
    <div className="container py-12">
      <h1>{t('pricing.title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={() => navigate(`/register?plan=${plan.code}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### **Phase 2: تحديث Register.tsx**

```typescript
// src/features/auth/Register.tsx
export function Register() {
  const searchParams = new URLSearchParams(location.search);
  const selectedPlan = searchParams.get('plan') || 'starter';
  const [plans, setPlans] = useState<Plan[]>([]);

  // ... باقي الكود

  return (
    <form onSubmit={handleSubmit}>
      {/* ... الحقول الأخرى */}
      
      <div>
        <label>{t('register.selectPlan')}</label>
        <Select value={selectedPlan} onChange={setSelectedPlan}>
          {plans.map(plan => (
            <option key={plan.code} value={plan.code}>
              {i18n.language === 'ar' ? plan.name_ar : plan.name_en}
              {' - '}
              {plan.price_monthly} {plan.currency}/
              {t('common.month')}
            </option>
          ))}
        </Select>
      </div>

      {/* عرض تفاصيل الباقة المختارة */}
      <PlanSummary plan={plans.find(p => p.code === selectedPlan)} />

      <Button type="submit">{t('register.submit')}</Button>
    </form>
  );
}
```

---

### **Phase 3: تحديث RegistrationWizard.tsx**

```typescript
// src/features/auth/RegistrationWizard.tsx
const handleComplete = async () => {
  const { data, error } = await supabase.rpc('register_new_subscriber', {
    p_user_id: user.id,
    p_user_email: user.email,
    p_user_name: user.user_metadata.full_name,
    p_company_name: formData.companyName,
    p_phone: formData.phone,
    p_business_type: formData.businessType,
    p_currency: formData.localCurrency,
    p_country_code: formData.country,
    p_plan_code: selectedPlan // ✅ من state
  });

  if (error) {
    toast.error(t('errors.registrationFailed'));
    return;
  }

  // عرض رسالة نجاح مع تفاصيل Trial
  toast.success(
    t('messages.registrationSuccess', {
      trialDays: data.trial_days
    })
  );

  navigate('/dashboard');
};
```

---

### **Phase 4: لوحة إدارة الباقات (/saas/settings/plans)**

```typescript
// src/features/saas/settings/PlansManagement.tsx
export function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch plans
  const fetchPlans = async () => {
    const { data } = await supabase.rpc('get_subscription_plans', {
      p_active_only: false // عرض الكل
    });
    setPlans(data);
  };

  // Create plan
  const handleCreate = async (planData: PlanFormData) => {
    const { data, error } = await supabase.rpc('create_subscription_plan', {
      p_code: planData.code,
      p_name_ar: planData.nameAr,
      p_name_en: planData.nameEn,
      p_description: planData.description,
      p_max_users: planData.maxUsers,
      p_max_companies: planData.maxCompanies,
      p_max_branches: planData.maxBranches,
      p_max_warehouses: planData.maxWarehouses,
      p_max_products: planData.maxProducts,
      p_storage_gb: planData.storageGb,
      p_included_modules: planData.includedModules,
      p_features: planData.features,
      p_price_monthly: planData.priceMonthly,
      p_price_yearly: planData.priceYearly,
      p_currency: planData.currency,
      p_trial_days: planData.trialDays,
      p_is_popular: planData.isPopular,
      p_display_order: planData.displayOrder
    });

    if (!error) {
      toast.success(t('messages.planCreated'));
      fetchPlans();
    }
  };

  // Update plan
  const handleUpdate = async (planId: string, updates: Partial<PlanFormData>) => {
    const { data, error } = await supabase.rpc('update_subscription_plan', {
      p_plan_id: planId,
      p_name_ar: updates.nameAr,
      p_trial_days: updates.trialDays,
      p_price_monthly: updates.priceMonthly,
      // ... باقي الحقول
    });

    if (!error) {
      toast.success(t('messages.planUpdated'));
      fetchPlans();
    }
  };

  // Toggle status
  const handleToggleStatus = async (planId: string, isActive: boolean) => {
    const { error } = await supabase.rpc('toggle_plan_status', {
      p_plan_id: planId,
      p_is_active: isActive
    });

    if (!error) {
      fetchPlans();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>{t('saas.plansManagement')}</h1>
        <Button onClick={() => setIsEditing(true)}>
          {t('saas.addPlan')}
        </Button>
      </div>

      <NexaTable
        data={plans}
        columns={[
          { header: t('common.code'), accessorKey: 'code' },
          { header: t('common.name'), accessorKey: 'name_ar' },
          { header: t('pricing.price'), accessorKey: 'price_monthly' },
          { header: t('pricing.companies'), accessorKey: 'max_companies' },
          { header: t('pricing.users'), accessorKey: 'max_users' },
          { header: t('pricing.trialDays'), accessorKey: 'trial_days' },
          {
            header: t('common.status'),
            cell: ({ row }) => (
              <Switch
                checked={row.original.is_active}
                onCheckedChange={(checked) =>
                  handleToggleStatus(row.original.id, checked)
                }
              />
            )
          },
          {
            header: t('common.actions'),
            cell: ({ row }) => (
              <Button onClick={() => setSelectedPlan(row.original)}>
                {t('common.edit')}
              </Button>
            )
          }
        ]}
      />

      {/* Plan Form Sheet */}
      <UnifiedSheet
        open={isEditing || selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditing(false);
            setSelectedPlan(null);
          }
        }}
        title={selectedPlan ? t('saas.editPlan') : t('saas.addPlan')}
      >
        <PlanForm
          plan={selectedPlan}
          onSubmit={selectedPlan ? handleUpdate : handleCreate}
        />
      </UnifiedSheet>
    </div>
  );
}
```

---

### **Phase 5: Trial Banner في Dashboard**

```typescript
// src/features/dashboard/TrialBanner.tsx
export function TrialBanner() {
  const [subscription, setSubscription] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'trial')
      .single();

    setSubscription(data);
  };

  if (!subscription || subscription.status !== 'trial') {
    return null;
  }

  const daysRemaining = Math.ceil(
    (new Date(subscription.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Alert className="mb-6">
      <Clock className="h-4 w-4" />
      <AlertTitle>{t('subscription.trialPeriod')}</AlertTitle>
      <AlertDescription>
        {t('subscription.trialDaysRemaining', { days: daysRemaining })}
        <Button variant="link" onClick={() => navigate('/pricing')}>
          {t('subscription.upgradNow')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

### **Phase 6: Plan Limit Checker Hook**

```typescript
// src/hooks/usePlanLimits.ts
export function usePlanLimits(limitType: string) {
  const [limit, setLimit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    checkLimit();
  }, [limitType, user]);

  const checkLimit = async () => {
    if (!user?.tenant_id) return;

    const { data, error } = await supabase.rpc('check_plan_limits', {
      p_tenant_id: user.tenant_id,
      p_limit_type: limitType
    });

    if (!error && data) {
      setLimit(data);
    }
    setLoading(false);
  };

  return {
    limit,
    loading,
    allowed: limit?.allowed ?? true,
    current: limit?.current ?? 0,
    max: limit?.max ?? 0,
    remaining: limit?.remaining ?? 0,
    refresh: checkLimit
  };
}

// الاستخدام:
function CreateCompanyButton() {
  const { allowed, current, max } = usePlanLimits('companies');
  const { t } = useTranslation();

  if (!allowed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button disabled>
            {t('company.addNew')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t('errors.planLimitReached', {
            current, max, type: t('common.companies')
          })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button onClick={handleCreateCompany}>
      {t('company.addNew')} ({current}/{max})
    </Button>
  );
}
```

---

## 🎯 **خطة التنفيذ (بالترتيب):**

### **✅ Phase 1: Backend (مكتمل)**
- [x] إنشاء 3 باقات افتراضية
- [x] دوال CRUD كاملة
- [x] دالة التحقق من الحدود
- [x] تحديث register_new_subscriber()
- [x] ملف اختبار SQL

### **⏳ Phase 2: Frontend - Pricing Page**
- [ ] إنشاء `/pricing` page
- [ ] عرض الباقات الثلاثة
- [ ] مقارنة الميزات
- [ ] ربط مع `/register?plan=X`

### **⏳ Phase 3: Frontend - Registration**
- [ ] تحديث Register.tsx لاستقبال plan من URL
- [ ] Dropdown للباقات
- [ ] عرض تفاصيل الباقة المختارة
- [ ] تحديث Wizard لإرسال plan_code

### **⏳ Phase 4: Frontend - Dashboard**
- [ ] Trial Banner
- [ ] عرض حدود الباقة (X/Y companies)
- [ ] منع إنشاء شركة/مستخدم عند الوصول للحد

### **⏳ Phase 5: Frontend - SaaS Management**
- [ ] صفحة `/saas/settings/plans`
- [ ] Plans List Table
- [ ] Add/Edit Plan Form
- [ ] Toggle Plan Status
- [ ] Trial Days Control

---

## 🧪 **الاختبار:**

### **تشغيل Migration:**
```bash
# في Supabase Dashboard → SQL Editor
# نسخ ولصق محتوى STEP_45_subscription_plans_system.sql
# ثم Run
```

### **تشغيل الاختبار:**
```bash
# نسخ ولصق محتوى test_subscription_plans.sql
# ثم Run
```

### **اختبار من Frontend:**
```typescript
// 1. التسجيل بباقة Starter
navigate('/register?plan=starter');

// 2. التسجيل بباقة Professional
navigate('/register?plan=professional');

// 3. محاولة إنشاء شركة ثانية على Starter (يجب أن يمنع)
// Current: 1, Max: 1, Allowed: false
```

---

## 📋 **الترجمات المطلوبة:**

```json
{
  "pricing": {
    "title": "الباقات والأسعار",
    "selectPlan": "اختر باقتك",
    "popular": "الأكثر شيوعاً",
    "month": "شهر",
    "year": "سنة",
    "trialDays": "فترة تجريبية",
    "companies": "الشركات",
    "users": "المستخدمين",
    "features": "الميزات",
    "getStarted": "ابدأ الآن",
    "currentPlan": "باقتك الحالية"
  },
  "subscription": {
    "trialPeriod": "فترة تجريبية",
    "trialDaysRemaining": "متبقي {days} يوم من الفترة التجريبية",
    "upgradeNow": "ترقية الآن",
    "planLimits": "حدود الباقة"
  },
  "errors": {
    "planLimitReached": "وصلت للحد الأقصى ({current}/{max}) من {type}"
  },
  "saas": {
    "plansManagement": "إدارة الباقات",
    "addPlan": "إضافة باقة",
    "editPlan": "تعديل باقة"
  }
}
```

---

## ✅ **الخلاصة:**

### **Backend: جاهز 100% ✅**
- 3 باقات افتراضية
- دوال CRUD كاملة
- التحقق من الحدود
- دعم Trial Period
- ربط الموديولات

### **Frontend: يحتاج تطوير**
1. صفحة Pricing
2. تحديث Registration
3. Trial Banner
4. Plan Limits UI
5. لوحة إدارة الباقات

---

**الخطوة التالية:** تنفيذ Frontend Phase 2 (Pricing Page) 🚀
