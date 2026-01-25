# ✅ نقل بيانات التسجيل من Register إلى Wizard

## 🎯 **المشكلة:**
اسم الشركة المدخل في صفحة التسجيل (`Register.tsx`) لا ينتقل إلى معالج التسجيل (`RegistrationWizard.tsx`).

---

## ✅ **الحل المطبق:**

### **1. في Register.tsx:**

**قبل الـ redirect للـ Wizard:**
```typescript
// تمرير بيانات التسجيل للـ Wizard
const registrationData = {
  fullName: formData.fullName,
  companyName: formData.companyName,
  email: formData.email,
  phone: formData.phone
};
localStorage.setItem('registration_data', JSON.stringify(registrationData));

navigate('/registration-wizard');
```

**البيانات المُمررة:**
- ✅ `fullName` - الاسم الكامل
- ✅ `companyName` - اسم الشركة
- ✅ `email` - البريد الإلكتروني
- ✅ `phone` - رقم الهاتف

---

### **2. في RegistrationWizard.tsx:**

**قراءة البيانات من localStorage:**
```typescript
// قراءة بيانات التسجيل من localStorage
const registrationData = React.useMemo(() => {
  const data = localStorage.getItem('registration_data');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}, []);

const [formData, setFormData] = useState<CompanyFormData>({
  companyName: registrationData?.companyName || '', // ← من localStorage
  businessType: '',
  address: '',
  city: '',
  country: defaultCountryByLanguage[language] || 'SA',
  phone: registrationData?.phone || '', // ← من localStorage
  email: registrationData?.email || user?.email || '', // ← من localStorage
  website: '',
  localCurrency: '',
  mainCurrency: 'USD',
  fiscalYearStart: 1
});
```

---

### **3. تنظيف localStorage بعد الإكمال:**

```typescript
// Success!
// تنظيف البيانات المؤقتة
localStorage.removeItem('registration_data');

toast.success(
  formData.businessType === 'fabric' 
    ? t('wizard.successFabric') 
    : t('wizard.success')
);
```

**لماذا التنظيف؟**
- لتجنب بقاء البيانات القديمة في المتصفح
- للحفاظ على الخصوصية
- لمنع تعبئة بيانات خاطئة في تسجيلات مستقبلية

---

### **4. تحسينات UX:**

**في Step 1 - حقل اسم الشركة:**

```typescript
{formData.companyName && (
  <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
    <Check className="w-3 h-3" />
    {t('wizard.companyNameFromRegistration')}
  </p>
)}
```

**النتيجة:**
- ✅ إذا كان الاسم مُعبأ → رسالة خضراء: "تم جلب اسم الشركة من بيانات التسجيل"
- ✅ المستخدم يمكنه التعديل إذا أراد
- ✅ التركيز التلقائي فقط إذا كان الحقل فارغاً

---

## 🔄 **التدفق الكامل:**

### **User Journey:**

```
1. المستخدم في /register
   ↓
   يدخل: اسم الشركة = "شركة التجارة الذهبية"
   ↓
2. يضغط "إنشاء حساب"
   ↓
   localStorage.setItem('registration_data', { companyName: "شركة التجارة الذهبية", ... })
   ↓
3. Redirect إلى /registration-wizard
   ↓
   registrationData = JSON.parse(localStorage.getItem('registration_data'))
   ↓
4. Step 1 يظهر:
   ✅ حقل اسم الشركة مُعبأ مسبقاً: "شركة التجارة الذهبية"
   ✅ رسالة: "تم جلب اسم الشركة من بيانات التسجيل"
   ↓
5. المستخدم يكمل باقي الخطوات
   ↓
6. عند الإكمال:
   localStorage.removeItem('registration_data') ✅ تنظيف
   navigate('/') + reload
```

---

## 📊 **الحقول المنقولة:**

| الحقل | من Register | إلى Wizard | ملاحظات |
|------|-------------|-----------|---------|
| **companyName** | ✅ | ✅ Step 1 | قابل للتعديل |
| **phone** | ✅ | ✅ Step 2 | قابل للتعديل |
| **email** | ✅ | ✅ Step 2 | من user أو localStorage |
| **fullName** | ✅ | ✅ (في RPC) | يُستخدم في `p_user_name` |

---

## 🧪 **اختبار السيناريو:**

### **Test Case: نقل اسم الشركة بنجاح**

**الخطوات:**
1. افتح `/register`
2. أدخل:
   - الاسم: "أحمد محمد"
   - **اسم الشركة: "شركة التقنية المتقدمة"** ← المهم
   - البريد: `test@example.com`
   - الهاتف: `+966501234567`
   - كلمة المرور: `Test@123`
3. اضغط "إنشاء حساب"
4. سيتم التوجيه لـ `/registration-wizard`

**النتيجة المتوقعة:**
```
✅ حقل اسم الشركة في Step 1 = "شركة التقنية المتقدمة"
✅ رسالة خضراء: "تم جلب اسم الشركة من بيانات التسجيل (يمكنك تعديله)"
✅ حقل الهاتف في Step 2 = "+966501234567"
✅ حقل البريد في Step 2 = "test@example.com"
```

---

## 🔍 **تحقق من localStorage:**

افتح Developer Tools → Console:
```javascript
// بعد التسجيل مباشرة (قبل الإكمال):
localStorage.getItem('registration_data')
// النتيجة: '{"fullName":"أحمد محمد","companyName":"شركة التقنية المتقدمة",...}'

// بعد إكمال الـ Wizard:
localStorage.getItem('registration_data')
// النتيجة: null ← تم التنظيف! ✅
```

---

## ✅ **الملفات المعدلة:**

1. ✅ `src/features/auth/Register.tsx`
   - إضافة `localStorage.setItem()` قبل navigate

2. ✅ `src/features/auth/RegistrationWizard.tsx`
   - قراءة من localStorage باستخدام `useMemo`
   - تعبئة `formData` من البيانات المقروءة
   - تنظيف localStorage بعد النجاح
   - تحسين UX برسالة تأكيد

3. ✅ `src/i18n/locales/ar.json`
   - `companyNameFromRegistration`: "تم جلب اسم الشركة من بيانات التسجيل (يمكنك تعديله)"

4. ✅ `src/i18n/locales/en.json`
   - `companyNameFromRegistration`: "Company name from registration (you can edit it)"

---

## 🎯 **النتيجة:**

| Before | After |
|--------|-------|
| ❌ اسم الشركة لا ينتقل | ✅ ينتقل تلقائياً |
| ❌ المستخدم يدخله مرتين | ✅ مُعبأ مسبقاً |
| ❌ لا توجد رسالة توضيحية | ✅ رسالة خضراء |
| ❌ التركيز على حقل فارغ | ✅ تركيز ذكي |

---

## 🚀 **جاهز للاختبار!**

1. **أعد تشغيل Dev Server**
2. **افتح `/register`**
3. **أدخل اسم الشركة** (مثل: "شركة الأقمشة الحديثة")
4. **أكمل التسجيل**
5. **في الـ Wizard** → يجب أن ترى الاسم مُعبأ مسبقاً! ✅

---

## ✅ **Status: COMPLETED!**

جميع البيانات الآن تنتقل بشكل صحيح من Register إلى Wizard! 🎉
