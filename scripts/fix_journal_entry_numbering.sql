-- Fix journal entry numbering and display issues

-- Step 1: Create or replace the sequence number generation function
CREATE OR REPLACE FUNCTION generate_sequence_number(
    p_tenant_id UUID,
    p_company_id UUID,
    p_sequence_type VARCHAR
)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_number INT;
    v_formatted_number TEXT;
    v_year TEXT;
    v_month TEXT;
BEGIN
    -- Get current year and month
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    -- Set prefix based on sequence type
    CASE p_sequence_type
        WHEN 'journal_entry' THEN v_prefix := 'JE';
        WHEN 'receipt' THEN v_prefix := 'RC';
        WHEN 'payment' THEN v_prefix := 'PY';
        WHEN 'cash_journal' THEN v_prefix := 'CJ';
        ELSE v_prefix := 'DOC';
    END CASE;
    
    -- Get next number for this company and type
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(entry_number FROM '[0-9]+$') AS INT
        )
    ), 0) + 1
    INTO v_next_number
    FROM journal_entries
    WHERE tenant_id = p_tenant_id
        AND company_id = p_company_id
        AND entry_number LIKE v_prefix || '-' || v_year || '%';
    
    -- Format: JE-2026-00001
    v_formatted_number := v_prefix || '-' || v_year || '-' || LPAD(v_next_number::TEXT, 5, '0');
    
    RETURN v_formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update existing entries with proper numbering (optional - only for cleanup)
-- This will update entries that have UUID-style numbers
DO $$
DECLARE
    entry_rec RECORD;
    new_number TEXT;
    counter INT := 1;
BEGIN
    FOR entry_rec IN 
        SELECT id, tenant_id, company_id, entry_date
        FROM journal_entries
        WHERE entry_number LIKE '%-%-%-%-%'  -- UUID pattern
        ORDER BY entry_date, created_at
    LOOP
        new_number := 'JE-' || TO_CHAR(entry_rec.entry_date, 'YYYY') || '-' || LPAD(counter::TEXT, 5, '0');
        
        UPDATE journal_entries
        SET entry_number = new_number
        WHERE id = entry_rec.id;
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated % journal entries with proper numbering', counter - 1;
END $$;

-- Verification
SELECT 
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit
FROM journal_entries
ORDER BY created_at DESC
LIMIT 10;
