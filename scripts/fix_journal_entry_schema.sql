-- Fix journal entry lines schema and add currency support
-- This migration fixes the trigger issue and adds proper currency handling

-- Step 1: Check if there are any triggers using journal_entry_id
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table IN ('journal_entry_lines', 'journal_entries')
    LOOP
        RAISE NOTICE 'Found trigger: % on table: %', trigger_rec.trigger_name, trigger_rec.event_object_table;
    END LOOP;
END $$;

-- Step 2: Drop any problematic triggers that reference journal_entry_id
-- (These will be recreated with correct field names if needed)
DROP TRIGGER IF EXISTS set_tenant_id_trigger ON journal_entry_lines;
DROP TRIGGER IF EXISTS update_journal_entry_totals_trigger ON journal_entry_lines;

-- Step 3: Create trigger to auto-set tenant_id from parent journal_entry
CREATE OR REPLACE FUNCTION set_journal_entry_line_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get tenant_id from the parent journal_entry
    SELECT tenant_id INTO NEW.tenant_id
    FROM journal_entries
    WHERE id = NEW.entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenant_id_trigger
    BEFORE INSERT ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION set_journal_entry_line_tenant_id();

-- Step 4: Add currency fields if they don't exist
DO $$
BEGIN
    -- Check if currency column exists in journal_entry_lines
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE journal_entry_lines ADD COLUMN currency VARCHAR(3);
    END IF;
    
    -- Check if exchange_rate column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' 
        AND column_name = 'exchange_rate'
    ) THEN
        ALTER TABLE journal_entry_lines ADD COLUMN exchange_rate DECIMAL(18,8) DEFAULT 1;
    END IF;
END $$;

-- Step 5: Create function to update journal entry totals
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update totals in parent journal_entry
    UPDATE journal_entries
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating totals
CREATE TRIGGER update_journal_entry_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_totals();

-- Step 6: Set default currency from company settings
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

CREATE TRIGGER set_default_currency_trigger
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_default_currency_for_journal_entry();

-- Step 7: Add default_currency to companies table if it doesn't exist
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

-- Step 8: Update existing companies to have SAR as default currency
UPDATE companies 
SET default_currency = 'SAR' 
WHERE default_currency IS NULL;

-- Migration completed successfully!
