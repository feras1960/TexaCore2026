# 🚀 دليل تنفيذ ميزات الأتمتة المتقدمة — خطوة بخطوة

> **تاريخ الإنشاء:** 2026-02-09  
> **الحالة:** جاهز للتنفيذ  
> **المتطلبات:** صلاحية الوصول إلى Supabase SQL Editor + n8n

---

## 📋 ملخص ما تم إنجازه (الملفات الجاهزة)

| # | الملف | الغرض | الحالة |
|---|-------|-------|--------|
| 1 | `supabase/scripts/STEP_1_ADVANCED_FEATURES_SCHEMA.sql` | جداول QR + Telegram + سياسات RLS | ✅ جاهز |
| 2 | `supabase/scripts/STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql` | جداول المكالمات + الشحن + البنوك | ✅ جاهز |
| 3 | `n8n-workflows/supabase-rpc-functions.sql` | دوال التقارير اليومية/الشهرية | ✅ جاهز |
| 4 | `n8n-workflows/supabase-webhook-trigger.sql` | Trigger إرسال أحداث لـ n8n | ✅ جاهز |
| 5 | `n8n-workflows/01-telegram-notifications.json` | إشعارات Telegram | ✅ مُصحح |
| 6 | `n8n-workflows/02-qr-scan-workflow.json` | QR Scan عبر REST API | ✅ مُحوّل |
| 7 | `n8n-workflows/03-ai-telegram-assistant.json` | مساعد AI عبر Telegram | ⚠️ يحتاج API Key |

---

## 🔧 خطوات التنفيذ في Supabase SQL Editor

### الخطوة 1: تشغيل مخطط QR + Telegram
📂 **الملف:** `supabase/scripts/STEP_1_ADVANCED_FEATURES_SCHEMA.sql`

**ماذا يفعل:**
- يضيف أعمدة Telegram لجداول `customers` و `user_profiles`
- ينشئ جدول `qr_codes` مع CHECK constraints
- ينشئ جدول `qr_scans` (سجل المسح)
- ينشئ فهارس الأداء
- يفعّل RLS بالنمط الرسمي (`get_user_tenant_id()`, `is_platform_admin()`, إلخ)
- ينشئ دالة `update_entity_status_on_scan()`
- ينشئ trigger تحديث `updated_at`

**كيف تنفذه:**
1. افتح Supabase Dashboard → SQL Editor
2. انسخ محتوى الملف كاملاً
3. اضغط **Run**
4. تأكد من ظهور رسائل النجاح بدون أخطاء

---

### الخطوة 2: تشغيل مخطط المكالمات + الشحن + البنوك
📂 **الملف:** `supabase/scripts/STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql`

**ماذا يفعل:**
- ينشئ جداول: `call_logs`, `call_analyses`, `shipments_tracking`, `bank_integrations`, `notification_preferences`
- يضيف CHECK constraints + فهارس أداء
- يفعّل RLS بالنمط الرسمي
- `bank_integrations` مقيدة بـ `is_tenant_admin()` (بيانات حساسة)
- `qr_scans` و `call_analyses` لا تُعدّل (immutable logs)

**كيف تنفذه:**
1. في SQL Editor → New Query
2. انسخ محتوى الملف والصقه
3. اضغط **Run**

---

### الخطوة 3: تشغيل دوال التقارير (RPC)
📂 **الملف:** `n8n-workflows/supabase-rpc-functions.sql`

**ماذا يفعل:**
- ينشئ 5 دوال RPC: `get_daily_stats`, `get_monthly_summary`, `get_fund_balances`, `get_monthly_sales`, `get_monthly_expenses`
- كل دالة تستخدم `get_user_tenant_id()` الرسمية
- يمنع وصول `anon` (أمان)
- يمنح الوصول لـ `authenticated` و `service_role`

**كيف تنفذه:**
1. في SQL Editor → New Query
2. انسخ والصق
3. اضغط **Run**

---

### الخطوة 4 (اختياري): تشغيل Webhook Trigger
📂 **الملف:** `n8n-workflows/supabase-webhook-trigger.sql`

**⚠️ متطلبات مسبقة:**
- تفعيل إضافة `pg_net` في Supabase:
  - Dashboard → Database → Extensions → البحث عن `pg_net` → Enable
- تحديث URL الـ webhook في الملف (سطر 21)

**ماذا يفعل:**
- ينشئ دالة `notify_n8n_webhook()` ترسل أحداث القيود لـ n8n
- ينشئ trigger على `journal_entries`
- يتضمن EXCEPTION block (إذا فشل n8n لا تفشل العملية)
- يرسل `tenant_id` في الـ payload

**كيف تنفذه:**
1. **أولاً:** فعّل `pg_net` من Extensions
2. **عدّل** URL الـ webhook في السطر 21
3. في SQL Editor → انسخ والصق واضغط **Run**

---

### الخطوة 5: فحص شامل
📂 **الملف:** `supabase/scripts/VERIFY_ALL_ADVANCED_FEATURES.sql`

**ماذا يفحص:**
- ✅ وجود الجداول (7 جداول)
- ✅ وجود الأعمدة المضافة (8 أعمدة)
- ✅ سياسات RLS (تسمية صحيحة + 4 لكل جدول)
- ✅ تفعيل RLS
- ✅ العلاقات (Foreign Keys)
- ✅ الفهارس
- ✅ CHECK Constraints
- ✅ الدوال والـ Triggers
- ✅ استخدام الدوال المساعدة الرسمية

**كيف تنفذه:**
1. في SQL Editor → انسخ والصق
2. اضغط **Run**
3. راجع النتائج — كل شيء يجب أن يكون ✅

---

## 🤖 خطوات التنفيذ في n8n

### الخطوة 6: استيراد Workflows
1. افتح n8n Dashboard
2. اذهب إلى **Workflows → Import from File**
3. استورد الملفات بالترتيب:
   - `01-telegram-notifications.json`
   - `02-qr-scan-workflow.json`
   - `03-ai-telegram-assistant.json` (اختياري)

### الخطوة 7: إعداد Credentials في n8n
1. **Telegram Bot:**
   - اذهب إلى Settings → Credentials → Add Credential
   - اختر "Telegram API"
   - أدخل Bot Token من [@BotFather](https://t.me/BotFather)
   - احفظ واربطه بالـ workflows

2. **Supabase REST API:**
   - الـ workflows تستخدم HTTP Request مع Headers
   - تأكد أن `SUPABASE_URL` و `SUPABASE_SERVICE_KEY` صحيحة
   - (موجودة في Supabase Dashboard → Settings → API)

3. **Gemini API Key** (للملف 03 فقط):
   - احصل على مفتاح من [Google AI Studio](https://aistudio.google.com/)
   - استبدل `YOUR_GEMINI_API_KEY` في workflow الـ AI

### الخطوة 8: تفعيل Workflows
1. بعد الاستيراد والإعداد
2. فعّل كل workflow (Toggle → Active)
3. اختبر بإرسال `/start` لبوت Telegram

---

## ⚡ ترتيب التنفيذ السريع

```
Supabase SQL Editor:
  ① STEP_1_ADVANCED_FEATURES_SCHEMA.sql     ← أولاً (الأساس)
  ② STEP_2_COMMUNICATIONS_AND_SHIPMENTS.sql  ← ثانياً (البناء)
  ③ supabase-rpc-functions.sql               ← ثالثاً (الدوال)
  ④ supabase-webhook-trigger.sql             ← رابعاً (اختياري)
  ⑤ VERIFY_ALL_ADVANCED_FEATURES.sql         ← أخيراً (الفحص)

n8n:
  ⑥ Import workflows
  ⑦ Configure credentials  
  ⑧ Activate & test
```

---

## ⚠️ ملاحظات مهمة

1. **الترتيب مهم!** — الخطوة 1 قبل 2 (لأن الخطوة 2 قد تعتمد على جداول الخطوة 1)
2. **الخطوة 4 اختيارية** — تعمل فقط مع `pg_net` مفعّل
3. **كل الملفات آمنة لإعادة التشغيل** — تستخدم `IF NOT EXISTS` و `CREATE OR REPLACE`
4. **لا تنسَ الـ Credentials** — بدون ضبطها لن تعمل الـ workflows
5. **جميع السياسات تتبع النمط الرسمي:**
   - `is_platform_admin()` — مدير المنصة يرى الكل
   - `is_partner_or_reseller()` + `get_partner_tenant_ids()` — الوكيل يرى مشتركيه
   - `is_same_brand(tenant_id)` + `get_user_tenant_id()` — المستخدم يرى تينانته ببراند
   - `is_tenant_admin()` — صلاحيات إدارية خاصة
   - سياسة `_delete_policy` دائماً أكثر تقييداً

---

## 📊 نظرة على نمط العزل الرسمي

```
Brand (saas_product)
  └── Tenant (مشترك)
       └── Company (شركة)
            └── User (موظف)

العزل في السياسات:
  Platform Admin → يرى كل شيء
  Partner/Reseller → يرى مشتركيه فقط (ضمن البراندات المسموحة)
  Tenant Owner → يرى كل شركات تينانته
  Regular User → يرى شركته فقط (ضمن نفس البراند والتينانت)
```
