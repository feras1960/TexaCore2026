# 📚 نظام الباقات والاشتراكات - التوثيق الشامل
**Subscription Plans System - Complete Documentation**

**التاريخ:** 2026-01-24  
**الحالة:** ✅ Backend جاهز، Frontend قيد التطوير  
**المطورون:** Next Revolution Company

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البنية التقنية](#البنية-التقنية)
3. [الباقات المتاحة](#الباقات-المتاحة)
4. [نظام التسعير](#نظام-التسعير)
5. [Backend API](#backend-api)
6. [معالج التسجيل](#معالج-التسجيل)
7. [Frontend Implementation](#frontend-implementation)

---

## 🎯 نظرة عامة

### الهدف
نظام شامل لإدارة الاشتراكات والباقات في نظام **Texa Core ERP** يتضمن:
- ✅ 3 باقات (Basic, Professional, Enterprise)
- ✅ نظام خصومات مرن (موسمية وترويجية)
- ✅ اشتراك شهري/سنوي مع مزايا إضافية
- ✅ فترة تجريبية قابلة للتخصيص
- ✅ حدود مخصصة لكل باقة
- ✅ دعم 9 لغات

---

## 🏗️ البنية التقنية

### قاعدة البيانات

#### 1️⃣ **جدول `subscription_plans`**
يحتوي على تفاصيل الباقات:

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES saas_products(id),
    code VARCHAR(50) NOT NULL UNIQUE,
    
    -- أسماء متعددة اللغات
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_de TEXT,
    name_tr TEXT,
    name_ru TEXT,
    name_uk TEXT,
    name_it TEXT,
    name_pl TEXT,
    name_ro TEXT,
    
    description TEXT,
    
    -- الحدود
    max_users INTEGER NOT NULL DEFAULT 1,
    max_companies INTEGER NOT NULL DEFAULT 1,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_warehouses INTEGER NOT NULL DEFAULT 1,
    max_products INTEGER NOT NULL DEFAULT 100,
    storage_gb INTEGER NOT NULL DEFAULT 1,
    
    -- الموديولات والميزات
    included_modules TEXT[] DEFAULT '{}',
    features JSONB DEFAULT '{}',
    
    -- الأسعار
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- المزايا السنوية
    yearly_free_months INTEGER DEFAULT 2,
    additional_yearly_discount DECIMAL(5,2) DEFAULT 0,
    
    trial_days INTEGER DEFAULT 14,
    is_popular BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2️⃣ **جدول `promotional_discounts`**
يدير الخصومات الترويجية:

```sql
CREATE TABLE promotional_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    
    -- أسماء متعددة اللغات
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_de TEXT,
    name_tr TEXT,
    name_ru TEXT,
    name_uk TEXT,
    name_it TEXT,
    name_pl TEXT,
    name_ro TEXT,
    
    description TEXT,
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage BETWEEN 1 AND 100),
    
    -- صلاحية الخصم
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ NOT NULL,
    
    -- تطبيق الخصم
    applicable_plans TEXT[] DEFAULT '{}', -- فارغ = كل الباقات
    applies_to VARCHAR(20) DEFAULT 'both' CHECK (applies_to IN ('monthly', 'yearly', 'both')),
    
    is_active BOOLEAN DEFAULT true,
    auto_apply BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3️⃣ **جدول `subscriptions`**
يربط المشتركين بالباقات:

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    status VARCHAR(20) DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    
    billing_cycle VARCHAR(10) DEFAULT 'monthly',
    price_paid DECIMAL(10,2),
    currency VARCHAR(3),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📦 الباقات المتاحة

### 1️⃣ الباقة الأساسية (Starter)
**الكود:** `starter`

#### الأسعار:
| النوع | السعر الأصلي | بعد الخصم 50% | التوفير |
|-------|--------------|---------------|---------|
| شهري | $99.00 | **$49.50** | $49.50 (50%) |
| سنوي | $1,188.00 | **$495.00** (10 أشهر) | $693.00 (58%) |

#### الحدود:
- ✅ **1 شركة**
- ✅ 5 مستخدمين
- ✅ 50 فرع
- ✅ 5 مخازن
- ✅ 1,000 منتج
- ✅ 10 GB تخزين

#### المدة التجريبية:
- 🎁 **14 يوم مجاناً**

#### الموديولات المتضمنة:
```json
["accounting", "sales", "purchases", "inventory"]
```

#### الميزات:
```json
{
  "multi_currency": false,
  "advanced_reports": false,
  "api_access": false,
  "white_label": false,
  "priority_support": false,
  "custom_fields": false,
  "export_excel": true,
  "export_pdf": true,
  "sms_notifications": false,
  "email_notifications": true,
  "mobile_app": false
}
```

---

### 2️⃣ الباقة الاحترافية (Professional)
**الكود:** `professional`  
⭐ **الأكثر شعبية**

#### الأسعار:
| النوع | السعر الأصلي | بعد الخصم 50% | التوفير |
|-------|--------------|---------------|---------|
| شهري | $799.00 | **$399.50** | $399.50 (50%) |
| سنوي | $9,588.00 | **$3,995.00** (10 أشهر) | $5,593.00 (58%) |

#### الحدود:
- ✅ **3 شركات**
- ✅ 20 مستخدم
- ✅ 200 فرع
- ✅ 20 مخزن
- ✅ 10,000 منتج
- ✅ 100 GB تخزين

#### المدة التجريبية:
- 🎁 **30 يوم مجاناً**

#### الموديولات المتضمنة:
```json
["accounting", "sales", "purchases", "inventory", "crm", "hr", "pos", "manufacturing"]
```

#### الميزات:
```json
{
  "multi_currency": true,
  "advanced_reports": true,
  "api_access": true,
  "white_label": false,
  "priority_support": true,
  "custom_fields": true,
  "export_excel": true,
  "export_pdf": true,
  "sms_notifications": true,
  "email_notifications": true,
  "mobile_app": true
}
```

---

### 3️⃣ باقة المؤسسات (Enterprise)
**الكود:** `enterprise`

#### الأسعار:
| النوع | السعر الأصلي | بعد الخصم 50% | التوفير |
|-------|--------------|---------------|---------|
| شهري | $1,199.00 | **$599.50** | $599.50 (50%) |
| سنوي | $14,388.00 | **$5,995.00** (10 أشهر) | $8,393.00 (58%) |

#### الحدود:
- ✅ **غير محدود** - شركات، مستخدمين، فروع، مخازن، منتجات
- ✅ 500 GB تخزين

#### المدة التجريبية:
- 🎁 **30 يوم مجاناً**

#### الموديولات المتضمنة:
```json
["accounting", "sales", "purchases", "inventory", "crm", "hr", "pos", "manufacturing", "projects", "assets"]
```

#### الميزات:
```json
{
  "multi_currency": true,
  "advanced_reports": true,
  "api_access": true,
  "white_label": true,
  "priority_support": true,
  "custom_fields": true,
  "export_excel": true,
  "export_pdf": true,
  "sms_notifications": true,
  "email_notifications": true,
  "mobile_app": true,
  "dedicated_support": true
}
```

---

## 💰 نظام التسعير

### آلية الحساب

#### 1️⃣ **الاشتراك الشهري:**
```
السعر النهائي = السعر الأصلي × (1 - نسبة الخصم الترويجي)
```

**مثال (Professional - شهري):**
```
السعر الأصلي: $799.00
الخصم (50%): -$399.50
────────────────────
السعر النهائي: $399.50
```

#### 2️⃣ **الاشتراك السنوي:**
```
السعر الشهري بعد الخصم = السعر الأصلي × (1 - نسبة الخصم)
عدد الأشهر المدفوعة = 12 - الأشهر المجانية
السعر السنوي = السعر الشهري بعد الخصم × عدد الأشهر المدفوعة
```

**مثال (Professional - سنوي):**
```
السعر الأصلي الشهري: $799.00
الخصم (50%): -$399.50
────────────────────────────────
السعر الشهري بعد الخصم: $399.50

عدد الأشهر المدفوعة: 10 (12 - 2 مجاناً)
────────────────────────────────
السعر السنوي النهائي: $3,995.00

التوفير الإجمالي:
- من السعر الأصلي السنوي: $5,593.00 (58%)
- قيمة الشهرين المجانيين: $799.00
```

### الخصومات النشطة

#### 🎁 **خصم الإطلاق (LAUNCH_50)**
```json
{
  "code": "LAUNCH_50",
  "discount_percentage": 50,
  "applies_to": "both",
  "applicable_plans": [],  // كل الباقات
  "auto_apply": true,
  "is_active": true
}
```

---

## 🔌 Backend API

### الدوال المتاحة (PostgreSQL Functions)

#### 1️⃣ **get_plan_pricing**
حساب السعر النهائي مع الخصومات:

```sql
SELECT * FROM get_plan_pricing(
    'professional',  -- plan_code
    'yearly',        -- billing_cycle: 'monthly' أو 'yearly'
    2                -- free_months_override (اختياري)
);
```

**النتيجة:**
```json
{
  "plan_code": "professional",
  "plan_name_ar": "الباقة الاحترافية",
  "plan_name_en": "Professional Plan",
  "billing_cycle": "yearly",
  "original_price": 9588.00,
  "currency": "USD",
  "promo_discount": 50,
  "promo_code": "LAUNCH_50",
  "free_months": 2,
  "months_paid": 10,
  "monthly_after_promo": 399.50,
  "final_price": 3995.00,
  "total_savings": 5593.00,
  "savings_percentage": 58.32
}
```

#### 2️⃣ **register_new_subscriber**
تسجيل مشترك جديد مع الباقة:

```sql
SELECT * FROM register_new_subscriber(
    'user-uuid',                    -- p_user_id
    'user@example.com',             -- p_user_email
    'John Doe',                     -- p_user_name
    'My Company',                   -- p_company_name
    '+966501234567',                -- p_phone
    'fabric',                       -- p_business_type
    'SAR',                          -- p_currency
    'SA',                           -- p_country_code
    'starter'                       -- p_plan_code (افتراضي: 'starter')
);
```

**النتيجة:**
```json
{
  "success": true,
  "tenant_id": "tenant-uuid",
  "company_id": "company-uuid",
  "subscription_id": "subscription-uuid",
  "plan_code": "starter",
  "trial_days": 14,
  "trial_ends_at": "2026-02-07T12:00:00Z"
}
```

#### 3️⃣ **check_plan_limits**
التحقق من حدود الباقة:

```sql
SELECT * FROM check_plan_limits(
    'tenant-uuid',       -- p_tenant_id
    'companies'          -- p_limit_type: 'companies', 'users', 'branches', 'warehouses', 'products', 'storage'
);
```

**النتيجة:**
```json
{
  "success": true,
  "limit_type": "companies",
  "max_allowed": 1,
  "current_count": 1,
  "remaining": 0,
  "is_limit_reached": true,
  "plan_code": "starter",
  "plan_name": "الباقة الأساسية"
}
```

#### 4️⃣ **get_subscription_plans**
جلب الباقات النشطة:

```sql
-- جلب الباقات النشطة فقط
SELECT * FROM get_subscription_plans(true);

-- جلب كل الباقات
SELECT * FROM get_subscription_plans(false);
```

#### 5️⃣ **create_subscription_plan**
إنشاء باقة جديدة:

```sql
SELECT * FROM create_subscription_plan(
    'custom_plan',                  -- p_code
    'الباقة المخصصة',              -- p_name_ar
    'Custom Plan',                  -- p_name_en
    'باقة مخصصة للعملاء الخاصين',  -- p_description
    10,                             -- p_max_users
    2,                              -- p_max_companies
    100,                            -- p_max_branches
    10,                             -- p_max_warehouses
    5000,                           -- p_max_products
    50,                             -- p_storage_gb
    ARRAY['accounting', 'sales'],   -- p_included_modules
    '{"api_access": true}'::JSONB,  -- p_features
    299.00,                         -- p_price_monthly
    3588.00,                        -- p_price_yearly
    'USD',                          -- p_currency
    14,                             -- p_trial_days
    false,                          -- p_is_popular
    2                               -- p_display_order
);
```

#### 6️⃣ **update_subscription_plan**
تحديث باقة موجودة:

```sql
SELECT * FROM update_subscription_plan(
    'plan-uuid',                    -- p_plan_id
    'الباقة المحدثة',              -- p_name_ar
    'Updated Plan',                 -- p_name_en
    'وصف جديد',                    -- p_description
    15,                             -- p_max_users
    -- ... باقي البارامترات
);
```

#### 7️⃣ **toggle_plan_status**
تفعيل/إيقاف باقة:

```sql
SELECT * FROM toggle_plan_status(
    'plan-uuid',    -- p_plan_id
    false           -- p_is_active
);
```

#### 8️⃣ **create_promotional_discount**
إنشاء خصم ترويجي:

```sql
SELECT * FROM create_promotional_discount(
    'SUMMER50',                     -- p_code
    'خصم الصيف',                   -- p_name_ar
    'Summer Discount',              -- p_name_en
    'خصم 50% لفصل الصيف',          -- p_description
    50,                             -- p_discount_percentage
    '2026-06-01'::TIMESTAMPTZ,      -- p_valid_from
    '2026-08-31'::TIMESTAMPTZ,      -- p_valid_to
    ARRAY['starter', 'professional'],-- p_applicable_plans
    'both',                         -- p_applies_to
    true,                           -- p_auto_apply
    1                               -- p_priority
);
```

#### 9️⃣ **get_promotional_discounts**
جلب الخصومات:

```sql
-- الخصومات النشطة فقط
SELECT * FROM get_promotional_discounts(true);

-- كل الخصومات
SELECT * FROM get_promotional_discounts(false);
```

---

## 🧙‍♂️ معالج التسجيل (Registration Wizard)

### سير العمل

#### الخطوة 1: التسجيل الأساسي (`Register.tsx`)
1. ✅ المستخدم يدخل البيانات الأساسية:
   - الاسم الكامل
   - اسم الشركة
   - البريد الإلكتروني
   - رقم الهاتف
   - كلمة المرور

2. ✅ عند الضغط على "إنشاء حساب":
   - يتم إنشاء حساب Auth في Supabase
   - يتم حفظ البيانات في `localStorage`
   - إعادة التوجيه إلى `/registration-wizard`

#### الخطوة 2: اختيار نوع العمل (`RegistrationWizard.tsx` - Step 1)
1. ✅ اختيار نوع العمل:
   - General (عام)
   - Fabric (أقمشة)
   - Exchange (صرافة)
   - Healthcare (رعاية صحية)
   - E-commerce (تجارة إلكترونية)

2. ✅ تأكيد اسم الشركة

#### الخطوة 3: معلومات الشركة (Step 2)
1. ✅ الدولة (مع اختيار العملة التلقائي)
2. ✅ المدينة
3. ✅ العنوان
4. ✅ الموقع الإلكتروني
5. ✅ الهاتف
6. ✅ البريد الإلكتروني

#### الخطوة 4: الإعدادات المالية (Step 3)
1. ✅ العملة المحلية
2. ✅ العملة الرئيسية
3. ✅ بداية السنة المالية

#### الخطوة 5: اختيار الباقة (جديد - سيتم إضافته)
1. 🔄 عرض الباقات الثلاث
2. 🔄 عرض الأسعار مع الخصم
3. 🔄 اختيار الدورة (شهري/سنوي)
4. 🔄 عرض التوفير

#### الخطوة النهائية: التسجيل
```typescript
await supabase.rpc('register_new_subscriber', {
  p_user_id: user.id,
  p_user_email: formData.email,
  p_user_name: formData.fullName,
  p_company_name: formData.companyName,
  p_phone: formData.phone,
  p_business_type: formData.businessType,
  p_currency: formData.localCurrency,
  p_country_code: formData.country,
  p_plan_code: selectedPlan  // 🆕 الباقة المختارة
});
```

---

## 🎨 Frontend Implementation

### المطلوب تنفيذه

#### 1️⃣ **صفحة الأسعار (`/pricing`)**
**المسار:** `src/features/pricing/PricingPage.tsx`

**المكونات:**
```typescript
// PricingToggle.tsx - تبديل شهري/سنوي
// PricingCard.tsx - كرت الباقة
// FeaturesList.tsx - قائمة الميزات
// DiscountBadge.tsx - شارة الخصم
```

**المميزات:**
- ✅ عرض الباقات الثلاث
- ✅ تبديل بين شهري/سنوي
- ✅ عرض الخصم والتوفير
- ✅ زر "اختر الباقة" → `/register?plan=starter`
- ✅ دعم RTL والترجمات

#### 2️⃣ **تحديث معالج التسجيل**
**الملف:** `src/features/auth/RegistrationWizard.tsx`

**التغييرات المطلوبة:**

```typescript
// 1. إضافة state للباقة
const [selectedPlan, setSelectedPlan] = useState<string>('starter');

// 2. قراءة الباقة من URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const planFromUrl = params.get('plan');
  if (planFromUrl && ['starter', 'professional', 'enterprise'].includes(planFromUrl)) {
    setSelectedPlan(planFromUrl);
  }
}, []);

// 3. إضافة خطوة اختيار الباقة (Step 4)
const renderStep4 = () => (
  <PlanSelection
    selectedPlan={selectedPlan}
    onPlanChange={setSelectedPlan}
    billingCycle={billingCycle}
    onBillingCycleChange={setBillingCycle}
  />
);

// 4. تحديث handleSubmit
const handleSubmit = async () => {
  const { data, error } = await supabase.rpc('register_new_subscriber', {
    // ... البارامترات الموجودة
    p_plan_code: selectedPlan  // 🆕 إضافة الباقة
  });
};
```

#### 3️⃣ **بانر الفترة التجريبية**
**الملف:** `src/components/trial/TrialBanner.tsx`

```typescript
export function TrialBanner() {
  const { subscription } = useSubscription();
  
  if (subscription.status !== 'trial') return null;
  
  const daysRemaining = getDaysRemaining(subscription.trial_ends_at);
  
  return (
    <Alert className="mb-4 bg-amber-50 border-amber-200">
      <Clock className="w-4 h-4" />
      <AlertTitle>{t('trial.title')}</AlertTitle>
      <AlertDescription>
        {t('trial.daysRemaining', { days: daysRemaining })}
        <Link to="/settings/subscription">
          {t('trial.upgrade')}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
```

#### 4️⃣ **التحقق من حدود الباقة**
**الملف:** `src/hooks/usePlanLimits.ts`

```typescript
export function usePlanLimits() {
  const checkLimit = async (limitType: string) => {
    const { data } = await supabase.rpc('check_plan_limits', {
      p_tenant_id: tenantId,
      p_limit_type: limitType
    });
    
    if (data?.is_limit_reached) {
      toast.error(t('limits.reached', { 
        type: limitType,
        max: data.max_allowed 
      }));
      return false;
    }
    
    return true;
  };
  
  return { checkLimit };
}
```

**الاستخدام:**
```typescript
// في صفحة إضافة شركة
const { checkLimit } = usePlanLimits();

const handleAddCompany = async () => {
  const canAdd = await checkLimit('companies');
  if (!canAdd) return;
  
  // متابعة الإضافة
};
```

#### 5️⃣ **إدارة الباقات (SaaS Admin)**
**المسار:** `src/features/saas/settings/SubscriptionPlansPage.tsx`

**المميزات:**
- ✅ عرض كل الباقات
- ✅ إضافة/تعديل/حذف باقة
- ✅ تفعيل/إيقاف باقة
- ✅ تعديل الأسعار والحدود
- ✅ إدارة الموديولات المتضمنة

#### 6️⃣ **إدارة الخصومات**
**المسار:** `src/features/saas/settings/PromotionalDiscountsPage.tsx`

**المميزات:**
- ✅ عرض كل الخصومات
- ✅ إضافة خصم جديد
- ✅ تعديل خصم موجود
- ✅ تفعيل/إيقاف خصم
- ✅ تحديد تاريخ الصلاحية
- ✅ تحديد الباقات المطبق عليها

---

## 🔐 مفاتيح الترجمة المطلوبة

### إضافتها في `src/i18n/locales/*.json`

```json
{
  "plans": {
    "title": "الباقات والأسعار",
    "monthly": "شهري",
    "yearly": "سنوي",
    "save": "وفر {percentage}%",
    "startTrial": "ابدأ التجربة المجانية",
    "choosePlan": "اختر الباقة",
    "mostPopular": "الأكثر شعبية",
    "freeMonths": "{count} أشهر مجاناً",
    "perMonth": "/ شهر",
    "perYear": "/ سنة",
    "billed": "يتم الدفع {cycle}",
    
    "starter": {
      "name": "الباقة الأساسية",
      "description": "مثالية للشركات الصغيرة",
      "features": {
        "companies": "{count} شركة",
        "users": "حتى {count} مستخدمين",
        "branches": "حتى {count} فرع",
        "storage": "{size} GB تخزين",
        "trial": "{days} يوم تجريبي"
      }
    },
    
    "professional": {
      "name": "الباقة الاحترافية",
      "description": "للشركات المتنامية",
      "features": {
        "companies": "{count} شركات",
        "users": "حتى {count} مستخدم",
        "branches": "حتى {count} فرع",
        "storage": "{size} GB تخزين",
        "trial": "{days} يوم تجريبي",
        "priority": "دعم ذو أولوية"
      }
    },
    
    "enterprise": {
      "name": "باقة المؤسسات",
      "description": "للشركات الكبيرة",
      "features": {
        "unlimited": "غير محدود",
        "whiteLabel": "White Label",
        "api": "API Access",
        "dedicated": "دعم مخصص"
      }
    }
  },
  
  "trial": {
    "title": "أنت في الفترة التجريبية",
    "daysRemaining": "متبقي {days} يوم",
    "upgrade": "ترقية الباقة",
    "expired": "انتهت الفترة التجريبية"
  },
  
  "limits": {
    "reached": "تم الوصول للحد الأقصى من {type} ({max})",
    "upgrade": "قم بترقية باقتك للحصول على المزيد"
  }
}
```

---

## 📊 أمثلة الاستخدام

### مثال 1: التحقق من السعر
```typescript
const { data: pricing } = await supabase.rpc('get_plan_pricing', {
  plan_code: 'professional',
  billing_cycle: 'yearly',
  free_months_override: 2
});

console.log(`السعر النهائي: ${pricing.final_price} ${pricing.currency}`);
console.log(`التوفير: ${pricing.total_savings} (${pricing.savings_percentage}%)`);
```

### مثال 2: التسجيل مع باقة
```typescript
const { data } = await supabase.rpc('register_new_subscriber', {
  p_user_id: user.id,
  p_user_email: 'user@example.com',
  p_user_name: 'John Doe',
  p_company_name: 'ABC Company',
  p_phone: '+966501234567',
  p_business_type: 'general',
  p_currency: 'SAR',
  p_country_code: 'SA',
  p_plan_code: 'professional'
});

if (data.success) {
  console.log(`تم التسجيل بنجاح! Trial حتى: ${data.trial_ends_at}`);
}
```

### مثال 3: التحقق من الحدود قبل الإضافة
```typescript
// قبل إضافة شركة جديدة
const { data } = await supabase.rpc('check_plan_limits', {
  p_tenant_id: tenantId,
  p_limit_type: 'companies'
});

if (data.is_limit_reached) {
  toast.error(`الحد الأقصى: ${data.max_allowed} شركة. قم بالترقية!`);
  return;
}

// متابعة الإضافة
await createCompany(newCompanyData);
```

---

## ✅ الحالة الحالية

### ✅ Backend (جاهز 100%)
- [x] جدول `subscription_plans`
- [x] جدول `promotional_discounts`
- [x] جدول `subscriptions`
- [x] دالة `get_plan_pricing()`
- [x] دالة `register_new_subscriber()` محدثة
- [x] دالة `check_plan_limits()`
- [x] دوال إدارة الباقات (CRUD)
- [x] دوال إدارة الخصومات (CRUD)
- [x] البيانات الافتراضية (3 باقات + خصم)
- [x] الاختبار الشامل

### 🔄 Frontend (قيد التطوير)
- [ ] صفحة `/pricing`
- [ ] تحديث معالج التسجيل
- [ ] خطوة اختيار الباقة
- [ ] بانر الفترة التجريبية
- [ ] التحقق من الحدود
- [ ] إدارة الباقات (Admin)
- [ ] إدارة الخصومات (Admin)
- [ ] مفاتيح الترجمة

---

## 🚀 الخطوات التالية

1. ✅ **إضافة مفاتيح الترجمة** في 9 لغات
2. ✅ **تحديث `RegistrationWizard.tsx`** لإضافة خطوة الباقة
3. ✅ **إنشاء صفحة Pricing**
4. ✅ **إضافة Trial Banner**
5. ✅ **تطبيق Plan Limits Checks**
6. ✅ **صفحات إدارة SaaS**

---

**📞 للمساعدة:** تواصل مع فريق التطوير  
**📅 آخر تحديث:** 2026-01-24  
**✍️ المطور:** Next Revolution Company
