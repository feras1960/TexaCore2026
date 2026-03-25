-- ============================================================================
-- Test: Verify Payments Data
-- ============================================================================

-- 1. Check payments table
SELECT 
    '✅ Payments Table' as test,
    COUNT(*) as total_payments,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
FROM saas_payments;

-- 2. Check payments by method
SELECT 
    '📊 Payments by Method' as test,
    payment_method,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM saas_payments
WHERE status = 'completed'
GROUP BY payment_method
ORDER BY total_amount DESC;

-- 3. Check monthly revenue
SELECT 
    '💰 Monthly Revenue' as test,
    TO_CHAR(collection_date, 'YYYY-MM') as month,
    COUNT(*) as payment_count,
    SUM(amount) as revenue
FROM saas_payments
WHERE status = 'completed'
GROUP BY TO_CHAR(collection_date, 'YYYY-MM')
ORDER BY month DESC;

-- 4. Test revenue function
SELECT '🔢 Revenue Function Test' as test, get_total_revenue('USD') as total_revenue_usd;

-- 5. Check recent payments
SELECT 
    '📋 Recent Payments' as test,
    payment_number,
    amount,
    currency,
    payment_method,
    status,
    collection_date
FROM saas_payments
ORDER BY collection_date DESC
LIMIT 5;
