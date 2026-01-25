# 🎨 دليل تطبيق Frontend - Business Type & Company Switcher

## ✅ ما تم إنجازه:

### 1. **RegistrationWizard.tsx** ✅
**الموقع:** `src/features/auth/RegistrationWizard.tsx`

**الميزات:**
- ✅ معالج متعدد الخطوات (3 خطوات)
- ✅ Step 1: اختيار نوع العمل (5 أنواع)
- ✅ Step 2: معلومات الشركة
- ✅ Step 3: الإعدادات المالية
- ✅ رسالة توضيحية عند اختيار "Fabric"
- ✅ استدعاء `register_new_subscriber` مع `p_business_type`
- ✅ تصميم احترافي مع Framer Motion

### 2. **CompanySwitcher.tsx** ✅
**الموقع:** `src/components/settings/CompanySwitcher.tsx`

**الميزات:**
- ✅ عرض قائمة الشركات من `get_user_companies()`
- ✅ تبديل الشركة باستخدام `switch_user_company()`
- ✅ تمييز الشركة الحالية
- ✅ Icons مختلفة (Production/Testing)
- ✅ إخفاء المكون إذا شركة واحدة فقط
- ✅ رسالة معلوماتية لشركات الأقمشة

### 3. **Translations** ✅
**الموقع:** `src/i18n/locales/wizard-*.json`

- ✅ `wizard-ar.json` (العربية)
- ✅ `wizard-en.json` (الإنجليزية)
- ⏳ بقية اللغات (7 لغات) - سأنشئها

---

## 📋 الخطوات المتبقية:

### **الخطوة 1: إضافة Route للـ Wizard**

عدّل ملف `src/App.tsx` أو ملف الـ routes:

```tsx
import RegistrationWizard from '@/features/auth/RegistrationWizard';

// في Routes:
<Route path="/registration-wizard" element={<RegistrationWizard />} />
```

### **الخطوة 2: توجيه المستخدم بعد التسجيل**

عدّل `src/features/auth/Register.tsx`:

```tsx
// بعد نجاح التسجيل (Auth):
if (authData?.user && authData?.session) {
  // توجيه للمعالج بدلاً من Dashboard
  navigate('/registration-wizard');
} else {
  // أو الإبقاء على السلوك الحالي
  navigate('/');
}
```

### **الخطوة 3: إضافة CompanySwitcher في Settings**

عدّل ملف الإعدادات (مثلاً `src/features/accounting/AccountingSettings.tsx`):

```tsx
import { CompanySwitcher } from '@/components/settings/CompanySwitcher';

// في JSX:
<div className="space-y-6">
  {/* Company Switcher Card */}
  <CompanySwitcher />
  
  {/* بقية الإعدادات */}
</div>
```

### **الخطوة 4: دمج الترجمات**

خيارين:

#### **الخيار A: دمج في الملفات الأساسية** (موصى به)
انسخ محتوى `wizard-ar.json` و `wizard-en.json` وألصقه في:
- `src/i18n/locales/ar.json`
- `src/i18n/locales/en.json`

#### **الخيار B: استيراد ديناميكي**
في ملف `src/i18n/index.ts`:

```tsx
import arWizard from './locales/wizard-ar.json';
import enWizard from './locales/wizard-en.json';

// دمج الترجمات
const ar = { ...arBase, ...arWizard };
const en = { ...enBase, ...enWizard };
```

### **الخطوة 5: إضافة الترجمات للغات الأخرى**

سأنشئ ملفات الترجمة للغات المتبقية الآن...

---

## 🧪 الاختبار:

### **Test 1: Registration Wizard**
1. سجّل مستخدم جديد من `/register`
2. بعد النجاح، يجب التوجيه لـ `/registration-wizard`
3. اختر "Fabric" في Step 1
4. يجب أن ترى رسالة "سيتم إنشاء شركتين"
5. أكمل الخطوات واضغط "إكمال"
6. تحقق من Database: يجب أن يكون هناك شركتين (`company_type = 'production'` و `'testing'`)

### **Test 2: Company Switcher**
1. سجّل دخول بمستخدم لديه شركتين
2. اذهب للإعدادات
3. يجب أن ترى مكون CompanySwitcher
4. يجب أن تكون الشركة الحالية مميزة بـ "✅ الحالية"
5. اضغط "التبديل" على الشركة الأخرى
6. يجب reload الصفحة وتفعيل الشركة الجديدة

### **Test 3: Single Company User**
1. سجّل دخول بمستخدم لديه شركة واحدة فقط
2. اذهب للإعدادات
3. يجب أن ترى رسالة "لديك شركة واحدة فقط"
4. لا يجب أن يظهر زر "التبديل"

---

## 🐛 Troubleshooting:

### **Problem 1: Wizard لا يظهر**
**Solution:** تأكد من Route مضاف في `App.tsx`

### **Problem 2: الترجمات لا تعمل**
**Solution:** تأكد من دمج ملفات wizard-*.json في الملفات الأساسية

### **Problem 3: CompanySwitcher فارغ**
**Solution:** 
```sql
-- تحقق من Supabase:
SELECT * FROM get_user_companies();
-- يجب أن يرجع شركات المستخدم
```

### **Problem 4: Switch Company لا يعمل**
**Solution:**
- تحقق من `STEP_41` منفذ بنجاح
- تحقق من RLS policies
- راجع Console للأخطاء

---

## 📁 Structure النهائي:

```
src/
├── features/
│   └── auth/
│       ├── Register.tsx (موجود - يحتاج تعديل بسيط)
│       └── RegistrationWizard.tsx ✅ (جديد)
│
├── components/
│   └── settings/
│       └── CompanySwitcher.tsx ✅ (جديد)
│
└── i18n/
    └── locales/
        ├── wizard-ar.json ✅
        ├── wizard-en.json ✅
        └── wizard-*.json (7 لغات أخرى)
```

---

## ⏱️ الوقت المقدر:

| المهمة | الوقت |
|-------|-------|
| إضافة Route | 2 دقيقة |
| تعديل Register.tsx | 3 دقائق |
| إضافة CompanySwitcher في Settings | 3 دقائق |
| دمج الترجمات | 5 دقائق |
| الاختبار | 10 دقائق |
| **المجموع** | **~23 دقيقة** |

---

## ✅ Checklist:

- [x] ✅ Backend (STEP_41)
- [x] ✅ RegistrationWizard Component
- [x] ✅ CompanySwitcher Component
- [x] ✅ Translations (ar, en)
- [ ] ⏳ Translations (7 لغات أخرى)
- [ ] ⏳ Add Routes
- [ ] ⏳ Update Register.tsx
- [ ] ⏳ Add CompanySwitcher to Settings
- [ ] ⏳ Merge Translations
- [ ] ⏳ Testing

---

**الخطوة التالية:** سأنشئ ملفات الترجمة للغات المتبقية (de, tr, ru, uk, it, pl, ro)
