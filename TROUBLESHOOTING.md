# 🔧 استكشاف الأخطاء وإصلاحها - Troubleshooting

## المشاكل الشائعة وحلولها

### 1. البرنامج لا يعمل / لا يفتح

#### الحلول:

**أ. تحقق من الأخطاء في Console:**
```bash
# افتح المتصفح → F12 → Console
# ابحث عن أخطاء باللون الأحمر
```

**ب. تحقق من الـ Dev Server:**
```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
npm run dev
```

**ج. تحقق من الـ Environment Variables:**
```bash
# تأكد من وجود .env في الجذر
cat .env

# يجب أن يحتوي على:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

**د. امسح Cache وأعد البناء:**
```bash
# امسح node_modules و .vite
rm -rf node_modules .vite
npm install
npm run dev
```

---

### 2. خطأ في الـ Imports

**المشكلة:** `Cannot find module '@/...'`

**الحل:**
- تأكد من وجود `tsconfig.json` في الجذر
- تأكد من وجود `vite.config.ts` مع path aliases صحيحة
- أعد تشغيل TypeScript Server في VS Code (Cmd+Shift+P → "TypeScript: Restart TS Server")

---

### 3. خطأ في Routing

**المشكلة:** الصفحة لا تفتح أو تظهر بيضاء

**الحل:**
- تأكد من وجود Route في `App.tsx`
- تأكد من استخدام `useNavigate` و `useLocation` بشكل صحيح
- تحقق من Console للأخطاء

---

### 4. خطأ في الترجمة

**المشكلة:** النصوص لا تظهر أو تظهر كمفاتيح

**الحل:**
- تأكد من وجود المفاتيح في `src/i18n/locales/ar.json` و `en.json`
- تأكد من استخدام `t()` وليس نصوص ثابتة
- تحقق من `LanguageProvider` في `App.tsx`

---

### 5. خطأ في Services

**المشكلة:** البيانات لا تُحمل

**الحل:**
- تأكد من وجود `.env` مع Supabase credentials
- تحقق من Console للأخطاء
- تأكد من استخدام Services وليس Supabase مباشرة
- تحقق من RLS Policies في Supabase

---

## خطوات التشخيص السريع

### 1. فحص الأخطاء:
```bash
npm run build
```

### 2. فحص TypeScript:
```bash
npx tsc --noEmit
```

### 3. فحص Linter:
```bash
npm run lint
```

### 4. فحص الملفات:
```bash
# تأكد من وجود جميع الملفات
ls -la src/features/saas/
ls -la src/services/saas/
```

---

## الأخطاء الشائعة

### ❌ Error: Cannot find module
**الحل:** أعد تثبيت node_modules

### ❌ Error: Auth session missing
**الحل:** هذا طبيعي - تم إخفاؤه في Login.tsx

### ❌ Error: RLS Policy violation
**الحل:** تحقق من RLS Policies في Supabase

### ❌ Error: Invalid hook call
**الحل:** تأكد من استخدام hooks داخل Components فقط

---

## التحقق من التثبيت

```bash
# 1. تحقق من Node.js
node --version  # يجب أن يكون 18+

# 2. تحقق من npm
npm --version

# 3. تحقق من الملفات
ls -la package.json
ls -la .env

# 4. أعد التثبيت
npm install
```

---

## طلب المساعدة

إذا استمرت المشكلة:
1. افتح Console في المتصفح (F12)
2. انسخ رسالة الخطأ الكاملة
3. تحقق من Network tab للأخطاء
4. تحقق من ملف `.env`

---

**آخر تحديث:** 2026-01-19
