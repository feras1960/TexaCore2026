# 🔑 خطوات سريعة: إنشاء مستخدم تجريبي

## الطريقة الأسهل (5 دقائق)

### 1️⃣ افتح Supabase Dashboard
```
https://supabase.com/dashboard/project/wzkklenfsaepegymfxfz
```

### 2️⃣ أنشئ المستخدم
```
Authentication → Users → Add User

املأ:
├─ Email: test@texa.com
├─ Password: Test@123456
└─ ✅ Auto Confirm User (مهم!)

اضغط "Create User"
```

### 3️⃣ احفظ UUID
```
بعد الإنشاء، ستظهر قائمة المستخدمين
اضغط على المستخدم الجديد
احفظ الـ UUID (مثل: 123e4567-e89b-12d3-a456-426614174000)
```

### 4️⃣ نفذ SQL Script
```
SQL Editor → New Query

انسخ من ملف: CREATE_TEST_USER.sql
استبدل 'USER_UUID_HERE' بالـ UUID الحقيقي (في 3 أماكن)
اضغط Run
```

### 5️⃣ سجل دخول!
```
في التطبيق:
Email: test@texa.com
Password: Test@123456
```

---

## ✅ التحقق السريع

نفذ في SQL Editor:
```sql
SELECT 
  au.email,
  up.full_name,
  r.name as role_name,
  ura.is_active
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
LEFT JOIN user_role_assignments ura ON au.id = ura.user_id
LEFT JOIN roles r ON ura.role_id = r.id
WHERE au.email = 'test@texa.com';
```

يجب أن ترى:
```
email: test@texa.com
full_name: مستخدم تجريبي
role_name: Admin
is_active: true
```

---

## 🐛 إذا لم يعمل

### خطأ: "البريد أو كلمة المرور غير صحيحة"
```
→ المستخدم غير موجود في auth.users
→ الحل: كرر الخطوة 2
```

### خطأ: "لم يتم العثور على بيانات المستخدم"
```
→ Profile غير موجود
→ الحل: كرر الخطوة 4 وتأكد من UUID صحيح
```

### لا يظهر أي خطأ لكن لا يدخل
```
→ Role assignment غير موجود
→ الحل: نفذ التحقق السريع أعلاه
```

---

**💡 أسرع طريقة:** اتبع الخطوات 1→2→3→4→5 بالترتيب!
