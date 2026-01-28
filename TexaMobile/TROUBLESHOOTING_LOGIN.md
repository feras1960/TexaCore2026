# 🔍 دليل حل مشكلة تسجيل الدخول

## المشكلة: لا يدخل بالبيانات التجريبية

---

## 🎯 خطوات التشخيص والحل

### الخطوة 1: التحقق من إنشاء المستخدم في Supabase

#### أ. في Supabase Dashboard:
```
1. اذهب إلى: https://supabase.com/dashboard/project/wzkklenfsaepegymfxfz
2. اضغط على: Authentication → Users
3. تحقق من وجود مستخدم بالبريد: test@texa.com
```

**إذا لم يكن موجوداً:**
```
1. اضغط "Add User"
2. املأ:
   - Email: test@texa.com
   - Password: Test@123456
   - Auto Confirm User: ✅ (مهم!)
3. اضغط "Create User"
4. احفظ الـ UUID الذي يظهر
```

---

### الخطوة 2: تنفيذ SQL Script

#### افتح SQL Editor في Supabase:
```
Dashboard → SQL Editor → New Query
```

#### انسخ والصق من ملف:
```
CREATE_TEST_USER.sql
```

#### **مهم جداً:** استبدل `USER_UUID_HERE` بالـ UUID الفعلي
```sql
-- مثال:
-- بدلاً من: 'USER_UUID_HERE'
-- ضع: '123e4567-e89b-12d3-a456-426614174000'
```

#### نفذ الـ Script:
```
اضغط "Run" أو Ctrl+Enter
```

---

### الخطوة 3: التحقق من البيانات

#### في SQL Editor، نفذ:
```sql
-- 1. تحقق من auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'test@texa.com';

-- 2. تحقق من profile
SELECT * FROM user_profiles 
WHERE email = 'test@texa.com';

-- 3. تحقق من roles
SELECT 
  up.email,
  r.name as role_name,
  ura.is_active
FROM user_role_assignments ura
JOIN roles r ON ura.role_id = r.id
JOIN user_profiles up ON ura.user_id = up.user_id
WHERE up.email = 'test@texa.com';
```

#### النتيجة المتوقعة:
```
✅ auth.users: موجود مع email_confirmed_at ≠ null
✅ user_profiles: موجود مع is_active = true
✅ user_role_assignments: موجود مع role_name = 'Admin' و is_active = true
```

---

### الخطوة 4: اختبار تسجيل الدخول

#### في التطبيق:
```
1. افتح شاشة Login
2. أدخل:
   📧 Email: test@texa.com
   🔒 Password: Test@123456
3. اضغط "تسجيل الدخول"
```

#### النتائج المحتملة:

**✅ نجح:**
- Toast أخضر: "تم تسجيل الدخول بنجاح"
- يوجهك لـ Admin Dashboard
- اسمك يظهر في الأعلى

**❌ فشل مع رسالة:**

| الرسالة | السبب | الحل |
|---------|--------|------|
| "البريد أو كلمة المرور غير صحيحة" | User غير موجود في auth.users | أنشئ المستخدم من Dashboard |
| "البريد الإلكتروني غير مؤكد" | email_confirmed_at = null | فعّل Auto Confirm User |
| "حدث خطأ أثناء تسجيل الدخول" | مشكلة في الاتصال | تحقق من .env |
| "لم يتم العثور على بيانات المستخدم" | profile غير موجود | نفذ SQL script |

---

## 🔧 حلول سريعة

### الحل 1: إعادة إنشاء المستخدم بالكامل

```sql
-- 1. حذف البيانات القديمة (إذا وجدت)
DELETE FROM user_role_assignments 
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'test@texa.com'
);

DELETE FROM user_profiles 
WHERE email = 'test@texa.com';

-- ملاحظة: auth.users يُحذف من Dashboard فقط

-- 2. ثم اتبع الخطوات من البداية
```

### الحل 2: استخدام Email مختلف

```
بدلاً من: test@texa.com
جرب: admin@texa.com
```

### الحل 3: التحقق من RLS Policies

```sql
-- تعطيل RLS مؤقتاً للاختبار (احذف بعد الاختبار!)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments DISABLE ROW LEVEL SECURITY;

-- اختبر تسجيل الدخول

-- إعادة تفعيل RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
```

---

## 🐛 تشخيص متقدم

### في Console (Browser DevTools):

```javascript
// 1. تحقق من Environment
console.log(process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// 2. تحقق من الـ Request
// افتح Network tab
// ابحث عن requests لـ supabase.co
// تحقق من Response
```

### في Terminal (حيث يعمل Expo):

```bash
# ابحث عن أخطاء Supabase
cat /Users/dr.firas/.cursor/projects/.../terminals/339449.txt | grep -i "supabase\|auth\|error"
```

---

## ✅ Checklist النهائي

قبل تسجيل الدخول، تأكد من:

- [ ] المستخدم موجود في `auth.users`
- [ ] `email_confirmed_at` ≠ null
- [ ] Profile موجود في `user_profiles`
- [ ] `is_active = true` في profile
- [ ] Role assignment موجود
- [ ] `is_active = true` في role assignment
- [ ] Role name صحيح (Admin, Driver, etc.)
- [ ] Environment variables محملة
- [ ] Server يعمل على port 8081
- [ ] Console خالي من الأخطاء

---

## 🎯 بيانات تسجيل الدخول النهائية

```
📧 Email: test@texa.com
🔒 Password: Test@123456
👤 Role: Admin
```

**ملاحظة:** الباسورد حساس لحالة الأحرف (Case Sensitive)

---

## 📞 إذا لم يعمل بعد:

1. راجع Console للأخطاء
2. راجع Supabase Dashboard → Logs
3. تأكد من RLS Policies
4. جرب Email مختلف
5. تحقق من صلاحيات الـ Anon Key

---

**💡 نصيحة:** ابدأ من الخطوة 1 بترتيب ولا تتخطى أي خطوة!
