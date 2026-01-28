# 🎯 نظام الباقات والاشتراكات - تحليل وخطة التنفيذ
# Subscription Plans System - Analysis & Implementation Plan

**التاريخ:** 24 يناير 2026  
**الحالة:** موجود في Backend - يحتاج إلى تفعيل وربط مع التسجيل

---

## 📊 **الوضع الحالي:**

### **✅ الجداول الموجودة:**

```sql
1. subscription_plans
   ├─ max_companies (عدد الشركات المسموح بها)
   ├─ max_users
   ├─ included_modules
   ├─ features
   ├─ price_monthly / price_yearly
   ├─ trial_days (فترة تجريبية)
   └─ is_active

2. subscriptions
   ├─ tenant_id (مرتبط بالـ Tenant)
   ├─ plan_id (الباقة المختارة)
   ├─ status (trial, active, cancelled, expired)
   ├─ trial_ends_at
   └─ current_period_start/end

3. tenant_modules
   ├─ tenant_id
   ├─ module_code
   ├─ is_active
   └─ expires_at
```

---

## 🎯 **الهيكلية المقترحة:**

### **3 باقات رئيسية:**

| الباقة | الكود | الشركات | المستخدمين | السعر/شهر | الفترة التجريبية |
|-------|-------|---------|------------|-----------|------------------|
| **Starter** | `starter` | 1 | 5 | 299 ر.س | 14 يوم |
| **Professional** | `professional` | 3 | 15 | 799 ر.س | 14 يوم |
| **Enterprise** | `enterprise` | 10 | 50 | 1,999 ر.س | 30 يوم |

---

## 🔄 **Flow المقترح للتسجيل:**

### **Option A: اختيار الباقة في البداية (موصى به)** ⭐

```
1. صفحة Pricing (/pricing)
   ├─ عرض 3 باقات
   ├─ مقارنة الميزات
   └─ زر "ابدأ الآن" لكل باقة
   ↓
2. Register (/register?plan=professional)
   ├─ Email, Password, Name
   ├─ الباقة محددة مسبقاً (من URL)
   └─ "تسجيل"
   ↓
3. Registration Wizard (/registration-wizard)
   ├─ Step 1: Business Type
   ├─ Step 2: Company Info
   ├─ Step 3: Fiscal Settings
   └─ "إكمال"
   ↓
4. Backend (register_new_subscriber)
   ├─ ينشئ Tenant
   ├─ ينشئ Subscription (trial)
   ├─ يطبق حدود الباقة
   ├─ ينشئ Company واحدة
   └─ يفعّل الموديولات حسب الباقة
   ↓
5. Dashboard
   ├─ Banner: "فترة تجريبية: 14 يوم متبقية"
   └─ جميع الميزات متاحة
```

### **Option B: اختيار الباقة بعد التسجيل**

```
1. Register → Wizard (بدون باقة)
   ↓
2. Dashboard
   ↓
3. Choose Plan Page (/choose-plan)
   ↓
4. يختار الباقة ويبدأ Trial
```

**التوصية:** Option A أفضل ✅

---

## 📝 **التعديلات المطلوبة:**

### **1. تحديث `register_new_subscriber()`**

إضافة parameter للباقة:

```sql
CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter'  -- ✅ جديد
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
    v_trial_days INT;
BEGIN
    -- 1. إنشاء Tenant
    v_tenant_id := create_new_tenant(...);
    
    -- 2. الحصول على Plan ID
    SELECT id, trial_days INTO v_plan_id, v_trial_days
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true;
    
    IF v_plan_id IS NULL THEN
        v_plan_id := (SELECT id FROM subscription_plans 
                      WHERE code = 'starter' LIMIT 1);
    END IF;
    
    -- 3. إنشاء Subscription (trial)
    INSERT INTO subscriptions (
        tenant_id,
        plan_id,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end
    )
    VALUES (
        v_tenant_id,
        v_plan_id,
        'trial',
        NOW() + (v_trial_days || ' days')::INTERVAL,
        NOW(),
        NOW() + (v_trial_days || ' days')::INTERVAL
    )
    RETURNING id INTO v_subscription_id;
    
    -- 4. إنشاء Company
    v_company_id := create_default_company_for_tenant(...);
    
    -- 5. تفعيل الموديولات حسب الباقة
    INSERT INTO tenant_modules (tenant_id, module_code, is_active)
    SELECT 
        v_tenant_id,
        module_code,
        true
    FROM modules
    WHERE module_code = ANY(
        SELECT jsonb_array_elements_text(included_modules)
        FROM subscription_plans
        WHERE id = v_plan_id
    );
    
    -- 6. إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'subscription_id', v_subscription_id,
        'plan_code', p_plan_code,
        'trial_ends_at', NOW() + (v_trial_days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;
```

### **2. إنشاء الباقات الافتراضية**

```sql
-- إنشاء Product أولاً
INSERT INTO saas_products (code, name_ar, name_en, description, is_active)
VALUES (
    'erp-saas',
    'نظام ERP',
    'ERP System',
    'نظام إدارة موارد المؤسسات',
    true
)
ON CONFLICT (code) DO NOTHING
RETURNING id;

-- إنشاء الباقات
INSERT INTO subscription_plans (
    product_id,
    code,
    name_ar,
    name_en,
    description,
    max_users,
    max_companies,
    price_monthly,
    price_yearly,
    currency,
    trial_days,
    is_popular,
    display_order,
    included_modules,
    features
)
VALUES
    -- Starter
    (
        (SELECT id FROM saas_products WHERE code = 'erp-saas'),
        'starter',
        'الباقة الأساسية',
        'Starter Plan',
        'مثالية للشركات الصغيرة',
        5,   -- max_users
        1,   -- max_companies ✅
        299, -- price_monthly
        2990, -- price_yearly (خصم 17%)
        'SAR',
        14,  -- trial_days
        false,
        1,
        '["accounting", "sales", "purchases", "inventory"]'::jsonb,
        '{
            "export_pdf": false,
            "export_excel": false,
            "multi_currency": false,
            "advanced_reports": false
        }'::jsonb
    ),
    -- Professional
    (
        (SELECT id FROM saas_products WHERE code = 'erp-saas'),
        'professional',
        'الباقة الاحترافية',
        'Professional Plan',
        'للشركات المتوسطة',
        15,  -- max_users
        3,   -- max_companies ✅
        799,
        7990,
        'SAR',
        14,
        true, -- is_popular
        2,
        '["accounting", "sales", "purchases", "inventory", "hr", "crm", "fabric"]'::jsonb,
        '{
            "export_pdf": true,
            "export_excel": true,
            "multi_currency": true,
            "advanced_reports": true
        }'::jsonb
    ),
    -- Enterprise
    (
        (SELECT id FROM saas_products WHERE code = 'erp-saas'),
        'enterprise',
        'باقة الأعمال',
        'Enterprise Plan',
        'للشركات الكبيرة',
        50,  -- max_users
        10,  -- max_companies ✅
        1999,
        19990,
        'SAR',
        30,  -- trial_days
        false,
        3,
        '["accounting", "sales", "purchases", "inventory", "hr", "crm", "fabric", "healthcare", "exchange"]'::jsonb,
        '{
            "export_pdf": true,
            "export_excel": true,
            "multi_currency": true,
            "advanced_reports": true,
            "api_access": true,
            "white_label": true,
            "priority_support": true
        }'::jsonb
    )
ON CONFLICT (product_id, code) DO UPDATE SET
    max_companies = EXCLUDED.max_companies,
    included_modules = EXCLUDED.included_modules;
```

### **3. دالة للتحقق من حدود الباقة**

```sql
CREATE OR REPLACE FUNCTION check_plan_limits(
    p_tenant_id UUID,
    p_limit_type VARCHAR(50) -- 'companies', 'users', 'modules'
)
RETURNS JSONB AS $$
DECLARE
    v_plan_id UUID;
    v_max_companies INT;
    v_current_companies INT;
    v_max_users INT;
    v_current_users INT;
BEGIN
    -- الحصول على الباقة الحالية
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('trial', 'active')
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'لا يوجد اشتراك نشط'
        );
    END IF;
    
    -- التحقق من حدود الشركات
    IF p_limit_type = 'companies' THEN
        SELECT max_companies INTO v_max_companies
        FROM subscription_plans
        WHERE id = v_plan_id;
        
        SELECT COUNT(*) INTO v_current_companies
        FROM companies
        WHERE tenant_id = p_tenant_id;
        
        RETURN jsonb_build_object(
            'allowed', v_current_companies < v_max_companies,
            'current', v_current_companies,
            'max', v_max_companies,
            'remaining', v_max_companies - v_current_companies
        );
    END IF;
    
    -- التحقق من حدود المستخدمين
    IF p_limit_type = 'users' THEN
        SELECT max_users INTO v_max_users
        FROM subscription_plans
        WHERE id = v_plan_id;
        
        SELECT COUNT(*) INTO v_current_users
        FROM user_profiles
        WHERE tenant_id = p_tenant_id;
        
        RETURN jsonb_build_object(
            'allowed', v_current_users < v_max_users,
            'current', v_current_users,
            'max', v_max_users,
            'remaining', v_max_users - v_current_users
        );
    END IF;
    
    RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 **Frontend Changes:**

### **1. صفحة Pricing (/pricing)**

```typescript
// src/features/saas/Pricing.tsx
const plans = [
  {
    code: 'starter',
    name: 'الباقة الأساسية',
    price: 299,
    companies: 1,
    users: 5,
    trial: 14
  },
  {
    code: 'professional',
    name: 'الباقة الاحترافية',
    price: 799,
    companies: 3,
    users: 15,
    trial: 14,
    popular: true
  },
  {
    code: 'enterprise',
    name: 'باقة الأعمال',
    price: 1999,
    companies: 10,
    users: 50,
    trial: 30
  }
];

// عند الضغط على "ابدأ الآن"
navigate(`/register?plan=${plan.code}`);
```

### **2. تحديث Register.tsx**

```typescript
// استقبال plan من URL
const searchParams = new URLSearchParams(location.search);
const selectedPlan = searchParams.get('plan') || 'starter';

// تمرير الباقة للـ RegistrationWizard
```

### **3. تحديث RegistrationWizard.tsx**

```typescript
// إرسال plan_code للـ RPC
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: user.id,
  p_user_email: formData.email,
  p_user_name: user?.user_metadata?.full_name,
  p_company_name: formData.companyName,
  p_phone: formData.phone,
  p_business_type: formData.businessType,
  p_currency: formData.localCurrency,
  p_country_code: formData.country,
  p_plan_code: selectedPlan // ✅ جديد
});
```

### **4. Trial Banner في Dashboard**

```typescript
// عرض الفترة التجريبية المتبقية
const subscription = useSubscription();

{subscription.status === 'trial' && (
  <Alert>
    <Clock className="h-4 w-4" />
    <AlertTitle>فترة تجريبية</AlertTitle>
    <AlertDescription>
      متبقي {subscription.trial_days_remaining} يوم
    </AlertDescription>
  </Alert>
)}
```

---

## 📋 **خطة التنفيذ (بالترتيب):**

### **Phase 1: Backend (1-2 ساعة)**
- [ ] إنشاء الباقات الثلاثة في Database
- [ ] تحديث `register_new_subscriber()` لدعم الباقات
- [ ] إنشاء `check_plan_limits()`
- [ ] اختبار في Supabase

### **Phase 2: Frontend - Pricing Page (1 ساعة)**
- [ ] إنشاء `/pricing` page
- [ ] عرض الباقات الثلاثة
- [ ] ربط مع `/register?plan=X`

### **Phase 3: Frontend - Registration (30 دقيقة)**
- [ ] تحديث Register لاستقبال plan من URL
- [ ] تحديث Wizard لإرسال plan_code
- [ ] اختبار التسجيل مع باقات مختلفة

### **Phase 4: Frontend - Dashboard (30 دقيقة)**
- [ ] عرض Trial Banner
- [ ] عرض حدود الباقة (X/3 companies)
- [ ] منع إنشاء شركة إذا وصل للحد

### **Phase 5: Testing (1 ساعة)**
- [ ] تسجيل مستخدم بـ Starter (1 شركة)
- [ ] تسجيل مستخدم بـ Professional (3 شركات)
- [ ] محاولة تجاوز الحد
- [ ] التحقق من Trial Period

---

## 🎯 **الخلاصة:**

### **✅ الموجود:**
- نظام باقات كامل في Backend
- جدول subscriptions جاهز
- نظام trial periods

### **⏳ المطلوب:**
- ربط التسجيل بالباقات
- صفحة Pricing
- تطبيق حدود الباقات

### **💡 التوصية:**
**نبدأ بـ Phase 1 (Backend)** - ننشئ الباقات ونحدث الدالة، ثم نختبرها قبل الانتقال للـ Frontend.

---

**هل نبدأ بإنشاء الباقات وتحديث النظام؟** 🚀
