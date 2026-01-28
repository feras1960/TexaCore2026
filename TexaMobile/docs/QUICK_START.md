# 🚀 TexaMobile - دليل البدء السريع

**آخر تحديث:** 26 يناير 2026

---

## ⚡ البدء في 5 دقائق

### 1️⃣ التثبيت

```bash
# انتقل للمجلد
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase/TexaMobile"

# ثبت الحزم (إذا لم يتم تثبيتها بعد)
npm install
```

### 2️⃣ إعداد البيئة

تأكد من وجود ملف `.env` بهذا المحتوى:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3️⃣ التشغيل

```bash
# شغّل السيرفر
npx expo start --clear

# ثم اضغط:
# w = Web Browser (الأسرع)
# i = iOS Simulator
# a = Android Emulator
```

### 4️⃣ تسجيل الدخول

افتح `http://localhost:8081` واستخدم:

```
📧 Email: test@texa.com
🔒 Password: Test@123456
```

---

## 🔄 إيقاف وإعادة تشغيل السيرفر

### إيقاف العمليات القديمة

```bash
pkill -9 -f expo
pkill -9 -f metro
```

### إعادة تشغيل نظيف

```bash
npx expo start --web --clear
```

---

## 🐛 حل المشاكل السريع

### ❌ المشكلة: "Port already in use"

```bash
# اقتل العملية على Port 8081
lsof -ti:8081 | xargs kill -9

# أعد التشغيل
npx expo start --clear
```

### ❌ المشكلة: "window is not defined"

**الحل:** تم حلها في `lib/supabase.ts` - استخدم `localStorage` للـ Web.

### ❌ المشكلة: "Environment variables undefined"

تأكد من استخدام `EXPO_PUBLIC_` prefix في `.env`:

```bash
# ✅ صحيح
EXPO_PUBLIC_SUPABASE_URL=...

# ❌ خطأ
VITE_SUPABASE_URL=...
REACT_APP_SUPABASE_URL=...
```

### ❌ المشكلة: "Login doesn't work"

1. افتح Browser Console (`Cmd + Option + J`)
2. ابحث عن أي أخطاء حمراء
3. تحقق من أن البيانات التجريبية موجودة في Supabase:

```sql
-- في Supabase SQL Editor
SELECT 
  up.email,
  up.full_name_ar,
  ur.role_code
FROM user_profiles up
JOIN user_role_assignments ura ON ura.user_id = up.id
JOIN user_roles ur ON ur.id = ura.role_id
WHERE up.email = 'test@texa.com';
```

---

## 📱 تشغيل على الهاتف

### iOS (يتطلب Xcode)

```bash
npx expo start --clear
# ثم اضغط: i
```

### Android (يتطلب Android Studio)

```bash
npx expo start --clear
# ثم اضغط: a
```

### Physical Device (QR Code)

```bash
npx expo start --clear
# امسح QR Code:
# - iOS: تطبيق Camera
# - Android: تطبيق Expo Go
```

---

## 🎨 الميزات المتاحة حالياً

- ✅ شاشة Login بتصميم Glassmorphism
- ✅ Email/Password Authentication
- ✅ Role-Based Dashboard Redirect
- ✅ Dark/Light Mode Auto-switch
- ✅ Glass Toast Notifications
- ✅ Biometric Login Button (UI only)
- ✅ Loading States & Animations

---

## 🔜 قريباً

- ⏳ Admin Dashboard - UI كاملة
- ⏳ Biometric Login - وظيفي
- ⏳ Multi-language Support (AR/EN)
- ⏳ Offline Mode
- ⏳ Push Notifications

---

## 📚 المزيد من التوثيق

- [📖 التوثيق الشامل](./MOBILE_APP_DOCUMENTATION.md)
- [🐛 استكشاف الأخطاء](./TROUBLESHOOTING.md)
- [❓ الأسئلة الشائعة](./FAQ.md)

---

## 💡 نصائح سريعة

### أسرع طريقة للتطوير

```bash
# Web أسرع من Simulator/Emulator
npx expo start --web --clear

# Hot Reload تلقائي على Web
# Cmd+R للتحديث اليدوي
```

### Debugging

```bash
# افتح Console في Browser
Cmd + Option + J (Chrome/Safari)
Cmd + Option + K (Firefox)

# أو في Expo
اضغط: j (لفتح Remote Debugger)
```

### Clear Cache

```bash
# إذا واجهت مشاكل غريبة
npx expo start --clear

# أو
rm -rf node_modules
npm install
npx expo start --clear
```

---

**🎉 جاهز للبدء! افتح `http://localhost:8081` الآن!**
