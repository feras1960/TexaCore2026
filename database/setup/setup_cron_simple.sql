-- ============================================================================
-- جدولة Cron Job (نسخة مبسطة ومضمونة)
-- ============================================================================

-- الخطوة 1: تفعيل pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- الخطوة 2: حذف أي جدولة قديمة (إن وجدت)
DO $$ 
BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'check-expired-subscriptions-daily';
    
    RAISE NOTICE '✓ تم حذف الجدولة القديمة (إن وجدت)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '→ لا توجد جدولة قديمة';
END $$;

-- الخطوة 3: إنشاء الجدولة الجديدة
SELECT cron.schedule(
    'check-expired-subscriptions-daily',
    '0 2 * * *',
    'SELECT check_expired_subscriptions();'
);

-- الخطوة 4: التحقق
SELECT 
    jobid as "Job ID",
    jobname as "الاسم",
    schedule as "التوقيت",
    active as "نشط؟",
    command as "الأمر"
FROM cron.job
WHERE jobname = 'check-expired-subscriptions-daily';

-- معلومات
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ تم إنشاء Cron Job بنجاح!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '   الاسم: check-expired-subscriptions-daily';
    RAISE NOTICE '   التوقيت: يومياً الساعة 2:00 صباحاً (0 2 * * *)';
    RAISE NOTICE '   الوظيفة: فحص الاشتراكات المنتهية';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 اختبار يدوي:';
    RAISE NOTICE '   SELECT check_expired_subscriptions();';
    RAISE NOTICE '';
    RAISE NOTICE '📊 عرض السجل:';
    RAISE NOTICE '   SELECT * FROM cron.job_run_details';
    RAISE NOTICE '   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = ''check-expired-subscriptions-daily'')';
    RAISE NOTICE '   ORDER BY start_time DESC LIMIT 5;';
    RAISE NOTICE '============================================================================';
END $$;
