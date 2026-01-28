-- ============================================================================
-- إصلاح دالة check_expired_subscriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS TABLE(
    tenant_id UUID,
    tenant_name VARCHAR,
    subscription_id UUID,
    end_date DATE,
    days_expired INT,
    action_taken TEXT
) AS $$
BEGIN
    -- 1. تحديث الاشتراكات المنتهية
    UPDATE tenant_subscriptions ts
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE ts.end_date < CURRENT_DATE
        AND ts.status = 'active';
    
    -- 2. تعليق المستأجرين بعد فترة السماح
    UPDATE tenants t
    SET 
        status = 'suspended',
        updated_at = NOW()
    FROM tenant_subscriptions ts
    WHERE t.id = ts.tenant_id
        AND ts.grace_period_end < CURRENT_DATE
        AND ts.status = 'expired'
        AND t.status IN ('active', 'trial');
    
    -- 3. إرجاع قائمة بالاشتراكات المنتهية/المعلقة
    -- إصلاح: استخدام طرح التواريخ مباشرة
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        ts.id,
        ts.end_date,
        (CURRENT_DATE - ts.end_date)::INT,  -- إصلاح هنا
        CASE 
            WHEN t.status = 'suspended' THEN 'Tenant Suspended'
            WHEN ts.status = 'expired' THEN 'Subscription Expired'
            ELSE 'Active'
        END
    FROM tenants t
    JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    WHERE ts.status IN ('expired')
        OR (t.status = 'suspended' AND ts.end_date < CURRENT_DATE)
    ORDER BY ts.end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expired_subscriptions IS 'فحص وتحديث الاشتراكات المنتهية والمعلقة (محدثة)';

-- رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة check_expired_subscriptions بنجاح';
END $$;
