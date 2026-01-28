-- ============================================================================
-- إصلاح دالة get_subscription_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subscription_stats(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_stats JSONB;
BEGIN
    SELECT 
        ts.id,
        ts.status,
        ts.start_date,
        ts.end_date,
        ts.total_days_purchased,
        ts.remaining_balance,
        sp.name_en,
        sp.name_ar,
        sp.price_monthly,
        sp.price_daily,
        sp.currency,
        -- إصلاح حساب الأيام
        (ts.end_date - CURRENT_DATE) as days_remaining,
        (CURRENT_DATE - ts.start_date) as days_used,
        CASE 
            WHEN ts.end_date < CURRENT_DATE THEN 'expired'
            WHEN (ts.end_date - CURRENT_DATE) <= 7 THEN 'expiring_soon'
            ELSE 'active'
        END as health_status
    INTO v_subscription
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id
        AND ts.status IN ('active', 'trial', 'expired')
    ORDER BY ts.end_date DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;
    
    v_stats := jsonb_build_object(
        'found', true,
        'subscription_id', v_subscription.id,
        'status', v_subscription.status,
        'health_status', v_subscription.health_status,
        'start_date', v_subscription.start_date,
        'end_date', v_subscription.end_date,
        'days_remaining', GREATEST(v_subscription.days_remaining, 0),
        'days_used', v_subscription.days_used,
        'total_days_purchased', v_subscription.total_days_purchased,
        'remaining_balance', v_subscription.remaining_balance,
        'plan', jsonb_build_object(
            'name_en', v_subscription.name_en,
            'name_ar', v_subscription.name_ar,
            'price_monthly', v_subscription.price_monthly,
            'price_daily', v_subscription.price_daily,
            'currency', v_subscription.currency
        )
    );
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subscription_stats IS 'الحصول على إحصائيات كاملة لاشتراك المستأجر (محدثة)';

-- رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة get_subscription_stats بنجاح';
END $$;
