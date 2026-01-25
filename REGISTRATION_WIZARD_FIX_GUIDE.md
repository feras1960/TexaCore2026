# 🎯 دليل إصلاح معالج التسجيل - Registration Wizard Fix Guide

## 📋 الملخص

تم إصلاح مشكلتين رئيسيتين في **معالج التسجيل**:

### ✅ المشكلة 1: خطأ 404 في Backend
```
PGRST202: Function register_new_subscriber not found in schema cache
```

### ✅ المشكلة 2: عدم وجود Validation قوي
كان المستخدم يستطيع الانتقال بين الخطوات دون إدخال البيانات المطلوبة.

---

## 🔧 الحلول المطبقة

### 1️⃣ إصلاح Backend Function

**الملف:** `FIX_REGISTER_FUNCTION_COMPLETE.sql`

**ما يفعله:**
1. حذف الدالة القديمة بكل إصداراتها
2. إعادة إنشاء `register_new_subscriber` بـ signature صحيح:
   ```sql
   register_new_subscriber(
     p_user_id UUID,
     p_user_email VARCHAR,
     p_user_name VARCHAR,
     p_company_name VARCHAR,
     p_phone VARCHAR,          ← جديد
     p_business_type VARCHAR,  ← جديد
     p_currency VARCHAR,       ← جديد
     p_country_code VARCHAR    ← جديد
   )
   ```
3. منح الصلاحيات لـ `authenticated` و `anon`
4. عرض تقرير تأكيد

**كيفية التنفيذ:**
```bash
1. افتح Supabase SQL Editor
2. افتح FIX_REGISTER_FUNCTION_COMPLETE.sql في Cursor
3. انسخ محتواه كاملاً (Cmd+A → Cmd+C)
4. الصق في Supabase SQL Editor
5. اضغط RUN ▶️
```

**النتيجة المتوقعة:**
```
✅ اكتمل إصلاح الدالة بنجاح!
📊 التحقق من الدالة:
  ✅ Function: register_new_subscriber
  ✅ Parameters: p_user_id uuid, p_user_email character varying, ...
  ✅ Returns: jsonb

📊 التحقق من الصلاحيات:
  ✅ authenticated: EXECUTE
  ✅ anon: EXECUTE

🎉 يمكنك الآن اختبار التسجيل من Frontend!
```

---

### 2️⃣ تحسين Frontend Validation

**الملف المُعدّل:** `src/features/auth/RegistrationWizard.tsx`

#### التحديثات:

##### أ) Step 1: نوع العمل واسم الشركة
```typescript
✅ التحقق من اختيار نوع العمل
✅ التحقق من إدخال اسم الشركة (لا يسمح بمسافات فارغة)
✅ رسائل خطأ واضحة باللغة المختارة
```

##### ب) Step 2: معلومات الشركة
```typescript
✅ التحقق من اختيار الدولة (dropdown)
✅ التحقق من إدخال المدينة
✅ التحقق من إدخال البريد الإلكتروني
✅ التحقق من صحة صيغة البريد الإلكتروني (email validation)
```

##### ج) Step 3: الإعدادات المالية
```typescript
✅ التحقق من اختيار العملة المحلية
✅ التحقق من اختيار العملة الرئيسية
```

#### الكود المُحسّن:

```typescript
const handleNext = () => {
  // Step 1 Validation
  if (currentStep === 1) {
    if (!formData.businessType) {
      toast.error(t('wizard.selectBusinessType') || 'الرجاء اختيار نوع العمل');
      return;
    }
    if (!formData.companyName || formData.companyName.trim() === '') {
      toast.error(t('wizard.companyNameRequired') || 'الرجاء إدخال اسم الشركة');
      return;
    }
  }
  
  // Step 2 Validation
  if (currentStep === 2) {
    if (!formData.country) {
      toast.error(t('wizard.countryRequired') || 'الرجاء اختيار الدولة');
      return;
    }
    if (!formData.city || formData.city.trim() === '') {
      toast.error(t('wizard.cityRequired') || 'الرجاء إدخال المدينة');
      return;
    }
    if (!formData.email || formData.email.trim() === '') {
      toast.error(t('wizard.emailRequired') || 'الرجاء إدخال البريد الإلكتروني');
      return;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('wizard.emailInvalid') || 'البريد الإلكتروني غير صحيح');
      return;
    }
  }
  
  // Step 3 Validation
  if (currentStep === 3) {
    if (!formData.localCurrency) {
      toast.error(t('wizard.localCurrencyRequired') || 'الرجاء اختيار العملة المحلية');
      return;
    }
    if (!formData.mainCurrency) {
      toast.error(t('wizard.mainCurrencyRequired') || 'الرجاء اختيار العملة الرئيسية');
      return;
    }
  }
  
  // إذا مر كل شيء بنجاح، انتقل للخطوة التالية
  setCurrentStep(prev => Math.min(prev + 1, totalSteps));
};
```

---

## 🎨 Visual Feedback للمستخدم

### ✅ الحقول المطلوبة
جميع الحقول المطلوبة تحتوي على علامة `*`:

```tsx
<Label>
  {t('wizard.companyName')} *
</Label>
```

### ✅ رسائل Toast
عند محاولة الانتقال بدون إدخال بيانات:

```
❌ الرجاء اختيار نوع العمل
❌ الرجاء إدخال اسم الشركة
❌ الرجاء اختيار الدولة
❌ الرجاء إدخال المدينة
❌ الرجاء إدخال البريد الإلكتروني
❌ البريد الإلكتروني غير صحيح
❌ الرجاء اختيار العملة المحلية
❌ الرجاء اختيار العملة الرئيسية
```

### ✅ رسائل مساعدة (Hints)
```tsx
{!formData.companyName && (
  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
    <Info className="w-3 h-3" />
    {t('wizard.companyNameHint')}
  </p>
)}
```

---

## 📊 خطوات الاختبار

### 1️⃣ اختبار Backend

```bash
# في Supabase SQL Editor
SELECT register_new_subscriber(
  '65a5c73b-bb93-4c84-8ba8-155079b8736c'::UUID,
  'test@example.com',
  'Test User',
  'Test Company',
  '+966500000000',
  'fabric',
  'SAR',
  'SA'
);
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "tenant_id": "...",
  "company_id": "...",
  "testing_company_id": "...",
  "business_type": "fabric",
  "message": "تم إنشاء شركتين: حقيقية وتجريبية"
}
```

---

### 2️⃣ اختبار Frontend

#### Test Case 1: محاولة الانتقال من Step 1 بدون بيانات
```
✅ يجب أن تظهر رسالة خطأ
✅ لا ينتقل للخطوة التالية
```

#### Test Case 2: محاولة الانتقال من Step 2 ببريد إلكتروني خطأ
```
✅ يجب أن تظهر رسالة "البريد الإلكتروني غير صحيح"
✅ لا ينتقل للخطوة التالية
```

#### Test Case 3: إكمال التسجيل بنجاح
```
1. Step 1: اختر "أقمشة" + اسم الشركة
2. Step 2: اختر الدولة + المدينة + البريد الصحيح
3. Step 3: اختر العملات
4. اضغط "إكمال"

المتوقع:
✅ رسالة نجاح
✅ انتقال للصفحة الرئيسية
✅ إنشاء شركتين (حقيقية + تجريبية)
```

---

## 🚀 خطوات التنفيذ السريعة

### 1️⃣ إصلاح Backend (5 دقائق)
```bash
1. افتح Supabase Dashboard
2. SQL Editor → New Query
3. افتح FIX_REGISTER_FUNCTION_COMPLETE.sql في Cursor
4. انسخ محتواه (Cmd+A → Cmd+C)
5. الصق في Supabase (Cmd+V)
6. RUN ▶️
7. انتظر رسالة النجاح ✅
```

### 2️⃣ مسح Cache في المتصفح (1 دقيقة)
```bash
1. اضغط Cmd+Shift+Delete
2. اختر "Cached images and files"
3. Clear data
4. أعد تحميل الصفحة (F5)
```

### 3️⃣ اختبار التسجيل (2 دقيقة)
```bash
1. افتح /register
2. سجل حساب جديد
3. انتقل لمعالج التسجيل
4. جرب التنقل بدون إدخال بيانات ← يجب أن يمنعك
5. أدخل بيانات صحيحة ← يجب أن ينجح
```

---

## 🔍 استكشاف الأخطاء

### ❌ ما زال يظهر خطأ 404

**الحل:**
```bash
1. تحقق من تنفيذ FIX_REGISTER_FUNCTION_COMPLETE.sql
2. امسح Cache في المتصفح
3. أعد تسجيل الدخول
4. جرب مرة أخرى
```

### ❌ لا تظهر رسالة خطأ عند الانتقال بدون بيانات

**الحل:**
```bash
1. تحقق من حفظ ملف RegistrationWizard.tsx
2. أعد تشغيل Dev Server (npm run dev)
3. امسح Cache في المتصفح
4. جرب مرة أخرى
```

### ❌ لا ينتقل للصفحة الرئيسية بعد الإكمال

**الحل:**
```bash
1. افتح Console (F12)
2. ابحث عن أخطاء حمراء
3. شارك Screenshot للأخطاء
```

---

## 📚 الملفات المُعدّلة

| الملف | النوع | الحالة |
|------|------|--------|
| `FIX_REGISTER_FUNCTION_COMPLETE.sql` | Backend | ✅ جاهز للتنفيذ |
| `src/features/auth/RegistrationWizard.tsx` | Frontend | ✅ تم التحديث |
| `REGISTRATION_WIZARD_FIX_GUIDE.md` | توثيق | ✅ هذا الملف |

---

## 🎉 الخلاصة

### ✅ ما تم إصلاحه:
1. Backend function signature
2. Frontend validation قوي
3. رسائل خطأ واضحة باللغة المختارة
4. منع الانتقال بدون إدخال بيانات

### 🚀 الخطوة التالية:
**نفّذ FIX_REGISTER_FUNCTION_COMPLETE.sql في Supabase الآن!**

---

**آخر تحديث:** 2026-01-24  
**الحالة:** ✅ جاهز للتنفيذ
