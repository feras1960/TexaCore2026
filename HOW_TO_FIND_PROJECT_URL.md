# كيفية العثور على Project URL في Supabase
# How to Find Project URL in Supabase

## 📍 الطريقة 1: من Dashboard الرئيسي

### الخطوات:

1. **افتح Supabase Dashboard:**
   - اذهب إلى: https://app.supabase.com
   - سجّل الدخول

2. **اختر مشروعك:**
   - من قائمة المشاريع، اختر المشروع الخاص بك

3. **في الصفحة الرئيسية للمشروع:**
   - في أعلى الصفحة، ستجد **Project URL**
   - مثال: `https://wzkklenfsaepegymfxfz.supabase.co`
   - انسخ هذا الرابط

---

## 📍 الطريقة 2: من Settings → API

### الخطوات:

1. **من القائمة الجانبية:**
   - اضغط على **Settings** (الإعدادات) - أيقونة الترس ⚙️
   - اختر **API**

2. **في صفحة API Settings:**
   - في قسم **Project URL**
   - ستجد الرابط مثل:
     ```
     https://wzkklenfsaepegymfxfz.supabase.co
     ```
   - انسخ هذا الرابط

---

## 📍 الطريقة 3: من Project Settings

### الخطوات:

1. **من القائمة الجانبية:**
   - اضغط على **Settings** (الإعدادات)
   - اختر **General**

2. **في صفحة General Settings:**
   - في قسم **Project URL**
   - ستجد الرابط
   - انسخه

---

## 🔍 إذا لم تجده في أي مكان:

### الطريقة البديلة: بناء URL من Project ID

إذا كان لديك **Project ID** (مثل: `wzkklenfsaepegymfxfz`)، يمكنك بناء URL:

```
https://[PROJECT_ID].supabase.co
```

**مثال:**
```
https://wzkklenfsaepegymfxfz.supabase.co
```

---

## 📸 أين تجد Project ID؟

1. **من Dashboard الرئيسي:**
   - في أعلى الصفحة بجانب اسم المشروع
   - أو في URL المتصفح: `https://app.supabase.com/project/[PROJECT_ID]`

2. **من Settings → General:**
   - في قسم **Project ID**

---

## ✅ بعد العثور على Project URL

انسخ الرابط وأرسله لي، وسأحدث ملف `.env` تلقائياً.

**أو** يمكنك تحديثه يدوياً في ملف `.env`:

```env
VITE_SUPABASE_URL=https://wzkklenfsaepegymfxfz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN
```

---

## 💡 نصيحة

إذا كان Project ID هو `wzkklenfsaepegymfxfz`، فـ Project URL هو:
```
https://wzkklenfsaepegymfxfz.supabase.co
```

يمكنك تجربة هذا الرابط مباشرة!
