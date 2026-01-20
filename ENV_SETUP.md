# إعداد ملف .env
# Environment Variables Setup

## 📋 الخطوات

### 1. إنشاء ملف `.env`

أنشئ ملف `.env` في جذر المشروع (نفس مستوى `package.json`):

```bash
# في terminal
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
touch .env
```

### 2. الحصول على قيم Supabase

#### أ) اذهب إلى Supabase Dashboard:
- افتح: https://app.supabase.com
- سجّل الدخول إلى حسابك
- اختر المشروع الخاص بك

#### ب) الحصول على Project URL:
1. اذهب إلى **Settings** (الإعدادات) في القائمة الجانبية
2. اختر **API**
3. في قسم **Project URL**، انسخ الرابط
   - مثال: `https://abcdefghijklmnop.supabase.co`

#### ج) الحصول على Anon Key:
1. في نفس صفحة **API Settings**
2. في قسم **Project API keys**
3. انسخ **`anon` `public`** key
   - هذا هو المفتاح العام الآمن للاستخدام في Frontend

### 3. إضافة القيم إلى `.env`

افتح ملف `.env` وأضف:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**مثال:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example-key-here
```

### 4. التحقق من الإعداد

بعد إضافة القيم:

1. **أعد تشغيل Development Server:**
   ```bash
   npm run dev
   ```

2. **تحقق من Console:**
   - افتح Developer Tools (F12)
   - اذهب إلى Console
   - يجب ألا ترى رسالة: `⚠️ Supabase URL or Anon Key is missing`

---

## ⚠️ ملاحظات مهمة

1. **لا تشارك ملف `.env`:**
   - ملف `.env` موجود في `.gitignore` - لا يتم رفعه إلى Git
   - لا تشارك القيم مع أي شخص

2. **Anon Key آمن:**
   - `anon` key آمن للاستخدام في Frontend
   - RLS Policies تحمي البيانات
   - لا تستخدم `service_role` key في Frontend أبداً!

3. **تغيير القيم:**
   - إذا غيرت القيم، أعد تشغيل Development Server

---

## 🔍 التحقق من الإعداد

بعد إعداد `.env`، يمكنك التحقق:

```typescript
// في أي component
import { supabase } from '@/lib/supabase';

console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

---

## ❓ مشاكل شائعة

### المشكلة: "Supabase URL or Anon Key is missing"
**الحل:**
- تأكد من أن ملف `.env` في جذر المشروع
- تأكد من أن المتغيرات تبدأ بـ `VITE_`
- أعد تشغيل Development Server

### المشكلة: "Invalid API key"
**الحل:**
- تأكد من نسخ `anon` key وليس `service_role`
- تأكد من عدم وجود مسافات إضافية في `.env`

---

## ✅ بعد الإعداد

بعد إعداد `.env` بنجاح:
1. ✅ يمكنك تسجيل الدخول
2. ✅ يمكنك جلب البيانات
3. ✅ RLS Policies تعمل تلقائياً
4. ✅ Multi-Tenant يعمل بشكل صحيح
