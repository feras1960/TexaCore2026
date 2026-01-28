-- ============================================================================
-- إنشاء اشتراك تجريبي للعميل Default Tenant
-- ============================================================================

-- 1. اختيار باقة (نستخدم Starter Plan)
DO $$
DECLARE
    v_tenant_id UUID := 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47'; -- Default Tenant
    v_plan_id UUID;
    v_subscription_id UUID;
BEGIN
    -- جلب أول باقة متاحة (Starter)
    SELECT id INTO v_plan_id 
    FROM subscription_plans 
    WHERE is_active = true 
    ORDER BY price_monthly 
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'No plans available';
    END IF;
    
    RAISE NOTICE 'Creating subscription for Default Tenant with plan: %', v_plan_id;
    
    -- إنشاء اشتراك منتهي (لاختبار التجديد)
    INSERT INTO tenant_subscriptions (
        tenant_id,
        plan_id,
        status,
        start_date,
        end_date,
        billing_cycle
    ) VALUES (
        v_tenant_id,
        v_plan_id,
        'expired',  -- منتهي حتى نختبر التجديد
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '30 days',
        'flexible'
    )
    RETURNING id INTO v_subscription_id;
    
    RAISE NOTICE '✅ Subscription created: %', v_subscription_id;
    RAISE NOTICE '   Status: expired (ready for renewal)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الآن يمكنك تشغيل step2_activate_subscription.sql';
    
END $$;

-- 2. عرض الاشتراك المنشأ
SELECT 
    t.name as tenant,
    sp.name_en as plan,
    sp.price_monthly,
    sp.price_daily,
    sp.currency,
    ts.status,
    ts.start_date,
    ts.end_date
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE t.id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47';
