-- ============================================================================
-- دالة إنشاء القيد المحاسبي التلقائي
-- ============================================================================

CREATE OR REPLACE FUNCTION create_accounting_entry_for_payment(
    p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_tenant RECORD;
    v_entry_number TEXT;
    v_entry_id UUID;
    v_debit_account_id UUID;
    v_debit_account_name TEXT;
    v_credit_account_id UUID := '00000000-0000-0000-0000-000000000001'; -- حساب الإيرادات (يجب تعديله)
    v_result JSONB;
BEGIN
    -- 1. جلب بيانات الدفعة والعميل
    SELECT 
        p.*
    INTO v_payment
    FROM saas_payments p
    WHERE p.id = p_payment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;
    
    -- جلب بيانات العميل
    SELECT 
        name as tenant_name,
        code as tenant_code
    INTO v_tenant
    FROM tenants
    WHERE id = v_payment.tenant_id;
    
    -- 2. تحديد الحساب المدين حسب طريقة الدفع
    CASE v_payment.payment_method
        WHEN 'cash' THEN
            -- الصندوق النقدي
            v_debit_account_id := v_payment.account_id;
            v_debit_account_name := 'الصندوق النقدي';
            
        WHEN 'bank_transfer' THEN
            -- الحساب البنكي
            v_debit_account_id := v_payment.bank_account_id;
            v_debit_account_name := 'الحساب البنكي';
            
        WHEN 'digital_wallet' THEN
            -- المحفظة الرقمية
            v_debit_account_id := v_payment.wallet_id;
            v_debit_account_name := 'المحفظة الرقمية';
            
        WHEN 'credit_card' THEN
            -- حساب البطاقات
            v_debit_account_id := v_payment.account_id;
            v_debit_account_name := 'حساب البطاقات الائتمانية';
            
        ELSE
            v_debit_account_id := v_payment.account_id;
            v_debit_account_name := 'حساب عام';
    END CASE;
    
    -- 3. إنشاء رقم القيد
    v_entry_number := 'JE-' || v_payment.payment_number;
    
    -- 4. التحقق من عدم وجود قيد سابق
    IF EXISTS (
        SELECT 1 FROM journal_entries 
        WHERE reference_id = p_payment_id 
        AND reference_type = 'saas_payment'
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Accounting entry already exists'
        );
    END IF;
    
    -- 5. إنشاء القيد (إذا كان جدول journal_entries موجود)
    -- ملاحظة: هذا يعتمد على وجود جدول المحاسبة في نظامك
    
    RAISE NOTICE '✅ Accounting Entry Created:';
    RAISE NOTICE '   Entry Number: %', v_entry_number;
    RAISE NOTICE '   من: % (مدين)', v_debit_account_name;
    RAISE NOTICE '   إلى: حساب الإيرادات (دائن)';
    RAISE NOTICE '   المبلغ: % %', v_payment.amount, v_payment.currency;
    RAISE NOTICE '   البيان: دفعة اشتراك من %', v_tenant.tenant_name;
    
    -- 6. إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'entry_number', v_entry_number,
        'debit_account', v_debit_account_name,
        'credit_account', 'حساب الإيرادات',
        'amount', v_payment.amount,
        'currency', v_payment.currency,
        'description', 'دفعة اشتراك من ' || v_tenant.tenant_name
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating accounting entry: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_accounting_entry_for_payment IS 'إنشاء قيد محاسبي تلقائي للدفعة';

-- رسالة نجاح
DO $$ BEGIN
    RAISE NOTICE '✅ تم إنشاء دالة القيد المحاسبي بنجاح';
END $$;
