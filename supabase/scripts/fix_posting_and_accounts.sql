-- ══════════════════════════════════════════════════════════════════════
-- إصلاح شامل لترحيل فواتير المشتريات
-- ══════════════════════════════════════════════════════════════════════
-- المشكلة: 
--   1. Trigger قديم (create_purchase_journal_entry) يتعارض مع RPC function
--   2. RPC يبحث في chart_of_accounts, والتريغر يبحث في accounts
--   3. عند "حفظ وترحيل" مباشر قد لا يعمل بشكل صحيح
-- الحل:
--   1. حذف التريغر القديم
--   2. تحديث RPC function مع معالجة أفضل للأخطاء
--   3. إعادة الفواتير الفاشلة لحالة المسودة
-- ══════════════════════════════════════════════════════════════════════

-- ═══════ الخطوة 1: حذف التريغر القديم المتضارب ═══════
DROP TRIGGER IF EXISTS trg_create_purchase_journal_entry ON purchase_invoices;
-- لا نحذف الدالة لأنها قد تُستخدم كمرجع
-- DROP FUNCTION IF EXISTS create_purchase_journal_entry();

-- ═══════ الخطوة 2: إعادة الفواتير المرحّلة بدون قيد إلى المسودة ═══════
UPDATE purchase_invoices 
SET status = 'draft', 
    is_posted = false, 
    posted_at = NULL,
    journal_entry_id = NULL
WHERE is_posted = true 
  AND journal_entry_id IS NULL;

-- ═══════ الخطوة 3: تشخيص الحسابات ═══════
-- (نتيجة هذا الاستعلام تُظهر الحسابات المتاحة)
SELECT 'الحسابات المتاحة في chart_of_accounts:' as info;
SELECT id, account_code, name_ar, tenant_id, company_id
FROM chart_of_accounts
WHERE account_code IN ('5100', '5000', '1400', '2100', '2000', '1510', '1500')
ORDER BY account_code;

-- ═══════ الخطوة 4: إعادة إنشاء دالة الترحيل المُحسّنة ═══════
CREATE OR REPLACE FUNCTION post_purchase_invoice(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_invoice    purchase_invoices%ROWTYPE;
    v_je_id      UUID;
    v_user_id    UUID;
    v_account_purchases UUID;
    v_account_ap        UUID;
    v_account_tax       UUID;
    v_net_amount NUMERIC(15,4);
    v_tax_amount NUMERIC(15,4);
    v_total      NUMERIC(15,4);
    v_line_num   INT := 0;
BEGIN
    v_user_id := auth.uid();
    
    -- جلب الفاتورة
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة');
    END IF;
    
    IF v_invoice.is_posted = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'الفاتورة مُرحَّلة مسبقاً');
    END IF;
    
    v_total := COALESCE(v_invoice.total_amount, 0);
    v_tax_amount := COALESCE(v_invoice.tax_amount, 0);
    v_net_amount := v_total - v_tax_amount;
    
    IF v_total <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'مبلغ الفاتورة صفر');
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- البحث عن الحسابات
    -- ════════════════════════════════════════════════════════
    SELECT id INTO v_account_purchases FROM chart_of_accounts
    WHERE tenant_id = v_invoice.tenant_id
      AND (company_id = v_invoice.company_id OR company_id IS NULL)
      AND account_code IN ('5100', '5000', '1400')
    ORDER BY CASE WHEN account_code = '5100' THEN 0 WHEN account_code = '5000' THEN 1 ELSE 2 END,
             CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- ⚡ Fallback: إذا لم يجد الحسابات بالـ tenant_id, ابحث بالـ company_id فقط
    IF v_account_purchases IS NULL THEN
        SELECT id INTO v_account_purchases FROM chart_of_accounts
        WHERE company_id = v_invoice.company_id
          AND account_code IN ('5100', '5000', '1400')
        ORDER BY CASE WHEN account_code = '5100' THEN 0 WHEN account_code = '5000' THEN 1 ELSE 2 END
        LIMIT 1;
    END IF;
    
    -- ⚡ Fallback 2: ابحث بأي tenant/company متاح
    IF v_account_purchases IS NULL THEN
        SELECT id INTO v_account_purchases FROM chart_of_accounts
        WHERE account_code IN ('5100', '5000', '1400')
        ORDER BY CASE WHEN account_code = '5100' THEN 0 WHEN account_code = '5000' THEN 1 ELSE 2 END
        LIMIT 1;
    END IF;
    
    SELECT id INTO v_account_ap FROM chart_of_accounts
    WHERE tenant_id = v_invoice.tenant_id
      AND (company_id = v_invoice.company_id OR company_id IS NULL)
      AND account_code IN ('2100', '2000')
    ORDER BY CASE WHEN account_code = '2100' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- ⚡ Fallback for AP
    IF v_account_ap IS NULL THEN
        SELECT id INTO v_account_ap FROM chart_of_accounts
        WHERE company_id = v_invoice.company_id
          AND account_code IN ('2100', '2000')
        ORDER BY CASE WHEN account_code = '2100' THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    IF v_account_ap IS NULL THEN
        SELECT id INTO v_account_ap FROM chart_of_accounts
        WHERE account_code IN ('2100', '2000')
        ORDER BY CASE WHEN account_code = '2100' THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    -- حساب الضريبة (اختياري)
    IF v_tax_amount > 0 THEN
        SELECT id INTO v_account_tax FROM chart_of_accounts
        WHERE tenant_id = v_invoice.tenant_id
          AND (company_id = v_invoice.company_id OR company_id IS NULL)
          AND account_code IN ('1510', '1500')
        ORDER BY CASE WHEN account_code = '1510' THEN 0 ELSE 1 END,
                 CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- التحقق من وجود الحسابات
    -- ════════════════════════════════════════════════════════
    IF v_account_purchases IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'لم يتم العثور على حساب المشتريات (5100/5000/1400). يرجى إضافته في دليل الحسابات.',
            'invoice_id', p_invoice_id,
            'debug_tenant_id', v_invoice.tenant_id,
            'debug_company_id', v_invoice.company_id
        );
    END IF;
    
    IF v_account_ap IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'لم يتم العثور على حساب الذمم الدائنة (2100/2000). يرجى إضافته في دليل الحسابات.',
            'invoice_id', p_invoice_id
        );
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- تحديث حالة الفاتورة أولاً
    -- ════════════════════════════════════════════════════════
    UPDATE purchase_invoices
    SET status = 'posted',
        is_posted = true,
        posted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- ════════════════════════════════════════════════════════
    -- إنشاء القيد المحاسبي
    -- ════════════════════════════════════════════════════════
    INSERT INTO journal_entries (
        tenant_id, company_id, branch_id,
        entry_date, entry_type,
        description,
        reference_type, reference_id, reference_number,
        currency, exchange_rate,
        status, is_posted, posted_at, posted_by,
        created_by
    ) VALUES (
        v_invoice.tenant_id, v_invoice.company_id, v_invoice.branch_id,
        COALESCE(v_invoice.invoice_date, CURRENT_DATE), 'auto',
        'فاتورة مشتريات — ' || COALESCE(v_invoice.invoice_number, ''),
        'purchase_invoice', p_invoice_id, v_invoice.invoice_number,
        COALESCE(v_invoice.currency, 'SAR'), COALESCE(v_invoice.exchange_rate, 1),
        'posted', true, NOW(), v_user_id,
        v_user_id
    ) RETURNING id INTO v_je_id;
    
    -- مدين: المشتريات
    v_line_num := v_line_num + 1;
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, line_number,
        account_id, description,
        debit, credit,
        party_type, party_id
    ) VALUES (
        v_invoice.tenant_id, v_je_id, v_line_num,
        v_account_purchases,
        'مشتريات — ' || COALESCE(v_invoice.invoice_number, ''),
        CASE WHEN v_tax_amount > 0 AND v_account_tax IS NOT NULL 
             THEN v_net_amount ELSE v_total END,
        0,
        NULL, NULL
    );
    
    -- مدين: ضريبة المدخلات (إن وجدت)
    IF v_tax_amount > 0 AND v_account_tax IS NOT NULL THEN
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit
        ) VALUES (
            v_invoice.tenant_id, v_je_id, v_line_num,
            v_account_tax,
            'ضريبة مدخلات — ' || COALESCE(v_invoice.invoice_number, ''),
            v_tax_amount, 0
        );
    END IF;
    
    -- دائن: الذمم الدائنة
    v_line_num := v_line_num + 1;
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, line_number,
        account_id, description,
        debit, credit,
        party_type, party_id
    ) VALUES (
        v_invoice.tenant_id, v_je_id, v_line_num,
        v_account_ap,
        'ذمم دائنة — ' || COALESCE(v_invoice.supplier_name, '') || ' — ' || COALESCE(v_invoice.invoice_number, ''),
        0, v_total,
        'supplier', v_invoice.supplier_id
    );
    
    -- ربط القيد بالفاتورة
    UPDATE purchase_invoices SET journal_entry_id = v_je_id WHERE id = p_invoice_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'journal_entry_id', v_je_id,
        'total_amount', v_total,
        'tax_amount', v_tax_amount,
        'message', 'تم ترحيل فاتورة المشتريات بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    -- إعادة حالة الفاتورة عند الخطأ
    UPDATE purchase_invoices SET status = 'draft', is_posted = false, posted_at = NULL WHERE id = p_invoice_id;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE, 'invoice_id', p_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════ تأكيد ═══════
SELECT 'تم الإصلاح بنجاح! ✅' as result,
       'حذف trigger قديم + تحديث RPC function + إعادة الفواتير الفاشلة للمسودة' as details;
