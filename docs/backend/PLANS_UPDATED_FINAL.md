# ✅ نظام الباقات والخصومات - التحديث النهائي
# Subscription Plans & Discounts System - Final Update

**التاريخ:** 24 يناير 2026  
**الحالة:** ✅ جاهز للتنفيذ

---

## 📊 **الأسعار النهائية (بالدولار USD):**

### **Starter (الباقة الأساسية)**
```
السعر الأصلي:
- شهري: $99
- سنوي: $1,188 (99 × 12)

بعد خصم 50%:
- شهري: $49.50
- سنوي: $594 (49.50 × 12)
- سنوي مع بونص: $495 (49.50 × 10) ✅ شهرين مجاناً

الحدود:
- 1 شركة
- 5 مستخدمين
- 50 فرع
- 5 مخازن
- 10 GB

الموديولات:
- accounting, sales, purchases, inventory
```

---

### **Professional (الباقة الاحترافية)** ⭐
```
السعر الأصلي:
- شهري: $799
- سنوي: $9,588 (799 × 12)

بعد خصم 50%:
- شهري: $399.50
- سنوي: $4,794 (399.50 × 12)
- سنوي مع بونص: $3,995 (399.50 × 10) ✅ شهرين مجاناً

الحدود:
- 3 شركات
- 10 مستخدمين
- 60 فرع
- 5 مخازن
- 50 GB

الموديولات:
- accounting, sales, purchases, inventory
- hr, crm, fabric, pos
```

---

### **Enterprise (باقة المؤسسات)**
```
السعر الأصلي:
- شهري: $1,199
- سنوي: $14,388 (1,199 × 12)

بعد خصم 50%:
- شهري: $599.50
- سنوي: $7,194 (599.50 × 12)
- سنوي مع بونص: $5,995 (599.50 × 10) ✅ شهرين مجاناً

الحدود:
- شركات غير محدودة (-1)
- مستخدمين غير محدودين (-1)
- فروع غير محدودة (-1)
- مخازن غير محدودة (-1)
- 200 GB

الموديولات:
- جميع الموديولات (12 موديول)
```

---

## 🎁 **نظام الخصومات:**

### **جدول `promotional_discounts`:**

```sql
{
  code: 'LAUNCH_50',
  name_ar: 'خصم الإطلاق 50%',
  name_en: 'Launch Sale 50%',
  discount_percentage: 50,
  valid_from: '2026-01-01',
  valid_to: '2026-12-31',
  applicable_plans: [], // جميع الباقات
  applies_to: 'both', // شهري + سنوي
  is_active: true,
  auto_apply: true,
  priority: 100
}
```

**الحقول المتاحة:**
- ✅ دعم 9 لغات (name_ar, name_en, name_de, ...)
- ✅ تحديد الباقات المشمولة
- ✅ تطبيق على الشهري أو السنوي أو كليهما
- ✅ تفعيل/تعطيل
- ✅ تطبيق تلقائي
- ✅ أولوية (priority)

---

## 🔧 **الدوال الرئيسية:**

### **1. get_plan_pricing()**

```sql
-- حساب السعر النهائي مع الخصومات
SELECT get_plan_pricing('starter', 'monthly', 2);

-- المعاملات:
-- 1. plan_code: 'starter', 'professional', 'enterprise'
-- 2. billing_cycle: 'monthly' أو 'yearly'
-- 3. free_months: عدد الأشهر المجانية للسنوي (افتراضي: 2)

-- النتيجة:
{
  "success": true,
  "plan_code": "starter",
  "plan_name_ar": "الباقة الأساسية",
  "billing_cycle": "yearly",
  "currency": "USD",
  
  "original_price": 1188.00,
  "monthly_after_promo": 49.50,
  "final_price": 495.00,
  
  "promo_discount": 50,
  "promo_name_ar": "خصم الإطلاق 50%",
  "free_months": 2,
  "months_paid": 10,
  
  "total_savings": 693.00,
  "savings_percentage": 58.33
}
```

---

### **2. create_promotional_discount()**

```sql
-- إنشاء خصم جديد (Platform Owner فقط)
SELECT create_promotional_discount(
    'SUMMER_30',               -- code
    'خصم الصيف 30%',          -- name_ar
    'Summer Sale 30%',         -- name_en
    30,                        -- discount_percentage
    '2026-06-01'::TIMESTAMPTZ, -- valid_from
    '2026-08-31'::TIMESTAMPTZ, -- valid_to
    '[]'::jsonb,               -- applicable_plans ([] = all)
    'both',                    -- applies_to
    true,                      -- auto_apply
    50                         -- priority
);
```

---

### **3. update_promotional_discount()**

```sql
-- تحديث خصم موجود
SELECT update_promotional_discount(
    'discount-uuid-here',      -- discount_id
    p_discount_percentage := 40,
    p_is_active := true
);
```

---

### **4. get_promotional_discounts()**

```sql
-- الحصول على جميع الخصومات
SELECT * FROM get_promotional_discounts(true); -- النشطة فقط
SELECT * FROM get_promotional_discounts(false); -- الكل
```

---

## 📝 **أمثلة الحسابات:**

### **Starter - شهري:**
```
$99 (أصلي) × 50% خصم = $49.50/شهر ✅
```

### **Starter - سنوي:**
```
$1,188 (أصلي) → $49.50/شهر (بعد خصم 50%)
$49.50 × 10 أشهر = $495/سنة ✅
شهرين مجاناً 🎁
توفير: $693 (58.33%)
```

### **Professional - شهري:**
```
$799 (أصلي) × 50% خصم = $399.50/شهر ✅
```

### **Professional - سنوي:**
```
$9,588 (أصلي) → $399.50/شهر (بعد خصم 50%)
$399.50 × 10 أشهر = $3,995/سنة ✅
توفير: $5,593 (58.33%)
```

### **Enterprise - سنوي:**
```
$14,388 (أصلي) → $599.50/شهر (بعد خصم 50%)
$599.50 × 10 أشهر = $5,995/سنة ✅
توفير: $8,393 (58.33%)
```

---

## 🎨 **عرض الأسعار في Frontend:**

```typescript
// Pricing Card Component
<PricingCard>
  <h3>Professional Plan</h3>
  
  {/* الأسعار */}
  <div className="pricing">
    {/* شهري */}
    <div className="monthly">
      <span className="original line-through">$799</span>
      <Badge>50% OFF</Badge>
      <span className="final">$399.50/mo</span>
    </div>
    
    {/* سنوي */}
    <div className="yearly">
      <span className="original line-through">$9,588/yr</span>
      <Badge>50% OFF + 2 Months Free</Badge>
      <span className="final">$3,995/yr</span>
      <span className="savings">Save $5,593 (58%)</span>
      <span className="per-month">($333/mo)</span>
    </div>
  </div>
  
  {/* الميزات */}
  <ul>
    <li>✅ 3 شركات</li>
    <li>✅ 10 مستخدمين</li>
    <li>✅ 60 فرع</li>
    <li>✅ جميع الموديولات</li>
  </ul>
  
  <Button>ابدأ الآن</Button>
</PricingCard>
```

---

## 🔄 **كيفية استخدام الخصومات:**

### **Frontend - عرض الأسعار:**

```typescript
const { data: pricingData } = await supabase.rpc('get_plan_pricing', {
  p_plan_code: 'professional',
  p_billing_cycle: 'yearly',
  p_free_months: 2
});

if (pricingData.success) {
  return (
    <div>
      <h3>{pricingData.plan_name_ar}</h3>
      <p className="original">${pricingData.original_price}</p>
      
      {pricingData.promo_discount > 0 && (
        <Badge>{pricingData.promo_name_ar}</Badge>
      )}
      
      <p className="final">${pricingData.final_price}</p>
      <p className="savings">
        وفّر ${pricingData.total_savings} ({pricingData.savings_percentage}%)
      </p>
      
      {pricingData.free_months > 0 && (
        <Badge>🎁 {pricingData.free_months} شهر مجاناً</Badge>
      )}
    </div>
  );
}
```

---

### **Platform Owner - إدارة الخصومات:**

```typescript
// صفحة /saas/settings/discounts
export function DiscountsManagement() {
  const handleCreate = async (data: DiscountFormData) => {
    const { data: result, error } = await supabase.rpc(
      'create_promotional_discount',
      {
        p_code: data.code,
        p_name_ar: data.nameAr,
        p_name_en: data.nameEn,
        p_discount_percentage: data.percentage,
        p_valid_from: data.validFrom,
        p_valid_to: data.validTo,
        p_applicable_plans: data.plans || [],
        p_applies_to: data.appliesTo,
        p_auto_apply: true,
        p_priority: data.priority || 0
      }
    );

    if (!error && result.success) {
      toast.success('تم إنشاء الخصم بنجاح');
    }
  };

  return (
    <div>
      <Button onClick={() => setIsCreating(true)}>
        إضافة خصم جديد
      </Button>
      
      <NexaTable
        data={discounts}
        columns={[
          { header: 'الكود', accessorKey: 'code' },
          { header: 'الاسم', accessorKey: 'name_ar' },
          { header: 'النسبة', accessorKey: 'discount_percentage' },
          { header: 'من', accessorKey: 'valid_from' },
          { header: 'إلى', accessorKey: 'valid_to' },
          {
            header: 'الحالة',
            cell: ({ row }) => (
              <Switch
                checked={row.original.is_active}
                onCheckedChange={(checked) =>
                  handleToggle(row.original.id, checked)
                }
              />
            )
          }
        ]}
      />
    </div>
  );
}
```

---

## 📋 **الترجمات المطلوبة:**

### **في `src/i18n/locales/ar.json`:**
```json
{
  "pricing": {
    "title": "الباقات والأسعار",
    "monthly": "شهرياً",
    "yearly": "سنوياً",
    "perMonth": "/شهر",
    "perYear": "/سنة",
    "save": "وفّر",
    "freeMonths": "شهر مجاناً",
    "discount": "خصم",
    "originalPrice": "السعر الأصلي",
    "finalPrice": "السعر النهائي",
    "getStarted": "ابدأ الآن",
    "mostPopular": "الأكثر شيوعاً",
    
    "starter": {
      "name": "الباقة الأساسية",
      "description": "مثالية للشركات الصغيرة",
      "companies": "شركة واحدة",
      "users": "5 مستخدمين"
    },
    
    "professional": {
      "name": "الباقة الاحترافية",
      "description": "للشركات المتوسطة",
      "companies": "3 شركات",
      "users": "10 مستخدمين"
    },
    
    "enterprise": {
      "name": "باقة المؤسسات",
      "description": "للشركات الكبيرة",
      "companies": "غير محدود",
      "users": "غير محدود"
    }
  },
  
  "discounts": {
    "title": "إدارة الخصومات",
    "add": "إضافة خصم",
    "edit": "تعديل خصم",
    "code": "الكود",
    "name": "الاسم",
    "percentage": "النسبة",
    "validFrom": "من تاريخ",
    "validTo": "إلى تاريخ",
    "appliesTo": "يطبق على",
    "both": "شهري وسنوي",
    "monthly": "شهري فقط",
    "yearly": "سنوي فقط",
    "active": "نشط",
    "priority": "الأولوية"
  }
}
```

---

## ✅ **الملفات المُحدّثة:**

1. ✅ `STEP_45_subscription_plans_system.sql`
   - الأسعار بالدولار (USD)
   - جدول `promotional_discounts`
   - دالة `get_plan_pricing()`
   - دوال إدارة الخصومات

2. ✅ `test_subscription_plans.sql`
   - 11 اختبار شامل
   - اختبارات الأسعار مع الخصومات
   - جداول المقارنة

3. ✅ `PLANS_UPDATED_FINAL.md` (هذا الملف)
   - التوثيق الكامل
   - الأمثلة والأكواد
   - دليل Frontend

---

## 🚀 **خطوات التنفيذ:**

### **1. تنفيذ Backend:**
```bash
# في Supabase Dashboard → SQL Editor
# نسخ ولصق STEP_45_subscription_plans_system.sql
# ثم Run ✅
```

### **2. الاختبار:**
```bash
# نسخ ولصق test_subscription_plans.sql
# ثم Run ✅
```

### **3. Frontend (لاحقاً):**
- صفحة `/pricing`
- لوحة إدارة الخصومات
- تكامل مع Registration

---

## 📊 **ملخص نهائي:**

| الباقة | شهري (أصلي) | شهري (50%) | سنوي (10 أشهر) | التوفير |
|--------|-------------|-----------|----------------|---------|
| **Starter** | $99 | $49.50 | $495 | 58.33% |
| **Professional** | $799 | $399.50 | $3,995 | 58.33% |
| **Enterprise** | $1,199 | $599.50 | $5,995 | 58.33% |

---

**✅ Backend جاهز 100%!** 🎉
