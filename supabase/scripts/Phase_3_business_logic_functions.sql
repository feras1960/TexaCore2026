-- ═══════════════════════════════════════════════════════════════════════════
-- المرحلة ٣ (المُصلحة): دوال الباك إند الأساسية (Business Logic Functions)
-- Phase 3 (FIXED): Core Backend Business Logic Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-02-14
-- المراجعة: تمت بواسطة Claude Opus 4.6
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- الإصلاحات المطبقة:
--   ✔ إصلاح ١: حذف triggers القديمة التي تتضارب مع الدوال الجديدة
--   ✔ إصلاح ٢: entity_type/entity_id → party_type/party_id (الأسماء الصحيحة)
--   ✔ إصلاح ٣: حذف company_id من INSERT في purchase_order_items (غير موجود)
--   ✔ إصلاح ٤: إضافة is_posted=true + posted_at=NOW() عند الترحيل
--   ✔ إصلاح ٥: عدم تمرير entry_number (trigger يولّده تلقائياً)
--   ✔ إصلاح ٦: عدم تمرير total_debit/total_credit (trigger يحسبها من الأسطر)
--   ✔ إصلاح ٧: إضافة total_cost في inventory_movements
--   ✔ إصلاح ٨: استخدام is_posted + posted_at + posted_by على journal_entries
--   ✔ SECURITY DEFINER على كل الدوال
--   ✔ tenant_id + company_id في كل INSERT
--
-- الترتيب: نفّذ بعد المرحلة ١ والمرحلة ٢
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  القسم ٠: حذف Triggers القديمة المتضاربة                    ║
-- ║  🔴 هذه الخطوة حرجة — بدونها ستحصل قيود مزدوجة!            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- الـ trigger القديم ينشئ قيد محاسبي عند UPDATE على purchase_invoices
-- الـ function الجديدة post_purchase_invoice() تتولى هذا الآن بشكل أفضل
DROP TRIGGER IF EXISTS trg_create_purchase_journal_entry ON purchase_invoices;

-- الـ trigger القديم يخصم المخزون عند UPDATE على sales_invoices
-- سنتحكم في هذا عبر post_sales_invoice() لاحقاً عند الحاجة
DROP TRIGGER IF EXISTS trg_deduct_inventory_on_sale ON sales_invoices;

DO $$ BEGIN RAISE NOTICE '✅ Dropped conflicting triggers: trg_create_purchase_journal_entry, trg_deduct_inventory_on_sale'; END $$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ١. post_purchase_receipt() — ترحيل سند استلام المشتريات     ║
-- ║                                                              ║
-- ║  يكمل هذه الخطوات في transaction واحدة:                     ║
-- ║  1. تحديث حالة سند الاستلام → completed                     ║
-- ║  2. إنشاء حركات مخزون (inventory_movements)                 ║
-- ║     → trigger update_inventory_stock يحدّث inventory_stock   ║
-- ║  3. إنشاء قيد: مدين مخزون (1400) / دائن موردون (2100)      ║
-- ║     → trigger generate_entry_number يولّد رقم القيد          ║
-- ║     → trigger update_journal_entry_totals يحسب المجاميع     ║
-- ║  4. تحديث حالة المستند المصدر (الفاتورة/أمر الشراء)        ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION post_purchase_receipt(
    p_receipt_id UUID,
    p_warehouse_id UUID,
    p_items JSONB  -- [{ "material_id":"uuid", "product_id":"uuid", "quantity":10, "unit_price":50, "description":"قماش" }]
) RETURNS JSONB AS $$
DECLARE
    v_receipt      RECORD;
    v_item         JSONB;
    v_movement_count INT := 0;
    v_total_amount NUMERIC(15,4) := 0;
    v_je_id        UUID;
    v_movement_number VARCHAR(50);
    v_user_id      UUID;
    v_account_inventory UUID;
    v_account_ap   UUID;
    v_item_qty     NUMERIC(15,3);
    v_item_price   NUMERIC(15,4);
    v_item_total   NUMERIC(15,4);
BEGIN
    v_user_id := auth.uid();
    
    -- ════════════════════════════════════════════════════════
    -- الخطوة ٠: التحقق من سند الاستلام
    -- ════════════════════════════════════════════════════════
    SELECT * INTO v_receipt
    FROM purchase_receipts
    WHERE id = p_receipt_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'سند الاستلام غير موجود');
    END IF;
    
    IF v_receipt.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'سند الاستلام مُرحَّل مسبقاً');
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- الخطوة ١: تحديث حالة سند الاستلام
    -- ════════════════════════════════════════════════════════
    UPDATE purchase_receipts
    SET status = 'completed',
        warehouse_id = COALESCE(p_warehouse_id, warehouse_id),
        updated_at = NOW()
    WHERE id = p_receipt_id;
    
    -- ════════════════════════════════════════════════════════
    -- الخطوة ٢: إنشاء حركات المخزون (واحدة لكل صنف)
    -- trigger: update_inventory_stock يحدّث inventory_stock تلقائياً
    -- ════════════════════════════════════════════════════════
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty   := COALESCE((v_item->>'quantity')::NUMERIC, 0);
        v_item_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
        v_item_total := v_item_qty * v_item_price;
        v_total_amount := v_total_amount + v_item_total;
        v_movement_count := v_movement_count + 1;
        
        v_movement_number := 'GRN-' || COALESCE(v_receipt.receipt_number, '') || '-' || v_movement_count;
        
        INSERT INTO inventory_movements (
            tenant_id, company_id,
            movement_number, movement_date,
            movement_type,
            product_id, material_id, variant_id,
            to_warehouse_id,
            quantity, unit_cost, total_cost,
            reference_type, reference_id, reference_number,
            notes, created_by
        ) VALUES (
            v_receipt.tenant_id, v_receipt.company_id,
            v_movement_number, CURRENT_DATE,
            'receipt',
            (v_item->>'product_id')::UUID,
            (v_item->>'material_id')::UUID,
            (v_item->>'variant_id')::UUID,
            COALESCE(p_warehouse_id, v_receipt.warehouse_id),
            v_item_qty, v_item_price, v_item_total,
            'purchase_receipt', p_receipt_id, v_receipt.receipt_number,
            COALESCE(v_item->>'description', 'استلام مشتريات'),
            v_user_id
        );
    END LOOP;
    
    -- ════════════════════════════════════════════════════════
    -- الخطوة ٣: إنشاء قيد محاسبي
    -- مدين: المخزون (1400)  /  دائن: الموردون (2100)
    -- 
    -- ملاحظة: entry_number يتولّد تلقائياً بواسطة generate_entry_number trigger
    -- ملاحظة: total_debit/total_credit تتحسب بواسطة update_journal_entry_totals trigger
    -- ════════════════════════════════════════════════════════
    
    -- البحث عن حساب المخزون (خاص بالشركة أولاً، ثم عام)
    SELECT id INTO v_account_inventory
    FROM chart_of_accounts
    WHERE tenant_id = v_receipt.tenant_id
      AND (company_id = v_receipt.company_id OR company_id IS NULL)
      AND account_code = '1400'
    ORDER BY CASE WHEN company_id = v_receipt.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- البحث عن حساب الموردين / الذمم الدائنة
    SELECT id INTO v_account_ap
    FROM chart_of_accounts
    WHERE tenant_id = v_receipt.tenant_id
      AND (company_id = v_receipt.company_id OR company_id IS NULL)
      AND account_code IN ('2100', '2108')
    ORDER BY CASE WHEN account_code = '2100' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_receipt.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    IF v_account_inventory IS NOT NULL AND v_account_ap IS NOT NULL AND v_total_amount > 0 THEN
        -- إنشاء رأس القيد (entry_number يتولّد تلقائياً)
        INSERT INTO journal_entries (
            tenant_id, company_id, branch_id,
            entry_date, entry_type,
            description,
            reference_type, reference_id, reference_number,
            status, is_posted, posted_at, posted_by,
            created_by
        ) VALUES (
            v_receipt.tenant_id, v_receipt.company_id, v_receipt.branch_id,
            CURRENT_DATE, 'auto',
            'قيد استلام مشتريات — ' || COALESCE(v_receipt.receipt_number, ''),
            'purchase_receipt', p_receipt_id, v_receipt.receipt_number,
            'posted', true, NOW(), v_user_id,
            v_user_id
        ) RETURNING id INTO v_je_id;
        
        -- سطر مدين: المخزون
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit,
            party_type, party_id
        ) VALUES (
            v_receipt.tenant_id, v_je_id, 1,
            v_account_inventory,
            'استلام مخزني — ' || COALESCE(v_receipt.receipt_number, ''),
            v_total_amount, 0,
            NULL, NULL
        );
        
        -- سطر دائن: الموردون
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit,
            party_type, party_id
        ) VALUES (
            v_receipt.tenant_id, v_je_id, 2,
            v_account_ap,
            'تسوية استلام — ' || COALESCE(v_receipt.receipt_number, ''),
            0, v_total_amount,
            'supplier', v_receipt.supplier_id
        );
        
        -- ربط القيد بسند الاستلام
        UPDATE purchase_receipts
        SET journal_entry_id = v_je_id
        WHERE id = p_receipt_id;
    END IF;
    
    -- ════════════════════════════════════════════════════════
    -- الخطوة ٤: تحديث حالة المستند المصدر
    -- ════════════════════════════════════════════════════════
    IF v_receipt.invoice_id IS NOT NULL THEN
        UPDATE purchase_invoices
        SET receiving_status = 'received', updated_at = NOW()
        WHERE id = v_receipt.invoice_id;
    END IF;
    
    IF v_receipt.order_id IS NOT NULL THEN
        UPDATE purchase_orders
        SET updated_at = NOW()
        WHERE id = v_receipt.order_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', p_receipt_id,
        'receipt_number', v_receipt.receipt_number,
        'movements_created', v_movement_count,
        'total_amount', v_total_amount,
        'journal_entry_id', v_je_id,
        'message', 'تم ترحيل سند الاستلام بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'receipt_id', p_receipt_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_purchase_receipt IS 'ترحيل سند استلام — حركات مخزون + قيد محاسبي + تحديث المصدر';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٢. post_purchase_invoice() — ترحيل فاتورة مشتريات          ║
-- ║                                                              ║
-- ║  مدين: المشتريات (5100)  /  دائن: الذمم الدائنة (2100)     ║
-- ║  + الضريبة إن وجدت: مدين ضريبة مدخلات                      ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION post_purchase_invoice(
    p_invoice_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_invoice   RECORD;
    v_je_id     UUID;
    v_user_id   UUID;
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
    -- تحديث حالة الفاتورة (⚠️ الـ trigger القديم محذوف — لن يتضارب)
    -- ════════════════════════════════════════════════════════
    UPDATE purchase_invoices
    SET status = 'posted',
        is_posted = true,
        posted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
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
    
    SELECT id INTO v_account_ap FROM chart_of_accounts
    WHERE tenant_id = v_invoice.tenant_id
      AND (company_id = v_invoice.company_id OR company_id IS NULL)
      AND account_code IN ('2100', '2000')
    ORDER BY CASE WHEN account_code = '2100' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
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
    -- إنشاء القيد المحاسبي
    -- ════════════════════════════════════════════════════════
    IF v_account_purchases IS NULL THEN
        -- ⚠️ لم يتم العثور على حساب المشتريات — ننشئ القيد بدون ذلك غير ممكن
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'لم يتم العثور على حساب المشتريات (5100/5000/1400) في دليل الحسابات. يرجى إضافته أولاً.',
            'invoice_id', p_invoice_id,
            'hint', 'يجب إنشاء حساب بكود 5100 (مشتريات) في دليل الحسابات'
        );
    END IF;
    
    IF v_account_ap IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'لم يتم العثور على حساب الذمم الدائنة (2100/2000) في دليل الحسابات. يرجى إضافته أولاً.',
            'invoice_id', p_invoice_id,
            'hint', 'يجب إنشاء حساب بكود 2100 (ذمم دائنة) في دليل الحسابات'
        );
    END IF;
    
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
    
    -- مدين: المشتريات (صافي بدون ضريبة)
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
    
    -- دائن: الذمم الدائنة (المبلغ الكامل)
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE, 'invoice_id', p_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_purchase_invoice IS 'ترحيل فاتورة مشتريات — قيد محاسبي مع دعم الضريبة';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٣. post_sales_invoice() — ترحيل فاتورة مبيعات              ║
-- ║                                                              ║
-- ║  مدين: الذمم المدينة (1200)  /  دائن: الإيرادات (4100)     ║
-- ║  + الضريبة إن وجدت: دائن ضريبة مخرجات                      ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION post_sales_invoice(
    p_invoice_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_invoice    RECORD;
    v_je_id      UUID;
    v_user_id    UUID;
    v_account_ar  UUID;
    v_account_rev UUID;
    v_account_tax UUID;
    v_net_amount  NUMERIC(15,4);
    v_tax_amount  NUMERIC(15,4);
    v_total       NUMERIC(15,4);
    v_line_num    INT := 0;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_invoice FROM sales_invoices WHERE id = p_invoice_id;
    
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
    
    -- تحديث الحالة
    UPDATE sales_invoices
    SET status = 'posted',
        is_posted = true,
        posted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- البحث عن الحسابات
    SELECT id INTO v_account_ar FROM chart_of_accounts
    WHERE tenant_id = v_invoice.tenant_id
      AND (company_id = v_invoice.company_id OR company_id IS NULL)
      AND account_code IN ('1200', '1210')
    ORDER BY CASE WHEN account_code = '1200' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    SELECT id INTO v_account_rev FROM chart_of_accounts
    WHERE tenant_id = v_invoice.tenant_id
      AND (company_id = v_invoice.company_id OR company_id IS NULL)
      AND account_code IN ('4100', '4000')
    ORDER BY CASE WHEN account_code = '4100' THEN 0 ELSE 1 END,
             CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    IF v_tax_amount > 0 THEN
        SELECT id INTO v_account_tax FROM chart_of_accounts
        WHERE tenant_id = v_invoice.tenant_id
          AND (company_id = v_invoice.company_id OR company_id IS NULL)
          AND account_code IN ('2160', '2150')
        ORDER BY CASE WHEN account_code = '2160' THEN 0 ELSE 1 END,
                 CASE WHEN company_id = v_invoice.company_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;
    
    -- إنشاء القيد
    IF v_account_ar IS NOT NULL AND v_account_rev IS NOT NULL THEN
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
            'فاتورة مبيعات — ' || COALESCE(v_invoice.invoice_number, ''),
            'sales_invoice', p_invoice_id, v_invoice.invoice_number,
            COALESCE(v_invoice.currency, 'SAR'), COALESCE(v_invoice.exchange_rate, 1),
            'posted', true, NOW(), v_user_id,
            v_user_id
        ) RETURNING id INTO v_je_id;
        
        -- مدين: الذمم المدينة
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit,
            party_type, party_id
        ) VALUES (
            v_invoice.tenant_id, v_je_id, v_line_num,
            v_account_ar,
            'ذمم مدينة — ' || COALESCE(v_invoice.customer_name, ''),
            v_total, 0,
            'customer', v_invoice.customer_id
        );
        
        -- دائن: الإيرادات (صافي بدون ضريبة)
        v_line_num := v_line_num + 1;
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number,
            account_id, description,
            debit, credit
        ) VALUES (
            v_invoice.tenant_id, v_je_id, v_line_num,
            v_account_rev,
            'إيرادات مبيعات — ' || COALESCE(v_invoice.invoice_number, ''),
            0,
            CASE WHEN v_tax_amount > 0 AND v_account_tax IS NOT NULL 
                 THEN v_net_amount ELSE v_total END
        );
        
        -- دائن: ضريبة المخرجات (إن وجدت)
        IF v_tax_amount > 0 AND v_account_tax IS NOT NULL THEN
            v_line_num := v_line_num + 1;
            INSERT INTO journal_entry_lines (
                tenant_id, entry_id, line_number,
                account_id, description,
                debit, credit
            ) VALUES (
                v_invoice.tenant_id, v_je_id, v_line_num,
                v_account_tax,
                'ضريبة مخرجات — ' || COALESCE(v_invoice.invoice_number, ''),
                0, v_tax_amount
            );
        END IF;
        
        UPDATE sales_invoices SET journal_entry_id = v_je_id WHERE id = p_invoice_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'journal_entry_id', v_je_id,
        'total_amount', v_total,
        'tax_amount', v_tax_amount,
        'message', 'تم ترحيل فاتورة المبيعات بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE, 'invoice_id', p_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_sales_invoice IS 'ترحيل فاتورة مبيعات — قيد محاسبي مع دعم الضريبة';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٤. post_purchase_return() — ترحيل مرتجع مشتريات            ║
-- ║                                                              ║
-- ║  مدين: الذمم الدائنة (2100)  /  دائن: المخزون (1400)       ║
-- ║  + إخراج المخزون من المستودع                                ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION post_purchase_return(
    p_return_id UUID,
    p_warehouse_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_return       RECORD;
    v_item         RECORD;
    v_je_id        UUID;
    v_user_id      UUID;
    v_total        NUMERIC(15,4) := 0;
    v_movement_count INT := 0;
    v_account_inventory UUID;
    v_account_ap   UUID;
    v_movement_number VARCHAR(50);
    v_wh_id        UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_return FROM purchase_returns WHERE id = p_return_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'مرتجع المشتريات غير موجود');
    END IF;
    
    IF v_return.status = 'posted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'المرتجع مُرحَّل مسبقاً');
    END IF;
    
    v_wh_id := COALESCE(p_warehouse_id, v_return.warehouse_id);
    
    -- تحديث الحالة
    UPDATE purchase_returns SET status = 'posted', updated_at = NOW() WHERE id = p_return_id;
    
    -- معالجة البنود → حركات مخزون (خروج)
    FOR v_item IN SELECT * FROM purchase_return_items WHERE return_id = p_return_id
    LOOP
        v_movement_count := v_movement_count + 1;
        v_total := v_total + COALESCE(v_item.total, v_item.quantity_returned * COALESCE(v_item.unit_price, 0));
        
        v_movement_number := 'PR-' || COALESCE(v_return.return_number, '') || '-' || v_movement_count;
        
        INSERT INTO inventory_movements (
            tenant_id, company_id,
            movement_number, movement_date,
            movement_type,
            product_id, material_id, variant_id,
            from_warehouse_id,
            quantity, unit_cost, total_cost,
            reference_type, reference_id, reference_number,
            notes, created_by
        ) VALUES (
            v_return.tenant_id, v_return.company_id,
            v_movement_number, CURRENT_DATE,
            'return_out',
            v_item.product_id, v_item.material_id, v_item.variant_id,
            v_wh_id,
            v_item.quantity_returned, COALESCE(v_item.unit_price, 0),
            COALESCE(v_item.total, v_item.quantity_returned * COALESCE(v_item.unit_price, 0)),
            'purchase_return', p_return_id, v_return.return_number,
            'مرتجع مشتريات', v_user_id
        );
    END LOOP;
    
    -- القيد: مدين ذمم دائنة / دائن مخزون
    SELECT id INTO v_account_inventory FROM chart_of_accounts
    WHERE tenant_id = v_return.tenant_id
      AND (company_id = v_return.company_id OR company_id IS NULL)
      AND account_code = '1400'
    ORDER BY CASE WHEN company_id = v_return.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    SELECT id INTO v_account_ap FROM chart_of_accounts
    WHERE tenant_id = v_return.tenant_id
      AND (company_id = v_return.company_id OR company_id IS NULL)
      AND account_code = '2100'
    ORDER BY CASE WHEN company_id = v_return.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    IF v_account_inventory IS NOT NULL AND v_account_ap IS NOT NULL AND v_total > 0 THEN
        INSERT INTO journal_entries (
            tenant_id, company_id, branch_id,
            entry_date, entry_type,
            description,
            reference_type, reference_id, reference_number,
            status, is_posted, posted_at, posted_by,
            created_by
        ) VALUES (
            v_return.tenant_id, v_return.company_id, v_return.branch_id,
            CURRENT_DATE, 'auto',
            'مرتجع مشتريات — ' || COALESCE(v_return.return_number, ''),
            'purchase_return', p_return_id, v_return.return_number,
            'posted', true, NOW(), v_user_id,
            v_user_id
        ) RETURNING id INTO v_je_id;
        
        -- مدين: تخفيض ذمم دائنة
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit, party_type, party_id)
        VALUES (v_return.tenant_id, v_je_id, 1, v_account_ap, 'تخفيض ذمم دائنة — مرتجع', v_total, 0, 'supplier', v_return.supplier_id);
        
        -- دائن: إرجاع مخزون
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
        VALUES (v_return.tenant_id, v_je_id, 2, v_account_inventory, 'إرجاع مخزون — مرتجع مشتريات', 0, v_total);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'return_id', p_return_id,
        'movements_created', v_movement_count,
        'total_amount', v_total,
        'journal_entry_id', v_je_id,
        'message', 'تم ترحيل مرتجع المشتريات بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_purchase_return IS 'ترحيل مرتجع مشتريات — إخراج مخزون + قيد عكسي';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٥. post_sales_return() — ترحيل مرتجع مبيعات                ║
-- ║                                                              ║
-- ║  مدين: الإيرادات (4100)  /  دائن: الذمم المدينة (1200)     ║
-- ║  + إدخال المخزون للمستودع                                   ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION post_sales_return(
    p_return_id UUID,
    p_warehouse_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_return       RECORD;
    v_item         RECORD;
    v_je_id        UUID;
    v_user_id      UUID;
    v_total        NUMERIC(15,4) := 0;
    v_movement_count INT := 0;
    v_account_ar   UUID;
    v_account_rev  UUID;
    v_movement_number VARCHAR(50);
    v_wh_id        UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'مرتجع المبيعات غير موجود');
    END IF;
    
    IF v_return.status = 'posted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'المرتجع مُرحَّل مسبقاً');
    END IF;
    
    v_wh_id := COALESCE(p_warehouse_id, v_return.warehouse_id);
    
    UPDATE sales_returns SET status = 'posted', updated_at = NOW() WHERE id = p_return_id;
    
    -- معالجة البنود → حركات مخزون (دخول)
    FOR v_item IN SELECT * FROM sales_return_items WHERE return_id = p_return_id
    LOOP
        v_movement_count := v_movement_count + 1;
        v_total := v_total + COALESCE(v_item.total, v_item.quantity_returned * COALESCE(v_item.unit_price, 0));
        
        v_movement_number := 'SR-' || COALESCE(v_return.return_number, '') || '-' || v_movement_count;
        
        INSERT INTO inventory_movements (
            tenant_id, company_id,
            movement_number, movement_date,
            movement_type,
            product_id, material_id, variant_id,
            to_warehouse_id,
            quantity, unit_cost, total_cost,
            reference_type, reference_id, reference_number,
            notes, created_by
        ) VALUES (
            v_return.tenant_id, v_return.company_id,
            v_movement_number, CURRENT_DATE,
            'return_in',
            v_item.product_id, v_item.material_id, v_item.variant_id,
            v_wh_id,
            v_item.quantity_returned, COALESCE(v_item.unit_price, 0),
            COALESCE(v_item.total, v_item.quantity_returned * COALESCE(v_item.unit_price, 0)),
            'sales_return', p_return_id, v_return.return_number,
            'مرتجع مبيعات', v_user_id
        );
    END LOOP;
    
    -- القيد: مدين إيرادات / دائن ذمم مدينة
    SELECT id INTO v_account_ar FROM chart_of_accounts
    WHERE tenant_id = v_return.tenant_id
      AND (company_id = v_return.company_id OR company_id IS NULL)
      AND account_code IN ('1200', '1210')
    ORDER BY CASE WHEN company_id = v_return.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    SELECT id INTO v_account_rev FROM chart_of_accounts
    WHERE tenant_id = v_return.tenant_id
      AND (company_id = v_return.company_id OR company_id IS NULL)
      AND account_code IN ('4100', '4000')
    ORDER BY CASE WHEN company_id = v_return.company_id THEN 0 ELSE 1 END LIMIT 1;
    
    IF v_account_ar IS NOT NULL AND v_account_rev IS NOT NULL AND v_total > 0 THEN
        INSERT INTO journal_entries (
            tenant_id, company_id, branch_id,
            entry_date, entry_type,
            description,
            reference_type, reference_id, reference_number,
            status, is_posted, posted_at, posted_by,
            created_by
        ) VALUES (
            v_return.tenant_id, v_return.company_id, v_return.branch_id,
            CURRENT_DATE, 'auto',
            'مرتجع مبيعات — ' || COALESCE(v_return.return_number, ''),
            'sales_return', p_return_id, v_return.return_number,
            'posted', true, NOW(), v_user_id,
            v_user_id
        ) RETURNING id INTO v_je_id;
        
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit)
        VALUES (v_return.tenant_id, v_je_id, 1, v_account_rev, 'تخفيض إيرادات — مرتجع', v_total, 0);
        
        INSERT INTO journal_entry_lines (tenant_id, entry_id, line_number, account_id, description, debit, credit, party_type, party_id)
        VALUES (v_return.tenant_id, v_je_id, 2, v_account_ar, 'تخفيض ذمم مدينة — مرتجع', 0, v_total, 'customer', v_return.customer_id);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'return_id', p_return_id,
        'movements_created', v_movement_count,
        'total_amount', v_total,
        'journal_entry_id', v_je_id,
        'message', 'تم ترحيل مرتجع المبيعات بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_sales_return IS 'ترحيل مرتجع مبيعات — إدخال مخزون + قيد عكسي';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٦. get_party_balance() — رصيد مورد أو عميل                 ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION get_party_balance(
    p_party_type VARCHAR,   -- 'supplier' أو 'customer'
    p_party_id UUID,
    p_company_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_total_debit  NUMERIC(15,4) := 0;
    v_total_credit NUMERIC(15,4) := 0;
    v_balance      NUMERIC(15,4);
BEGIN
    SELECT 
        COALESCE(SUM(jel.debit), 0),
        COALESCE(SUM(jel.credit), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE jel.party_type = p_party_type
      AND jel.party_id = p_party_id
      AND je.is_posted = true
      AND (p_company_id IS NULL OR je.company_id = p_company_id);
    
    v_balance := v_total_debit - v_total_credit;
    
    RETURN jsonb_build_object(
        'party_type', p_party_type,
        'party_id', p_party_id,
        'total_debit', v_total_debit,
        'total_credit', v_total_credit,
        'balance', v_balance,
        'balance_label', CASE 
            WHEN p_party_type = 'supplier' THEN 
                CASE WHEN v_balance < 0 THEN 'مستحق للمورد' ELSE 'رصيد لصالحنا' END
            ELSE
                CASE WHEN v_balance > 0 THEN 'مستحق لنا' ELSE 'رصيد لصالح العميل' END
        END
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_party_balance IS 'حساب رصيد مورد أو عميل من القيود المحاسبية المرحّلة';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ٧. convert_quotation_to_order() — تحويل عرض سعر → أمر     ║
-- ║                                                              ║
-- ║  يدعم: مشتريات (purchase) ومبيعات (sales)                  ║
-- ║  ينسخ البنود تلقائياً ويربط المستندات ببعض                  ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION convert_quotation_to_order(
    p_quotation_id UUID,
    p_doc_cycle VARCHAR DEFAULT 'purchase'  -- 'purchase' أو 'sales'
) RETURNS JSONB AS $$
DECLARE
    v_quote       RECORD;
    v_order_id    UUID;
    v_order_number VARCHAR(50);
    v_items_copied INT := 0;
BEGIN
    IF p_doc_cycle = 'purchase' THEN
        -- ════════════════════════════════════════════════════════
        -- دورة المشتريات: عرض سعر مشتريات → أمر شراء
        -- ════════════════════════════════════════════════════════
        SELECT * INTO v_quote FROM purchase_quotations WHERE id = p_quotation_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'عرض السعر غير موجود');
        END IF;
        
        IF v_quote.status = 'converted' THEN
            RETURN jsonb_build_object('success', false, 'error', 'عرض السعر محوّل مسبقاً');
        END IF;
        
        v_order_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
        
        -- إنشاء أمر الشراء (tenant_id + company_id يأتيان من عرض السعر)
        INSERT INTO purchase_orders (
            tenant_id, company_id, branch_id,
            order_number, order_date,
            supplier_id, supplier_name,
            quotation_id,
            status, currency, exchange_rate,
            total_amount, notes,
            created_by
        ) VALUES (
            v_quote.tenant_id, v_quote.company_id, v_quote.branch_id,
            v_order_number, CURRENT_DATE,
            v_quote.supplier_id, v_quote.supplier_name,
            p_quotation_id,
            'draft', COALESCE(v_quote.currency, 'SAR'), COALESCE(v_quote.exchange_rate, 1),
            COALESCE(v_quote.total_amount, 0),
            'تحويل من عرض سعر ' || COALESCE(v_quote.quotation_number, ''),
            auth.uid()
        ) RETURNING id INTO v_order_id;
        
        -- نسخ البنود (بدون company_id لأنها غير موجودة في purchase_order_items)
        INSERT INTO purchase_order_items (
            tenant_id, order_id,
            product_id, material_id, variant_id,
            description, quantity, unit_price, discount_amount,
            tax_rate, tax_amount, subtotal, total
        )
        SELECT 
            tenant_id, v_order_id,
            product_id, material_id, variant_id,
            description, quantity, unit_price, discount_amount,
            tax_rate, tax_amount, subtotal, total
        FROM purchase_quotation_items
        WHERE quotation_id = p_quotation_id;
        
        GET DIAGNOSTICS v_items_copied = ROW_COUNT;
        
        -- تحديث حالة عرض السعر
        UPDATE purchase_quotations SET status = 'converted', updated_at = NOW() WHERE id = p_quotation_id;
        
    ELSIF p_doc_cycle = 'sales' THEN
        -- ════════════════════════════════════════════════════════
        -- دورة المبيعات: عرض سعر مبيعات → أمر بيع
        -- ════════════════════════════════════════════════════════
        SELECT * INTO v_quote FROM quotations WHERE id = p_quotation_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'عرض السعر غير موجود');
        END IF;
        
        IF v_quote.status = 'converted' THEN
            RETURN jsonb_build_object('success', false, 'error', 'عرض السعر محوّل مسبقاً');
        END IF;
        
        v_order_number := 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
        
        INSERT INTO sales_orders (
            tenant_id, company_id, branch_id,
            order_number, order_date,
            customer_id, customer_name,
            quotation_id,
            status, currency,
            total_amount, notes,
            created_by
        ) VALUES (
            v_quote.tenant_id, v_quote.company_id, v_quote.branch_id,
            v_order_number, CURRENT_DATE,
            v_quote.customer_id, v_quote.customer_name,
            p_quotation_id,
            'draft', COALESCE(v_quote.currency, 'SAR'),
            COALESCE(v_quote.total_amount, 0),
            'تحويل من عرض سعر ' || COALESCE(v_quote.quotation_number, ''),
            auth.uid()
        ) RETURNING id INTO v_order_id;
        
        -- نسخ البنود (sales_order_items فيها company_id)
        INSERT INTO sales_order_items (
            tenant_id, company_id, order_id,
            product_id, variant_id, material_id,
            description, quantity, unit_price,
            discount_percent, discount_amount,
            tax_percent, tax_amount, subtotal, total
        )
        SELECT 
            tenant_id, company_id, v_order_id,
            product_id, variant_id, material_id,
            description, quantity, unit_price,
            discount_percent, discount_amount,
            tax_percent, tax_amount, subtotal, total
        FROM quotation_items
        WHERE quotation_id = p_quotation_id;
        
        GET DIAGNOSTICS v_items_copied = ROW_COUNT;
        
        UPDATE quotations SET status = 'converted', updated_at = NOW() WHERE id = p_quotation_id;
        
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'doc_cycle يجب أن يكون purchase أو sales');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'items_copied', v_items_copied,
        'cycle', p_doc_cycle,
        'message', 'تم تحويل عرض السعر إلى أمر بنجاح'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION convert_quotation_to_order IS 'تحويل عرض سعر (مشتريات/مبيعات) إلى أمر مع نسخ البنود';


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  التحقق النهائي                                              ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
    v_functions TEXT[] := ARRAY[
        'post_purchase_receipt',
        'post_purchase_invoice',
        'post_sales_invoice',
        'post_purchase_return',
        'post_sales_return',
        'get_party_balance',
        'convert_quotation_to_order'
    ];
    v_func TEXT;
    v_exists BOOLEAN;
    v_is_definer BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 PHASE 3 (FIXED) VERIFICATION';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    
    -- التحقق من حذف الـ triggers المتضاربة
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_create_purchase_journal_entry') THEN
        RAISE NOTICE '  ✅ trg_create_purchase_journal_entry — REMOVED (no conflict)';
    ELSE
        RAISE NOTICE '  🔴 trg_create_purchase_journal_entry — STILL EXISTS! May cause double entries!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_deduct_inventory_on_sale') THEN
        RAISE NOTICE '  ✅ trg_deduct_inventory_on_sale — REMOVED (no conflict)';
    ELSE
        RAISE NOTICE '  🔴 trg_deduct_inventory_on_sale — STILL EXISTS!';
    END IF;
    
    RAISE NOTICE '';
    
    -- التحقق من الدوال
    FOREACH v_func IN ARRAY v_functions LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public' AND routine_name = v_func
        ) INTO v_exists;
        
        IF v_exists THEN
            SELECT security_type = 'DEFINER' INTO v_is_definer
            FROM information_schema.routines
            WHERE routine_schema = 'public' AND routine_name = v_func
            LIMIT 1;
            
            IF v_is_definer THEN
                RAISE NOTICE '  ✅ %() — SECURITY DEFINER ✓', v_func;
            ELSE
                RAISE NOTICE '  ⚠️ %() — NOT SECURITY DEFINER', v_func;
            END IF;
        ELSE
            RAISE NOTICE '  ❌ %() — MISSING!', v_func;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '  الاستخدام من الفرونت إند:';
    RAISE NOTICE '  const { data } = await supabase.rpc(''post_purchase_invoice'', { p_invoice_id: id })';
    RAISE NOTICE '  const { data } = await supabase.rpc(''post_sales_invoice'', { p_invoice_id: id })';
    RAISE NOTICE '  const { data } = await supabase.rpc(''post_purchase_receipt'', { p_receipt_id, p_warehouse_id, p_items })';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Phase 3 (FIXED) Complete!';
    RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;

COMMIT;
