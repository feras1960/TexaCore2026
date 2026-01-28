# 🔄 بديلان لجدولة الفحص اليومي

## ⚠️ المشكلة الحالية
`pg_cron` قد لا يكون متاحاً أو مفعّلاً في بعض خطط Supabase.

---

## ✅ **الحل 1: استخدام setup_cron_job_fixed.sql** (إذا كان pg_cron متاح)

### الخطوات:
1. تأكد من تفعيل `pg_cron` من **Supabase Dashboard**:
   - اذهب إلى **Database → Extensions**
   - ابحث عن `pg_cron`
   - اضغط **Enable**

2. نفّذ السكربت المحسّن:
   ```
   setup_cron_job_fixed.sql
   ```

### إذا نجح:
```
✅ تم جدولة Cron Job بنجاح!
   📌 Job ID: 1
   📌 التوقيت: يومياً الساعة 2:00 صباحاً
```

---

## ✅ **الحل 2: Supabase Edge Functions مع Cron في Dashboard** (الحل الأسهل - موصى به)

### الخطوات:

#### 1. نشر Edge Function (موجودة بالفعل):
```bash
# في Terminal:
cd supabase/functions/daily-subscription-check
supabase functions deploy daily-subscription-check
```

#### 2. جدولة من Supabase Dashboard:
1. اذهب إلى **Database → Cron Jobs** (أو **Edge Functions**)
2. اضغط **Add a new cron job**
3. املأ البيانات:
   - **Name**: `daily-subscription-check`
   - **Schedule**: `0 2 * * *` (يومياً الساعة 2 صباحاً)
   - **HTTP Request**:
     - **Method**: POST
     - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-subscription-check`
     - **Headers**: 
       ```json
       {
         "Authorization": "Bearer YOUR_ANON_KEY"
       }
       ```

#### 3. حفظ وتفعيل

---

## ✅ **الحل 3: جدولة SQL بسيطة (بدون pg_cron)**

إذا لم يعمل pg_cron، يمكنك استخدام جدولة بسيطة:

### الملف: `simple_cron_alternative.sql`

```sql
-- إنشاء جدول لتتبع آخر تشغيل
CREATE TABLE IF NOT EXISTS cron_jobs_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status VARCHAR(20),
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال سجل للـ job
INSERT INTO cron_jobs_log (job_name, next_run, status)
VALUES ('check-expired-subscriptions-daily', NOW() + INTERVAL '1 day', 'scheduled')
ON CONFLICT DO NOTHING;

-- دالة wrapper لتسجيل التشغيل
CREATE OR REPLACE FUNCTION run_daily_subscription_check()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_data RECORD;
BEGIN
    -- تشغيل الفحص
    v_data := check_expired_subscriptions();
    
    -- تسجيل النتيجة
    INSERT INTO cron_jobs_log (job_name, last_run, next_run, status, result)
    VALUES (
        'check-expired-subscriptions-daily',
        NOW(),
        NOW() + INTERVAL '1 day',
        'completed',
        jsonb_build_object('data', v_data)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'timestamp', NOW(),
        'data', v_data
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ
        INSERT INTO cron_jobs_log (job_name, last_run, status, result)
        VALUES (
            'check-expired-subscriptions-daily',
            NOW(),
            'failed',
            jsonb_build_object('error', SQLERRM)
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
```

ثم استخدم أي أداة خارجية (GitHub Actions, Zapier, n8n) لاستدعاء:
```
POST https://YOUR_PROJECT.supabase.co/rest/v1/rpc/run_daily_subscription_check
```

---

## 🎯 التوصية

### للإنتاج (Production):
استخدم **الحل 2** (Edge Function مع Supabase Dashboard Cron)
- ✅ أسهل
- ✅ أكثر استقراراً
- ✅ لا يحتاج pg_cron
- ✅ متاح في جميع الخطط

### للتطوير (Development):
استخدم التشغيل اليدوي:
```sql
SELECT check_expired_subscriptions();
```

---

## 📋 الخطوات الآن:

### الخيار A: جرّب setup_cron_job_fixed.sql
```
نفّذ الملف الجديد وأخبرني بالنتيجة
```

### الخيار B: استخدم Edge Function
```bash
# نشر Edge Function
supabase functions deploy daily-subscription-check

# ثم جدولها من Dashboard
```

### الخيار C: تخطى Cron الآن
```
يمكننا التركيز على الأجزاء الأخرى (Frontend)
والعودة لـ Cron لاحقاً
```

---

**أي خيار تفضل؟** 🤔
