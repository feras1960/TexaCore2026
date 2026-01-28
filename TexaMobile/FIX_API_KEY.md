# 🔧 إصلاح مشكلة Invalid API Key

## 🚨 المشكلة
```
❌ Login error: Invalid API key
```

**السبب:** الـ `EXPO_PUBLIC_SUPABASE_ANON_KEY` في ملف `.env` غير كامل!

---

## ✅ الحل

### 1️⃣ احصل على الـ Key الصحيح

#### من Supabase Dashboard:
1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك: `wzkklenfsaepegymfxfz`
3. من القائمة الجانبية: **Settings** ⚙️
4. اضغط على: **API**
5. في قسم **Project API keys**:
   - ابحث عن: **anon** / **public**
   - اضغط **👁️ Show** لإظهار المفتاح
   - اضغط **📋 Copy** لنسخه

---

### 2️⃣ عدّل ملف `.env`

افتح:
```
/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase/TexaMobile/.env
```

**استبدل السطر 10 بالكامل:**
```bash
EXPO_PUBLIC_SUPABASE_ANON_KEY=المفتاح_الكامل_من_Supabase
```

**⚠️ تأكد أن المفتاح:**
- يبدأ بـ `eyJhbGciOi...`
- ينتهي بتوقيع طويل (عادة 43 حرف بعد آخر نقطة)
- **لا توجد مسافات** قبل أو بعد المفتاح
- **لا يوجد سطر جديد** في المنتصف

---

### 3️⃣ أعد تشغيل السيرفر

```bash
# أوقف السيرفر الحالي
Ctrl + C

# أو من Terminal آخر:
pkill -9 -f expo

# أعد التشغيل (مهم: --clear لتحديث .env)
npx expo start --web --clear
```

---

### 4️⃣ جرّب تسجيل الدخول

استخدم أي مستخدم موجود في قاعدة البيانات:
```
📧 Email: texa@texa.com (أو أي بريد آخر)
🔒 Password: كلمة المرور الصحيحة
```

---

## 🔍 التحقق من صحة الـ Key

### JWT Token الصحيح يتكون من 3 أجزاء مفصولة بنقاط:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9     ← Header (base64)
.
eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2... ← Payload (base64)
.
rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN123abc... ← Signature (طويل!)
```

**المفتاح الحالي لديك مقطوع عند الـ Signature!**

---

## 💡 نصيحة

بعد إصلاح الـ Key، يمكنك استخدام **أي مستخدم** موجود في قاعدة البيانات!

لمعرفة المستخدمين:
```bash
# في Supabase → SQL Editor
SELECT email FROM auth.users;
```

---

**👉 أصلح الـ API Key وأعد تشغيل السيرفر، وسيعمل فوراً! 🚀**
