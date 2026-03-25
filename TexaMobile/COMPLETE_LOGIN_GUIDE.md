# 🎯 دليل كامل: إصلاح تسجيل الدخول

## المشكلة الأصلية:
```
ERROR: 42703: column "name" of relation "roles" does not exist
```

## السبب:
البنية الفعلية لجدول `roles` تستخدم:
- ✅ `code` (varchar) - كود الدور مثل 'admin', 'driver'
- ✅ `name_ar` (varchar) - الاسم بالعربية
- ✅ `name_en` (varchar) - الاسم بالإنجليزية
- ❌ NOT `name` - هذا العمود غير موجود!

## الحل:
تم إنشاء سكربتات جديدة تتطابق مع البنية الفعلية.

---

## 📋 الخطوات الصحيحة (بالترتيب)

### 🔸 الخطوة 0: تحقق من المتطلبات الأساسية

#### أ. في Supabase Dashboard:
```
https://supabase.com/dashboard/project/wzkklenfsaepegymfxfz
```

#### ب. في SQL Editor، نفذ:
```sql
-- افتح: PRE_SETUP_CHECK.sql
-- انسخه كاملاً ← الصق في SQL Editor ← Run
```

**النتائج المتوقعة:**
- ✅ يوجد على الأقل tenant واحد
- ✅ يوجد على الأقل company واحدة
- ✅ جدول roles يحتوي على: code, name_ar, name_en

**إذا لم يكن لديك tenant أو company:**
```sql
-- 1. إنشاء Tenant
INSERT INTO tenants (id, name_ar, name_en, status, created_at)
VALUES (
  gen_random_uuid(),
  'شركة تجريبية',
  'Demo Company',
  'active',
  NOW()
)
RETURNING id, name_ar;
-- احفظ الـ id الذي يظهر

-- 2. إنشاء Company (استبدل YOUR_TENANT_ID)
INSERT INTO companies (id, tenant_id, name_ar, name_en, created_at)
VALUES (
  gen_random_uuid(),
  'YOUR_TENANT_ID',
  'الشركة الرئيسية',
  'Main Company',
  NOW()
)
RETURNING id, name_ar;
```

---

### 🔸 الخطوة 1: إنشاء المستخدم في Authentication

#### في Supabase Dashboard:
```
Authentication → Users → Add User
```

#### املأ:
```
📧 Email: test@texa.com
🔒 Password: Test@123456
✅ Auto Confirm User: نعم (مهم جداً!)
```

#### اضغط "Create User"

---

### 🔸 الخطوة 2: تنفيذ SQL Setup Script

#### افتح SQL Editor:
```
SQL Editor → New Query
```

#### افتح ملف:
```
MOBILE_SETUP.sql
```

#### انسخ **كل محتوياته** (من أول سطر لآخر سطر)

#### الصق في SQL Editor

#### اضغط **Run** (أو Ctrl+Enter)

---

### 🔸 الخطوة 3: التحقق من النتيجة

#### يجب أن ترى في Results:

```
user_id: 123e4567-e89b-12d3-a456-426614174000
email: test@texa.com
email_confirmed_at: 2026-01-25 12:34:56
full_name: مستخدم تجريبي - Test User
tenant_id: abc...
company_id: def...
profile_active: t
role_code: admin
role_name_ar: مدير النظام
role_name_en: Admin
role_active: t
```

**✅ إذا رأيت النتيجة أعلاه، كل شيء جاهز!**

---

### 🔸 الخطوة 4: اختبار تسجيل الدخول

#### في التطبيق (Mobile):
```
📧 Email: test@texa.com
🔒 Password: Test@123456
```

#### اضغط "تسجيل الدخول"

---

## ✅ النتيجة المتوقعة:

1. ✅ Toast أخضر: "تم تسجيل الدخول بنجاح"
2. ✅ يتم توجيهك لـ Admin Dashboard
3. ✅ اسمك يظهر في الأعلى

---

## 🐛 إذا حدثت أخطاء:

### خطأ: "البريد أو كلمة المرور غير صحيحة"
```
→ المستخدم غير موجود في auth.users
→ الحل: كرر الخطوة 1
```

### خطأ: "لم يتم العثور على بيانات المستخدم"
```
→ Profile غير موجود
→ الحل: كرر الخطوة 2
→ تحقق من أن الـ SQL script تم تنفيذه بنجاح
```

### خطأ: "Invalid input syntax for type uuid"
```
→ tenant_id أو company_id غير موجودين
→ الحل: نفذ PRE_SETUP_CHECK.sql أولاً
→ أنشئ tenant و company إذا لزم الأمر
```

### خطأ SQL: "column does not exist"
```
→ استخدمت السكربت القديم (AUTO_SETUP.sql أو CREATE_TEST_USER.sql)
→ الحل: استخدم MOBILE_SETUP.sql الجديد
```

---

## 📝 ملاحظات مهمة:

1. **Auto Confirm User** يجب تفعيله، وإلا لن تستطيع تسجيل الدخول
2. **الباسورد Case Sensitive** - يعني `Test@123456` ≠ `test@123456`
3. **tenant و company** يجب أن يكونا موجودين قبل تنفيذ MOBILE_SETUP.sql
4. **السكربتات القديمة** (AUTO_SETUP.sql, CREATE_TEST_USER.sql) لن تعمل - استخدم MOBILE_SETUP.sql

---

## 🔧 التغييرات التي تمت:

### في `lib/supabase.ts`:
```typescript
// ✅ تم تعديل
export enum UserRole {
  ADMIN = 'admin', // كان: 'Admin'
  DRIVER = 'driver', // كان: 'Driver'
  // ... الخ
}

// ✅ تم تعديل query لاستخدام user_roles بدلاً من user_role_assignments
// ✅ تم تعديل query لاستخدام roles.code بدلاً من roles.name
// ✅ تم تعديل user_profiles.id بدلاً من user_profiles.user_id
```

### في SQL Scripts:
```sql
-- ✅ استخدام code, name_ar, name_en بدلاً من name
-- ✅ استخدام user_roles بدلاً من user_role_assignments
-- ✅ استخدام user_profiles.id بدلاً من user_profiles.user_id
```

---

## ✨ الملفات الجديدة:

1. **PRE_SETUP_CHECK.sql** - للتحقق من المتطلبات الأساسية
2. **MOBILE_SETUP.sql** - السكربت الصحيح للإعداد
3. **COMPLETE_LOGIN_GUIDE.md** - هذا الدليل
4. **CHECK_TABLES.sql** - لفحص بنية الجداول

---

## 🎉 بعد إتمام الخطوات:

يمكنك الآن:
- ✅ تسجيل الدخول بالبيانات التجريبية
- ✅ استخدام البصمة للدخول السريع
- ✅ الوصول لـ Admin Dashboard
- ✅ التبديل بين Dark/Light Mode

---

**💡 ابدأ الآن من الخطوة 0 → 1 → 2 → 3 → 4**

**لا تتخطى أي خطوة!**
