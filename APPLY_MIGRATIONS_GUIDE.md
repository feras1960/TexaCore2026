# دليل تطبيق Migrations على Supabase
# Step-by-Step Guide to Apply Migrations

---

## 📋 الملفات المطلوب تطبيقها

### ✅ الملفات الجاهزة:
1. **STEP_23_saas_agent_system.sql** - نظام الوكلاء والمسوقين
2. **STEP_24_saas_advanced_features.sql** - الميزات المتقدمة

---

## 🚀 خطوات التطبيق

### الخطوة 1: فتح Supabase Dashboard

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك (Project ID: `wzkklenfsaepegymfxfz`)
3. من القائمة الجانبية، اختر **SQL Editor**

---

### الخطوة 2: تطبيق STEP_23

1. في SQL Editor، انقر على **New Query**
2. افتح الملف: `supabase/migrations/STEP_23_saas_agent_system.sql`
3. انسخ **جميع** محتوى الملف
4. الصق في SQL Editor
5. انقر على **Run** (أو اضغط `Ctrl+Enter` / `Cmd+Enter`)

**⚠️ ملاحظة:** قد يستغرق التنفيذ بضع دقائق حسب حجم البيانات

**✅ النتيجة المتوقعة:**
- إنشاء 9 جداول جديدة
- إضافة 3 حقول لجدول `tenants`
- إنشاء Indexes
- رسائل نجاح في النتائج

---

### الخطوة 3: تطبيق STEP_24

1. في SQL Editor، انقر على **New Query** (أو امسح المحتوى السابق)
2. افتح الملف: `supabase/migrations/STEP_24_saas_advanced_features.sql`
3. انسخ **جميع** محتوى الملف
4. الصق في SQL Editor
5. انقر على **Run**

**✅ النتيجة المتوقعة:**
- إنشاء 14 جدول جديد
- إضافة 2 حقول لجدول `tenants`
- إدراج 6 قوالب إشعارات افتراضية
- إنشاء Indexes
- رسائل نجاح في النتائج

---

### الخطوة 4: التحقق من التطبيق

#### 4.1 التحقق من الجداول:

```sql
-- التحقق من جداول Agent System
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'agents', 'agent_tiers', 'agent_commissions', 
    'agent_withdrawals', 'agent_targets', 'agent_bonuses',
    'agent_events', 'agent_messages', 'marketing_materials'
  )
ORDER BY table_name;
```

**✅ يجب أن ترى 9 جداول**

#### 4.2 التحقق من جداول Advanced Features:

```sql
-- التحقق من جداول Advanced Features
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'discount_coupons', 'coupon_usage',
    'notification_templates', 'notifications', 'in_app_notifications',
    'support_tickets', 'ticket_replies',
    'announcements', 'reviews', 'changelog',
    'usage_analytics', 'referral_program', 'tenant_referrals',
    'webhook_endpoints', 'webhook_logs'
  )
ORDER BY table_name;
```

**✅ يجب أن ترى 14 جدول**

#### 4.3 التحقق من حقول tenants:

```sql
-- التحقق من الحقول الجديدة في tenants
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
  AND column_name IN (
    'agent_id', 'referral_code', 'referral_source',
    'tenant_referral_code', 'referral_credits'
  )
ORDER BY column_name;
```

**✅ يجب أن ترى 5 حقول**

#### 4.4 التحقق من قوالب الإشعارات:

```sql
-- التحقق من قوالب الإشعارات الافتراضية
SELECT code, name_ar, notification_type 
FROM notification_templates 
ORDER BY code;
```

**✅ يجب أن ترى 6 قوالب**

#### 4.5 التحقق من مستويات الوكلاء:

```sql
-- التحقق من مستويات الوكلاء
SELECT code, name_ar, commission_percent, recurring_commission_percent 
FROM agent_tiers 
ORDER BY display_order;
```

**✅ يجب أن ترى 5 مستويات (Bronze, Silver, Gold, Platinum, Diamond)**

---

## ⚠️ حل المشاكل الشائعة

### مشكلة 1: خطأ "relation already exists"
**السبب:** الجدول موجود مسبقاً

**الحل:**
- الملفات تستخدم `CREATE TABLE IF NOT EXISTS` - يجب أن تعمل بدون مشاكل
- إذا استمرت المشكلة، تحقق من أن الجدول موجود بالفعل

### مشكلة 2: خطأ "column already exists"
**السبب:** الحقل موجود مسبقاً في جدول `tenants`

**الحل:**
- الملفات تستخدم `ADD COLUMN IF NOT EXISTS` - يجب أن تعمل بدون مشاكل
- إذا استمرت المشكلة، تحقق من أن الحقل موجود بالفعل

### مشكلة 3: خطأ "function does not exist"
**السبب:** دالة مساعدة غير موجودة

**الحل:**
- تأكد من تطبيق جميع ملفات Migration السابقة (STEP_01 إلى STEP_22)
- الدوال المطلوبة موجودة في ملفات Migration السابقة

### مشكلة 4: خطأ "permission denied"
**السبب:** لا توجد صلاحيات كافية

**الحل:**
- تأكد من أنك تستخدم حساب Super Admin
- أو استخدم Service Role Key في SQL Editor

---

## ✅ Checklist بعد التطبيق

- [ ] تم تطبيق STEP_23 بنجاح
- [ ] تم تطبيق STEP_24 بنجاح
- [ ] جميع الجداول موجودة (23 جدول)
- [ ] جميع الحقول موجودة في `tenants` (5 حقول)
- [ ] قوالب الإشعارات موجودة (6 قوالب)
- [ ] مستويات الوكلاء موجودة (5 مستويات)
- [ ] لا توجد أخطاء في النتائج

---

## 📚 الخطوات التالية

بعد تطبيق Migrations بنجاح:

1. **إنشاء RLS Policies:**
   - إنشاء `STEP_25_saas_rls_policies.sql`
   - تطبيق RLS Policies على جميع الجداول الجديدة

2. **إنشاء Functions:**
   - إنشاء `STEP_26_saas_functions.sql`
   - إضافة Functions للوكلاء والميزات المتقدمة

3. **إنشاء Core Tables:**
   - إنشاء `STEP_27_saas_core_tables.sql`
   - إضافة جداول SaaS الأساسية (subscriptions, plans, modules)

4. **بدء تطوير Frontend:**
   - إنشاء Services
   - إنشاء Components
   - إضافة إلى ComponentLab

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من رسائل الخطأ في SQL Editor
2. راجع ملفات Migration للتأكد من الصحة
3. تحقق من وجود جميع الجداول والدوال المطلوبة

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
