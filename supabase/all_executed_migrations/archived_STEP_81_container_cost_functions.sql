-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 81: دوال توزيع تكاليف الكونتينر والقيد المحاسبي
-- Container Cost Allocation & Accounting Journal Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-01-31
-- الوصف: إنشاء دوال لتوزيع تكاليف الكونتينر وإنشاء القيود المحاسبية
-- التوافق: متوافق مع containersService.ts (calculateLandedCost, finalizeLandedCost)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. دالة توزيع تكاليف الكونتينر
-- Allocate Container Costs Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION allocate_container_costs(
    p_container_id UUID,
    p_allocation_method VARCHAR DEFAULT NULL  -- if NULL, uses container.cost_allocation_method
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_container RECORD;
    v_item RECORD;
    v_total_goods_value NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_total_quantity NUMERIC := 0;
    v_allocation_method VARCHAR;
    v_ratio NUMERIC;
    v_allocated_cost NUMERIC;
    v_final_unit_cost NUMERIC;
    v_items_updated INTEGER := 0;
    v_result JSONB;
BEGIN
    -- جلب بيانات الكونتينر
    SELECT c.*, comp.tenant_id 
    INTO v_container
    FROM containers c
    JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = p_container_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Container not found',
            'error_ar', 'الكونتينر غير موجود'
        );
    END IF;
    
    -- التحقق من أن التكاليف غير مثبتة
    IF v_container.is_cost_finalized = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Container costs already finalized',
            'error_ar', 'تكاليف الكونتينر مثبتة بالفعل'
        );
    END IF;
    
    -- تحديد طريقة التوزيع
    v_allocation_method := COALESCE(p_allocation_method, v_container.cost_allocation_method, 'by_value');
    
    -- حساب إجمالي قيمة البضاعة
    SELECT COALESCE(SUM(unit_cost * expected_quantity), 0)
    INTO v_total_goods_value
    FROM container_items
    WHERE container_id = p_container_id;
    
    -- حساب إجمالي المصاريف
    SELECT COALESCE(SUM(COALESCE(actual_amount, expected_amount, amount, 0)), 0)
    INTO v_total_expenses
    FROM container_expenses
    WHERE container_id = p_container_id;
    
    -- حساب إجمالي الكمية (لطريقة by_quantity)
    SELECT COALESCE(SUM(expected_quantity), 0)
    INTO v_total_quantity
    FROM container_items
    WHERE container_id = p_container_id;
    
    -- توزيع المصاريف على البنود
    FOR v_item IN 
        SELECT * FROM container_items WHERE container_id = p_container_id
    LOOP
        -- حساب النسبة حسب طريقة التوزيع
        CASE v_allocation_method
            WHEN 'by_value' THEN
                IF v_total_goods_value > 0 THEN
                    v_ratio := (v_item.unit_cost * v_item.expected_quantity) / v_total_goods_value;
                ELSE
                    v_ratio := 1.0 / NULLIF((SELECT COUNT(*) FROM container_items WHERE container_id = p_container_id), 0);
                END IF;
                
            WHEN 'by_quantity' THEN
                IF v_total_quantity > 0 THEN
                    v_ratio := v_item.expected_quantity / v_total_quantity;
                ELSE
                    v_ratio := 1.0 / NULLIF((SELECT COUNT(*) FROM container_items WHERE container_id = p_container_id), 0);
                END IF;
                
            WHEN 'by_weight' THEN
                -- توزيع حسب الوزن
                SELECT COALESCE(SUM(weight_kg), SUM(expected_quantity)) INTO v_total_quantity
                FROM container_items WHERE container_id = p_container_id;
                
                IF v_total_quantity > 0 THEN
                    v_ratio := COALESCE(v_item.weight_kg, v_item.expected_quantity) / v_total_quantity;
                ELSE
                    v_ratio := 1.0 / NULLIF((SELECT COUNT(*) FROM container_items WHERE container_id = p_container_id), 0);
                END IF;
                
            ELSE -- manual or unknown
                v_ratio := 0; -- keep existing values
        END CASE;
        
        -- حساب التكلفة الموزعة
        v_allocated_cost := v_total_expenses * COALESCE(v_ratio, 0);
        
        -- حساب تكلفة الوحدة النهائية
        IF v_item.expected_quantity > 0 THEN
            v_final_unit_cost := (v_item.unit_cost * v_item.expected_quantity + v_allocated_cost) / v_item.expected_quantity;
        ELSE
            v_final_unit_cost := v_item.unit_cost;
        END IF;
        
        -- تحديث البند
        IF v_allocation_method != 'manual' THEN
            UPDATE container_items
            SET 
                allocated_costs = v_allocated_cost,
                cost_per_unit_allocated = CASE WHEN expected_quantity > 0 THEN v_allocated_cost / expected_quantity ELSE 0 END,
                provisional_unit_cost = v_item.unit_cost,
                final_unit_cost = v_final_unit_cost,
                total_provisional_cost = v_item.unit_cost * expected_quantity,
                total_final_cost = v_final_unit_cost * expected_quantity,
                updated_at = NOW()
            WHERE id = v_item.id;
            
            v_items_updated := v_items_updated + 1;
        END IF;
    END LOOP;
    
    -- تحديث الكونتينر
    UPDATE containers
    SET 
        provisional_goods_cost = v_total_goods_value,
        total_expected_costs = (SELECT COALESCE(SUM(expected_amount), 0) FROM container_expenses WHERE container_id = p_container_id),
        total_actual_costs = v_total_expenses,
        total_landed_cost = v_total_goods_value + v_total_expenses,
        cost_allocation_method = v_allocation_method,
        updated_at = NOW()
    WHERE id = p_container_id;
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'container_id', p_container_id,
        'allocation_method', v_allocation_method,
        'total_goods_value', v_total_goods_value,
        'total_expenses', v_total_expenses,
        'total_landed_cost', v_total_goods_value + v_total_expenses,
        'items_updated', v_items_updated
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. دالة تثبيت تكاليف الكونتينر
-- Finalize Container Costs Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION finalize_container_costs(
    p_container_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_container RECORD;
    v_allocation_result JSONB;
BEGIN
    -- جلب بيانات الكونتينر
    SELECT * INTO v_container
    FROM containers
    WHERE id = p_container_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Container not found',
            'error_ar', 'الكونتينر غير موجود'
        );
    END IF;
    
    -- التحقق من عدم التثبيت المسبق
    IF v_container.is_cost_finalized = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Container costs already finalized',
            'error_ar', 'تكاليف الكونتينر مثبتة بالفعل'
        );
    END IF;
    
    -- توزيع التكاليف أولاً
    v_allocation_result := allocate_container_costs(p_container_id, v_container.cost_allocation_method);
    
    IF NOT (v_allocation_result->>'success')::BOOLEAN THEN
        RETURN v_allocation_result;
    END IF;
    
    -- تثبيت الكونتينر
    UPDATE containers
    SET 
        is_cost_finalized = true,
        finalized_at = NOW(),
        finalized_by = p_user_id,
        final_goods_cost = (v_allocation_result->>'total_goods_value')::NUMERIC,
        updated_at = NOW()
    WHERE id = p_container_id;
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'container_id', p_container_id,
        'finalized_at', NOW(),
        'finalized_by', p_user_id,
        'allocation', v_allocation_result
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة إنشاء قيد محاسبي للكونتينر
-- Create Container Accounting Journal Entry
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_container_journal_entry(
    p_container_id UUID,
    p_entry_type VARCHAR,  -- 'provisional' or 'final'
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_container RECORD;
    v_company RECORD;
    v_journal_entry_id UUID;
    v_inventory_account_id UUID;
    v_supplier_account_id UUID;
    v_expense_account_id UUID;
    v_total_goods NUMERIC;
    v_total_expenses NUMERIC;
    v_entry_number VARCHAR;
    v_description VARCHAR;
BEGIN
    -- جلب بيانات الكونتينر
    SELECT c.*, comp.tenant_id 
    INTO v_container
    FROM containers c
    JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = p_container_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Container not found',
            'error_ar', 'الكونتينر غير موجود'
        );
    END IF;
    
    -- جلب بيانات الشركة
    SELECT * INTO v_company FROM companies WHERE id = v_container.company_id;
    
    -- تحديد الحسابات
    -- حساب المخزون (1401)
    SELECT id INTO v_inventory_account_id
    FROM accounts
    WHERE company_id = v_container.company_id
      AND (code LIKE '%1401%' OR code LIKE '%14010%' OR account_type = 'asset' AND name_ar LIKE '%مخزون%')
    LIMIT 1;
    
    -- حساب الموردين (2101)
    SELECT id INTO v_supplier_account_id
    FROM accounts
    WHERE company_id = v_container.company_id
      AND (code LIKE '%2101%' OR code LIKE '%21010%' OR account_type = 'liability' AND name_ar LIKE '%موردين%')
    LIMIT 1;
    
    -- حساب مصاريف الاستيراد (5101)
    SELECT id INTO v_expense_account_id
    FROM accounts
    WHERE company_id = v_container.company_id
      AND (code LIKE '%5101%' OR account_type = 'expense' AND name_ar LIKE '%استيراد%')
    LIMIT 1;
    
    -- التحقق من وجود الحسابات
    IF v_inventory_account_id IS NULL OR v_supplier_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Required accounts not found (inventory or supplier)',
            'error_ar', 'الحسابات المطلوبة غير موجودة (المخزون أو الموردين)',
            'missing_accounts', jsonb_build_object(
                'inventory', v_inventory_account_id IS NULL,
                'supplier', v_supplier_account_id IS NULL,
                'expense', v_expense_account_id IS NULL
            )
        );
    END IF;
    
    -- حساب الإجماليات
    IF p_entry_type = 'provisional' THEN
        v_total_goods := COALESCE(v_container.provisional_goods_cost, 0);
        v_total_expenses := COALESCE(v_container.total_expected_costs, 0);
        v_description := 'قيد مشتريات تقريبي - كونتينر ' || v_container.container_number;
    ELSE
        v_total_goods := COALESCE(v_container.final_goods_cost, v_container.provisional_goods_cost, 0);
        v_total_expenses := COALESCE(v_container.total_actual_costs, v_container.total_expected_costs, 0);
        v_description := 'قيد مشتريات نهائي - كونتينر ' || v_container.container_number;
    END IF;
    
    -- إنشاء القيد
    INSERT INTO journal_entries (
        tenant_id,
        company_id,
        entry_date,
        description,
        entry_type,
        source_type,
        source_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        v_container.tenant_id,
        v_container.company_id,
        CURRENT_DATE,
        v_description,
        CASE WHEN p_entry_type = 'provisional' THEN 'provisional' ELSE 'posted' END,
        'container',
        p_container_id,
        v_total_goods + v_total_expenses,
        v_total_goods + v_total_expenses,
        CASE WHEN p_entry_type = 'provisional' THEN 'draft' ELSE 'posted' END,
        p_user_id
    ) RETURNING id INTO v_journal_entry_id;
    
    -- بند المخزون (مدين) - قيمة البضاعة + المصاريف الموزعة
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        tenant_id,
        company_id
    ) VALUES (
        v_journal_entry_id,
        v_inventory_account_id,
        v_total_goods + v_total_expenses,
        0,
        'مخزون كونتينر ' || v_container.container_number,
        v_container.tenant_id,
        v_container.company_id
    );
    
    -- بند الموردين (دائن) - قيمة البضاعة
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        tenant_id,
        company_id
    ) VALUES (
        v_journal_entry_id,
        v_supplier_account_id,
        0,
        v_total_goods,
        'مستحق للمورد - كونتينر ' || v_container.container_number,
        v_container.tenant_id,
        v_container.company_id
    );
    
    -- بند المصاريف (دائن) - إذا وجدت مصاريف
    IF v_total_expenses > 0 THEN
        -- إذا لم يكن هناك حساب مصاريف، نضع المصاريف أيضاً على الموردين
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit,
            credit,
            description,
            tenant_id,
            company_id
        ) VALUES (
            v_journal_entry_id,
            COALESCE(v_expense_account_id, v_supplier_account_id),
            0,
            v_total_expenses,
            'مصاريف استيراد - كونتينر ' || v_container.container_number,
            v_container.tenant_id,
            v_container.company_id
        );
    END IF;
    
    -- تحديث الكونتينر بمعرف القيد
    IF p_entry_type = 'provisional' THEN
        UPDATE containers
        SET provisional_journal_entry_id = v_journal_entry_id, updated_at = NOW()
        WHERE id = p_container_id;
    ELSE
        UPDATE containers
        SET final_journal_entry_id = v_journal_entry_id, updated_at = NOW()
        WHERE id = p_container_id;
    END IF;
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'entry_type', p_entry_type,
        'total_debit', v_total_goods + v_total_expenses,
        'total_credit', v_total_goods + v_total_expenses,
        'container_number', v_container.container_number
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة إنشاء قيود لمصاريف الكونتينر الفردية
-- Create Journal Entry for Individual Container Expense
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_container_expense_journal_entry(
    p_expense_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense RECORD;
    v_container RECORD;
    v_journal_entry_id UUID;
    v_expense_account_id UUID;
    v_payable_account_id UUID;
    v_amount NUMERIC;
BEGIN
    -- جلب بيانات المصروف
    SELECT ce.*, c.container_number, c.tenant_id, c.company_id
    INTO v_expense
    FROM container_expenses ce
    JOIN containers c ON ce.container_id = c.id
    WHERE ce.id = p_expense_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Expense not found',
            'error_ar', 'المصروف غير موجود'
        );
    END IF;
    
    -- التحقق من عدم وجود قيد مسبق
    IF v_expense.journal_entry_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Journal entry already exists for this expense',
            'error_ar', 'يوجد قيد محاسبي للمصروف بالفعل',
            'existing_journal_entry_id', v_expense.journal_entry_id
        );
    END IF;
    
    -- تحديد المبلغ
    v_amount := COALESCE(v_expense.actual_amount, v_expense.expected_amount, v_expense.amount, 0);
    
    IF v_amount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Expense amount is zero',
            'error_ar', 'مبلغ المصروف صفر'
        );
    END IF;
    
    -- البحث عن حساب المصاريف المناسب
    SELECT id INTO v_expense_account_id
    FROM accounts
    WHERE company_id = v_expense.company_id
      AND account_type = 'expense'
      AND (name_ar LIKE '%' || v_expense.expense_type || '%' 
           OR name_en LIKE '%' || v_expense.expense_type || '%'
           OR name_ar LIKE '%استيراد%')
    LIMIT 1;
    
    -- إذا لم يوجد حساب مخصص، استخدم حساب مصاريف عام
    IF v_expense_account_id IS NULL THEN
        SELECT id INTO v_expense_account_id
        FROM accounts
        WHERE company_id = v_expense.company_id
          AND account_type = 'expense'
        LIMIT 1;
    END IF;
    
    -- حساب الدائنين
    SELECT id INTO v_payable_account_id
    FROM accounts
    WHERE company_id = v_expense.company_id
      AND (account_type = 'liability' AND (name_ar LIKE '%دائنين%' OR name_ar LIKE '%موردين%'))
    LIMIT 1;
    
    IF v_payable_account_id IS NULL THEN
        SELECT id INTO v_payable_account_id
        FROM accounts
        WHERE company_id = v_expense.company_id
          AND account_type = 'liability'
        LIMIT 1;
    END IF;
    
    IF v_expense_account_id IS NULL OR v_payable_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Required accounts not found',
            'error_ar', 'الحسابات المطلوبة غير موجودة'
        );
    END IF;
    
    -- إنشاء القيد
    INSERT INTO journal_entries (
        tenant_id,
        company_id,
        entry_date,
        description,
        entry_type,
        source_type,
        source_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        v_expense.tenant_id,
        v_expense.company_id,
        COALESCE(v_expense.invoice_date::DATE, CURRENT_DATE),
        'مصروف ' || COALESCE(v_expense.expense_type, 'استيراد') || ' - كونتينر ' || v_expense.container_number,
        'posted',
        'container_expense',
        p_expense_id,
        v_amount,
        v_amount,
        'posted',
        p_user_id
    ) RETURNING id INTO v_journal_entry_id;
    
    -- بند المصروف (مدين)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        tenant_id,
        company_id
    ) VALUES (
        v_journal_entry_id,
        v_expense_account_id,
        v_amount,
        0,
        v_expense.expense_type || ' - ' || v_expense.container_number,
        v_expense.tenant_id,
        v_expense.company_id
    );
    
    -- بند الدائنين (دائن)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        tenant_id,
        company_id
    ) VALUES (
        v_journal_entry_id,
        v_payable_account_id,
        0,
        v_amount,
        'مستحق - ' || COALESCE(v_expense.vendor_name, 'مورد'),
        v_expense.tenant_id,
        v_expense.company_id
    );
    
    -- تحديث المصروف بمعرف القيد
    UPDATE container_expenses
    SET journal_entry_id = v_journal_entry_id, updated_at = NOW()
    WHERE id = p_expense_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'expense_type', v_expense.expense_type,
        'amount', v_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. View ملخص الكونتينر مع التكاليف
-- Container Summary View with Costs
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_container_cost_summary AS
SELECT 
    c.id,
    c.tenant_id,
    c.company_id,
    c.container_number,
    c.status,
    c.cost_allocation_method,
    c.is_cost_finalized,
    c.finalized_at,
    
    -- البنود
    COALESCE(items.total_items, 0) as total_items,
    COALESCE(items.total_quantity, 0) as total_quantity,
    COALESCE(items.total_goods_value, 0) as total_goods_value,
    
    -- المصاريف
    COALESCE(expenses.total_expenses_count, 0) as total_expenses_count,
    COALESCE(expenses.total_expected_expenses, 0) as total_expected_expenses,
    COALESCE(expenses.total_actual_expenses, 0) as total_actual_expenses,
    
    -- Landed Cost
    COALESCE(items.total_goods_value, 0) + COALESCE(expenses.total_actual_expenses, 0) as total_landed_cost,
    
    -- تكلفة الوحدة المتوسطة
    CASE WHEN COALESCE(items.total_quantity, 0) > 0 
        THEN (COALESCE(items.total_goods_value, 0) + COALESCE(expenses.total_actual_expenses, 0)) / items.total_quantity
        ELSE 0 
    END as average_unit_cost,
    
    -- الفرق بين المتوقع والفعلي
    COALESCE(expenses.total_actual_expenses, 0) - COALESCE(expenses.total_expected_expenses, 0) as expense_variance
    
FROM containers c
LEFT JOIN (
    SELECT 
        container_id,
        COUNT(*) as total_items,
        SUM(expected_quantity) as total_quantity,
        SUM(unit_cost * expected_quantity) as total_goods_value
    FROM container_items
    GROUP BY container_id
) items ON c.id = items.container_id
LEFT JOIN (
    SELECT 
        container_id,
        COUNT(*) as total_expenses_count,
        SUM(COALESCE(expected_amount, 0)) as total_expected_expenses,
        SUM(COALESCE(actual_amount, expected_amount, amount, 0)) as total_actual_expenses
    FROM container_expenses
    GROUP BY container_id
) expenses ON c.id = expenses.container_id;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من الإنشاء
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء دوال توزيع تكاليف الكونتينر بنجاح';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'الدوال المنشأة:';
    RAISE NOTICE '  1. allocate_container_costs(container_id, method)';
    RAISE NOTICE '  2. finalize_container_costs(container_id, user_id)';
    RAISE NOTICE '  3. create_container_journal_entry(container_id, type, user_id)';
    RAISE NOTICE '  4. create_container_expense_journal_entry(expense_id, user_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Views المنشأة:';
    RAISE NOTICE '  1. v_container_cost_summary';
    RAISE NOTICE '';
END $$;
