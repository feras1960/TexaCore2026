# 🔧 حل مشكلة "يحمل بدون توقف"

## **المشكلة:**
التطبيق يحمل بدون توقف ولا يفتح

## **السبب:**
1. ❌ **Invalid API key** - مفاتيح Supabase غير محملة
2. ❌ `app.json` لا يدعم environment variables
3. ❌ المتغيرات لم تُحمّل في `Constants.expoConfig.extra`

## **الحل المطبق:**

### **1. إنشاء `app.config.js` بدلاً من `app.json`:**

```javascript
module.exports = {
  expo: {
    // ... config ...
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
```

### **2. تحديث `lib/supabase.ts`:**
الكود موجود بالفعل ويستخدم:
```typescript
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

### **3. إعادة تشغيل السيرفر:**
```bash
pkill -f "expo start"
npx expo start --web --clear
```

## **للاختبار:**

1. افتح: `http://localhost:8081`
2. يجب أن ترى شاشة Login
3. استخدم: `feras1960@gmail.com` / كلمة المرور

## **إذا استمرت المشكلة:**

### **حل بديل: استخدام process.env مباشرة:**

في `lib/supabase.ts`:
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

**الحالة:** ⏳ في انتظار إعادة تشغيل السيرفر
