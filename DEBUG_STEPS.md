# 🔍 خطوات التشخيص - Debug Steps

## الخطوة 1: افتح Console

1. افتح المتصفح
2. اضغط **F12** (أو `Cmd+Option+I` على Mac)
3. اذهب إلى تبويب **Console**
4. **انسخ جميع الأخطاء** (باللون الأحمر)

---

## الخطوة 2: تحقق من Network

1. في Developer Tools، اذهب إلى **Network**
2. أعد تحميل الصفحة (`Cmd+R` أو `F5`)
3. ابحث عن:
   - طلبات فاشلة (باللون الأحمر)
   - Status Code غير 200
   - ملفات `.js` أو `.tsx` فاشلة

---

## الخطوة 3: تحقق من .env

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
cat .env
```

**يجب أن يحتوي على:**
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

---

## الخطوة 4: امسح Cache

```bash
# امسح
rm -rf node_modules .vite dist

# أعد التثبيت
npm install

# أعد التشغيل
npm run dev
```

---

## الخطوة 5: تحقق من Terminal

في Terminal الذي يشغل `npm run dev`:
- هل هناك أخطاء؟
- هل يقول "Local: http://localhost:5173"؟
- هل هناك رسائل خطأ باللون الأحمر؟

---

## الخطوة 6: اختبار بسيط

**مؤقتاً، عدّل `src/main.tsx`:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <div style={{ padding: '20px', backgroundColor: '#fff' }}>
    <h1>✅ React يعمل</h1>
    <p>إذا رأيت هذا، React يعمل. المشكلة في أحد الـ components.</p>
  </div>
);
```

**إذا ظهر هذا:**
- React يعمل ✅
- المشكلة في `App.tsx` أو أحد الـ components

**إذا لم يظهر:**
- المشكلة في الـ build أو الـ dev server

---

## 📋 المعلومات المطلوبة

**أرسل لي:**

1. **من Console:**
   - جميع الأخطاء (Errors)
   - جميع التحذيرات (Warnings)

2. **من Network:**
   - أي ملفات فاشلة
   - Status Codes للأخطاء

3. **من Terminal:**
   - رسائل `npm run dev`
   - أي أخطاء

4. **محتوى `.env`:**
   - بدون القيم الحقيقية (مثل: `VITE_SUPABASE_URL=https://xxx`)

---

## 🆘 إذا لم يعمل أي شيء

**جرب:**

```bash
# 1. امسح كل شيء
rm -rf node_modules .vite dist package-lock.json

# 2. أعد التثبيت
npm install

# 3. أعد التشغيل
npm run dev
```

---

**آخر تحديث:** 2026-01-19
