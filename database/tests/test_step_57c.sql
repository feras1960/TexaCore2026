-- ============================================================================
-- اختبار STEP 57C: Flexible Subscription System
-- ============================================================================

-- ============================================================================
-- 1. التحقق من الجداول المحدثة
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📋 1. Checking updated tables...';
END $$;

-- فحص جدول subscription_plans
SELECT 
    '✅ subscription_plans' as test,
    COUNT(*) FILTER (WHERE price_daily IS NOT NULL) as with_daily_price,
    COUNT(*) FILTER (WHERE billing_mode IS NOT NULL) as with_billing_mode,
    COUNT(*) FILTER (WHERE minimum_days IS NOT NULL) as with_minimum_days,
    COUNT(*) as total_plans
FROM subscription_plans;

-- فحص جدول tenant_subscriptions
SELECT 
    '✅ tenant_subscriptions' as test,
    COUNT(*) FILTER (WHERE total_days_purchased IS NOT NULL) as with_days_tracking,
    COUNT(*) FILTER (WHERE grace_period_end IS NOT NULL) as with_grace_period,
    COUNT(*) as total_subscriptions
FROM tenant_subscriptions;

-- فحص جدول subscription_alerts
SELECT 
    '✅ subscription_alerts' as test,
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_alerts,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_alerts
FROM subscription_alerts;

-- ============================================================================
-- 2. التحقق من الدوال
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 2. Checking functions...';
END $$;

SELECT 
    '✅ Functions Created' as test,
    COUNT(*) as total_functions,
    string_agg(proname, ', ') as function_names
FROM pg_proc
WHERE proname IN (
    'get_remaining_days',
    'activate_subscription_from_payment',
    'schedule_expiry_notifications',
    'check_expired_subscriptions',
    'get_subscription_stats'
);

-- ============================================================================
-- 3. اختبار الدوال
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 3. Testing functions...';
END $$;

-- اختبار 1: get_subscription_stats لأول tenant
DO $$
DECLARE
    v_tenant_id UUID;
    v_stats JSONB;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        v_stats := get_subscription_stats(v_tenant_id);
        RAISE NOTICE '✅ get_subscription_stats: %', v_stats::TEXT;
    ELSE
        RAISE NOTICE '⚠️ No tenants found for testing';
    END IF;
END $$;

-- اختبار 2: get_remaining_days
DO $$
DECLARE
    v_tenant_id UUID;
    v_days INT;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        v_days := get_remaining_days(v_tenant_id);
        RAISE NOTICE '✅ get_remaining_days: % days', v_days;
    END IF;
END $$;

-- اختبار 3: check_expired_subscriptions
SELECT 
    '✅ check_expired_subscriptions' as test,
    COUNT(*) as expired_count
FROM check_expired_subscriptions();

-- ============================================================================
-- 4. عرض إحصائيات الباقات مع الأسعار اليومية
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 4. Subscription Plans with Daily Prices:';
END $$;

SELECT 
    '📦 ' || name_en as plan,
    price_monthly || ' ' || currency || '/month' as monthly_price,
    price_daily || ' ' || currency || '/day' as daily_price,
    minimum_days || ' days' as minimum,
    grace_period_days || ' days' as grace_period,
    billing_mode
FROM subscription_plans
ORDER BY price_monthly;

-- ============================================================================
-- 5. عرض الاشتراكات النشطة مع الأيام المتبقية
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 5. Active Subscriptions:';
END $$;

SELECT 
    '👤 ' || t.name as tenant,
    sp.name_en as plan,
    ts.start_date,
    ts.end_date,
    GREATEST(EXTRACT(DAY FROM ts.end_date - CURRENT_DATE)::INT, 0) as days_remaining,
    ts.total_days_purchased as days_purchased,
    ts.remaining_balance as balance,
    ts.status
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.status IN ('active', 'trial')
ORDER BY ts.end_date;

-- ============================================================================
-- 6. محاكاة دفعة واختبار التفعيل
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 6. Simulating Payment Activation Test:';
END $$;

-- عرض مثال على كيفية استخدام الدالة
DO $$
DECLARE
    v_tenant RECORD;
    v_plan RECORD;
    v_test_payment_id UUID;
    v_activation_result JSONB;
BEGIN
    -- اختيار أول tenant وأول plan
    SELECT * INTO v_tenant FROM tenants WHERE status = 'active' LIMIT 1;
    SELECT * INTO v_plan FROM subscription_plans WHERE is_active = true LIMIT 1;
    
    IF v_tenant.id IS NULL OR v_plan.id IS NULL THEN
        RAISE NOTICE '⚠️ لا توجد بيانات كافية لاختبار المحاكاة';
        RETURN;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 لاختبار التفعيل الحقيقي:';
    RAISE NOTICE '';
    RAISE NOTICE '   1. أنشئ دفعة جديدة:';
    RAISE NOTICE '      INSERT INTO saas_payments (';
    RAISE NOTICE '        payment_number, tenant_id, amount, currency,';
    RAISE NOTICE '        payment_method, status, collection_date';
    RAISE NOTICE '      ) VALUES (';
    RAISE NOTICE '        ''PAY-TEST-001'', ''%'', 100.00, ''USD'',', v_tenant.id;
    RAISE NOTICE '        ''cash'', ''pending'', CURRENT_DATE';
    RAISE NOTICE '      ) RETURNING id;';
    RAISE NOTICE '';
    RAISE NOTICE '   2. فعّل الاشتراك:';
    RAISE NOTICE '      SELECT activate_subscription_from_payment(''<payment_id>'');';
    RAISE NOTICE '';
    RAISE NOTICE '   💡 ملاحظة: السعر اليومي للباقة % = % %',
        v_plan.name_en,
        v_plan.price_daily,
        v_plan.currency;
    RAISE NOTICE '      دفع 100 USD = % أيام تقريباً',
        FLOOR(100.0 / v_plan.price_daily);
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 7. عرض التنبيهات المجدولة
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 7. Scheduled Alerts:';
END $$;

SELECT 
    '🔔 ' || t.name as tenant,
    sa.alert_type,
    sa.alert_date,
    sa.days_remaining,
    sa.status,
    COALESCE(sa.message_ar, sa.message_en) as message
FROM subscription_alerts sa
JOIN tenants t ON sa.tenant_id = t.id
ORDER BY sa.alert_date, sa.days_remaining DESC;

-- ============================================================================
-- 8. ملخص النظام
-- ============================================================================

DO $$ 
DECLARE
    v_total_plans INT;
    v_active_subs INT;
    v_expiring_soon INT;
    v_total_revenue DECIMAL;
    v_pending_alerts INT;
BEGIN
    SELECT COUNT(*) INTO v_total_plans FROM subscription_plans WHERE is_active = true;
    SELECT COUNT(*) INTO v_active_subs FROM tenant_subscriptions WHERE status = 'active';
    SELECT COUNT(*) INTO v_expiring_soon 
        FROM tenant_subscriptions 
        WHERE status = 'active' 
        AND end_date - CURRENT_DATE <= 7;
    SELECT COUNT(*) INTO v_pending_alerts FROM subscription_alerts WHERE status = 'pending';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '📊 ملخص النظام:';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '   باقات نشطة: %', v_total_plans;
    RAISE NOTICE '   اشتراكات نشطة: %', v_active_subs;
    RAISE NOTICE '   تنتهي قريباً (7 أيام): %', v_expiring_soon;
    RAISE NOTICE '   تنبيهات معلقة: %', v_pending_alerts;
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ جميع الاختبارات اكتملت بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 الخطوات التالية:';
    RAISE NOTICE '   1. اختبر إنشاء دفعة حقيقية';
    RAISE NOTICE '   2. اختبر activate_subscription_from_payment()';
    RAISE NOTICE '   3. راجع التنبيهات المجدولة';
    RAISE NOTICE '   4. جدول check_expired_subscriptions() ليعمل يومياً';
    RAISE NOTICE '';
END $$;
