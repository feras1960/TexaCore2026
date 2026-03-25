-- ============================================================================
-- اختبار تفعيل الاشتراك من دفعة (Activation Test)
-- ============================================================================

-- 1. اختيار عميل للتجربة
DO $$ BEGIN
    RAISE NOTICE '🧪 محاكاة دفعة وتفعيل اشتراك';
    RAISE NOTICE '=====================================';
END $$;

-- عرض العملاء المتاحين
SELECT 
    '👤 العملاء المتاحين' as info,
    id,
    name,
    code,
    status
FROM tenants
LIMIT 5;

-- 2. إنشاء دفعة تجريبية
DO $$
DECLARE
    v_tenant_id UUID;
    v_payment_id UUID;
    v_result JSONB;
BEGIN
    -- اختيار أول عميل نشط
    SELECT id INTO v_tenant_id 
    FROM tenants 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ لا يوجد عملاء نشطين للاختبار';
        RETURN;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 إنشاء دفعة تجريبية...';
    RAISE NOTICE '   العميل: %', v_tenant_id;
    RAISE NOTICE '   المبلغ: 100.00 USD';
    RAISE NOTICE '';
    
    -- إنشاء الدفعة
    INSERT INTO saas_payments (
        payment_number,
        tenant_id,
        amount,
        currency,
        payment_method,
        collection_date,
        status
    ) VALUES (
        'PAY-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        v_tenant_id,
        100.00,
        'USD',
        'cash',
        CURRENT_DATE,
        'pending'
    )
    RETURNING id INTO v_payment_id;
    
    RAISE NOTICE '✅ تم إنشاء الدفعة: %', v_payment_id;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 تفعيل الاشتراك...';
    
    -- تفعيل الاشتراك
    v_result := activate_subscription_from_payment(v_payment_id);
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 النتيجة:';
    RAISE NOTICE '%', v_result::TEXT;
    RAISE NOTICE '';
    
    -- عرض تفاصيل الاشتراك بعد التفعيل
    IF (v_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ تم التفعيل بنجاح!';
        RAISE NOTICE '';
        RAISE NOTICE '📅 تفاصيل الاشتراك:';
        RAISE NOTICE '   • تاريخ البداية: %', v_result->>'start_date';
        RAISE NOTICE '   • تاريخ النهاية: %', v_result->>'end_date';
        RAISE NOTICE '   • عدد الأيام: %', v_result->>'days_purchased';
        RAISE NOTICE '   • السعر اليومي: % USD', v_result->>'daily_price';
        RAISE NOTICE '   • المبلغ المستخدم: % USD', v_result->>'amount_used';
        RAISE NOTICE '   • الرصيد المتبقي: % USD', v_result->>'remaining_balance';
        RAISE NOTICE '   • الباقة: %', v_result->>'plan_name';
    ELSE
        RAISE NOTICE '❌ فشل التفعيل: %', v_result->>'error';
    END IF;
    
END $$;

-- 3. عرض الاشتراكات بعد التفعيل
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 الاشتراكات النشطة بعد التفعيل:';
END $$;

SELECT 
    t.name as tenant,
    sp.name_en as plan,
    ts.start_date,
    ts.end_date,
    ts.total_days_purchased as days,
    (ts.end_date - CURRENT_DATE) as days_left,
    ts.remaining_balance as balance,
    ts.status
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.status = 'active'
ORDER BY ts.updated_at DESC
LIMIT 5;

-- 4. عرض التنبيهات المجدولة
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔔 التنبيهات المجدولة:';
END $$;

SELECT 
    t.name as tenant,
    sa.alert_type,
    sa.alert_date,
    sa.days_remaining,
    sa.status
FROM subscription_alerts sa
JOIN tenants t ON sa.tenant_id = t.id
WHERE sa.status = 'pending'
ORDER BY sa.alert_date
LIMIT 10;

-- رسالة نهائية
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ اختبار التفعيل اكتمل بنجاح!';
    RAISE NOTICE '============================================================================';
END $$;
