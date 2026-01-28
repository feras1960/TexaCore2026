-- ============================================================================
-- جدولة Cron Job للفحص اليومي
-- ============================================================================
-- يجب تشغيل هذا في Supabase SQL Editor
-- ============================================================================

-- تفعيل pg_cron extension إذا لم تكن مفعلة
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- حذف الجدولة القديمة إذا كانت موجودة
SELECT cron.unschedule('check-expired-subscriptions-daily');

-- جدولة الفحص اليومي الساعة 2 صباحاً
SELECT cron.schedule(
    'check-expired-subscriptions-daily',   -- اسم المهمة
    '0 2 * * *',                           -- Cron expression: يومياً الساعة 2:00 صباحاً
    $$
    -- تشغيل دالة الفحص
    SELECT check_expired_subscriptions();
    $$
);

-- رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '✅ تم جدولة Cron Job بنجاح!';
    RAISE NOTICE '   المهمة: check-expired-subscriptions-daily';
    RAISE NOTICE '   التوقيت: يومياً الساعة 2:00 صباحاً';
    RAISE NOTICE '   الوظيفة: فحص الاشتراكات المنتهية وتعليق الحسابات';
END $$;

-- ============================================================================
-- التحقق من الجدولة
-- ============================================================================

-- عرض جميع Cron Jobs المجدولة
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname = 'check-expired-subscriptions-daily';

-- ============================================================================
-- اختبار يدوي (اختياري)
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 لاختبار الـ Cron Job يدوياً:';
    RAISE NOTICE '   SELECT check_expired_subscriptions();';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 لعرض تاريخ الجدولة:';
    RAISE NOTICE '   SELECT * FROM cron.job_run_details';
    RAISE NOTICE '   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = ''check-expired-subscriptions-daily'')';
    RAISE NOTICE '   ORDER BY start_time DESC LIMIT 10;';
    RAISE NOTICE '';
END $$;
