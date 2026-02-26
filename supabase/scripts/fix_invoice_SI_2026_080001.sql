-- ══════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح القيد المحاسبي للفاتورة SI-2026-000001 (V5 - Final)
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_trx RECORD;
    v_je_id UUID;
    v_old_je_id UUID;
    v_account_ar  UUID;
    v_account_rev UUID;
    v_account_tax UUID;
    v_account_cogs UUID;
    v_account_inv  UUID;
    v_delivered_subtotal NUMERIC(15,4) := 0;
    v_delivered_discount NUMERIC(15,4) := 0;
    v_net_amount  NUMERIC(15,4) := 0;
    v_tax_amount  NUMERIC(15,4) := 0;
    v_total       NUMERIC(15,4) := 0;
    v_cost_amount NUMERIC(15,4) := 0;
    v_total_debit NUMERIC(15,4) := 0;
    v_total_credit NUMERIC(15,4) := 0;
    v_entry_no    TEXT;
BEGIN
    -- 1. جلب الفاتورة
    SELECT * INTO v_trx FROM sales_transactions WHERE invoice_no = 'SI-2026-000001';
    IF NOT FOUND THEN RAISE NOTICE '❌ لم أجد الفاتورة'; RETURN; END IF;
    
    v_old_je_id := v_trx.journal_entry_id;
    RAISE NOTICE '✅ فاتورة: % | إجمالي أصلي: %', v_trx.id, v_trx.total_amount;

    -- 2. حساب المبالغ من المسلّم فعلياً
    SELECT
        COALESCE(SUM(COALESCE(sti.delivered_qty,0) * COALESCE(sti.unit_price,0)), 0),
        COALESCE(SUM(COALESCE(sti.delivered_qty,0) * COALESCE(sti.unit_price,0) * COALESCE(sti.discount_percent,0)/100), 0),
        COALESCE(SUM((COALESCE(sti.delivered_qty,0)*COALESCE(sti.unit_price,0) - COALESCE(sti.delivered_qty,0)*COALESCE(sti.unit_price,0)*COALESCE(sti.discount_percent,0)/100) * COALESCE(sti.tax_rate,0)/100), 0),
        COALESCE(SUM(COALESCE(sti.cost_price,0) * COALESCE(sti.delivered_qty,0)), 0)
    INTO v_delivered_subtotal, v_delivered_discount, v_tax_amount, v_cost_amount
    FROM sales_transaction_items sti WHERE sti.transaction_id = v_trx.id;
    
    v_net_amount := v_delivered_subtotal - v_delivered_discount;
    v_total := v_net_amount + v_tax_amount;
    v_total_debit := v_total + v_cost_amount;
    v_total_credit := v_total + v_cost_amount;
    
    RAISE NOTICE '📊 صافي=% | ضريبة=% | إجمالي=% | تكلفة=% | ربح=%', 
        v_net_amount, v_tax_amount, v_total, v_cost_amount, v_net_amount - v_cost_amount;

    -- 3. إيجاد الحسابات
    SELECT id INTO v_account_ar FROM chart_of_accounts
    WHERE is_party_account = true AND party_type = 'customer' AND party_id = v_trx.customer_id LIMIT 1;
    IF v_account_ar IS NULL THEN
        SELECT id INTO v_account_ar FROM chart_of_accounts
        WHERE tenant_id = v_trx.tenant_id AND company_id = v_trx.company_id
          AND account_code IN ('1131', '1131-001', '1130') LIMIT 1;
    END IF;

    SELECT id INTO v_account_rev FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND company_id = v_trx.company_id
      AND account_code IN ('41', '411', '4110', '4100') LIMIT 1;

    SELECT id INTO v_account_tax FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND company_id = v_trx.company_id
      AND account_code IN ('214', '2130', '2141') LIMIT 1;

    SELECT id INTO v_account_cogs FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND company_id = v_trx.company_id
      AND account_code IN ('511', '5100', '5110') LIMIT 1;

    SELECT id INTO v_account_inv FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND company_id = v_trx.company_id
      AND account_code IN ('1141', '1140') LIMIT 1;

    IF v_account_ar IS NULL OR v_account_rev IS NULL THEN
        RAISE NOTICE '❌ حسابات ناقصة! AR=% REV=%', v_account_ar, v_account_rev;
        RETURN;
    END IF;

    -- 4. إزالة FK من الفاتورة ثم حذف القيد القديم
    UPDATE sales_transactions SET journal_entry_id = NULL, is_posted = false WHERE id = v_trx.id;
    IF v_old_je_id IS NOT NULL THEN
        DELETE FROM journal_entry_lines WHERE entry_id = v_old_je_id;
        DELETE FROM journal_entries WHERE id = v_old_je_id;
        RAISE NOTICE '🗑️ حذف القيد القديم';
    END IF;

    -- 5. إنشاء القيد الجديد — مع total_debit/total_credit صحيحين من البداية
    v_entry_no := 'JE-S-' || to_char(NOW(), 'YYMMDD') || '-' ||
                  LPAD(nextval('journal_entry_number_seq')::text, 4, '0');
    
    INSERT INTO journal_entries (
        tenant_id, company_id, entry_number, entry_date, description,
        reference_type, reference_id, reference_number,
        currency, exchange_rate,
        total_debit, total_credit,
        status, is_posted, posted_at, posted_by, created_by
    ) VALUES (
        v_trx.tenant_id, v_trx.company_id, v_entry_no, CURRENT_DATE,
        'فاتورة مبيعات — SI-2026-000001 (مصحّح — بناءً على المسلّم فعلياً)',
        'sales_invoice', v_trx.id, 'SI-2026-000001',
        COALESCE(v_trx.currency, 'USD'), COALESCE(v_trx.exchange_rate, 1),
        v_total_debit, v_total_credit,
        'posted', true, NOW(), v_trx.created_by, v_trx.created_by
    ) RETURNING id INTO v_je_id;

    RAISE NOTICE '📒 قيد جديد: % | رقم: %', v_je_id, v_entry_no;

    -- 6. إدخال كل سطور القيد دفعة واحدة
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit, party_type, party_id)
    VALUES
        -- ① مدين: ذمم مدينة — المبلغ الكامل
        (v_trx.tenant_id, v_je_id, 1, v_account_ar,
         'ذمم مدينة — ' || COALESCE(v_trx.customer_name, ''),
         v_total, 0, 'customer', v_trx.customer_id),
        -- ② دائن: إيرادات المبيعات
        (v_trx.tenant_id, v_je_id, 2, v_account_rev,
         'إيرادات مبيعات — SI-2026-000001',
         0, v_net_amount, NULL, NULL),
        -- ③ دائن: ضريبة المخرجات
        (v_trx.tenant_id, v_je_id, 3, v_account_tax,
         'ضريبة مخرجات — SI-2026-000001',
         0, v_tax_amount, NULL, NULL),
        -- ④ مدين: تكلفة البضاعة المباعة
        (v_trx.tenant_id, v_je_id, 4, v_account_cogs,
         'تكلفة مبيعات — SI-2026-000001',
         v_cost_amount, 0, NULL, NULL),
        -- ⑤ دائن: إخراج مخزون
        (v_trx.tenant_id, v_je_id, 5, v_account_inv,
         'إخراج مخزون — SI-2026-000001',
         0, v_cost_amount, NULL, NULL);

    -- 7. تحديث الفاتورة بالمبالغ الصحيحة
    UPDATE sales_transactions
    SET journal_entry_id = v_je_id,
        stage = 'posted', is_posted = true, posted_at = NOW(), posted_by = v_trx.created_by,
        subtotal = v_delivered_subtotal, discount_amount = v_delivered_discount,
        tax_amount = v_tax_amount, total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_trx.id;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم إصلاح القيد المحاسبي بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '  ❌ القديم: ذمم=8291.43 | إيرادات=7896.60 | ضريبة=394.83 | تكلفة=2290.88';
    RAISE NOTICE '  ✅ الجديد: ذمم=% | إيرادات=% | ضريبة=% | تكلفة=%', v_total, v_net_amount, v_tax_amount, v_cost_amount;
    RAISE NOTICE '  📈 الربح: % → %', 7896.60 - 2290.88, v_net_amount - v_cost_amount;
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- التحقق النهائي: عرض القيد الجديد
-- ══════════════════════════════════════════════════════════════════════
SELECT 
    jel.line_number AS "#",
    coa.account_code AS "كود",
    coa.name_ar AS "الحساب",
    jel.description AS "الوصف",
    ROUND(jel.debit::numeric, 2) AS "مدين",
    ROUND(jel.credit::numeric, 2) AS "دائن"
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE jel.entry_id = (
    SELECT journal_entry_id FROM sales_transactions WHERE invoice_no = 'SI-2026-000001'
)
ORDER BY jel.line_number;
