# 🔍 خطوات التشخيص - مشكلة تسجيل الدخول

## 1️⃣ تحقق من المستخدمين الموجودين

### افتح Supabase SQL Editor وشغّل:
```sql
-- في ملف: CHECK_EXISTING_USERS.sql
SELECT 
  au.email,
  au.email_confirmed_at,
  up.full_name_ar,
  STRING_AGG(ur.role_code, ', ') as roles
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN user_role_assignments ura ON ura.user_id = au.id
LEFT JOIN user_roles ur ON ur.id = ura.role_id
GROUP BY au.id, au.email, au.email_confirmed_at, up.full_name_ar
ORDER BY au.created_at DESC;
```

---

## 2️⃣ استخدم مستخدم موجود

### إذا وجدت مستخدماً موجوداً:

1. **انسخ البريد الإلكتروني**
2. **افتح:** `SETUP_EXISTING_USER.sql`
3. **عدّل السطر 17:**
   ```sql
   v_user_email TEXT := 'بريدك@example.com'; -- 👈 ضع بريدك هنا
   ```
4. **شغّل الـ Script**
5. **جرّب تسجيل الدخول**

---

## 3️⃣ تحقق من الـ Console في المتصفح

### افتح Developer Console:
- **Chrome/Safari:** `Cmd + Option + J`
- **Firefox:** `Cmd + Option + K`

### ابحث عن:
```
🔐 handleLogin called
📧 Email: ...
❌ Email Error: ...
❌ Password Error: ...
✅ Validation passed...
🔍 signIn result: ...
```

---

## 4️⃣ الأخطاء الشائعة

### ❌ "Invalid login credentials"
**السبب:** كلمة المرور خاطئة أو المستخدم غير موجود
**الحل:** تحقق من البريد وكلمة المرور

### ❌ "Email not confirmed"
**السبب:** البريد غير مؤكد
**الحل:** في Supabase → Authentication → Users → اضغط على المستخدم → Confirm Email

### ❌ لا يوجد Console Logs
**السبب:** السيرفر في CI Mode
**الحل:**
```bash
pkill -9 -f expo
npx expo start --web --clear
```

### ❌ "Cannot read property 'role_code'"
**السبب:** المستخدم ليس لديه Profile أو Role
**الحل:** شغّل `SETUP_EXISTING_USER.sql`

---

## 5️⃣ إنشاء مستخدم جديد (إذا لزم الأمر)

### في Supabase → Authentication → Users:
1. اضغط **Add User**
2. أدخل:
   - Email: `newuser@texa.com`
   - Password: `Test@123456`
   - Auto Confirm Email: ✅
3. اضغط **Create User**
4. انسخ الـ UUID
5. شغّل `SETUP_EXISTING_USER.sql` مع البريد الجديد

---

## 6️⃣ تحقق من Environment Variables

### في ملف `.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### تحقق أنها صحيحة:
```bash
# في Terminal
cat .env
```

---

## 7️⃣ إعادة تشغيل نظيفة

```bash
# أوقف كل شيء
pkill -9 -f expo
pkill -9 -f metro

# امسح Cache
npx expo start --clear

# أو للـ Web
npx expo start --web --clear
```

---

## 🆘 إذا لم ينجح شيء

### أرسل لي:

1. **Screenshot من Console في المتصفح** (Cmd+Option+J)
2. **نتيجة هذا الـ SQL:**
   ```sql
   SELECT email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'بريدك';
   ```
3. **البريد الذي تحاول الدخول به**

---

## ✅ الحل السريع

**جرّب المستخدم التجريبي:**
```
📧 Email: test@texa.com
🔒 Password: Test@123456
```

**إذا لم يعمل:**
1. افتح `STEP_7_FINAL_NO_CONFLICT.sql`
2. شغّله في Supabase SQL Editor
3. جرّب مرة أخرى

---

**👉 أخبرني ماذا يظهر في Console وسأساعدك! 🚀**
