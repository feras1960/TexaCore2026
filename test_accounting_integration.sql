-- ============================================================================
-- اختبار القيد المحاسبي الحقيقي
-- ============================================================================

-- 1. إنشاء دفعة جديدة للاختبار
DO $$
DECLARE
    v_tenant_id UUID;
    v_payment_id UUID;
    v_activation_result JSONB;
BEGIN
    RAISE NOTICE '🧪 اختبار القيد المحاسبي الحقيقي';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';
    
    -- اختيار عميل
    SELECT id INTO v_tenant_id 
    FROM tenants 
    WHERE status = 'active' 
    LIMIT 1;
    
    RAISE NOTICE '📝 إنشاء دفعة تجريبية...';
    
    -- إنشاء دفعة
    INSERT INTO saas_payments (
        payment_number,
        tenant_id,
        amount,
        currency,
        payment_method,
        collection_date,
        status
    ) VALUES (
        'PAY-TEST-ACCOUNTING-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        v_tenant_id,
        200.00,
        'USD',
        'cash',
        CURRENT_DATE,
        'pending'
    )
    RETURNING id INTO v_payment_id;
    
    RAISE NOTICE '✅ تم إنشاء الدفعة: %', v_payment_id;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 تفعيل الاشتراك مع القيد المحاسبي...';
    RAISE NOTICE '';
    
    -- تفعيل الاشتراك (سينشئ القيد تلقائياً)
    v_activation_result := activate_subscription_from_payment(v_payment_id);
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 نتيجة التفعيل:';
    RAISE NOTICE '%', v_activation_result::TEXT;
    RAISE NOTICE '';
    
    IF (v_activation_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ نجح التفعيل!';
        RAISE NOTICE '   • الأيام المشتراة: %', v_activation_result->>'days_purchased';
        RAISE NOTICE '   • تاريخ الانتهاء: %', v_activation_result->>'end_date';
        
        -- التحقق من القيد المحاسبي
        IF v_activation_result->'accounting_entry'->>'success' = 'true' THEN
            RAISE NOTICE '';
            RAISE NOTICE '✅ تم إنشاء القيد المحاسبي!';
            RAISE NOTICE '   • رقم القيد: %', v_activation_result->'accounting_entry'->>'entry_number';
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '❌ فشل إنشاء القيد: %', v_activation_result->'accounting_entry'->>'error';
        END IF;
    ELSE
        RAISE NOTICE '❌ فشل التفعيل: %', v_activation_result->>'error';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 الآن افحص النتائج في الجداول التالية...';
    
END $$;

-- 2. فحص القيد في journal_entries
SELECT 
    '📖 القيود المحاسبية للدفعات' as info,
    je.entry_number,
    je.entry_date,
    je.description,
    je.total_debit,
    je.total_credit,
    je.currency,
    je.status,
    je.is_posted,
    sp.payment_number
FROM journal_entries je
JOIN saas_payments sp ON je.reference_id = sp.id
WHERE je.reference_type = 'saas_payment'
ORDER BY je.created_at DESC
LIMIT 5;

-- 3. فحص سطور القيد
SELECT 
    '📝 سطور القيد الأخير' as info,
    jel.line_number,
    coa.account_code,
    coa.name_en as account_name,
    jel.debit,
    jel.credit,
    jel.description
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.reference_type = 'saas_payment'
ORDER BY je.created_at DESC, jel.line_number
LIMIT 10;

-- 4. فحص أرصدة الحسابات المتأثرة
SELECT 
    '💰 أرصدة الحسابات' as info,
    coa.account_code,
    coa.name_en as account_name,
    at.name_en as account_type,
    coa.currency
FROM chart_of_accounts coa
LEFT JOIN account_types at ON coa.account_type_id = at.id
WHERE coa.account_code LIKE '10%' OR coa.account_code LIKE '40%'
ORDER BY coa.account_code;

-- 5. ملخص
DO $$ 
DECLARE
    v_entries_count INT;
    v_lines_count INT;
    v_total_revenue DECIMAL;
BEGIN
    SELECT COUNT(*) INTO v_entries_count 
    FROM journal_entries 
    WHERE reference_type = 'saas_payment';
    
    SELECT COUNT(*) INTO v_lines_count 
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.entry_id = je.id
    WHERE je.reference_type = 'saas_payment';
    
    SELECT SUM(total_credit) INTO v_total_revenue
    FROM journal_entries
    WHERE reference_type = 'saas_payment'
        AND status = 'posted';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '📊 ملخص القيود المحاسبية:';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '   • عدد القيود: %', v_entries_count;
    RAISE NOTICE '   • عدد السطور: %', v_lines_count;
    RAISE NOTICE '   • إجمالي الإيرادات: % USD', COALESCE(v_total_revenue, 0);
    RAISE NOTICE '============================================================================';
END $$;
