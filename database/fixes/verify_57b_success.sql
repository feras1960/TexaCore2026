-- ============================================================================
-- التحقق من نجاح تنفيذ STEP_57B
-- ============================================================================

-- 1. التحقق من إضافة الأعمدة الجديدة
SELECT 
    '✅ التحقق من الأعمدة الجديدة' as test,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'saas_payments'
AND column_name IN ('product_id', 'bank_account_id', 'wallet_id', 'receipt_url')
ORDER BY column_name;

-- 2. التحقق من الفهارس (Indexes)
SELECT 
    '✅ التحقق من الفهارس' as test,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'saas_payments'
AND indexname = 'idx_payments_product';

-- 3. عرض جميع أعمدة جدول saas_payments (للتأكد)
SELECT 
    '📋 جميع الأعمدة في saas_payments' as test,
    ordinal_position,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'saas_payments'
ORDER BY ordinal_position;

-- 4. اختبار بسيط: عد الأعمدة
SELECT 
    '🔢 إجمالي عدد الأعمدة' as test,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'saas_payments';

-- Success message
SELECT '✅ النظام جاهز للاستخدام!' as status;
