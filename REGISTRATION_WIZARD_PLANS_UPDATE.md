# 🚀 تحديث معالج التسجيل - إضافة خطوة اختيار الباقة

**التاريخ:** 2026-01-24  
**الحالة:** ✅ تم التحديث بنجاح

---

## ✅ ما تم تنفيذه

### 1️⃣ **تحديث `RegistrationWizard.tsx`**

#### التغييرات الرئيسية:

1. **إضافة حقول جديدة في الـ Interface:**
```typescript
interface CompanyFormData {
  // ... الحقول الموجودة
  selectedPlan: string; // 🆕 الباقة المختارة
  billingCycle: 'monthly' | 'yearly'; // 🆕 دورة الفوترة
}
```

2. **قراءة الباقة من URL:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const planFromUrl = params.get('plan');
  if (planFromUrl && ['starter', 'professional', 'enterprise'].includes(planFromUrl)) {
    setFormData(prev => ({
      ...prev,
      selectedPlan: planFromUrl
    }));
  }
}, []);
```

3. **زيادة عدد الخطوات إلى 4:**
```typescript
const totalSteps = 4; // كان 3
```

4. **إضافة Step 4 - اختيار الباقة:**
```typescript
const renderStep4 = () => {
  // يعرض 3 كروت للباقات
  // تبديل شهري/سنوي
  // عرض الأسعار مع الخصم
  // يمكن الاختيار بالضغط على الكرت
};
```

5. **تحديث handleSubmit لإرسال الباقة:**
```typescript
const { data, error } = await supabase.rpc('register_new_subscriber', {
  // ... البارامترات الموجودة
  p_plan_code: formData.selectedPlan // 🆕
});
```

---

## 🎨 مميزات الخطوة الجديدة

### الباقات المعروضة:

#### 1️⃣ **الباقة الأساسية (Starter)**
- 💵 شهري: ~~$99~~ **$49.50** (خصم 50%)
- 💵 سنوي: ~~$1,188~~ **$495** (خصم 58%)
- ✅ 1 شركة
- ✅ 5 مستخدمين
- ✅ 50 فرع
- ✅ 10 GB تخزين
- 🎁 14 يوم تجريبي

#### 2️⃣ **الباقة الاحترافية (Professional)** ⭐ الأكثر شعبية
- 💵 شهري: ~~$799~~ **$399.50** (خصم 50%)
- 💵 سنوي: ~~$9,588~~ **$3,995** (خصم 58%)
- ✅ 3 شركات
- ✅ 20 مستخدم
- ✅ 200 فرع
- ✅ 100 GB تخزين
- 🎁 30 يوم تجريبي
- 🔥 دعم ذو أولوية

#### 3️⃣ **باقة المؤسسات (Enterprise)**
- 💵 شهري: ~~$1,199~~ **$599.50** (خصم 50%)
- 💵 سنوي: ~~$14,388~~ **$5,995** (خصم 58%)
- ✅ غير محدود
- ✅ 500 GB تخزين
- 🎁 30 يوم تجريبي
- 🏢 White Label
- 🔌 API Access
- 👨‍💼 دعم مخصص

---

## 🎯 سير العمل الجديد

### الخطوة 1: التسجيل الأساسي
- الاسم، البريد، كلمة المرور

### الخطوة 2: نوع العمل
- اختيار نوع العمل (General, Fabric, Exchange, Healthcare, E-commerce)
- اسم الشركة

### الخطوة 3: معلومات الشركة
- الدولة، المدينة، العنوان
- الهاتف، البريد، الموقع

### الخطوة 4: الإعدادات المالية
- العملة المحلية
- العملة الرئيسية
- بداية السنة المالية

### ✨ الخطوة 5: اختيار الباقة (جديد)
1. **تبديل شهري/سنوي:**
   - زر تبديل بين الدورتين
   - عرض نسبة التوفير (58% للسنوي)

2. **عرض الباقات:**
   - 3 كروت جنباً إلى جنب
   - السعر الأصلي مشطوب
   - السعر بعد الخصم بخط كبير
   - شارة "الأكثر شعبية" للباقة الاحترافية
   - علامة صح عند الاختيار

3. **الميزات:**
   - قائمة ميزات كل باقة
   - أيقونة صح خضراء لكل ميزة

4. **ملاحظة:**
   - إشعار أن الباقة قابلة للتغيير لاحقاً

---

## 📝 مفاتيح الترجمة المضافة

تم إنشاء ملفين منفصلين للترجمات:
- `wizard_plans_translations_ar.json` (العربية)
- `wizard_plans_translations_en.json` (الإنجليزية)

### يجب دمجها في ملفات اللغات الرئيسية:

```bash
# في src/i18n/locales/ar.json
# إضافة محتوى wizard_plans_translations_ar.json

# في src/i18n/locales/en.json
# إضافة محتوى wizard_plans_translations_en.json

# وباقي اللغات (de, tr, ru, uk, it, pl, ro)
```

---

## 🔗 التكامل مع Backend

### عند الضغط على "إكمال":
```typescript
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: user.id,
  p_user_email: 'user@example.com',
  p_user_name: 'John Doe',
  p_company_name: 'ABC Company',
  p_phone: '+966501234567',
  p_business_type: 'general',
  p_currency: 'SAR',
  p_country_code: 'SA',
  p_plan_code: 'professional' // 🆕 الباقة المختارة
});

if (data.success) {
  // يتم إنشاء:
  // 1. Tenant
  // 2. Company
  // 3. Subscription مرتبطة بالباقة
  // 4. Trial period
  
  // ثم إعادة التوجيه للـ Dashboard
  navigate('/');
}
```

---

## ✅ الاختبار المطلوب

### 1️⃣ **اختبار التسجيل بدون باقة في URL:**
```
/register
→ يجب أن يختار "starter" افتراضياً
```

### 2️⃣ **اختبار التسجيل مع باقة في URL:**
```
/register?plan=professional
→ يجب أن يظهر "professional" محدد في الخطوة 5
```

### 3️⃣ **اختبار التبديل بين شهري/سنوي:**
```
- الضغط على "سنوي" يجب أن يعرض الأسعار السنوية
- الضغط على "شهري" يجب أن يعرض الأسعار الشهرية
```

### 4️⃣ **اختبار اختيار الباقة:**
```
- الضغط على أي كرت يجب أن يضع علامة صح
- إلغاء اختيار باقة سابقة عند اختيار جديدة
```

### 5️⃣ **اختبار التسجيل الكامل:**
```
1. تعبئة جميع الخطوات
2. اختيار باقة
3. الضغط على "إكمال"
4. التحقق من إنشاء Subscription بالباقة الصحيحة
5. التحقق من Trial period
```

---

## 📊 البيانات المتوقعة بعد التسجيل

```sql
-- في جدول subscriptions
SELECT * FROM subscriptions WHERE tenant_id = 'new-tenant-uuid';

-- النتيجة المتوقعة:
{
  "id": "subscription-uuid",
  "tenant_id": "tenant-uuid",
  "plan_id": "plan-uuid", -- plan_code = 'professional'
  "status": "trial",
  "trial_ends_at": "2026-02-23", -- بعد 30 يوم
  "billing_cycle": "monthly",
  "price_paid": null, -- لم يدفع بعد
  "currency": "USD"
}
```

---

## 🎯 الخطوات التالية

### بعد التحقق من عمل المعالج:

1. ✅ **دمج مفاتيح الترجمة** في جميع ملفات اللغات
2. ✅ **إنشاء صفحة `/pricing`** لعرض الباقات قبل التسجيل
3. ✅ **إضافة Trial Banner** في Dashboard
4. ✅ **تطبيق Plan Limits Checks** عند إضافة شركات/مستخدمين
5. ✅ **صفحات إدارة SaaS** (Plans & Discounts)

---

## 📞 للمساعدة

إذا واجهت أي مشكلة:
1. تحقق من وجود مفاتيح الترجمة
2. تحقق من أن Backend function يقبل `p_plan_code`
3. تحقق من الـ console للأخطاء
4. راجع الـ network tab في DevTools

---

**✍️ تم التحديث بواسطة:** Next Revolution Company  
**📅 التاريخ:** 2026-01-24
