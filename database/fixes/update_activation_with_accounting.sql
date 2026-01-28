-- ============================================================================
-- تحديث دالة التفعيل لتشمل القيد المحاسبي التلقائي
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_subscription_from_payment(
    p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_plan RECORD;
    v_current_subscription RECORD;
    v_daily_price DECIMAL(10,2);
    v_total_days INT;
    v_used_amount DECIMAL(10,2);
    v_remaining_balance DECIMAL(10,2);
    v_start_date DATE;
    v_end_date DATE;
    v_subscription_id UUID;
    v_accounting_result JSONB;
    v_result JSONB;
BEGIN
    -- [... نفس الكود السابق حتى تحديث الدفعة ...]
    
    -- 1. جلب بيانات الدفعة
    SELECT * INTO v_payment
    FROM saas_payments
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;
    
    IF v_payment.status = 'completed' THEN
        RAISE NOTICE 'Payment already processed';
        RETURN jsonb_build_object('success', false, 'message', 'Payment already completed');
    END IF;
    
    -- 2. جلب بيانات الباقة
    SELECT 
        sp.id as plan_id,
        sp.price_monthly,
        sp.price_daily,
        sp.minimum_days,
        sp.grace_period_days,
        sp.name_en,
        sp.name_ar,
        sp.currency,
        ts.id as subscription_id,
        ts.end_date as current_end_date,
        ts.status as subscription_status
    INTO v_plan
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.tenant_id = v_payment.tenant_id
    ORDER BY ts.created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No subscription plan found for tenant: %', v_payment.tenant_id;
    END IF;
    
    v_daily_price := COALESCE(v_plan.price_daily, v_plan.price_monthly / 30.0);
    
    -- 3. حساب عدد الأيام
    v_total_days := FLOOR(v_payment.amount / v_daily_price)::INT;
    
    IF v_total_days < COALESCE(v_plan.minimum_days, 1) THEN
        RAISE EXCEPTION 'Amount insufficient. Minimum % days required', v_plan.minimum_days;
    END IF;
    
    v_used_amount := v_total_days * v_daily_price;
    v_remaining_balance := v_payment.amount - v_used_amount;
    
    -- 4. تحديد تاريخ البداية والنهاية
    IF v_plan.subscription_status = 'active' AND v_plan.current_end_date > CURRENT_DATE THEN
        v_start_date := v_plan.current_end_date;
        v_end_date := v_start_date + v_total_days;
        v_subscription_id := v_plan.subscription_id;
        
        UPDATE tenant_subscriptions
        SET 
            end_date = v_end_date,
            total_days_purchased = COALESCE(total_days_purchased, 0) + v_total_days,
            last_payment_date = COALESCE(v_payment.collection_date::DATE, v_payment.created_at::DATE),
            last_payment_amount = v_payment.amount,
            remaining_balance = COALESCE(remaining_balance, 0) + v_remaining_balance,
            grace_period_end = v_end_date + COALESCE(v_plan.grace_period_days, 3),
            status = 'active',
            updated_at = NOW()
        WHERE id = v_subscription_id;
        
        RAISE NOTICE 'Extended existing subscription: % days added', v_total_days;
    ELSE
        v_start_date := CURRENT_DATE;
        v_end_date := v_start_date + v_total_days;
        
        INSERT INTO tenant_subscriptions (
            tenant_id, plan_id, status, start_date, end_date,
            total_days_purchased, last_payment_date, last_payment_amount,
            remaining_balance, grace_period_end, billing_cycle
        ) VALUES (
            v_payment.tenant_id, v_plan.plan_id, 'active', v_start_date, v_end_date,
            v_total_days,
            COALESCE(v_payment.collection_date::DATE, v_payment.created_at::DATE),
            v_payment.amount, v_remaining_balance,
            v_end_date + COALESCE(v_plan.grace_period_days, 3), 'flexible'
        )
        RETURNING id INTO v_subscription_id;
        
        RAISE NOTICE 'Created new subscription: % days', v_total_days;
    END IF;
    
    -- 5. تحديث حالة المستأجر
    UPDATE tenants SET status = 'active' WHERE id = v_payment.tenant_id;
    
    -- 6. تحديث الدفعة
    UPDATE saas_payments
    SET 
        subscription_id = v_subscription_id,
        period_start = v_start_date,
        period_end = v_end_date,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- 7. جدولة التنبيهات
    PERFORM schedule_expiry_notifications(
        v_payment.tenant_id, v_subscription_id, v_end_date,
        v_plan.name_ar, v_plan.price_monthly, v_plan.currency
    );
    
    -- ✨ 8. إنشاء القيد المحاسبي التلقائي (الجديد!)
    v_accounting_result := create_accounting_entry_for_payment(p_payment_id);
    
    -- 9. إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'days_purchased', v_total_days,
        'daily_price', v_daily_price,
        'amount_used', v_used_amount,
        'remaining_balance', v_remaining_balance,
        'plan_name', v_plan.name_en,
        'accounting_entry', v_accounting_result
    );
    
    RAISE NOTICE '✅ Subscription activated successfully';
    IF v_accounting_result->>'success' = 'true' THEN
        RAISE NOTICE '✅ Accounting entry created: %', v_accounting_result->>'entry_number';
    END IF;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_subscription_from_payment IS 'تفعيل الاشتراك مع القيد المحاسبي التلقائي';

-- رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '✅ تم تحديث دالة التفعيل مع القيد المحاسبي التلقائي';
END $$;
