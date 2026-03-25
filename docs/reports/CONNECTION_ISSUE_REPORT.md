# ⚠️ مشكلة الاتصال وحلها

---

## 📊 **التشخيص:**

### ✅ **ما تم:**
1. ✅ حفظ كلمة المرور: `EH7NytvJA#t/yEE`
2. ✅ تشفير URL للرموز الخاصة: `EH7NytvJA%23t%2FyEE`
3. ✅ إنشاء ملف `.env.local`
4. ✅ الحصول على معلومات المشروع من Supabase CLI

### ❌ **المشكلة:**
- DNS لا يحل `db.wzkklenfsaepegymfxfz.supabase.co`
- Connection String قد يكون مختلف عما توقعناه
- قد يكون المشروع يستخدم subdomain مختلف

---

## 🎯 **الحل:**

يجب الحصول على Connection String **الصحيح** مباشرة من Supabase Dashboard.

### **الطريقة الأسهل:**

#### **الخطوة 1: افتح Supabase Dashboard**

افتح هذا الرابط في المتصفح:
```
https://supabase.com/dashboard/project/wzkklenfsaepegymfxfz/settings/database
```

#### **الخطوة 2: ابحث عن Connection String**

في الصفحة، ابحث عن قسم:
- **"Connection string"** أو
- **"Connection pooling"**

#### **الخطوة 3: اختر الوضع**

اختر: **Transaction Pooling** (port 6543)

#### **الخطوة 4: انسخ**

ستجد Connection String يشبه:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@[ACTUAL-HOST]:6543/postgres
```

#### **الخطوة 5: استبدل كلمة المرور**

استبدل `[YOUR-PASSWORD]` بـ:
```
EH7NytvJA#t/yEE
```

أو للرموز الخاصة، استخدم النسخة المشفرة:
```
EH7NytvJA%23t%2FyEE
```

#### **الخطوة 6: الصق هنا**

بعد الحصول على Connection String الكامل، أرسله لي وسأقوم بالربط.

---

## 💡 **بديل سريع:**

إذا كان لديك Connection String الصحيح الآن، أرسله لي بهذا الشكل:

```
postgresql://postgres.xxxxx:PASSWORD@actual-host.supabase.com:6543/postgres
```

---

## 🔍 **معلومات المشروع:**

من Supabase CLI:
```json
{
  "name": "TexaCore ERP",
  "id": "wzkklenfsaepegymfxfz",
  "region": "eu-west-2",
  "status": "ACTIVE_HEALTHY",
  "database": {
    "host": "db.wzkklenfsaepegymfxfz.supabase.co",
    "postgres_engine": "17",
    "version": "17.6.1.063"
  }
}
```

لكن هذا Host لا يعمل (مشكلة DNS).

---

## 🎯 **الإجراء المطلوب:**

**أرسل لي screenshot من صفحة Database Settings** يظهر فيه Connection String الفعلي.

أو:

**انسخ Connection String من Dashboard والصقه هنا** وسأقوم بالربط فوراً.

---

**كلمة المرور جاهزة عندي:** `EH7NytvJA#t/yEE` ✅

**ينقص فقط:** Connection String الصحيح من Dashboard 🔍
