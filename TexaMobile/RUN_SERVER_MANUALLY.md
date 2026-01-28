# 🚀 تعليمات تشغيل السيرفر يدوياً

## المشكلة:
السيرفر يعمل في CI mode والـ reloads معطّلة

## ✅ الحل (في Terminal خارجي):

### 1. افتح Terminal جديد

### 2. اذهب للمجلد:
```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase/TexaMobile"
```

### 3. أوقف أي Expo يعمل:
```bash
pkill -f expo
pkill -f metro
```

### 4. شغّل Expo:
```bash
npx expo start --clear
```

### 5. عندما يظهر:
```
› Metro waiting on exp://...
› Press s │ switch to development build
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

### 6. اضغط:
- `i` للـ iOS Simulator
- `a` للـ Android
- `w` للـ Web

---

## 📱 بعد فتح التطبيق:

### سجل دخول:
```
Email: test@texa.com
Password: Test@123456
```

### راقب Terminal للـ console logs:
يجب أن ترى:
```
🔐 handleLogin called
📧 Email: test@texa.com
🔍 getCurrentSession
✅ Login successful
```

---

## ❓ لماذا Terminal خارجي؟

لأن هناك مشكلة في CI mode داخل Cursor، استخدام Terminal خارجي يحلها.

---

**👉 افتح Terminal خارجي ونفذ الأوامر أعلاه!**
