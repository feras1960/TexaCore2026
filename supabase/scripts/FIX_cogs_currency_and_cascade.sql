-- ══════════════════════════════════════════════════════════════════════
-- 🔧 FIX: COGS Currency + Cascade Delete + Orphan Cleanup
-- ══════════════════════════════════════════════════════════════════════
-- 
-- المشكلة:
-- ❌ cost_per_meter مخزّن بالدولار USD (من فاتورة الشراء)
-- ❌ قيد COGS يحمل currency = UAH (عملة فاتورة المبيعات) + exchange_rate = ~43
-- ❌ get_all_account_balances_fc يقسم المبلغ على سعر الصرف ظناً أنه بالغريفن
-- ❌ النتيجة: فرق في الشجرة المحاسبية
--
-- الحل:
-- ✅ قيد COGS يُسجّل بالعملة الأساسية (من companies.default_currency) مع exchange_rate = 1
-- ✅ تريغر cascade delete لحذف القيود عند حذف الفاتورة
-- ✅ تنظيف القيود اليتيمة المرتبطة بفواتير محذوفة
-- ══════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- STEP 1: تنظيف القيود اليتيمة (orphaned journal entries)
-- قيود مرتبطة بفواتير مبيعات محذوفة
-- ══════════════════════════════════════════════════════════════════════

-- أولاً: عرض القيود اليتيمة قبل الحذف
SELECT 'ORPHANED ENTRIES' AS step;

SELECT je.id, je.entry_number, je.reference_type, je.reference_id, je.description,
       je.currency, je.exchange_rate, je.total_debit, je.total_credit, je.status
FROM journal_entries je
WHERE je.reference_type IN ('sales_invoice', 'sales_cogs')
  AND NOT EXISTS (
    SELECT 1 FROM sales_transactions st WHERE st.id = je.reference_id
  );

-- حذف سطور القيود اليتيمة
DELETE FROM journal_entry_lines
WHERE entry_id IN (
    SELECT je.id
    FROM journal_entries je
    WHERE je.reference_type IN ('sales_invoice', 'sales_cogs')
      AND NOT EXISTS (
        SELECT 1 FROM sales_transactions st WHERE st.id = je.reference_id
      )
);

-- حذف رؤوس القيود اليتيمة
DELETE FROM journal_entries
WHERE reference_type IN ('sales_invoice', 'sales_cogs')
  AND NOT EXISTS (
    SELECT 1 FROM sales_transactions st WHERE st.id = reference_id
  );


-- ══════════════════════════════════════════════════════════════════════
-- STEP 2: إصلاح قيود COGS الحالية التي تحمل عملة خاطئة
-- تحويلها من عملة الفاتورة (UAH) إلى العملة الأساسية (USD) مع exchange_rate = 1
-- ══════════════════════════════════════════════════════════════════════

SELECT 'FIX EXISTING COGS ENTRIES' AS step;

-- عرض القيود المتأثرة قبل الإصلاح
SELECT je.id, je.entry_number, je.currency, je.exchange_rate, 
       je.total_debit, je.total_credit, je.reference_type,
       c.default_currency AS base_currency
FROM journal_entries je
JOIN companies c ON c.id = je.company_id
WHERE je.reference_type = 'sales_cogs'
  AND je.currency != c.default_currency
  AND je.status = 'posted';

-- إصلاح: تحديث العملة وسعر الصرف
UPDATE journal_entries
SET currency = c.default_currency,
    exchange_rate = 1,
    updated_at = NOW()
FROM companies c
WHERE c.id = journal_entries.company_id
  AND journal_entries.reference_type = 'sales_cogs'
  AND journal_entries.currency != c.default_currency;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 3: تريغر Cascade Delete — حذف القيود المحاسبية عند حذف فاتورة المبيعات
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS cleanup_sales_invoice_journal_entries() CASCADE;

CREATE OR REPLACE FUNCTION cleanup_sales_invoice_journal_entries()
RETURNS TRIGGER AS $$
BEGIN
    -- حذف قيد المبيعات الرئيسي
    IF OLD.journal_entry_id IS NOT NULL THEN
        DELETE FROM journal_entry_lines WHERE entry_id = OLD.journal_entry_id;
        DELETE FROM journal_entries WHERE id = OLD.journal_entry_id;
    END IF;
    
    -- حذف قيد COGS المنفصل
    IF OLD.cogs_journal_entry_id IS NOT NULL THEN
        DELETE FROM journal_entry_lines WHERE entry_id = OLD.cogs_journal_entry_id;
        DELETE FROM journal_entries WHERE id = OLD.cogs_journal_entry_id;
    END IF;
    
    -- حذف أي قيود إضافية مرتبطة بنفس الفاتورة عبر reference_id
    DELETE FROM journal_entry_lines
    WHERE entry_id IN (
        SELECT id FROM journal_entries 
        WHERE reference_id = OLD.id 
          AND reference_type IN ('sales_invoice', 'sales_cogs')
    );
    
    DELETE FROM journal_entries
    WHERE reference_id = OLD.id
      AND reference_type IN ('sales_invoice', 'sales_cogs');
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء التريغر
DROP TRIGGER IF EXISTS trg_cleanup_sales_journal ON sales_transactions;

CREATE TRIGGER trg_cleanup_sales_journal
    BEFORE DELETE ON sales_transactions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_sales_invoice_journal_entries();

COMMENT ON FUNCTION cleanup_sales_invoice_journal_entries() IS 
    'تنظيف القيود المحاسبية المرتبطة بفاتورة المبيعات عند حذفها (قيد المبيعات + COGS)';


-- ══════════════════════════════════════════════════════════════════════
-- STEP 4: تحديث post_sales_invoice() — V3
-- ✅ قيد COGS بالعملة الأساسية (USD) مع exchange_rate = 1
-- ✅ قيد المبيعات بعملة الفاتورة (كما هو)
-- ✅ ربط cogs_journal_entry_id بالفاتورة
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS post_sales_invoice(UUID);

CREATE OR REPLACE FUNCTION post_sales_invoice(
    p_invoice_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_trx        RECORD;
    v_je_id      UUID;      -- قيد الفاتورة (المبيعات + ضريبة)
    v_je_cogs_id UUID;      -- قيد COGS (منفصل)
    v_user_id    UUID;
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
    v_line_num    INT := 0;
    v_entry_no    TEXT;
    v_entry_no_cogs TEXT;
    v_inv_label   TEXT;
    v_item_count  INT := 0;
    v_has_delivered BOOLEAN := false;
    v_base_currency TEXT;  -- 🆕 العملة الأساسية للشركة
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
    
    -- 🆕 جلب العملة الأساسية للشركة (USD)
    SELECT COALESCE(c.default_currency, 'USD') INTO v_base_currency
    FROM companies c WHERE c.id = v_trx.company_id;
    
    -- ════════════════════════════════════════════════════════
    -- 2. حساب المبالغ من البنود المسلّمة فعلياً
    -- ════════════════════════════════════════════════════════
    SELECT COUNT(*) INTO v_item_count
    FROM sales_transaction_items sti
    WHERE sti.transaction_id = p_invoice_id
      AND COALESCE(sti.delivered_qty, 0) > 0;
    
    v_has_delivered := v_item_count > 0;
    
    SELECT
        COALESCE(SUM(COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0)), 0),
        COALESCE(SUM(COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0) * COALESCE(sti.discount_percent, 0) / 100), 0),
        COALESCE(SUM(
            (COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0)
             - COALESCE(sti.delivered_qty, 0) * COALESCE(sti.unit_price, 0) * COALESCE(sti.discount_percent, 0) / 100
            ) * COALESCE(sti.tax_rate, 0) / 100
        ), 0),
        COALESCE(SUM(COALESCE(sti.cost_price, 0) * COALESCE(sti.delivered_qty, 0)), 0)
    INTO v_delivered_subtotal, v_delivered_discount, v_tax_amount, v_cost_amount
    FROM sales_transaction_items sti
    WHERE sti.transaction_id = p_invoice_id;
    
    v_net_amount := v_delivered_subtotal - v_delivered_discount;
    v_total := v_net_amount + v_tax_amount;
    
    IF NOT v_has_delivered THEN
        v_total := COALESCE(v_trx.total_amount, 0);
        v_tax_amount := COALESCE(v_trx.tax_amount, 0);
        v_net_amount := v_total - v_tax_amount;
        
        SELECT COALESCE(SUM(COALESCE(sti.cost_price, 0) * COALESCE(sti.quantity, 0)), 0)
        INTO v_cost_amount
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
    IF v_trx.customer_id IS NOT NULL THEN
        SELECT c.receivable_account_id INTO v_account_ar
        FROM customers c WHERE c.id = v_trx.customer_id AND c.receivable_account_id IS NOT NULL;
        
        IF v_account_ar IS NULL THEN
            SELECT id INTO v_account_ar FROM chart_of_accounts
            WHERE is_party_account = true AND party_type = 'customer' AND party_id = v_trx.customer_id LIMIT 1;
        END IF;
    END IF;
    
    IF v_account_ar IS NULL THEN
        SELECT id INTO v_account_ar FROM chart_of_accounts
        WHERE tenant_id = v_trx.tenant_id AND (company_id = v_trx.company_id OR company_id IS NULL)
          AND account_code IN ('1131', '1130')
        ORDER BY CASE WHEN account_code = '1131' THEN 0 ELSE 1 END,
                 CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END LIMIT 1;
    END IF;
    
    SELECT id INTO v_account_rev FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('41', '411', '4110', '4100')
    ORDER BY CASE WHEN account_code = '41' THEN 0 WHEN account_code = '4110' THEN 1 WHEN account_code = '4100' THEN 2 ELSE 3 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    IF v_tax_amount > 0 THEN
        SELECT id INTO v_account_tax FROM chart_of_accounts
        WHERE tenant_id = v_trx.tenant_id AND (company_id = v_trx.company_id OR company_id IS NULL)
          AND account_code IN ('214', '2130', '2141', '2150')
        ORDER BY CASE WHEN account_code = '214' THEN 0 WHEN account_code = '2130' THEN 1 WHEN account_code = '2141' THEN 2 ELSE 3 END,
                 CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END LIMIT 1;
    END IF;
    
    SELECT id INTO v_account_cogs FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('511', '5100', '5110')
    ORDER BY CASE WHEN account_code = '511' THEN 0 WHEN account_code = '5100' THEN 1 ELSE 2 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    SELECT id INTO v_account_inv FROM chart_of_accounts
    WHERE tenant_id = v_trx.tenant_id AND (company_id = v_trx.company_id OR company_id IS NULL)
      AND account_code IN ('1140', '1141')
    ORDER BY CASE WHEN account_code = '1140' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_trx.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    IF v_account_ar IS NULL OR v_account_rev IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error',
            'حسابات المبيعات غير مكتملة — تحقق من الذمم المدينة (1130) وحساب الإيرادات (4100)');
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- 4. تحديث الفاتورة
    -- ════════════════════════════════════════════════════════
    UPDATE sales_transactions
    SET stage = 'posted', is_posted = true, posted_at = NOW(), posted_by = v_user_id,
        subtotal = v_delivered_subtotal, discount_amount = v_delivered_discount,
        tax_amount = v_tax_amount, total_amount = v_total, updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- ════════════════════════════════════════════════════════
    -- 5. قيد ① — فاتورة المبيعات (Dr عميل / Cr مبيعات + ضريبة)
    --    المبلغ = قيمة الفاتورة بعملة الفاتورة
    -- ════════════════════════════════════════════════════════
    v_entry_no := 'JE-S-' || to_char(NOW(), 'YYMMDD') || '-' ||
                  LPAD(nextval('journal_entry_number_seq')::text, 4, '0');
    
    INSERT INTO journal_entries (
        tenant_id, company_id, entry_number, entry_date,
        description, reference_type, reference_id, reference_number,
        currency, exchange_rate, status, is_posted, created_by,
        total_debit, total_credit
    ) VALUES (
        v_trx.tenant_id, v_trx.company_id, v_entry_no, CURRENT_DATE,
        'فاتورة مبيعات — ' || v_inv_label || CASE WHEN v_has_delivered THEN ' (بناءً على المسلّم فعلياً)' ELSE '' END,
        'sales_invoice', p_invoice_id, v_inv_label,
        COALESCE(v_trx.currency, 'SAR'), COALESCE(v_trx.exchange_rate, 1),
        'draft', false, v_user_id,
        v_total, v_total
    ) RETURNING id INTO v_je_id;
    
    -- ① مدين: العميل
    v_line_num := 1;
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit, party_type, party_id)
    VALUES (v_trx.tenant_id, v_je_id, v_line_num, v_account_ar, 'ذمم مدينة — ' || COALESCE(v_trx.customer_name, ''), v_total, 0, 'customer', v_trx.customer_id);
    
    -- ② دائن: مبيعات
    v_line_num := 2;
    INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
    VALUES (v_trx.tenant_id, v_je_id, v_line_num, v_account_rev, 'إيرادات مبيعات — ' || v_inv_label, 0,
            CASE WHEN v_tax_amount > 0 AND v_account_tax IS NOT NULL THEN v_net_amount ELSE v_total END);
    
    -- ③ دائن: ضريبة مخرجات
    IF v_tax_amount > 0 AND v_account_tax IS NOT NULL THEN
        v_line_num := 3;
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
        VALUES (v_trx.tenant_id, v_je_id, v_line_num, v_account_tax, 'ضريبة مخرجات — ' || v_inv_label, 0, v_tax_amount);
    END IF;
    
    -- تفعيل قيد المبيعات
    UPDATE journal_entries SET status = 'posted', is_posted = true, posted_at = NOW(), posted_by = v_user_id WHERE id = v_je_id;
    
    -- ════════════════════════════════════════════════════════
    -- 6. قيد ② — تكلفة البضاعة المباعة (COGS) — منفصل
    --    🔑 المفتاح: العملة = العملة الأساسية (USD) وليس عملة الفاتورة
    --    لأن cost_price مخزّن بالدولار (من cost_per_meter المحسوب من فاتورة الشراء بالدولار)
    -- ════════════════════════════════════════════════════════
    IF v_cost_amount > 0 AND v_account_cogs IS NOT NULL AND v_account_inv IS NOT NULL THEN
        v_entry_no_cogs := 'JE-COGS-' || to_char(NOW(), 'YYMMDD') || '-' ||
                           LPAD(nextval('journal_entry_number_seq')::text, 4, '0');
        
        INSERT INTO journal_entries (
            tenant_id, company_id, entry_number, entry_date,
            description, reference_type, reference_id, reference_number,
            currency, exchange_rate, status, is_posted, created_by,
            total_debit, total_credit
        ) VALUES (
            v_trx.tenant_id, v_trx.company_id, v_entry_no_cogs, CURRENT_DATE,
            'تكلفة بضاعة مباعة — ' || v_inv_label,
            'sales_cogs', p_invoice_id, v_inv_label,
            -- 🔑 FIX: استخدام العملة الأساسية بدلاً من عملة الفاتورة
            v_base_currency, 1,
            'draft', false, v_user_id,
            v_cost_amount, v_cost_amount
        ) RETURNING id INTO v_je_cogs_id;
        
        -- Dr COGS
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
        VALUES (v_trx.tenant_id, v_je_cogs_id, 1, v_account_cogs, 'تكلفة مبيعات — ' || v_inv_label, v_cost_amount, 0);
        
        -- Cr Inventory
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
        VALUES (v_trx.tenant_id, v_je_cogs_id, 2, v_account_inv, 'إخراج مخزون — ' || v_inv_label, 0, v_cost_amount);
        
        -- تفعيل
        UPDATE journal_entries SET status = 'posted', is_posted = true, posted_at = NOW(), posted_by = v_user_id WHERE id = v_je_cogs_id;
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- 7. ربط القيود بالفاتورة
    -- ════════════════════════════════════════════════════════
    UPDATE sales_transactions
    SET journal_entry_id = v_je_id,
        cogs_journal_entry_id = v_je_cogs_id
    WHERE id = p_invoice_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv_label,
        'journal_entry_id', v_je_id,
        'cogs_journal_entry_id', v_je_cogs_id,
        'customer_account_id', v_account_ar,
        'based_on_delivered', v_has_delivered,
        'delivered_subtotal', v_delivered_subtotal,
        'delivered_discount', v_delivered_discount,
        'net_amount', v_net_amount,
        'tax_amount', v_tax_amount,
        'total_amount', v_total,
        'cost_amount', v_cost_amount,
        'cogs_recorded', v_cost_amount > 0 AND v_account_cogs IS NOT NULL,
        'cogs_currency', v_base_currency,
        'gross_profit', v_net_amount - v_cost_amount,
        'message', CASE 
            WHEN v_has_delivered THEN 'تم ترحيل فاتورة المبيعات بنجاح — بناءً على الكميات المسلّمة فعلياً'
            ELSE 'تم ترحيل فاتورة المبيعات بنجاح — بناءً على الفاتورة الأصلية (لا توجد كميات مسلّمة)'
        END
    );

EXCEPTION WHEN OTHERS THEN
    UPDATE sales_transactions 
    SET stage = 'delivered', is_posted = false, posted_at = NULL, posted_by = NULL
    WHERE id = p_invoice_id AND is_posted = true;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_sales_invoice IS 'ترحيل فاتورة مبيعات — V3: COGS بالعملة الأساسية + قيد منفصل + cascade delete';


-- ══════════════════════════════════════════════════════════════════════
-- STEP 5: التحقق النهائي
-- ══════════════════════════════════════════════════════════════════════

SELECT 'FINAL VERIFICATION' AS step;

-- A) هل يوجد قيود يتيمة متبقية؟
SELECT COUNT(*) AS orphaned_count,
       CASE WHEN COUNT(*) = 0 THEN '✅ لا قيود يتيمة' ELSE '❌ يوجد قيود يتيمة' END AS status
FROM journal_entries je
WHERE je.reference_type IN ('sales_invoice', 'sales_cogs')
  AND NOT EXISTS (
    SELECT 1 FROM sales_transactions st WHERE st.id = je.reference_id
  );

-- B) هل يوجد قيود COGS بعملة خاطئة؟
SELECT COUNT(*) AS wrong_currency_count,
       CASE WHEN COUNT(*) = 0 THEN '✅ كل قيود COGS بالعملة الصحيحة' ELSE '❌ يوجد قيود بعملة خاطئة' END AS status
FROM journal_entries je
JOIN companies c ON c.id = je.company_id
WHERE je.reference_type = 'sales_cogs'
  AND je.currency != c.default_currency;

-- C) التريغر مُفعّل؟
SELECT tgname, tgrelid::regclass AS trigger_table, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_cleanup_sales_journal';

-- D) ميزان المراجعة
SELECT 
  SUM(CASE WHEN bal.balance_base > 0 THEN bal.balance_base ELSE 0 END) AS total_debit,
  SUM(CASE WHEN bal.balance_base < 0 THEN ABS(bal.balance_base) ELSE 0 END) AS total_credit,
  SUM(bal.balance_base) AS net_diff,
  CASE WHEN ABS(SUM(bal.balance_base)) < 0.02 THEN '✅ BALANCED' ELSE '❌ STILL UNBALANCED: ' || ROUND(SUM(bal.balance_base), 4)::TEXT END AS status
FROM get_all_account_balances_fc('1313232a-6ad3-4002-891c-a9a9e8849a93') bal;
