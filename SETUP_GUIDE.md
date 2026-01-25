# 🚀 دليل الإعداد خطوة بخطوة - Super Admin Setup

## 📋 نظرة عامة

هذا الدليل لإعداد حساب Super Admin بصلاحيات كاملة على جميع الموديولات.

---

## ✅ الخطوات

### الخطوة 1️⃣: فحص بيانات المستخدم

**الملف:** `setup_step_1_check_user.sql`

**ماذا يفعل:**
- يعرض جميع المستخدمين
- يعرض user_id, tenant_id, company_id
- يعرض الصلاحيات والأدوار الحالية

**المطلوب منك:**
1. افتح الملف في Supabase SQL Editor
2. نفذ الاستعلامات واحداً تلو الآخر
3. **انسخ القيم التالية:**
   - `user_id` (من النتيجة الأولى)
   - `tenant_id` (من النتيجة الثانية)
   - `company_id` (من النتيجة الثانية)

**النتيجة المتوقعة:**
```
user_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
email: your@email.com
tenant_id: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
company_id: zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
```

---

### الخطوة 2️⃣: إنشاء الصلاحيات

**الملف:** `setup_step_2_create_permissions.sql`

**ماذا يفعل:**
- ينشئ صلاحيات full_admin على جميع الموديولات النشطة
- يعطيك كل الصلاحيات (view, create, edit, delete, export, import, approve, manage_settings)

**المطلوب منك:**
1. افتح الملف
2. **استبدل القيم:**
   - `YOUR_USER_ID` → القيمة من الخطوة 1
   - `YOUR_TENANT_ID` → القيمة من الخطوة 1
   - `YOUR_COMPANY_ID` → القيمة من الخطوة 1
3. نفذ القسم 2.1 (التحقق) أولاً
4. إذا نجح، احذف `/*` و `*/` من القسم 2.2 ونفذه
5. نفذ القسم 2.3 للتحقق

**النتيجة المتوقعة:**
- ✅ ~32 صلاحية (واحدة لكل موديول)
- ✅ جميع الصلاحيات = true

---

### الخطوة 3️⃣: تعيين الدور

**الملف:** `setup_step_3_assign_role.sql`

**ماذا يفعل:**
- يعيّن لك دور `full_admin` الرسمي

**المطلوب منك:**
1. افتح الملف
2. **استبدل القيم** (نفس القيم من الخطوة 1)
3. نفذ القسم 3.1 لرؤية الأدوار المتاحة
4. احذف `/*` و `*/` من القسم 3.2 ونفذه
5. نفذ القسم 3.3 للتحقق

**النتيجة المتوقعة:**
- ✅ دور `full_admin` معيّن
- ✅ `is_system_role = true`

---

### الخطوة 4️⃣: الاختبار النهائي

**الملف:** `setup_step_4_test_everything.sql`

**ماذا يفعل:**
- يختبر دالة `get_user_allowed_modules` (التي يستخدمها Frontend)
- يختبر الصلاحيات
- يعرض إحصائيات شاملة

**المطلوب منك:**
1. افتح الملف
2. **استبدل `YOUR_USER_ID`** في كل مكان
3. نفذ جميع الاستعلامات

**النتيجة المتوقعة:**
```
Total Modules: ~32
User Permissions: ~32
User Roles: 1
Permissions with full access: ~32

get_user_allowed_modules: يعرض ~32 موديول
check_user_module_permission: true
```

---

## 🎯 بعد الانتهاء

### في Backend:
- ✅ لديك صلاحيات full_admin
- ✅ جميع الموديولات متاحة لك
- ✅ جميع الصلاحيات = true

### في Frontend:
1. افتح المشروع: `npm run dev`
2. سجّل الدخول
3. **يجب أن ترى:**
   - ✅ جميع الموديولات في Sidebar (~32 موديول)
   - ✅ جميع الأزرار متاحة
   - ✅ لا قيود على الصلاحيات

---

## ⚠️ استكشاف الأخطاء

### المشكلة: لا تظهر الموديولات في Frontend

**الحلول:**

1. **افتح Console (F12):**
   ```javascript
   // تحقق من user_id
   console.log('User:', user);
   
   // تحقق من النتائج
   console.log('Modules:', modules);
   ```

2. **تحقق من useModules Hook:**
   - افتح `src/hooks/useModules.ts`
   - تأكد من أنه يستخدم `user.id` وليس `tenantId`

3. **تحقق من modulesService:**
   - افتح `src/services/modulesService.ts`
   - تأكد من أنه يستخدم `get_user_allowed_modules(user_id)`

4. **أعد تحميل الصفحة:**
   - `Ctrl+Shift+R` (hard refresh)

---

## 📊 الهيكلية النهائية

```
You (Super Admin)
├─ user_id: xxxxx
├─ tenant_id: yyyyy (platform_tenant)
├─ company_id: zzzzz (platform_company)
├─ Role: full_admin
└─ Permissions:
   ├─ 32 modules
   └─ All permissions = true
      ├─ can_view ✅
      ├─ can_create ✅
      ├─ can_edit ✅
      ├─ can_delete ✅
      ├─ can_export ✅
      ├─ can_import ✅
      ├─ can_approve ✅
      └─ can_manage_settings ✅
```

---

## 🎉 جاهز للتطوير!

بعد إكمال جميع الخطوات:
- ✅ Backend 100% جاهز
- ✅ Permissions 100% جاهزة
- ✅ يمكنك البدء بتطوير Frontend
- ✅ جميع الموديولات متاحة لك

---

**Good luck! 🚀 بالتوفيق!**
