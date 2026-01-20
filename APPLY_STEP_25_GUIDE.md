# دليل تطبيق STEP_25 - White Label System
# Guide to Apply STEP_25 White Label System

---

## 📋 الملف المطلوب تطبيقه

**`STEP_25_saas_white_label_system.sql`**

---

## 🚀 خطوات التطبيق

### الخطوة 1: فتح Supabase Dashboard

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك (Project ID: `wzkklenfsaepegymfxfz`)
3. من القائمة الجانبية، اختر **SQL Editor**

---

### الخطوة 2: تطبيق STEP_25

1. في SQL Editor، انقر على **New Query**
2. افتح الملف: `supabase/migrations/STEP_25_saas_white_label_system.sql`
3. انسخ **جميع** محتوى الملف
4. الصق في SQL Editor
5. انقر على **Run** (أو اضغط `Ctrl+Enter` / `Cmd+Enter`)

**⚠️ ملاحظة:** قد يستغرق التنفيذ بضع دقائق حسب حجم البيانات

**✅ النتيجة المتوقعة:**
- إضافة 12 حقل لجدول `agents`
- إنشاء 4 جداول جديدة
- إنشاء 5 Functions
- إنشاء 1 View
- إنشاء Indexes
- رسائل نجاح

---

### الخطوة 3: التحقق من التطبيق

#### 3.1 التحقق من حقول agents:

```sql
-- التحقق من الحقول الجديدة في agents
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'agents'
  AND column_name LIKE 'white_label%'
ORDER BY column_name;
```

**✅ يجب أن ترى 12 حقل**

#### 3.2 التحقق من الجداول الجديدة:

```sql
-- التحقق من جداول White Label
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'white_label_domains',
    'white_label_configs',
    'white_label_payments',
    'white_label_stats'
  )
ORDER BY table_name;
```

**✅ يجب أن ترى 4 جداول**

#### 3.3 التحقق من Functions:

```sql
-- التحقق من Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%white_label%'
ORDER BY routine_name;
```

**✅ يجب أن ترى 5 Functions**

#### 3.4 التحقق من Views:

```sql
-- التحقق من Views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'white_label_summary_view';
```

**✅ يجب أن ترى 1 View**

---

## ⚠️ حل المشاكل الشائعة

### مشكلة 1: خطأ "column already exists"
**السبب:** الحقل موجود مسبقاً

**الحل:**
- الملف يستخدم `ADD COLUMN IF NOT EXISTS` - يجب أن يعمل بدون مشاكل
- إذا استمرت المشكلة، تحقق من أن الحقل موجود بالفعل

### مشكلة 2: خطأ "relation already exists"
**السبب:** الجدول موجود مسبقاً

**الحل:**
- الملف يستخدم `CREATE TABLE IF NOT EXISTS` - يجب أن يعمل بدون مشاكل
- إذا استمرت المشكلة، تحقق من أن الجدول موجود بالفعل

### مشكلة 3: خطأ "function does not exist"
**السبب:** دالة مساعدة غير موجودة

**الحل:**
- تأكد من تطبيق جميع ملفات Migration السابقة (STEP_01 إلى STEP_24)
- الدوال المطلوبة موجودة في ملفات Migration السابقة

---

## ✅ Checklist بعد التطبيق

- [ ] تم تطبيق STEP_25 بنجاح
- [ ] جميع الحقول موجودة في `agents` (12 حقل)
- [ ] جميع الجداول موجودة (4 جداول)
- [ ] جميع Functions موجودة (5 Functions)
- [ ] View موجود (1 View)
- [ ] لا توجد أخطاء في النتائج

---

## 📚 الخطوات التالية

بعد تطبيق STEP_25 بنجاح:

1. **إنشاء RLS Policies:**
   - إنشاء `STEP_26_saas_rls_policies.sql`
   - تطبيق RLS Policies على جميع الجداول الجديدة

2. **إنشاء Core Tables:**
   - إنشاء `STEP_27_saas_core_tables.sql`
   - إضافة جداول SaaS الأساسية (subscriptions, plans, modules)

3. **بدء تطوير Frontend:**
   - إنشاء Services
   - إنشاء Components
   - إضافة إلى ComponentLab

---

## 📊 ملخص ما تم إضافته

### في جدول `agents`:
- ✅ 12 حقل جديد للـ White Label

### جداول جديدة:
- ✅ `white_label_domains` - إدارة الدومينات
- ✅ `white_label_configs` - إعدادات العلامة التجارية
- ✅ `white_label_payments` - سجل الدفعات
- ✅ `white_label_stats` - الإحصائيات

### Functions:
- ✅ `register_white_label_payment()` - تسجيل دفعة
- ✅ `activate_white_label()` - تفعيل White Label
- ✅ `add_white_label_domain()` - إضافة دومين
- ✅ `verify_white_label_domain()` - التحقق من الدومين
- ✅ `check_white_label_validity()` - التحقق من الصلاحية

### Views:
- ✅ `white_label_summary_view` - ملخص شامل

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
