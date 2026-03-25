CREATE OR REPLACE FUNCTION public.post_sales_invoice(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_trx        RECORD;
    v_je_id      UUID;
    v_user_id    UUID;
    v_account_ar  UUID;   -- حساب العميل (ذمم مدينة)
    v_account_rev UUID;   -- حساب إيرادات المبيعات
    v_account_tax UUID;   -- حساب ضريبة المخرجات
    v_account_cogs UUID;  -- حساب تكلفة البضاعة المباعة
    v_account_inv  UUID;  -- حساب المخزون
    -- ═══ المبالغ المحسوبة من البنود المسلّمة ═══
    v_delivered_subtotal NUMERIC(15,4) := 0;  -- إجمالي المبيعات قبل الخصم (من المسلّم)
    v_delivered_discount NUMERIC(15,4) := 0;  -- إجمالي الخصم (من المسلّم)
    v_net_amount  NUMERIC(15,4) := 0;         -- الصافي بعد الخصم
    v_tax_amount  NUMERIC(15,4) := 0;         -- الضريبة المحسوبة من المسلّم
    v_total       NUMERIC(15,4) := 0;         -- الإجمالي شامل الضريبة
    v_cost_amount NUMERIC(15,4) := 0;         -- تكلفة البضاعة المباعة
    v_line_num    INT := 0;
    v_entry_no    TEXT;
    v_inv_label   TEXT;
    v_item_count  INT := 0;
    v_has_delivered BOOLEAN := false;
BEGIN
    v_user_id := auth.uid();
    
    -- ════════════════════════════════════════════════════════
    -- 1. جلب بيانات الفاتورة
    -- ════════════════════════════════════════════════════════
    SELECT * INTO v_trx FROM sales_transactions WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة');
    END IF;
    
    IF v_trx.is_posted = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'الفاتورة مُرحَّلة مسبقاً');
    END IF;
    
    v_inv_label := COALESCE(v_trx.invoice_no, v_trx.draft_no, LEFT(p_invoice_id::text, 8));
    
    -- ════════════════════════════════════════════════════════
    -- 2. حساب المبالغ من البنود المسلّمة فعلياً
    -- ════════════════════════════════════════════════════════
    -- التحقق: هل يوجد بنود تم تسليمها؟
    SELECT COUNT(*) INTO v_item_count
    FROM sales_transaction_items sti
    WHERE sti.transaction_id = p_invoice_id
      AND COALESCE(sti.delivered_qty, 0) > 0;
    
    v_has_delivered := v_item_count > 0;
    
    -- ═══ حساب الإيرادات والضريبة من الكميات المسلّمة ═══
    SELECT
        -- الإجمالي قبل الخصم = SUM(delivered_qty × unit_price)
        COALESCE(SUM(
            COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0)
        ), 0),
        -- الخصم = SUM(delivered_qty × unit_price × discount_percent / 100)
        COALESCE(SUM(
            COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0)
            * COALESCE(sti.discount_percent, 0) / 100
        ), 0),
        -- الضريبة = SUM((delivered_qty × unit_price - خصم) × tax_rate / 100)
        COALESCE(SUM(
            (COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0)
             - COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0) * COALESCE(sti.discount_percent, 0) / 100
            ) * COALESCE(sti.tax_rate, 0) / 100
        ), 0),
        -- تكلفة البضاعة المباعة = SUM(cost_price × delivered_qty)
        COALESCE(SUM(
            COALESCE(sti.cost_price, 0) * COALESCE(sti.delivered_qty, 0)
        ), 0)
    INTO v_delivered_subtotal, v_delivered_discount, v_tax_amount, v_cost_amount
    FROM sales_transaction_items sti
    WHERE sti.transaction_id = p_invoice_id;
    
    -- الصافي = الإجمالي − الخصم
    v_net_amount := v_delivered_subtotal - v_delivered_discount;
    -- الإجمالي شامل الضريبة
    v_total := v_net_amount + v_tax_amount;
    
    -- ═══ Fallback: إذا لم يكن هناك بنود مسلّمة، استخدم الفاتورة الأصلية ═══
    IF NOT v_has_delivered THEN
        v_total := COALESCE(v_trx.total_amount, 0);
        v_tax_amount := COALESCE(v_trx.tax_amount, 0);
        v_net_amount := v_total - v_tax_amount;
        
        -- حساب التكلفة من الكمية الأصلية (fallback)
        SELECT COALESCE(SUM(
            COALESCE(sti.cost_price, 0) * COALESCE(sti.quantity, 0)
        ), 0) INTO v_cost_amount
        FROM sales_transaction_items sti
        WHERE sti.transaction_id = p_invoice_id;
    END IF;
    
    IF v_total <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 
            'مبلغ الفاتورة صفر أو سالب — تحقق من الكميات المسلّمة');
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- 3. البحث عن الحسابات
    -- ════════════════════════════════════════════════════════
    
    -- ① حساب العميل: الحساب الفرعي المربوط (الأولوية الأعلى)
    IF v_trx.customer_id IS NOT NULL THEN
        SELECT c.receivable_account_id INTO v_account_ar
        FROM customers c
        WHERE c.id = v_trx.customer_id
          AND c.receivable_account_id IS NOT NULL;
        
        IF v_account_ar IS NULL THEN
            SELECT id INTO v_account_ar
            FROM chart_of_accounts
            WHERE is_party_account = true
              AND party_type = 'customer'
              AND party_id = v_trx.customer_id
            LIMIT 1;
        END IF;
    END IF;
    
    IF v_account_ar IS NULL THEN
        SELECT id INTO v_account_ar
        FROM chart_of_accounts
        WHERE tenant_id = v_trx.tenant_id
          AND (company_id = v_trx.company_id OR company_id IS NULL)
          AND account_code IN ('1131', '1130')
        ORDER BY CASE WHEN account_code = '1131' THEN 0 ELSE 1 END,
                 CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    -- ② حساب إيرادات المبيعات (41 → 4110 → 4100)
    SELECT id INTO v_account_rev
    FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id
      AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('41', '411', '4110', '4100')
    ORDER BY CASE WHEN account_code = '41' THEN 0 WHEN account_code = '4110' THEN 1 WHEN account_code = '4100' THEN 2 ELSE 3 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- ③ ضريبة المخرجات (2130 → 2141)
    IF v_tax_amount > 0 THEN
        SELECT id INTO v_account_tax
        FROM chart_of_accounts
        WHERE tenant_id = v_trx.tenant_id
          AND (company_id = v_trx.company_id OR company_id IS NULL)
          AND account_code IN ('214', '2130', '2141', '2150')
        ORDER BY CASE WHEN account_code = '214' THEN 0 WHEN account_code = '2130' THEN 1 WHEN account_code = '2141' THEN 2 ELSE 3 END,
                 CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    -- ④ تكلفة البضاعة المباعة COGS (511 → 5100 → 5110)
    SELECT id INTO v_account_cogs
    FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id
      AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('511', '5100', '5110')
    ORDER BY CASE WHEN account_code = '511' THEN 0 WHEN account_code = '5100' THEN 1 ELSE 2 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- ⑤ المخزون (1140 → 1141)
    SELECT id INTO v_account_inv
    FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id
      AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('1140', '1141')
    ORDER BY CASE WHEN account_code = '1140' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- التحقق من الحسابات الأساسية
    IF v_account_ar IS NULL OR v_account_rev IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error',
            'حسابات المبيعات غير مكتملة — تحقق من الذمم المدينة (1130) وحساب الإيرادات (4100)');
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- 4. تحديث الفاتورة بالمبالغ الفعلية + تغيير الحالة
    -- ════════════════════════════════════════════════════════
    UPDATE sales_transactions
    SET stage = 'posted',
        is_posted = true,
        posted_at = NOW(),
        posted_by = v_user_id,
        -- تحديث المبالغ لتعكس المسلّم فعلياً
        subtotal = v_delivered_subtotal,
        discount_amount = v_delivered_discount,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- ════════════════════════════════════════════════════════
    -- 5. توليد رقم القيد
    -- ════════════════════════════════════════════════════════
    v_entry_no := 'JE-S-' || to_char(NOW(), 'YYMMDD') || '-' ||
                  LPAD(nextval('journal_entry_number_seq')::text, 4, '0');
    
    -- ════════════════════════════════════════════════════════
    -- 6. إنشاء القيد المحاسبي
    -- ════════════════════════════════════════════════════════
    -- ⚠️ يُنشأ كـ draft أولاً لتجنب chk_balanced_entry أثناء إدخال السطور
    INSERT INTO journal_entries (
        tenant_id, company_id, entry_number, entry_date,
        description,
        reference_type, reference_id, reference_number,
        currency, exchange_rate,
        status, is_posted,
        created_by
    ) VALUES (
        v_trx.tenant_id, v_trx.company_id, v_entry_no, CURRENT_DATE,
        'فاتورة مبيعات — ' || v_inv_label || CASE WHEN v_has_delivered THEN ' (بناءً على المسلّم فعلياً)' ELSE '' END,
        'sales_invoice', p_invoice_id, v_inv_label,
        COALESCE(v_trx.currency, 'SAR'), COALESCE(v_trx.exchange_rate, 1),
        'draft', false,
        v_user_id
    ) RETURNING id INTO v_je_id;
    
    -- ════════════════════════════════════════════════════════
    -- 7. سطور القيد
    -- ════════════════════════════════════════════════════════
    
    -- ① مدين: حساب العميل (الذمم المدينة) — المبلغ الكامل شامل الضريبة
    v_line_num := v_line_num + 1;
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, line_number,
        account_id, description,
        debit, credit,
        party_type, party_id
    ) VALUES (
        v_trx.tenant_id, v_je_id, v_line_num,
        v_account_ar,
        'ذمم مدينة — ' || COALESCE(v_trx.customer_name, ''),
        v_total, 0,
        'customer', v_trx.customer_id
    );
    
    -- ② دائن: إيرادات المبيعات (الصافي بعد الخصم)
    v_line_num := v_line_num + 1;
    INSERT INTO journal_entry_lines (
        tenant_id, entry_id, line_number,
        account_id, description,
        debit, credit
    ) VALUES (
        v_trx.tenant_id, v_je_id, v_line_num,
        v_account_rev,
        'إيرادات مبيعات — ' || v_inv_label,
        0,
        CASE WHEN v_tax_amount > 0 AND v_account_tax IS NOT NULL
             THEN v_net_amount ELSE v_total END
    );
    
    -- ③ دائن: ضريبة المخرجات (إن وجدت)
    IF v_tax_amount > 0 AND v_account_tax IS NOT NULL THEN
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit
        ) VALUES (
            v_trx.tenant_id, v_je_id, v_line_num,
            v_account_tax,
            'ضريبة مخرجات — ' || v_inv_label,
            0, v_tax_amount
        );
    END IF;
    
    -- ④⑤ قيد تكلفة البضاعة المباعة (COGS) — بناءً على التكلفة الفعلية للمسلّم
    IF v_cost_amount > 0 AND v_account_cogs IS NOT NULL AND v_account_inv IS NOT NULL THEN
        -- ④ مدين: تكلفة البضاعة المباعة (5100)
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit
        ) VALUES (
            v_trx.tenant_id, v_je_id, v_line_num,
            v_account_cogs,
            'تكلفة مبيعات — ' || v_inv_label,
            v_cost_amount, 0
        );
        
        -- ⑤ دائن: المخزون — إخراج بضاعة (1140)
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit
        ) VALUES (
            v_trx.tenant_id, v_je_id, v_line_num,
            v_account_inv,
            'إخراج مخزون — ' || v_inv_label,
            0, v_cost_amount
        );
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- 8. تفعيل القيد (draft → posted) بعد إكمال كل السطور
    -- ════════════════════════════════════════════════════════
    UPDATE journal_entries
    SET status = 'posted',
        is_posted = true,
        posted_at = NOW(),
        posted_by = v_user_id
    WHERE id = v_je_id;
    
    -- ربط القيد بالفاتورة
    UPDATE sales_transactions
    SET journal_entry_id = v_je_id
    WHERE id = p_invoice_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv_label,
        'journal_entry_id', v_je_id,
        'customer_account_id', v_account_ar,
        'based_on_delivered', v_has_delivered,
        'delivered_subtotal', v_delivered_subtotal,
        'delivered_discount', v_delivered_discount,
        'net_amount', v_net_amount,
        'tax_amount', v_tax_amount,
        'total_amount', v_total,
        'cost_amount', v_cost_amount,
        'cogs_recorded', v_cost_amount > 0 AND v_account_cogs IS NOT NULL,
        'gross_profit', v_net_amount - v_cost_amount,
        'message', CASE 
            WHEN v_has_delivered THEN 'تم ترحيل فاتورة المبيعات بنجاح — بناءً على الكميات المسلّمة فعلياً'
            ELSE 'تم ترحيل فاتورة المبيعات بنجاح — بناءً على الفاتورة الأصلية (لا توجد كميات مسلّمة)'
        END
    );

EXCEPTION WHEN OTHERS THEN
    -- إعادة حالة الفاتورة في حالة الخطأ
    UPDATE sales_transactions 
    SET stage = 'delivered', is_posted = false, posted_at = NULL, posted_by = NULL
    WHERE id = p_invoice_id AND is_posted = true;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$function$

