# 🧪 Backend Testing Guide

## الملفات المُنشأة

### 1. `test-backend.js`
سكريبت Node.js لاختبار شامل للـ Backend

## المتطلبات

```bash
npm install @supabase/supabase-js
```

## كيفية التشغيل

### الطريقة 1: باستخدام Node.js مباشرة

```bash
node test-backend.js
```

### الطريقة 2: عبر npm script

أضف في `package.json`:

```json
{
  "scripts": {
    "test:backend": "node test-backend.js"
  }
}
```

ثم شغّل:

```bash
npm run test:backend
```

---

## الاختبارات المتضمنة

### ✅ Test 1: Supabase Connection
- التحقق من الاتصال بقاعدة البيانات

### ✅ Test 2: New Tables Verification
يتحقق من وجود الجداول الجديدة:
- `module_features`
- `plan_module_features`
- `ui_tabs`
- `plan_ui_tabs`
- `system_languages`
- `tenant_languages`

### ✅ Test 3: System Languages Data
- عرض جميع اللغات المتاحة (9 لغات)
- التحقق من البيانات الكاملة

### ✅ Test 4: Module Features Data
- عرض الميزات لكل موديول
- إحصائيات الميزات

### ✅ Test 5: UI Tabs Data
- عرض التبويبات لكل قسم
- إحصائيات التبويبات

### ✅ Test 6: PostgreSQL Functions
يختبر الدوال التالية:
- `get_tenant_active_languages()`
- `check_language_limit()`
- `get_tenant_available_modules()`
- `check_feature_access()`
- `get_allowed_tabs()`

### ✅ Test 7: Data Insertion Test
- اختبار إضافة لغة جديدة
- التحقق من الدالة `enable_tenant_language()`

### ✅ Test 8: Subscription Plans
- التحقق من إعدادات الباقات
- عرض حدود اللغات لكل باقة

---

## مثال على النتائج

```
============================================================
🧪 TexaCore Backend Testing Suite
============================================================

ℹ️  Testing Modules, Features & Multi-Language System

## Test 1: Supabase Connection
✅ Supabase Connection - Connected successfully

## Test 2: New Tables Verification
✅ Table: module_features - Exists and accessible
✅ Table: plan_module_features - Exists and accessible
✅ Table: ui_tabs - Exists and accessible
✅ Table: plan_ui_tabs - Exists and accessible
✅ Table: system_languages - Exists and accessible
✅ Table: tenant_languages - Exists and accessible

## Test 3: System Languages Data
ℹ️  Found 9 languages: ar, de, en, it, pl, ro, ru, tr, uk
✅ System Languages - 9/9 languages present

📋 Available Languages:
   🇸🇦 AR: العربية / Arabic
   🇩🇪 DE: الألمانية / German
   🇬🇧 EN: الإنجليزية / English
   ...

## Test 4: Module Features Data
ℹ️  Found 43 features
✅ Module Features - 43 features loaded

📋 Features by Module:
   accounting: 12 features
   sales: 8 features
   inventory: 10 features
   fabric: 13 features

...

============================================================
📊 Test Summary
============================================================

Total Tests:  25
Passed:       25
Failed:       0
Duration:     3.45s

✅ All tests passed! 🎉
```

---

## استكشاف الأخطاء

### خطأ: "Cannot connect to Supabase"
- تأكد من ملف `.env` موجود
- تحقق من صحة الـ URL والـ Key

### خطأ: "Table not found"
- تأكد من تطبيق الـ migrations:
  - `STEP_32_modules_and_features_system.sql`
  - `STEP_32_B_multi_language_system.sql`

### خطأ: "Function not found"
- تأكد من تطبيق كل الدوال في الـ migrations

### خطأ: "No active tenant"
- تأكد من وجود tenant بحالة 'active' في قاعدة البيانات

---

## ملاحظات

- ✅ السكريبت آمن - لا يحذف أو يعدل بيانات مهمة
- ✅ يمكن تشغيله عدة مرات
- ✅ يعرض نتائج مفصلة وواضحة
- ✅ يعطي تقرير شامل في النهاية

---

## الخطوة القادمة

بعد نجاح الاختبارات:
1. ✅ تأكد من أن كل الاختبارات خضراء
2. 🚀 ابدأ بتطبيق النظام في الواجهة (Frontend)
3. 🎨 حدّث المكونات لاستخدام الـ Hooks الجديدة
