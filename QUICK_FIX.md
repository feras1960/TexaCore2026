# ⚡ إصلاح سريع للشاشة السوداء - Quick Fix

## 🔍 التشخيص السريع

### 1. افتح Console في المتصفح
```
F12 → Console Tab
```

### 2. ابحث عن الأخطاء
- أخطاء باللون الأحمر
- رسائل تحذير صفراء

### 3. الأخطاء الشائعة

#### ❌ Error: Cannot find module '@/...'
**الحل:**
```bash
# أعد تشغيل Dev Server
npm run dev
```

#### ❌ Error: VITE_SUPABASE_URL is not defined
**الحل:**
```bash
# أنشئ ملف .env
cat > .env << EOF
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
EOF
```

#### ❌ Error: useLanguage must be used within LanguageProvider
**الحل:** هذا يعني أن `AppProviders` لا يلف `AppRoutes` بشكل صحيح.

---

## 🛠️ الحل السريع

### الخطوة 1: امسح Cache
```bash
rm -rf node_modules .vite dist
npm install
npm run dev
```

### الخطوة 2: تحقق من .env
```bash
cat .env
# يجب أن يحتوي على VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
```

### الخطوة 3: افتح Console
- اضغط F12
- اذهب إلى Console
- انسخ أي أخطاء

---

## 📋 قائمة التحقق

- [ ] `.env` موجود ويحتوي على القيم الصحيحة
- [ ] `npm run dev` يعمل بدون أخطاء
- [ ] Console لا يحتوي على أخطاء حمراء
- [ ] Network tab - جميع الملفات تُحمّل (200 OK)
- [ ] `node_modules` موجود ومحدث

---

## 🆘 إذا استمرت المشكلة

**انسخ من Console:**
1. جميع الأخطاء (Errors)
2. جميع التحذيرات (Warnings)
3. أي رسائل أخرى

**من Network:**
1. أي طلبات فاشلة (باللون الأحمر)
2. Status Code للأخطاء

---

**أرسل لي:**
- رسائل Console
- Network errors
- محتوى `.env` (بدون القيم الحقيقية)
