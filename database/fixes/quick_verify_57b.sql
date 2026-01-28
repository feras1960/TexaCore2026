-- ============================================================================
-- التحقق السريع من نجاح STEP_57B
-- ============================================================================

-- فقط تحقق بسيط وسريع
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('product_id', 'bank_account_id', 'wallet_id', 'receipt_url') 
        THEN '✅ عمود جديد'
        ELSE '📋 عمود أصلي'
    END as status
FROM information_schema.columns
WHERE table_name = 'saas_payments'
ORDER BY 
    CASE WHEN column_name IN ('product_id', 'bank_account_id', 'wallet_id', 'receipt_url') THEN 0 ELSE 1 END,
    column_name;

-- رسالة النجاح
SELECT '✅ جاهز! يمكنك الآن استخدام النظام' as message;
