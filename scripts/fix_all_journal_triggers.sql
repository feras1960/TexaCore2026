-- COMPREHENSIVE FIX: Drop ALL triggers and functions that reference journal_entry_id
-- Then recreate them with the correct field name (entry_id)

-- Step 1: Drop ALL triggers on journal_entry_lines
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'journal_entry_lines'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON journal_entry_lines CASCADE', trigger_record.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Step 2: Drop ALL functions that reference journal_entry_id
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) LIKE '%journal_entry_id%'
            AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', func_record.function_name);
        RAISE NOTICE 'Dropped function: %', func_record.function_name;
    END LOOP;
END $$;

-- Step 3: Recreate essential triggers with CORRECT field names

-- Function to auto-set tenant_id from parent journal_entry
CREATE OR REPLACE FUNCTION set_journal_entry_line_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get tenant_id from the parent journal_entry using entry_id (NOT journal_entry_id)
    SELECT tenant_id INTO NEW.tenant_id
    FROM journal_entries
    WHERE id = NEW.entry_id;  -- CORRECT: using entry_id
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenant_id_trigger
    BEFORE INSERT ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION set_journal_entry_line_tenant_id();

-- Function to update journal entry totals
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update totals in parent journal_entry using entry_id (NOT journal_entry_id)
    UPDATE journal_entries
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)  -- CORRECT: using entry_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)  -- CORRECT: using entry_id
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);  -- CORRECT: using entry_id
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journal_entry_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_totals();

-- Step 4: Set default currency from company settings
CREATE OR REPLACE FUNCTION set_default_currency_for_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    company_currency VARCHAR(3);
BEGIN
    -- Get company's default currency
    SELECT default_currency INTO company_currency
    FROM companies
    WHERE id = NEW.company_id;
    
    -- Set currency if not provided
    IF NEW.currency IS NULL OR NEW.currency = '' THEN
        NEW.currency := COALESCE(company_currency, 'SAR');
    END IF;
    
    -- Set exchange rate to 1 if not provided
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate = 0 THEN
        NEW.exchange_rate := 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_default_currency_trigger ON journal_entries;
CREATE TRIGGER set_default_currency_trigger
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_default_currency_for_journal_entry();

-- Step 5: Ensure default_currency exists in companies table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'default_currency'
    ) THEN
        ALTER TABLE companies ADD COLUMN default_currency VARCHAR(3) DEFAULT 'SAR';
    END IF;
END $$;

-- Step 6: Update existing companies
UPDATE companies 
SET default_currency = 'SAR' 
WHERE default_currency IS NULL;

-- Verification: List all triggers on journal_entry_lines
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'journal_entry_lines';
