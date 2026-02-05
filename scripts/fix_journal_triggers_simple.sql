-- SIMPLE AND DIRECT FIX: Drop and recreate triggers correctly
-- This version avoids complex loops that cause errors

-- Step 1: Drop specific triggers that we know exist
DROP TRIGGER IF EXISTS set_tenant_id_trigger ON journal_entry_lines CASCADE;
DROP TRIGGER IF EXISTS update_journal_entry_totals_trigger ON journal_entry_lines CASCADE;
DROP TRIGGER IF EXISTS sync_journal_entry_line_tenant_trigger ON journal_entry_lines CASCADE;
DROP TRIGGER IF EXISTS set_default_currency_trigger ON journal_entries CASCADE;

-- Step 2: Drop specific functions that might use journal_entry_id
DROP FUNCTION IF EXISTS set_journal_entry_line_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS update_journal_entry_totals() CASCADE;
DROP FUNCTION IF EXISTS sync_journal_entry_line_tenant() CASCADE;
DROP FUNCTION IF EXISTS set_default_currency_for_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS create_payment_receipt_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS create_payment_voucher_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS create_sales_invoice_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS validate_journal_entry_balance() CASCADE;

-- Step 3: Create function to auto-set tenant_id (using CORRECT field name: entry_id)
CREATE OR REPLACE FUNCTION set_journal_entry_line_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT tenant_id INTO NEW.tenant_id
    FROM journal_entries
    WHERE id = NEW.entry_id;  -- CORRECT: using entry_id NOT journal_entry_id
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenant_id_trigger
    BEFORE INSERT ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION set_journal_entry_line_tenant_id();

-- Step 4: Create function to update totals (using CORRECT field name: entry_id)
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE journal_entries
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)  -- CORRECT: entry_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit), 0)
            FROM journal_entry_lines
            WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)  -- CORRECT: entry_id
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);  -- CORRECT: entry_id
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journal_entry_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_totals();

-- Step 5: Create function to set default currency
CREATE OR REPLACE FUNCTION set_default_currency_for_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    company_currency VARCHAR(3);
BEGIN
    SELECT COALESCE(default_currency, 'SAR') INTO company_currency
    FROM companies
    WHERE id = NEW.company_id;
    
    IF NEW.currency IS NULL OR NEW.currency = '' THEN
        NEW.currency := company_currency;
    END IF;
    
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

-- Step 6: Ensure default_currency column exists
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

-- Step 7: Update existing companies
UPDATE companies 
SET default_currency = 'SAR' 
WHERE default_currency IS NULL;

-- Verification: Show created triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('journal_entry_lines', 'journal_entries')
ORDER BY event_object_table, trigger_name;
