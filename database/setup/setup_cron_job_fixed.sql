-- ============================================================================
-- جدولة Cron Job للفحص اليومي (محسّن)
-- ============================================================================

-- 1. تفعيل pg_cron extension
DO $$ 
BEGIN
    RAISE NOTICE '📦 تفعيل pg_cron extension...';
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE '✅ pg_cron مفعّل';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ pg_cron قد يكون مفعّل مسبقاً: %', SQLERRM;
END $$;

-- 2. حذف الجدولة القديمة إذا كانت موجودة (بأمان)
DO $$ 
DECLARE
    v_job_id BIGINT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 البحث عن جدولة قديمة...';
    
    -- البحث عن الـ job
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'check-expired-subscriptions-daily'
    LIMIT 1;
    
    IF v_job_id IS NOT NULL THEN
        RAISE NOTICE '📝 تم العثور على job قديم (ID: %)، سيتم حذفه...', v_job_id;
        PERFORM cron.unschedule(v_job_id);
        RAISE NOTICE '✅ تم حذف الجدولة القديمة';
    ELSE
        RAISE NOTICE '✅ لا توجد جدولة قديمة';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ تخطي حذف الجدولة القديمة: %', SQLERRM;
END $$;

-- 3. إنشاء الجدولة الجديدة
DO $$ 
DECLARE
    v_job_id BIGINT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 إنشاء جدولة جديدة...';
    
    -- جدولة المهمة
    v_job_id := cron.schedule(
        'check-expired-subscriptions-daily',
        '0 2 * * *',
        'SELECT check_expired_subscriptions();'
    );
    
    RAISE NOTICE '✅ تم جدولة Cron Job بنجاح!';
    RAISE NOTICE '   📌 اسم المهمة: check-expired-subscriptions-daily';
    RAISE NOTICE '   📌 Job ID: %', v_job_id;
    RAISE NOTICE '   📌 التوقيت: يومياً الساعة 2:00 صباحاً (0 2 * * *)';
    RAISE NOTICE '   📌 الوظيفة: فحص الاشتراكات المنتهية وتعليق الحسابات';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في إنشاء الجدولة: %', SQLERRM;
        RAISE EXCEPTION 'Failed to create cron job: %', SQLERRM;
END $$;

-- 4. التحقق من الجدولة
DO $$
DECLARE
    v_job RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '🔍 التحقق من الجدولة:';
    RAISE NOTICE '============================================================================';
    
    SELECT 
        jobid,
        schedule,
        command,
        nodename,
        database,
        username,
        active
    INTO v_job
    FROM cron.job
    WHERE jobname = 'check-expired-subscriptions-daily';
    
    IF FOUND THEN
        RAISE NOTICE '✅ الجدولة موجودة ونشطة!';
        RAISE NOTICE '   • Job ID: %', v_job.jobid;
        RAISE NOTICE '   • Schedule: %', v_job.schedule;
        RAISE NOTICE '   • Command: %', v_job.command;
        RAISE NOTICE '   • Active: %', v_job.active;
        RAISE NOTICE '   • Database: %', v_job.database;
    ELSE
        RAISE NOTICE '❌ الجدولة غير موجودة!';
    END IF;
    
    RAISE NOTICE '============================================================================';
    
END $$;

-- 5. معلومات إضافية
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📚 معلومات مفيدة:';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 لاختبار الـ Cron Job يدوياً:';
    RAISE NOTICE '   SELECT check_expired_subscriptions();';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 لعرض جميع Cron Jobs:';
    RAISE NOTICE '   SELECT jobid, jobname, schedule, active FROM cron.job;';
    RAISE NOTICE '';
    RAISE NOTICE '📊 لعرض تاريخ التشغيل:';
    RAISE NOTICE '   SELECT * FROM cron.job_run_details';
    RAISE NOTICE '   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = ''check-expired-subscriptions-daily'')';
    RAISE NOTICE '   ORDER BY start_time DESC LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ لحذف الجدولة:';
    RAISE NOTICE '   SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = ''check-expired-subscriptions-daily'';';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;
