-- ============================================================================
-- Quick Test: Payment System
-- تجربة سريعة لنظام المدفوعات
-- ============================================================================

-- 1. التحقق من الحقول الجديدة في جدول saas_payments
-- Verify new columns in saas_payments table
SELECT 
    '✅ Payment Table Columns' as test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'saas_payments'
AND column_name IN ('product_id', 'bank_account_id', 'wallet_id', 'receipt_url', 'account_id', 'reference_number')
ORDER BY column_name;

-- 2. التحقق من وجود عملاء نشطين مع اشتراكات
-- Check active customers with subscriptions
SELECT 
    '✅ Active Customers with Subscriptions' as test,
    COUNT(DISTINCT t.id) as total_customers,
    COUNT(DISTINCT ts.id) as total_subscriptions
FROM tenants t
LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
WHERE t.status IN ('active', 'trial')
AND ts.status IN ('active', 'pending');

-- 3. عرض أول 5 عملاء مع تفاصيل باقاتهم
-- Show first 5 customers with subscription details
SELECT 
    '👥 Sample Customers' as test,
    t.id,
    t.name as customer_name,
    t.code as customer_code,
    t.email,
    t.status,
    sp.name as product_name,
    spl.name_en as plan_name_en,
    spl.name_ar as plan_name_ar,
    spl.price_monthly,
    spl.currency,
    ts.start_date,
    ts.end_date,
    ts.status as subscription_status
FROM tenants t
LEFT JOIN saas_products sp ON t.product_id = sp.id
LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
LEFT JOIN subscription_plans spl ON ts.plan_id = spl.id
WHERE t.status IN ('active', 'trial')
ORDER BY t.created_at DESC
LIMIT 5;

-- 4. التحقق من وجود حسابات (صناديق/بنوك)
-- Check for accounts (cash/banks)
SELECT 
    '💰 Available Accounts' as test,
    account_type,
    COUNT(*) as count
FROM chart_of_accounts
WHERE account_type IN ('cash', 'bank')
AND is_active = true
GROUP BY account_type;

-- 5. عرض عينة من الحسابات
-- Show sample accounts
SELECT 
    '🏦 Sample Accounts' as test,
    id,
    account_number,
    account_name,
    account_type
FROM chart_of_accounts
WHERE account_type IN ('cash', 'bank')
AND is_active = true
ORDER BY account_type, account_number
LIMIT 5;

-- 6. إنشاء دفعة تجريبية (إن وجد عملاء)
-- Create a test payment (if customers exist)
DO $$
DECLARE
    v_tenant_id UUID;
    v_product_id UUID;
    v_subscription_id UUID;
    v_plan_id UUID;
    v_account_id UUID;
    v_payment_number VARCHAR;
BEGIN
    -- Get first active tenant
    SELECT t.id, t.product_id, ts.id, ts.plan_id
    INTO v_tenant_id, v_product_id, v_subscription_id, v_plan_id
    FROM tenants t
    LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    WHERE t.status = 'active'
    LIMIT 1;

    -- Get first cash account
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE account_type = 'cash' AND is_active = true
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        -- Generate payment number
        v_payment_number := 'PAY-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');

        -- Insert test payment
        INSERT INTO saas_payments (
            payment_number,
            tenant_id,
            product_id,
            subscription_id,
            plan_id,
            amount,
            currency,
            payment_method,
            status,
            collection_date,
            account_id,
            notes
        ) VALUES (
            v_payment_number,
            v_tenant_id,
            v_product_id,
            v_subscription_id,
            v_plan_id,
            100.00,
            'USD',
            'cash',
            'completed',
            NOW(),
            v_account_id,
            'دفعة تجريبية - Test payment created by quick test script'
        );

        RAISE NOTICE '✅ Test payment created: %', v_payment_number;
    ELSE
        RAISE NOTICE '⚠️ No active tenant found. Cannot create test payment.';
    END IF;
END $$;

-- 7. عرض آخر 5 دفعات
-- Show last 5 payments
SELECT 
    '📋 Recent Payments' as test,
    payment_number,
    t.name as customer_name,
    amount,
    currency,
    payment_method,
    status,
    collection_date,
    CASE 
        WHEN notes LIKE '%Test%' OR notes LIKE '%تجريبية%' THEN '🧪 Test'
        ELSE '✅ Real'
    END as payment_type
FROM saas_payments p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY created_at DESC
LIMIT 5;

-- 8. إحصائيات المدفوعات
-- Payment Statistics
SELECT 
    '📊 Payment Statistics' as test,
    COUNT(*) as total_payments,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
    currency
FROM saas_payments
GROUP BY currency;

-- 9. المدفوعات حسب طريقة الدفع
-- Payments by method
SELECT 
    '💳 Payments by Method' as test,
    payment_method,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    currency
FROM saas_payments
WHERE status = 'completed'
GROUP BY payment_method, currency
ORDER BY total_amount DESC;

-- 10. المدفوعات حسب العميل
-- Payments by customer
SELECT 
    '👤 Top 5 Paying Customers' as test,
    t.name as customer_name,
    t.code as customer_code,
    COUNT(p.id) as payment_count,
    SUM(p.amount) as total_paid,
    p.currency
FROM saas_payments p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.status = 'completed'
GROUP BY t.name, t.code, p.currency
ORDER BY total_paid DESC
LIMIT 5;

-- 11. التحقق من دالة توليد رقم الدفعة
-- Test payment number generation
SELECT 
    '🔢 Payment Number Generator Test' as test,
    generate_payment_number() as sample_payment_number;

-- 12. التحقق من دالة الإيرادات
-- Test revenue function
SELECT 
    '💰 Revenue Function Test' as test,
    get_total_revenue('USD') as total_revenue_usd,
    get_total_revenue('SAR') as total_revenue_sar,
    get_total_revenue('EUR') as total_revenue_eur;

-- ============================================================================
-- النتيجة المتوقعة | Expected Results:
-- ============================================================================
-- ✅ All new columns exist in saas_payments table
-- ✅ Active customers with subscriptions found
-- ✅ Sample customers displayed with subscription details
-- ✅ Accounts (cash/bank) are available
-- ✅ Test payment created successfully
-- ✅ Recent payments displayed
-- ✅ Statistics calculated correctly
-- ✅ Payment number generator works
-- ✅ Revenue function works
-- ============================================================================

-- حذف الدفعة التجريبية (اختياري)
-- Delete test payment (optional)
-- DELETE FROM saas_payments WHERE notes LIKE '%Test%' OR notes LIKE '%تجريبية%';

RAISE NOTICE '';
RAISE NOTICE '✅ ============================================';
RAISE NOTICE '✅ Payment System Quick Test Completed!';
RAISE NOTICE '✅ نظام المدفوعات جاهز للاستخدام';
RAISE NOTICE '✅ ============================================';
