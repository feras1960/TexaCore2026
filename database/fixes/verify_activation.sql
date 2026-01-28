-- ============================================================================
-- التحقق من نتائج التفعيل
-- ============================================================================

-- 1. الاشتراك المحدث
SELECT 
    '📦 الاشتراك بعد التفعيل' as info,
    t.name as tenant,
    sp.name_en as plan,
    ts.status,
    ts.start_date,
    ts.end_date,
    (ts.end_date - CURRENT_DATE) as days_remaining,
    ts.total_days_purchased,
    ts.remaining_balance,
    ts.last_payment_amount
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE t.id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47'
ORDER BY ts.updated_at DESC
LIMIT 1;

-- 2. الدفعة المكتملة
SELECT 
    '💰 الدفعة' as info,
    payment_number,
    amount,
    currency,
    status,
    collection_date,
    period_start,
    period_end
FROM saas_payments
WHERE id = '66714cfc-a80a-4e75-830e-fc62e82afeb4';

-- 3. التنبيهات المجدولة
SELECT 
    '🔔 التنبيهات المجدولة' as info,
    alert_type,
    alert_date,
    days_remaining,
    status,
    LEFT(message_ar, 60) as message_preview
FROM subscription_alerts
WHERE tenant_id = 'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47'
ORDER BY alert_date;

-- 4. إحصائيات الاشتراك
SELECT 
    '📊 الإحصائيات' as info,
    get_subscription_stats('e3a8b7ef-6f27-43c1-bd3f-61d183a97a47');
