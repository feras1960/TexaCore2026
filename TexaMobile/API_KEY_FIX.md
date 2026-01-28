# ✅ إصلاح مشكلة API Key

## **المشكلة:**
```
❌ Login error: Invalid API key
❌ Login error: Invalid API key
```

## **السبب:**
`app.config.js` لا يحمّل `.env` تلقائياً!

## **الحل:**

### 1️⃣ تثبيت `dotenv`:
```bash
npm install dotenv --save-dev
```

### 2️⃣ تحديث `app.config.js`:
```javascript
require('dotenv').config(); // ⬅️ إضافة هذا السطر

module.exports = {
  expo: {
    // ...
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
```

### 3️⃣ إعادة تشغيل السيرفر:
```bash
pkill -f "expo start"
npx expo start --web --clear
```

---

## **التحقق:**
```bash
✅ URL: https://wzkklenfsaepegymfxfz.supabase.co
✅ KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...
```

---

## **النتيجة:**
✅ الـ API Keys محملة بشكل صحيح
✅ لا توجد أخطاء `Invalid API key`
✅ Login جاهز للعمل
