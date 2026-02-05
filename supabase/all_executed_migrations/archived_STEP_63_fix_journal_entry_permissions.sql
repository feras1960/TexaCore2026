-- Updated post_journal_entry with SECURITY DEFINER and improved error handling
CREATE OR REPLACE FUNCTION post_journal_entry(
    p_entry_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry RECORD;
    v_line RECORD;
    v_movement DECIMAL(15,2);
    v_balance_check DECIMAL(15,2);
BEGIN
    -- Input Validation
    IF p_entry_id IS NULL THEN
        RAISE EXCEPTION 'رقم القيد مطلوب';
    END IF;

    -- Fetch Entry
    SELECT * INTO v_entry
    FROM journal_entries
    WHERE id = p_entry_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'القيد غير موجود: %', p_entry_id;
    END IF;
    
    IF v_entry.is_posted THEN
        RAISE EXCEPTION 'القيد مرحّل مسبقاً: %', v_entry.entry_number;
    END IF;
    
    -- Strict Balance Check
    v_balance_check := ABS(v_entry.total_debit - v_entry.total_credit);
    IF v_balance_check > 0.01 THEN
        RAISE EXCEPTION 'القيد غير متوازن! الفرق: % (مدين: %, دائن: %)', 
            v_balance_check, v_entry.total_debit, v_entry.total_credit;
    END IF;

    -- Ensure lines exist
    IF NOT EXISTS (SELECT 1 FROM journal_entry_lines WHERE entry_id = p_entry_id) THEN
        RAISE EXCEPTION 'القيد لا يحتوي على أسطر';
    END IF;
    
    -- Process Lines
    FOR v_line IN 
        SELECT jel.*, coa.account_type_id, at.normal_balance
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        JOIN account_types at ON coa.account_type_id = at.id
        WHERE jel.entry_id = p_entry_id
    LOOP
        -- Calculate movement based on normal balance
        IF v_line.normal_balance = 'debit' THEN
            v_movement := v_line.debit - v_line.credit;
        ELSE
            v_movement := v_line.credit - v_line.debit;
        END IF;
        
        -- Update Account Balance
        UPDATE chart_of_accounts
        SET current_balance = COALESCE(current_balance, 0) + v_movement,
            updated_at = NOW()
        WHERE id = v_line.account_id;
    END LOOP;
    
    -- Mark as Posted
    UPDATE journal_entries
    SET is_posted = true,
        posted_at = NOW(),
        posted_by = p_user_id,
        status = 'posted'
    WHERE id = p_entry_id;
    
    RETURN true;
END;
$$;
