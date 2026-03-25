-- ============================================================================
-- STEP 57C: Flexible Subscription System (النظام الهجين المرن)
-- ============================================================================
-- هذا السكربت يضيف:
-- 1. نظام فوترة مرن (شهري/يومي/مختلط)
-- 2. دوال تفعيل الاشتراك التلقائي
-- 3. نظام التنبيهات والإشعارات
-- 4. فحص الاشتراكات المنتهية
-- ============================================================================

-- ============================================================================
-- PART 1: تحديث جدول subscription_plans
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 1: Updating subscription_plans table...';
END $$;

-- إضافة حقول النظام المرن
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS price_daily DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(20) DEFAULT 'flexible',
ADD COLUMN IF NOT EXISTS minimum_days INT DEFAULT 7,
ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 3;

-- تحديث price_daily للصفوف الموجودة
UPDATE subscription_plans
SET price_daily = ROUND(price_monthly / 30.0, 2)
WHERE price_daily IS NULL AND price_monthly IS NOT NULL;

-- التعليقات
COMMENT ON COLUMN subscription_plans.price_daily IS 'السعر اليومي (محسوب من الشهري ÷ 30)';
COMMENT ON COLUMN subscription_plans.billing_mode IS 'نمط الفوترة: monthly (شهري), daily (يومي), flexible (مرن)';
COMMENT ON COLUMN subscription_plans.minimum_days IS 'الحد الأدنى لعدد الأيام للتفعيل (افتراضي: 7 أيام)';
COMMENT ON COLUMN subscription_plans.grace_period_days IS 'فترة السماح بالأيام بعد انتهاء الاشتراك (افتراضي: 3 أيام)';

DO $$ BEGIN
    RAISE NOTICE '✅ Part 1 Complete: subscription_plans updated';
END $$;

-- ============================================================================
-- PART 2: تحديث جدول tenant_subscriptions
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 2: Updating tenant_subscriptions table...';
END $$;

-- إضافة حقول التتبع المتقدم
ALTER TABLE tenant_subscriptions
ADD COLUMN IF NOT EXISTS total_days_purchased INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_used INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grace_period_end DATE,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS renewal_notification_sent BOOLEAN DEFAULT false;

-- التعليقات
COMMENT ON COLUMN tenant_subscriptions.total_days_purchased IS 'إجمالي الأيام المشتراة في هذا الاشتراك';
COMMENT ON COLUMN tenant_subscriptions.days_used IS 'عدد الأيام المستخدمة حتى الآن';
COMMENT ON COLUMN tenant_subscriptions.last_payment_date IS 'تاريخ آخر دفعة';
COMMENT ON COLUMN tenant_subscriptions.last_payment_amount IS 'مبلغ آخر دفعة';
COMMENT ON COLUMN tenant_subscriptions.remaining_balance IS 'الرصيد المتبقي من دفعة زائدة';
COMMENT ON COLUMN tenant_subscriptions.grace_period_end IS 'تاريخ نهاية فترة السماح';
COMMENT ON COLUMN tenant_subscriptions.auto_renew IS 'التجديد التلقائي عند الانتهاء';
COMMENT ON COLUMN tenant_subscriptions.renewal_notification_sent IS 'هل تم إرسال إشعار التجديد';

DO $$ BEGIN
    RAISE NOTICE '✅ Part 2 Complete: tenant_subscriptions updated';
END $$;

-- ============================================================================
-- PART 3: إنشاء جدول التنبيهات
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 3: Creating subscription_alerts table...';
END $$;

CREATE TABLE IF NOT EXISTS subscription_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL,
    alert_date DATE NOT NULL,
    days_remaining INT,
    amount_due DECIMAL(10,2),
    message_ar TEXT,
    message_en TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    sent_to VARCHAR(200),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_alert_type CHECK (alert_type IN ('expiry_warning', 'expired', 'payment_due', 'renewed', 'suspended')),
    CONSTRAINT valid_alert_status CHECK (status IN ('pending', 'sent', 'dismissed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON subscription_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_subscription ON subscription_alerts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON subscription_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_date ON subscription_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON subscription_alerts(alert_type);

COMMENT ON TABLE subscription_alerts IS 'تنبيهات وإشعارات الاشتراكات';
COMMENT ON COLUMN subscription_alerts.alert_type IS 'نوع التنبيه: expiry_warning (تحذير انتهاء), expired (منتهي), payment_due (دفعة مستحقة), renewed (تم التجديد), suspended (معلق)';

DO $$ BEGIN
    RAISE NOTICE '✅ Part 3 Complete: subscription_alerts created';
END $$;

-- ============================================================================
-- PART 4: الدوال (Functions)
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 4: Creating functions...';
END $$;

-- ============================================================================
-- Function 1: حساب الأيام المتبقية
-- ============================================================================

CREATE OR REPLACE FUNCTION get_remaining_days(p_tenant_id UUID)
RETURNS INT AS $$
DECLARE
    v_end_date DATE;
    v_days_remaining INT;
BEGIN
    SELECT end_date INTO v_end_date
    FROM tenant_subscriptions
    WHERE tenant_id = p_tenant_id
        AND status = 'active'
    ORDER BY end_date DESC
    LIMIT 1;
    
    IF v_end_date IS NULL THEN
        RETURN 0;
    END IF;
    
    v_days_remaining := v_end_date - CURRENT_DATE;
    RETURN GREATEST(v_days_remaining, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_remaining_days IS 'حساب الأيام المتبقية في اشتراك المستأجر';

-- ============================================================================
-- Function 2: تفعيل الاشتراك من الدفعة (الدالة الرئيسية!) 🔥
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
    v_result JSONB;
BEGIN
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
    
    -- 2. جلب بيانات الباقة من آخر اشتراك
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
    
    -- إذا لم يكن price_daily موجوداً، احسبه
    v_daily_price := COALESCE(v_plan.price_daily, v_plan.price_monthly / 30.0);
    
    -- 3. حساب عدد الأيام
    v_total_days := FLOOR(v_payment.amount / v_daily_price)::INT;
    
    IF v_total_days < COALESCE(v_plan.minimum_days, 1) THEN
        RAISE EXCEPTION 'Amount insufficient. Minimum % days required (% %)', 
            v_plan.minimum_days, 
            (v_plan.minimum_days * v_daily_price),
            v_plan.currency;
    END IF;
    
    -- 4. حساب المبلغ المستخدم والرصيد المتبقي
    v_used_amount := v_total_days * v_daily_price;
    v_remaining_balance := v_payment.amount - v_used_amount;
    
    -- 5. تحديد تاريخ البداية والنهاية
    IF v_plan.subscription_status = 'active' AND v_plan.current_end_date > CURRENT_DATE THEN
        -- إضافة للاشتراك الحالي
        v_start_date := v_plan.current_end_date;
        v_end_date := v_start_date + v_total_days;
        v_subscription_id := v_plan.subscription_id;
        
        -- تحديث الاشتراك الحالي
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
        -- إنشاء اشتراك جديد أو تجديد منتهي
        v_start_date := CURRENT_DATE;
        v_end_date := v_start_date + v_total_days;
        
        INSERT INTO tenant_subscriptions (
            tenant_id,
            plan_id,
            status,
            start_date,
            end_date,
            total_days_purchased,
            last_payment_date,
            last_payment_amount,
            remaining_balance,
            grace_period_end,
            billing_cycle
        ) VALUES (
            v_payment.tenant_id,
            v_plan.plan_id,
            'active',
            v_start_date,
            v_end_date,
            v_total_days,
            COALESCE(v_payment.collection_date::DATE, v_payment.created_at::DATE),
            v_payment.amount,
            v_remaining_balance,
            v_end_date + COALESCE(v_plan.grace_period_days, 3),
            'flexible'
        )
        RETURNING id INTO v_subscription_id;
        
        RAISE NOTICE 'Created new subscription: % days', v_total_days;
    END IF;
    
    -- 6. تحديث حالة المستأجر
    UPDATE tenants
    SET status = 'active'
    WHERE id = v_payment.tenant_id;
    
    -- 7. تحديث الدفعة
    UPDATE saas_payments
    SET 
        subscription_id = v_subscription_id,
        period_start = v_start_date,
        period_end = v_end_date,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- 8. جدولة التنبيهات
    PERFORM schedule_expiry_notifications(v_payment.tenant_id, v_subscription_id, v_end_date, v_plan.name_ar, v_plan.price_monthly, v_plan.currency);
    
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
        'plan_name', v_plan.name_en
    );
    
    RAISE NOTICE '✅ Subscription activated successfully';
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_subscription_from_payment IS 'تفعيل/تجديد الاشتراك تلقائياً من الدفعة - النظام المرن';

-- ============================================================================
-- Function 3: جدولة التنبيهات
-- ============================================================================

CREATE OR REPLACE FUNCTION schedule_expiry_notifications(
    p_tenant_id UUID,
    p_subscription_id UUID,
    p_end_date DATE,
    p_plan_name TEXT DEFAULT 'الباقة',
    p_amount_due DECIMAL DEFAULT 0,
    p_currency VARCHAR DEFAULT 'USD'
) RETURNS VOID AS $$
DECLARE
    v_tenant RECORD;
BEGIN
    -- جلب بيانات المستأجر
    SELECT name, email INTO v_tenant
    FROM tenants
    WHERE id = p_tenant_id;
    
    -- حذف التنبيهات القديمة غير المرسلة
    DELETE FROM subscription_alerts
    WHERE subscription_id = p_subscription_id
        AND status = 'pending';
    
    -- تنبيه قبل 7 أيام
    IF p_end_date - INTERVAL '7 days' > CURRENT_DATE THEN
        INSERT INTO subscription_alerts (
            tenant_id, subscription_id, alert_type, alert_date, days_remaining,
            message_ar, message_en, sent_to
        ) VALUES (
            p_tenant_id, p_subscription_id, 'expiry_warning', 
            p_end_date - INTERVAL '7 days', 7,
            format('تنبيه: اشتراكك في %s سينتهي بعد 7 أيام في تاريخ %s', p_plan_name, p_end_date),
            format('Notice: Your %s subscription will expire in 7 days on %s', p_plan_name, p_end_date),
            v_tenant.email
        );
    END IF;
    
    -- تنبيه قبل 3 أيام
    IF p_end_date - INTERVAL '3 days' > CURRENT_DATE THEN
        INSERT INTO subscription_alerts (
            tenant_id, subscription_id, alert_type, alert_date, days_remaining, amount_due,
            message_ar, message_en, sent_to
        ) VALUES (
            p_tenant_id, p_subscription_id, 'expiry_warning', 
            p_end_date - INTERVAL '3 days', 3, p_amount_due,
            format('⚠️ تنبيه عاجل: اشتراكك سينتهي بعد 3 أيام. المبلغ المطلوب للتجديد: %s %s', 
                p_amount_due, p_currency),
            format('⚠️ Urgent: Your subscription expires in 3 days. Renewal amount: %s %s',
                p_amount_due, p_currency),
            v_tenant.email
        );
    END IF;
    
    -- تنبيه يوم الانتهاء
    INSERT INTO subscription_alerts (
        tenant_id, subscription_id, alert_type, alert_date, days_remaining,
        message_ar, message_en, sent_to
    ) VALUES (
        p_tenant_id, p_subscription_id, 'expired', p_end_date, 0,
        '🔴 انتهى اشتراكك اليوم. يرجى التجديد فوراً لتجنب تعليق الخدمة',
        '🔴 Your subscription expired today. Please renew immediately to avoid service suspension',
        v_tenant.email
    );
    
    RAISE NOTICE '📧 Scheduled % notification alerts for tenant: %', 3, v_tenant.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION schedule_expiry_notifications IS 'جدولة تنبيهات انتهاء الاشتراك (7 أيام، 3 أيام، يوم الانتهاء)';

-- ============================================================================
-- Function 4: فحص الاشتراكات المنتهية (Cron Job)
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
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        ts.id,
        ts.end_date,
        EXTRACT(DAY FROM CURRENT_DATE - ts.end_date)::INT,
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

COMMENT ON FUNCTION check_expired_subscriptions IS 'فحص وتحديث الاشتراكات المنتهية والمعلقة (تشغل يومياً عبر Cron)';

-- ============================================================================
-- Function 5: حساب إحصائيات الاشتراك
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
        -- إصلاح: استخدام طرح التواريخ مباشرة بدلاً من EXTRACT
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

COMMENT ON FUNCTION get_subscription_stats IS 'الحصول على إحصائيات كاملة لاشتراك المستأجر';

DO $$ BEGIN
    RAISE NOTICE '✅ Part 4 Complete: All functions created';
END $$;

-- ============================================================================
-- PART 5: Triggers
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 5: Creating triggers...';
END $$;

-- Trigger لتحديث updated_at في subscription_alerts
CREATE OR REPLACE FUNCTION update_subscription_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_alerts_timestamp ON subscription_alerts;
CREATE TRIGGER trigger_update_alerts_timestamp
    BEFORE UPDATE ON subscription_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_alerts_updated_at();

DO $$ BEGIN
    RAISE NOTICE '✅ Part 5 Complete: Triggers created';
END $$;

-- ============================================================================
-- PART 6: تحديث البيانات الموجودة
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 6: Updating existing data...';
END $$;

-- تحديث grace_period_end للاشتراكات النشطة
UPDATE tenant_subscriptions ts
SET grace_period_end = ts.end_date + COALESCE(sp.grace_period_days, 3)
FROM subscription_plans sp
WHERE ts.plan_id = sp.id
    AND ts.grace_period_end IS NULL
    AND ts.status IN ('active', 'trial');

DO $$ BEGIN
    RAISE NOTICE '✅ Part 6 Complete: Existing data updated';
END $$;

-- ============================================================================
-- PART 7: الفهارس الإضافية للأداء
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '📦 Part 7: Creating additional indexes...';
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date_status 
    ON tenant_subscriptions(end_date, status) 
    WHERE status IN ('active', 'trial');

CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period 
    ON tenant_subscriptions(grace_period_end) 
    WHERE status = 'expired';

CREATE INDEX IF NOT EXISTS idx_alerts_pending 
    ON subscription_alerts(alert_date, status) 
    WHERE status = 'pending';

DO $$ BEGIN
    RAISE NOTICE '✅ Part 7 Complete: Additional indexes created';
END $$;

-- ============================================================================
-- النهاية: رسائل النجاح
-- ============================================================================

DO $$ 
DECLARE
    v_plans_count INT;
    v_subscriptions_count INT;
    v_alerts_count INT;
BEGIN
    SELECT COUNT(*) INTO v_plans_count FROM subscription_plans;
    SELECT COUNT(*) INTO v_subscriptions_count FROM tenant_subscriptions;
    SELECT COUNT(*) INTO v_alerts_count FROM subscription_alerts;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ STEP 57C: Flexible Subscription System - تم التثبيت بنجاح!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   • Subscription Plans: %', v_plans_count;
    RAISE NOTICE '   • Active Subscriptions: %', v_subscriptions_count;
    RAISE NOTICE '   • Scheduled Alerts: %', v_alerts_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 الدوال المتاحة:';
    RAISE NOTICE '   1. get_remaining_days(tenant_id) - حساب الأيام المتبقية';
    RAISE NOTICE '   2. activate_subscription_from_payment(payment_id) - تفعيل الاشتراك';
    RAISE NOTICE '   3. schedule_expiry_notifications(...) - جدولة التنبيهات';
    RAISE NOTICE '   4. check_expired_subscriptions() - فحص الاشتراكات المنتهية';
    RAISE NOTICE '   5. get_subscription_stats(tenant_id) - إحصائيات الاشتراك';
    RAISE NOTICE '';
    RAISE NOTICE '✨ الميزات الجديدة:';
    RAISE NOTICE '   ✓ نظام فوترة مرن (شهري/يومي/مختلط)';
    RAISE NOTICE '   ✓ تفعيل تلقائي للاشتراكات عند الدفع';
    RAISE NOTICE '   ✓ حساب دقيق بالأيام';
    RAISE NOTICE '   ✓ دعم الدفعات الجزئية والزائدة';
    RAISE NOTICE '   ✓ نظام تنبيهات متقدم (7، 3، 0 أيام)';
    RAISE NOTICE '   ✓ فترة سماح قابلة للتخصيص';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 اختبار سريع:';
    RAISE NOTICE '   SELECT get_subscription_stats(''<tenant_id>'');';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;
