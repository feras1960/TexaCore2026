-- ============================================================================
-- التحقق قبل تنفيذ STEP_57B
-- ============================================================================

-- 1. التحقق من وجود جدول saas_payments
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'saas_payments'
        ) THEN '✅ جدول saas_payments موجود'
        ELSE '❌ جدول saas_payments غير موجود - يجب تنفيذ STEP_57 أولاً'
    END as status;

-- 2. عرض الأعمدة الحالية في الجدول
SELECT 
    '📋 الأعمدة الحالية في saas_payments' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'saas_payments'
ORDER BY ordinal_position;

-- 3. التحقق من الأعمدة المطلوب إضافتها
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'saas_payments' AND column_name = 'product_id'
        ) THEN '✅ موجود'
        ELSE '⚠️ سيتم إضافته'
    END as product_id_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'saas_payments' AND column_name = 'bank_account_id'
        ) THEN '✅ موجود'
        ELSE '⚠️ سيتم إضافته'
    END as bank_account_id_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'saas_payments' AND column_name = 'wallet_id'
        ) THEN '✅ موجود'
        ELSE '⚠️ سيتم إضافته'
    END as wallet_id_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'saas_payments' AND column_name = 'receipt_url'
        ) THEN '✅ موجود'
        ELSE '⚠️ سيتم إضافته'
    END as receipt_url_status;
