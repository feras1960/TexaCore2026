-- ============================================================================
-- بديل بسيط لـ Cron Job (بدون pg_cron)
-- ============================================================================
-- استخدم هذا إذا لم يعمل pg_cron
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '🔧 إنشاء بديل بسيط لـ Cron Job...';
    RAISE NOTICE '=====================================';
END $$;

-- 1. جدول لتتبع التشغيل
CREATE TABLE IF NOT EXISTS cron_jobs_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status VARCHAR(20), -- scheduled, running, completed, failed
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_log_job_name 
ON cron_jobs_log(job_name, created_at DESC);

COMMENT ON TABLE cron_jobs_log IS 'سجل تشغيل المهام المجدولة';

-- 2. دالة wrapper مع تسجيل
CREATE OR REPLACE FUNCTION run_daily_subscription_check()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    v_start_time := NOW();
    
    -- تسجيل بداية التشغيل
    INSERT INTO cron_jobs_log (job_name, last_run, status)
    VALUES ('check-expired-subscriptions-daily', v_start_time, 'running');
    
    RAISE NOTICE '🚀 بدء الفحص اليومي...';
    RAISE NOTICE '   الوقت: %', v_start_time;
    
    -- تشغيل الفحص
    v_result := check_expired_subscriptions();
    
    v_end_time := NOW();
    
    -- تسجيل النتيجة الناجحة
    UPDATE cron_jobs_log
    SET 
        status = 'completed',
        next_run = NOW() + INTERVAL '1 day',
        result = jsonb_build_object(
            'data', v_result,
            'duration_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time))
        )
    WHERE job_name = 'check-expired-subscriptions-daily'
        AND last_run = v_start_time;
    
    RAISE NOTICE '✅ اكتمل الفحص بنجاح!';
    RAISE NOTICE '   المدة: % ثانية', EXTRACT(EPOCH FROM (v_end_time - v_start_time));
    RAISE NOTICE '   النتيجة: %', v_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'timestamp', v_start_time,
        'duration', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
        'data', v_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ
        UPDATE cron_jobs_log
        SET 
            status = 'failed',
            error_message = SQLERRM,
            result = jsonb_build_object('error', SQLERRM)
        WHERE job_name = 'check-expired-subscriptions-daily'
            AND last_run = v_start_time;
        
        RAISE NOTICE '❌ فشل الفحص: %', SQLERRM;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', v_start_time
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_daily_subscription_check IS 'تشغيل الفحص اليومي مع تسجيل النتائج';

-- 3. إدخال سجل أولي
INSERT INTO cron_jobs_log (job_name, next_run, status)
VALUES ('check-expired-subscriptions-daily', NOW() + INTERVAL '1 day', 'scheduled')
ON CONFLICT DO NOTHING;

-- 4. عرض السجل
DO $$
DECLARE
    v_last_run RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ تم إنشاء البديل بنجاح!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 معلومات المهمة:';
    
    SELECT * INTO v_last_run
    FROM cron_jobs_log
    WHERE job_name = 'check-expired-subscriptions-daily'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '   • آخر تشغيل: %', COALESCE(v_last_run.last_run::TEXT, 'لم يتم التشغيل بعد');
        RAISE NOTICE '   • الحالة: %', v_last_run.status;
        RAISE NOTICE '   • التشغيل التالي: %', v_last_run.next_run;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🚀 كيفية التشغيل:';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣ تشغيل يدوي (للاختبار):';
    RAISE NOTICE '   SELECT run_daily_subscription_check();';
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ تشغيل عبر API:';
    RAISE NOTICE '   POST https://YOUR_PROJECT.supabase.co/rest/v1/rpc/run_daily_subscription_check';
    RAISE NOTICE '   Headers: { "apikey": "YOUR_KEY", "Authorization": "Bearer YOUR_KEY" }';
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ عرض السجل:';
    RAISE NOTICE '   SELECT * FROM cron_jobs_log';
    RAISE NOTICE '   WHERE job_name = ''check-expired-subscriptions-daily''';
    RAISE NOTICE '   ORDER BY created_at DESC LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 نصيحة: استخدم GitHub Actions أو Zapier لاستدعاء API يومياً';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;
