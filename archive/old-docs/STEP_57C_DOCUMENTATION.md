# 🎯 STEP 57C: نظام الاشتراك المرن (Flexible Subscription System)

## 📋 نظرة عامة

هذا النظام يوفر حلاً مرناً لإدارة الاشتراكات والمدفوعات مع:
- ✅ فوترة مرنة (شهري/يومي/مختلط)
- ✅ تفعيل تلقائي للاشتراكات عند الدفع
- ✅ حساب دقيق بالأيام
- ✅ نظام تنبيهات متقدم
- ✅ دعم الدفعات الجزئية والزائدة

---

## 🚀 التثبيت

### الخطوة 1: تنفيذ السكربت الرئيسي

```sql
-- في Supabase SQL Editor
\i supabase/migrations/STEP_57C_subscription_flexible_system.sql
```

أو انسخ محتوى الملف مباشرة في SQL Editor.

### الخطوة 2: التحقق من التثبيت

```sql
-- شغّل ملف الاختبار
\i test_step_57c.sql
```

---

## 🔧 التحديثات على قاعدة البيانات

### 1. جدول `subscription_plans`

**حقول جديدة:**
- `price_daily` - السعر اليومي (محسوب تلقائياً: price_monthly ÷ 30)
- `billing_mode` - نمط الفوترة: monthly, daily, flexible
- `minimum_days` - الحد الأدنى لعدد الأيام (افتراضي: 7)
- `grace_period_days` - فترة السماح (افتراضي: 3 أيام)

### 2. جدول `tenant_subscriptions`

**حقول جديدة:**
- `total_days_purchased` - إجمالي الأيام المشتراة
- `days_used` - الأيام المستخدمة
- `last_payment_date` - تاريخ آخر دفعة
- `last_payment_amount` - مبلغ آخر دفعة
- `remaining_balance` - الرصيد المتبقي
- `grace_period_end` - نهاية فترة السماح
- `auto_renew` - التجديد التلقائي
- `renewal_notification_sent` - هل تم إرسال إشعار التجديد

### 3. جدول جديد: `subscription_alerts`

جدول التنبيهات والإشعارات:
```sql
- id
- tenant_id
- subscription_id
- alert_type (expiry_warning, expired, payment_due, renewed, suspended)
- alert_date
- days_remaining
- amount_due
- message_ar / message_en
- status (pending, sent, dismissed, failed)
- sent_at
- sent_to (email/phone)
```

---

## 📚 الدوال المتاحة

### 1. `get_remaining_days(tenant_id)`

حساب الأيام المتبقية في الاشتراك.

**مثال:**
```sql
SELECT get_remaining_days('e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');
-- النتيجة: 15 (يوم)
```

---

### 2. `activate_subscription_from_payment(payment_id)` 🔥

**الدالة الرئيسية!** تفعيل/تجديد الاشتراك تلقائياً من الدفعة.

**كيف تعمل:**
1. تجلب بيانات الدفعة والباقة
2. تحسب عدد الأيام: `المبلغ ÷ السعر اليومي`
3. تتحقق من الحد الأدنى للأيام
4. تحدد تاريخ البداية والنهاية
5. تنشئ/تحدث الاشتراك
6. تجدول التنبيهات (7، 3، 0 أيام)
7. تحدث حالة المستأجر إلى active

**مثال:**
```sql
-- إنشاء دفعة
INSERT INTO saas_payments (
    payment_number, 
    tenant_id, 
    amount, 
    currency,
    payment_method, 
    status, 
    collection_date
) VALUES (
    'PAY-2026-001',
    'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',
    150.00,
    'USD',
    'cash',
    'pending',
    CURRENT_DATE
) RETURNING id;

-- تفعيل الاشتراك (استخدم الـ id من الأعلى)
SELECT activate_subscription_from_payment('payment_id_here');

-- النتيجة:
{
  "success": true,
  "subscription_id": "...",
  "start_date": "2026-01-27",
  "end_date": "2026-03-14",
  "days_purchased": 45,
  "daily_price": 3.33,
  "amount_used": 149.85,
  "remaining_balance": 0.15,
  "plan_name": "Professional"
}
```

**السيناريوهات المدعومة:**

#### أ. دفع كامل (شهر واحد)
```
الباقة: Professional - 100 USD/شهر (3.33 USD/يوم)
الدفع: 100 USD
النتيجة: 30 يوماً
الرصيد المتبقي: 0
```

#### ب. دفع زائد
```
الباقة: Professional - 100 USD/شهر
الدفع: 150 USD
النتيجة: 45 يوماً
الرصيد المتبقي: 0
```

#### ج. دفع جزئي
```
الباقة: Professional - 100 USD/شهر (3.33 USD/يوم)
الدفع: 50 USD
النتيجة: 15 يوماً
الرصيد المتبقي: 0
ملاحظة: إذا كان أقل من minimum_days (7)، سيرفض
```

#### د. إضافة لاشتراك نشط
```
الاشتراك الحالي: ينتهي في 2026-02-15
الدفع: 100 USD (30 يوم)
النتيجة: 
  - start_date: 2026-02-15 (من نهاية الاشتراك الحالي)
  - end_date: 2026-03-17
```

---

### 3. `schedule_expiry_notifications(...)`

جدولة تنبيهات انتهاء الاشتراك.

**التنبيهات:**
- قبل 7 أيام: تحذير عادي
- قبل 3 أيام: تحذير عاجل مع المبلغ المطلوب
- يوم الانتهاء: إشعار انتهاء

**مثال:**
```sql
SELECT schedule_expiry_notifications(
    'tenant_id',
    'subscription_id',
    '2026-03-01',  -- end_date
    'Professional', -- plan_name
    100.00,        -- amount_due
    'USD'          -- currency
);
```

---

### 4. `check_expired_subscriptions()`

فحص وتحديث الاشتراكات المنتهية.

**ماذا تفعل:**
1. تحدّث الاشتراكات المنتهية (end_date < اليوم) → `expired`
2. تعلّق المستأجرين بعد فترة السماح → `suspended`
3. ترجع قائمة بالاشتراكات المتأثرة

**مثال:**
```sql
-- تشغيل الفحص
SELECT * FROM check_expired_subscriptions();

-- النتيجة:
tenant_id | tenant_name | subscription_id | end_date | days_expired | action_taken
----------|-------------|-----------------|----------|--------------|-------------
xxx...    | مودا تكس    | yyy...         | 2026-01-20| 7           | Tenant Suspended
```

**يجب جدولتها لتعمل يومياً!** (استخدم Supabase Cron أو Edge Function)

---

### 5. `get_subscription_stats(tenant_id)`

الحصول على إحصائيات كاملة لاشتراك المستأجر.

**مثال:**
```sql
SELECT get_subscription_stats('tenant_id');

-- النتيجة:
{
  "found": true,
  "subscription_id": "...",
  "status": "active",
  "health_status": "active",  -- active, expiring_soon, expired
  "start_date": "2026-01-01",
  "end_date": "2026-02-15",
  "days_remaining": 19,
  "days_used": 27,
  "total_days_purchased": 46,
  "remaining_balance": 0.15,
  "plan": {
    "name_en": "Professional",
    "name_ar": "المحترف",
    "price_monthly": 100.00,
    "price_daily": 3.33,
    "currency": "USD"
  }
}
```

---

## 💡 أمثلة الاستخدام

### السيناريو 1: دفعة عادية

```sql
-- 1. العميل يدفع 100 USD
INSERT INTO saas_payments (
    payment_number, tenant_id, amount, currency,
    payment_method, status, collection_date
) VALUES (
    generate_payment_number(),
    'tenant_id_here',
    100.00,
    'USD',
    'cash',
    'pending',
    CURRENT_DATE
) RETURNING id;

-- 2. تفعيل الاشتراك
SELECT activate_subscription_from_payment('payment_id_here');

-- 3. التحقق
SELECT get_subscription_stats('tenant_id_here');
```

### السيناريو 2: دفعة جزئية (أسبوع)

```sql
-- باقة Professional: 100 USD/شهر = 3.33 USD/يوم
-- دفع 25 USD = 7.5 أيام ≈ أسبوع

INSERT INTO saas_payments (...)
VALUES (..., 25.00, ...);

SELECT activate_subscription_from_payment('payment_id');
-- النتيجة: 7 أيام (مع رصيد متبقي 1.69 USD)
```

### السيناريو 3: تجديد قبل الانتهاء

```sql
-- الاشتراك الحالي ينتهي في 2026-02-15
-- اليوم: 2026-02-10 (5 أيام متبقية)
-- دفع 100 USD لتجديد شهر

INSERT INTO saas_payments (...) VALUES (..., 100.00, ...);
SELECT activate_subscription_from_payment('payment_id');

-- النتيجة:
-- start_date: 2026-02-15 (من نهاية الاشتراك الحالي)
-- end_date: 2026-03-17 (30 يوم إضافية)
```

---

## 🔔 نظام التنبيهات

### أنواع التنبيهات

1. **expiry_warning** - تحذير انتهاء (7 أيام، 3 أيام)
2. **expired** - منتهي (يوم الانتهاء)
3. **payment_due** - دفعة مستحقة
4. **renewed** - تم التجديد
5. **suspended** - تم التعليق

### عرض التنبيهات المعلقة

```sql
SELECT 
    t.name,
    sa.alert_type,
    sa.alert_date,
    sa.days_remaining,
    sa.message_ar
FROM subscription_alerts sa
JOIN tenants t ON sa.tenant_id = t.id
WHERE sa.status = 'pending'
    AND sa.alert_date <= CURRENT_DATE
ORDER BY sa.alert_date;
```

### تحديث حالة التنبيه

```sql
-- بعد إرسال الإيميل/SMS
UPDATE subscription_alerts
SET 
    status = 'sent',
    sent_at = NOW()
WHERE id = 'alert_id';
```

---

## 🧪 الاختبار

### اختبار سريع

```sql
-- 1. عرض الباقات مع الأسعار اليومية
SELECT 
    name_en,
    price_monthly || ' ' || currency || '/month',
    price_daily || ' ' || currency || '/day'
FROM subscription_plans;

-- 2. عرض الاشتراكات النشطة
SELECT 
    t.name,
    sp.name_en,
    ts.end_date,
    get_remaining_days(t.id) as days_left
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.status = 'active';

-- 3. فحص الاشتراكات المنتهية
SELECT * FROM check_expired_subscriptions();
```

---

## 📊 الإحصائيات

```sql
-- إحصائيات عامة
SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'expired') as expired,
    COUNT(*) FILTER (WHERE end_date - CURRENT_DATE <= 7 AND status = 'active') as expiring_soon,
    SUM(total_days_purchased) as total_days_sold,
    SUM(remaining_balance) as total_remaining_balance
FROM tenant_subscriptions;
```

---

## ⚙️ الجدولة (Cron Jobs)

يجب جدولة `check_expired_subscriptions()` للعمل يومياً:

### في Supabase Edge Functions:

```typescript
// supabase/functions/daily-subscription-check/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data, error } = await supabase.rpc('check_expired_subscriptions')
  
  return new Response(
    JSON.stringify({ success: !error, data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

ثم جدولها في Supabase Dashboard → Database → Cron Jobs:
```sql
SELECT cron.schedule(
  'check-expired-subscriptions',
  '0 2 * * *', -- يومياً الساعة 2 صباحاً
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-subscription-check',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## ✅ Checklist للمطورين

عند إضافة دفعة جديدة في الـ Frontend:

- [ ] إنشاء سجل في `saas_payments` بـ status = 'pending'
- [ ] استدعاء `activate_subscription_from_payment(payment_id)`
- [ ] التحقق من النتيجة (success = true)
- [ ] عرض رسالة نجاح للمستخدم
- [ ] تحديث واجهة الاشتراك

---

## 🚨 ملاحظات مهمة

1. **السعر اليومي** يُحسب تلقائياً: `price_monthly / 30`
2. **الحد الأدنى** للأيام افتراضياً 7 (قابل للتعديل لكل باقة)
3. **فترة السماح** افتراضياً 3 أيام (قابلة للتعديل)
4. **الرصيد المتبقي** يُحفظ في `remaining_balance` (يمكن استخدامه لاحقاً)
5. **التنبيهات** تُجدول تلقائياً عند التفعيل

---

## 📞 الدعم

في حالة وجود مشاكل:
1. شغّل `test_step_57c.sql` لفحص النظام
2. تحقق من الـ logs في Supabase Dashboard
3. راجع دالة `activate_subscription_from_payment` للأخطاء

---

**تم التثبيت بنجاح! 🎉**
