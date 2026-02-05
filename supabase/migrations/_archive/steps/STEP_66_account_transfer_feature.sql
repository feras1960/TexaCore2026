-- ═══════════════════════════════════════════════════════════════
-- STEP 66: Account Transfer Feature
-- ═══════════════════════════════════════════════════════════════
-- Description: Enables transferring balances between accounts and
--              moving accounts to different parent groups
-- Author: System
-- Date: 2026-01-30
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Part 1: Account Transfers Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS account_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Transfer Details
    source_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    target_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    transfer_type VARCHAR(20) NOT NULL, -- 'balance' or 'move_account'
    
    -- Amount (for balance transfers)
    amount DECIMAL(15, 2),
    
    -- Journal Entry (for balance transfers)
    journal_entry_id UUID REFERENCES journal_entries(id),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transfer_type CHECK (transfer_type IN ('balance', 'move_account')),
    CONSTRAINT different_accounts CHECK (source_account_id != target_account_id)
);

CREATE INDEX idx_account_transfers_source ON account_transfers(source_account_id);
CREATE INDEX idx_account_transfers_target ON account_transfers(target_account_id);
CREATE INDEX idx_account_transfers_company ON account_transfers(company_id);
CREATE INDEX idx_account_transfers_journal ON account_transfers(journal_entry_id);

COMMENT ON TABLE account_transfers IS 'Tracks account balance transfers and account moves';

-- ═══════════════════════════════════════════════════════════════
-- Part 2: Transfer Account Balance Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION transfer_account_balance(
    p_source_account_id UUID,
    p_target_account_id UUID,
    p_amount DECIMAL(15, 2) DEFAULT NULL, -- NULL = transfer full balance
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_source_account RECORD;
    v_target_account RECORD;
    v_transfer_amount DECIMAL(15, 2);
    v_source_balance DECIMAL(15, 2);
    v_journal_entry_id UUID;
    v_transfer_id UUID;
    v_description TEXT;
BEGIN
    -- Validate accounts exist and get details
    SELECT * INTO v_source_account
    FROM chart_of_accounts
    WHERE id = p_source_account_id;
    
    IF v_source_account IS NULL THEN
        RAISE EXCEPTION 'Source account not found';
    END IF;
    
    SELECT * INTO v_target_account
    FROM chart_of_accounts
    WHERE id = p_target_account_id;
    
    IF v_target_account IS NULL THEN
        RAISE EXCEPTION 'Target account not found';
    END IF;
    
    -- Validate same company
    IF v_source_account.company_id != v_target_account.company_id THEN
        RAISE EXCEPTION 'Accounts must belong to the same company';
    END IF;
    
    v_tenant_id := v_source_account.tenant_id;
    v_company_id := v_source_account.company_id;
    
    -- Validate both are detail accounts
    IF v_source_account.is_group OR v_target_account.is_group THEN
        RAISE EXCEPTION 'Cannot transfer balance from/to group accounts';
    END IF;
    
    -- Calculate source account balance
    SELECT COALESCE(SUM(debit - credit), 0) INTO v_source_balance
    FROM journal_entry_lines
    WHERE account_id = p_source_account_id;
    
    -- Determine transfer amount
    IF p_amount IS NULL THEN
        v_transfer_amount := ABS(v_source_balance);
    ELSE
        v_transfer_amount := p_amount;
    END IF;
    
    -- Validate amount
    IF v_transfer_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be positive';
    END IF;
    
    IF v_transfer_amount > ABS(v_source_balance) THEN
        RAISE EXCEPTION 'Transfer amount (%) exceeds source balance (%)', v_transfer_amount, ABS(v_source_balance);
    END IF;
    
    -- Create description
    v_description := format('نقل رصيد من %s إلى %s | Balance transfer from %s to %s',
        v_source_account.name_ar,
        v_target_account.name_ar,
        v_source_account.account_code,
        v_target_account.account_code
    );
    
    -- Create journal entry
    INSERT INTO journal_entries (
        tenant_id,
        company_id,
        entry_date,
        description,
        notes,
        created_by
    ) VALUES (
        v_tenant_id,
        v_company_id,
        CURRENT_DATE,
        v_description,
        p_notes,
        p_user_id
    )
    RETURNING id INTO v_journal_entry_id;
    
    -- Create journal entry lines
    -- Debit target account
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description
    ) VALUES (
        v_journal_entry_id,
        p_target_account_id,
        v_transfer_amount,
        0,
        v_description
    );
    
    -- Credit source account
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description
    ) VALUES (
        v_journal_entry_id,
        p_source_account_id,
        0,
        v_transfer_amount,
        v_description
    );
    
    -- Record the transfer
    INSERT INTO account_transfers (
        tenant_id,
        company_id,
        source_account_id,
        target_account_id,
        transfer_type,
        amount,
        journal_entry_id,
        notes,
        created_by
    ) VALUES (
        v_tenant_id,
        v_company_id,
        p_source_account_id,
        p_target_account_id,
        'balance',
        v_transfer_amount,
        v_journal_entry_id,
        p_notes,
        p_user_id
    )
    RETURNING id INTO v_transfer_id;
    
    RAISE NOTICE 'Balance transferred: % from % to %', 
        v_transfer_amount, 
        v_source_account.account_code, 
        v_target_account.account_code;
    
    RETURN v_transfer_id;
END;
$$;

COMMENT ON FUNCTION transfer_account_balance IS 'Transfer balance from one account to another via journal entry';

-- ═══════════════════════════════════════════════════════════════
-- Part 3: Move Account to Different Parent Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION move_account_to_parent(
    p_account_id UUID,
    p_new_parent_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_new_parent RECORD;
    v_old_parent_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
BEGIN
    -- Get account details
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = p_account_id;
    
    IF v_account IS NULL THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Get new parent details
    SELECT * INTO v_new_parent
    FROM chart_of_accounts
    WHERE id = p_new_parent_id;
    
    IF v_new_parent IS NULL THEN
        RAISE EXCEPTION 'New parent account not found';
    END IF;
    
    -- Validate same company
    IF v_account.company_id != v_new_parent.company_id THEN
        RAISE EXCEPTION 'Account and new parent must belong to the same company';
    END IF;
    
    -- Validate new parent is a group
    IF NOT v_new_parent.is_group THEN
        RAISE EXCEPTION 'New parent must be a group account';
    END IF;
    
    -- Prevent moving to self or descendant
    IF p_account_id = p_new_parent_id THEN
        RAISE EXCEPTION 'Cannot move account to itself';
    END IF;
    
    -- Check if new parent is a descendant of the account
    IF EXISTS (
        WITH RECURSIVE descendants AS (
            SELECT id, parent_id
            FROM chart_of_accounts
            WHERE parent_id = p_account_id
            
            UNION ALL
            
            SELECT c.id, c.parent_id
            FROM chart_of_accounts c
            INNER JOIN descendants d ON c.parent_id = d.id
        )
        SELECT 1 FROM descendants WHERE id = p_new_parent_id
    ) THEN
        RAISE EXCEPTION 'Cannot move account to its own descendant';
    END IF;
    
    v_tenant_id := v_account.tenant_id;
    v_company_id := v_account.company_id;
    v_old_parent_id := v_account.parent_id;
    
    -- Update account parent
    UPDATE chart_of_accounts
    SET parent_id = p_new_parent_id,
        updated_at = NOW()
    WHERE id = p_account_id;
    
    -- Record the move
    INSERT INTO account_transfers (
        tenant_id,
        company_id,
        source_account_id,
        target_account_id,
        transfer_type,
        notes,
        created_by
    ) VALUES (
        v_tenant_id,
        v_company_id,
        v_old_parent_id,
        p_new_parent_id,
        'move_account',
        COALESCE(p_notes, format('Moved account %s from parent %s to %s',
            v_account.account_code,
            (SELECT account_code FROM chart_of_accounts WHERE id = v_old_parent_id),
            v_new_parent.account_code
        )),
        p_user_id
    );
    
    RAISE NOTICE 'Account % moved from parent % to %', 
        v_account.account_code,
        (SELECT account_code FROM chart_of_accounts WHERE id = v_old_parent_id),
        v_new_parent.account_code;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION move_account_to_parent IS 'Move an account to a different parent group';

-- ═══════════════════════════════════════════════════════════════
-- Part 4: Get Account Balance Function (Helper)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_account_balance(
    p_account_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(jel.debit - jel.credit), 0) INTO v_balance
    FROM journal_entry_lines jel
    INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_id = p_account_id
      AND je.entry_date <= p_as_of_date;
    
    RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION get_account_balance IS 'Get account balance as of a specific date';

-- ═══════════════════════════════════════════════════════════════
-- Part 5: Get Transfer History Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_transfer_history(
    p_account_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    transfer_id UUID,
    transfer_date TIMESTAMPTZ,
    transfer_type VARCHAR(20),
    source_account_code VARCHAR(10),
    source_account_name VARCHAR(200),
    target_account_code VARCHAR(10),
    target_account_name VARCHAR(200),
    amount DECIMAL(15, 2),
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.created_at,
        t.transfer_type,
        sa.account_code,
        sa.name_ar,
        ta.account_code,
        ta.name_ar,
        t.amount,
        t.notes
    FROM account_transfers t
    INNER JOIN chart_of_accounts sa ON t.source_account_id = sa.id
    INNER JOIN chart_of_accounts ta ON t.target_account_id = ta.id
    WHERE t.source_account_id = p_account_id 
       OR t.target_account_id = p_account_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_transfer_history IS 'Get transfer history for an account';

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 66 completed successfully!';
    RAISE NOTICE '   - account_transfers table created';
    RAISE NOTICE '   - transfer_account_balance() function created';
    RAISE NOTICE '   - move_account_to_parent() function created';
    RAISE NOTICE '   - get_account_balance() helper created';
    RAISE NOTICE '   - get_transfer_history() function created';
END $$;
