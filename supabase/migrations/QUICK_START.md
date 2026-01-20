# دليل البدء السريع - تطبيق تدريجي
# Quick Start Guide - Step-by-Step Application

## 🎯 الهدف
تطبيق التحديثات على قاعدة البيانات بشكل تدريجي وآمن **بدون توقف العمل**.

---

## 📋 الخطوات (5 خطوات أساسية)

### ✅ الخطوة 1: إنشاء جدول tenants
**الملف:** `STEP_01_create_tenants.sql`
**الوقت المتوقع:** 30 ثانية
**التأثير:** ✅ لا يؤثر على العمل الحالي

```sql
-- انسخ محتوى STEP_01_create_tenants.sql
-- والصقه في Supabase SQL Editor
```

**التحقق:**
```sql
SELECT * FROM tenants;
-- يجب أن ترى tenant واحد باسم "Default Tenant"
```

---

### ✅ الخطوة 2: إضافة tenant_id (NULL)
**الملف:** `STEP_02_add_tenant_id_nullable.sql`
**الوقت المتوقع:** 1 دقيقة
**التأثير:** ✅ لا يؤثر - الحقل NULL مؤقتاً

```sql
-- انسخ محتوى STEP_02_add_tenant_id_nullable.sql
-- والصقه في Supabase SQL Editor
```

**التحقق:**
```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'tenant_id';
-- يجب أن ترى: is_nullable = YES
```

---

### ✅ الخطوة 3: ربط البيانات
**الملف:** `STEP_03_link_to_default_tenant.sql`
**الوقت المتوقع:** 30 ثانية
**التأثير:** ✅ يربط البيانات ب tenant افتراضي

```sql
-- انسخ محتوى STEP_03_link_to_default_tenant.sql
-- والصقه في Supabase SQL Editor
```

**التحقق:**
```sql
SELECT COUNT(*) FROM companies WHERE tenant_id IS NOT NULL;
-- يجب أن يكون العدد = عدد companies
```

---

### ✅ الخطوة 4: جعل tenant_id مطلوب
**الملف:** `STEP_04_make_tenant_id_required.sql`
**الوقت المتوقع:** 10 ثواني
**التأثير:** ✅ تأمين البيانات

```sql
-- انسخ محتوى STEP_04_make_tenant_id_required.sql
-- والصقه في Supabase SQL Editor
```

**التحقق:**
```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'tenant_id';
-- يجب أن ترى: is_nullable = NO
```

---

### ✅ الخطوة 5: إضافة حقول جديدة
**الملف:** `STEP_05_add_new_fields.sql`
**الوقت المتوقع:** 30 ثانية
**التأثير:** ✅ إضافة حقول جديدة فقط

```sql
-- انسخ محتوى STEP_05_add_new_fields.sql
-- والصقه في Supabase SQL Editor
```

**التحقق:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name IN ('code', 'name_ar', 'name_en');
-- يجب أن ترى الحقول الجديدة
```

---

## 🎉 مبروك!

بعد الخطوات الخمس، لديك:
- ✅ جدول tenants
- ✅ tenant_id في جميع الجداول
- ✅ بياناتك مرتبطة بـ tenant افتراضي
- ✅ حقول جديدة جاهزة

---

## 📝 الخطوات التالية (اختياري)

بعد التأكد من أن كل شيء يعمل:

1. **جداول المحاسبة:** `STEP_06a_account_types.sql` (سيتم إنشاؤها لاحقاً)
2. **العملاء والموردين:** `STEP_08_customers.sql` (سيتم إنشاؤها لاحقاً)
3. **المخزون:** `STEP_09_inventory.sql` (سيتم إنشاؤها لاحقاً)

---

## ⚠️ نصائح مهمة

1. **طبّق خطوة واحدة في كل مرة** - لا تطبق كل شيء دفعة واحدة
2. **اختبر بعد كل خطوة** - تأكد أن التطبيق يعمل
3. **انسخ احتياطي** - قبل البدء، اعمل نسخة احتياطية
4. **في حالة الخطأ** - راجع الرسائل في Supabase SQL Editor

---

## 🆘 حل المشاكل

### خطأ: "tenant not found"
**الحل:** تأكد من تطبيق STEP_01 أولاً

### خطأ: "column already exists"
**الحل:** هذا طبيعي - الخطوة تم تطبيقها مسبقاً

### خطأ: "cannot add NOT NULL"
**الحل:** تأكد من تطبيق STEP_03 أولاً لربط البيانات

---

**ابدأ الآن بالخطوة 1! 🚀**
