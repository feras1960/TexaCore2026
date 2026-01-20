# 🔧 إصلاح الشاشة السوداء - Black Screen Fix

## المشكلة
البرنامج يفتح شاشة سوداء ولا يعمل.

## الحلول

### 1. تحقق من Console في المتصفح

**الخطوات:**
1. افتح المتصفح
2. اضغط `F12` أو `Cmd+Option+I` (Mac)
3. اذهب إلى تبويب **Console**
4. ابحث عن أخطاء باللون الأحمر
5. انسخ رسالة الخطأ الكاملة

### 2. تحقق من Network Tab

1. في Developer Tools، اذهب إلى **Network**
2. أعد تحميل الصفحة (`Cmd+R` أو `F5`)
3. ابحث عن طلبات فاشلة (باللون الأحمر)
4. تحقق من أن جميع الملفات تُحمّل بشكل صحيح

### 3. تحقق من Environment Variables

```bash
# في Terminal
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
cat .env

# يجب أن يحتوي على:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

**إذا كان `.env` غير موجود:**
```bash
# أنشئ ملف .env
touch .env

# أضف:
echo "VITE_SUPABASE_URL=your_url_here" >> .env
echo "VITE_SUPABASE_ANON_KEY=your_key_here" >> .env
```

### 4. امسح Cache وأعد البناء

```bash
# امسح node_modules و .vite
rm -rf node_modules .vite dist

# أعد التثبيت
npm install

# أعد تشغيل Dev Server
npm run dev
```

### 5. تحقق من الأخطاء الشائعة

#### أ. خطأ في الـ Imports
**الخطأ:** `Cannot find module '@/...'`

**الحل:**
- تأكد من وجود `tsconfig.json` و `vite.config.ts`
- أعد تشغيل TypeScript Server في VS Code

#### ب. خطأ في الـ Routing
**الخطأ:** `Cannot read property 'pathname' of undefined`

**الحل:**
- تأكد من وجود `<BrowserRouter>` في `AppProviders`

#### ج. خطأ في الـ Providers
**الخطأ:** `useLanguage must be used within LanguageProvider`

**الحل:**
- تأكد من أن `AppProviders` يلف `AppRoutes`

### 6. تحقق من ErrorBoundary

إذا كان هناك خطأ في React، سيظهر في ErrorBoundary. تحقق من:
- Console للأخطاء
- Network للأخطاء في تحميل الملفات

### 7. اختبار بسيط

أنشئ ملف اختبار بسيط:

```typescript
// src/App.tsx - مؤقتاً
function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test - البرنامج يعمل</h1>
    </div>
  );
}
```

إذا ظهر هذا، المشكلة في أحد الـ components.

---

## خطوات التشخيص السريع

### 1. افتح Console
```bash
# في Terminal
npm run dev
# ثم افتح المتصفح → F12 → Console
```

### 2. تحقق من الأخطاء
- ابحث عن أخطاء باللون الأحمر
- انسخ رسالة الخطأ الكاملة

### 3. تحقق من Network
- افتح Network tab
- أعد تحميل الصفحة
- تحقق من الملفات الفاشلة

---

## الأخطاء الشائعة وحلولها

### ❌ Error: Cannot find module
**الحل:** `npm install`

### ❌ Error: VITE_SUPABASE_URL is not defined
**الحل:** أنشئ ملف `.env` مع القيم الصحيحة

### ❌ Error: useLanguage must be used within LanguageProvider
**الحل:** تأكد من `AppProviders` في `App.tsx`

### ❌ Error: Cannot read property 'pathname'
**الحل:** تأكد من `<BrowserRouter>` في `AppProviders`

---

## طلب المساعدة

إذا استمرت المشكلة:
1. افتح Console (F12)
2. انسخ **جميع** الأخطاء
3. افتح Network tab
4. أعد تحميل الصفحة
5. انسخ أي طلبات فاشلة
6. أرسل لي:
   - رسائل الخطأ من Console
   - أي طلبات فاشلة من Network
   - محتوى ملف `.env` (بدون القيم الحقيقية)

---

**آخر تحديث:** 2026-01-19
