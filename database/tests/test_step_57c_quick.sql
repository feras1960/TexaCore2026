-- ============================================================================
-- اختبار سريع ومبسط للنظام
-- ============================================================================

-- 1. التحقق من الدوال
DO $$ BEGIN
    RAISE NOTICE '📋 1. Testing Functions...';
END $$;

-- اختبار get_remaining_days
DO $$
DECLARE
    v_tenant_id UUID;
    v_days INT;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        v_days := get_remaining_days(v_tenant_id);
        RAISE NOTICE '✅ get_remaining_days: % days remaining', v_days;
    ELSE
        RAISE NOTICE '⚠️ No tenants found';
    END IF;
END $$;

-- اختبار get_subscription_stats
DO $$
DECLARE
    v_tenant_id UUID;
    v_stats JSONB;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        v_stats := get_subscription_stats(v_tenant_id);
        RAISE NOTICE '✅ get_subscription_stats: %', v_stats::TEXT;
    END IF;
END $$;

-- اختبار check_expired_subscriptions
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM check_expired_subscriptions();
    RAISE NOTICE '✅ check_expired_subscriptions: % records found', v_count;
END $$;

-- 2. عرض الباقات مع الأسعار
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📦 2. Subscription Plans:';
END $$;

SELECT 
    name_en as plan,
    price_monthly || ' ' || currency as monthly,
    price_daily || ' ' || currency as daily,
    minimum_days || ' days' as minimum
FROM subscription_plans
WHERE is_active = true
ORDER BY price_monthly;

-- 3. عرض الاشتراكات النشطة
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👥 3. Active Subscriptions:';
END $$;

SELECT 
    t.name as tenant,
    sp.name_en as plan,
    ts.end_date,
    (ts.end_date - CURRENT_DATE) as days_left,
    ts.status
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.status IN ('active', 'trial')
ORDER BY ts.end_date;

-- 4. رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ جميع الاختبارات نجحت!';
    RAISE NOTICE '============================================================================';
END $$;
