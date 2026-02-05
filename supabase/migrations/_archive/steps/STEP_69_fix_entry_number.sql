-- ═══════════════════════════════════════════════════════════════
-- STEP 69: Fix Journal Entry Number Auto-Generation
-- ═══════════════════════════════════════════════════════════════
-- Description: Adds trigger to auto-generate entry_number per company per year
-- Author: System
-- Date: 2026-01-31
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Part 1: Make entry_number Nullable (Temporary)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE journal_entries 
ALTER COLUMN entry_number DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- Part 2: Create Auto-Generation Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_max_number INTEGER;
    v_year INTEGER;
    v_prefix VARCHAR(10);
BEGIN
    -- Skip if entry_number already provided
    IF NEW.entry_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get year from entry_date
    v_year := EXTRACT(YEAR FROM NEW.entry_date);
    
    -- Get max entry number for this company and year
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN entry_number ~ '^\d+/\d{4}$' 
                THEN SPLIT_PART(entry_number, '/', 1)::INTEGER
                ELSE 0
            END
        ), 
        0
    ) INTO v_max_number
    FROM journal_entries
    WHERE company_id = NEW.company_id
      AND EXTRACT(YEAR FROM entry_date) = v_year;
    
    -- Generate new entry number
    NEW.entry_number := (v_max_number + 1)::TEXT || '/' || v_year::TEXT;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION generate_entry_number IS 'Auto-generates entry_number in format: number/year (e.g., 1/2026, 2/2026)';

-- ═══════════════════════════════════════════════════════════════
-- Part 3: Create Trigger
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_entry_number ON journal_entries;

CREATE TRIGGER set_entry_number
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION generate_entry_number();

COMMENT ON TRIGGER set_entry_number ON journal_entries IS 'Auto-generates entry_number before insert';

-- ═══════════════════════════════════════════════════════════════
-- Part 4: Update Existing NULL entry_numbers
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_entry RECORD;
    v_max_number INTEGER;
    v_year INTEGER;
BEGIN
    FOR v_entry IN 
        SELECT id, company_id, entry_date
        FROM journal_entries
        WHERE entry_number IS NULL
        ORDER BY company_id, entry_date
    LOOP
        v_year := EXTRACT(YEAR FROM v_entry.entry_date);
        
        SELECT COALESCE(
            MAX(
                CASE 
                    WHEN entry_number ~ '^\d+/\d{4}$' 
                    THEN SPLIT_PART(entry_number, '/', 1)::INTEGER
                    ELSE 0
                END
            ), 
            0
        ) INTO v_max_number
        FROM journal_entries
        WHERE company_id = v_entry.company_id
          AND EXTRACT(YEAR FROM entry_date) = v_year
          AND id != v_entry.id;
        
        UPDATE journal_entries
        SET entry_number = (v_max_number + 1)::TEXT || '/' || v_year::TEXT
        WHERE id = v_entry.id;
    END LOOP;
    
    RAISE NOTICE 'Updated % entries with NULL entry_number', 
        (SELECT COUNT(*) FROM journal_entries WHERE entry_number IS NULL);
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Part 5: Make entry_number NOT NULL Again
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE journal_entries 
ALTER COLUMN entry_number SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 69 completed successfully!';
    RAISE NOTICE '   - entry_number auto-generation enabled';
    RAISE NOTICE '   - Format: number/year (e.g., 1/2026)';
    RAISE NOTICE '   - Resets annually per company';
END $$;
