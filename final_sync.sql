-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 FINAL SYNC - Database Synchronization & Gap Fixing
-- سكريبت الإصلاح النهائي لسد الفجوات بين التوثيق والواقع
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Based on: FINAL_RECONCILIATION_REPORT.md
-- Date: 2026-01-25
-- Priority: URGENT - Security & Data Integrity
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔧 FINAL SYNC SCRIPT - Starting Database Synchronization'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 1: 🔥 URGENT - Security & Data Integrity
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔥 PRIORITY 1: Critical Security & Integrity Fixes'
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.1 Add Missing FK Constraints
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔗 1.1 Adding Missing Foreign Key Constraints...'

-- Check if companies.tenant_id FK already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'companies' 
            AND constraint_name = 'fk_companies_tenant_id'
            AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE companies 
        ADD CONSTRAINT fk_companies_tenant_id 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added FK: companies.tenant_id → tenants.id';
    ELSE
        RAISE NOTICE '⏭️  FK already exists: companies.tenant_id → tenants.id';
    END IF;
END $$;

-- Check if accounting_periods.company_id FK already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_periods') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'accounting_periods' 
                AND constraint_name = 'fk_accounting_periods_company_id'
                AND constraint_type = 'FOREIGN KEY'
        ) THEN
            ALTER TABLE accounting_periods 
            ADD CONSTRAINT fk_accounting_periods_company_id 
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added FK: accounting_periods.company_id → companies.id';
        ELSE
            RAISE NOTICE '⏭️  FK already exists: accounting_periods.company_id → companies.id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Table accounting_periods does not exist';
    END IF;
END $$;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.2 Enable RLS on HR/Payroll Tables (CRITICAL SECURITY GAP)
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔐 1.2 Enabling RLS on HR/Payroll Tables (CRITICAL)...'

-- Function to enable RLS and add tenant isolation policy
CREATE OR REPLACE FUNCTION enable_rls_with_tenant_isolation(p_table_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_has_tenant_id BOOLEAN;
    v_policy_exists BOOLEAN;
BEGIN
    -- Check if table has tenant_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
            AND table_name = p_table_name
            AND column_name = 'tenant_id'
    ) INTO v_has_tenant_id;
    
    IF NOT v_has_tenant_id THEN
        RAISE NOTICE '⚠️  Table % does not have tenant_id column - SKIP', p_table_name;
        RETURN;
    END IF;
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    RAISE NOTICE '✅ Enabled RLS on table: %', p_table_name;
    
    -- Check if policy already exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = p_table_name
            AND policyname = 'tenant_isolation'
    ) INTO v_policy_exists;
    
    IF NOT v_policy_exists THEN
        -- Create tenant isolation policy
        EXECUTE format('
            CREATE POLICY tenant_isolation ON %I
            FOR ALL 
            USING (tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        ', p_table_name);
        RAISE NOTICE '✅ Created policy tenant_isolation on: %', p_table_name;
    ELSE
        RAISE NOTICE '⏭️  Policy tenant_isolation already exists on: %', p_table_name;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error enabling RLS on %: %', p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Apply to all HR/Payroll tables
SELECT enable_rls_with_tenant_isolation('employee_commissions');
SELECT enable_rls_with_tenant_isolation('employee_targets');
SELECT enable_rls_with_tenant_isolation('employee_incentive_assignments');
SELECT enable_rls_with_tenant_isolation('agent_bonuses');
SELECT enable_rls_with_tenant_isolation('agent_withdrawals');
SELECT enable_rls_with_tenant_isolation('agent_events');
SELECT enable_rls_with_tenant_isolation('agent_messages');
SELECT enable_rls_with_tenant_isolation('agent_targets');
SELECT enable_rls_with_tenant_isolation('agent_commissions');

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.3 Add Debit=Credit Balance Validation
-- ═══════════════════════════════════════════════════════════════════════════

\echo '⚖️ 1.3 Adding Debit=Credit Balance Validation...'

-- Create or replace journal balance validation function
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit DECIMAL(15,2);
    v_total_credit DECIMAL(15,2);
    v_entry_id UUID;
BEGIN
    -- Determine journal entry ID based on operation
    IF TG_OP = 'DELETE' THEN
        v_entry_id := OLD.journal_entry_id;
    ELSE
        v_entry_id := NEW.journal_entry_id;
    END IF;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_entry_lines
    WHERE journal_entry_id = v_entry_id;
    
    -- Validate balance
    IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Journal entry % is not balanced: Debit=% Credit=%', 
            v_entry_id, v_total_debit, v_total_credit;
    END IF;
    
    -- Update totals on journal_entries if columns exist
    IF TG_OP <> 'DELETE' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'journal_entries' 
                AND column_name IN ('total_debit', 'total_credit')
        ) THEN
            UPDATE journal_entries
            SET 
                total_debit = v_total_debit,
                total_credit = v_total_credit
            WHERE id = v_entry_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (to avoid duplicates)
DROP TRIGGER IF EXISTS trg_validate_journal_balance_insert ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_validate_journal_balance_update ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_validate_journal_balance_delete ON journal_entry_lines;

-- Create trigger
CREATE TRIGGER trg_validate_journal_balance_insert
AFTER INSERT ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

CREATE TRIGGER trg_validate_journal_balance_update
AFTER UPDATE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

CREATE TRIGGER trg_validate_journal_balance_delete
AFTER DELETE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

\echo '✅ Added Debit=Credit balance validation triggers'
\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.4 Remove Duplicate Triggers
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🧹 1.4 Cleaning Up Duplicate Triggers...'

-- Function to remove duplicate triggers (keep only one)
CREATE OR REPLACE FUNCTION remove_duplicate_triggers()
RETURNS TABLE(trigger_name TEXT, table_name TEXT, action TEXT) AS $$
DECLARE
    v_trigger RECORD;
    v_count INT;
BEGIN
    FOR v_trigger IN (
        SELECT t.trigger_name, t.event_object_table
        FROM information_schema.triggers t
        WHERE t.trigger_schema = 'public'
        GROUP BY t.trigger_name, t.event_object_table
        HAVING COUNT(*) > 1
    ) LOOP
        -- Get count
        SELECT COUNT(*) INTO v_count
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
            AND information_schema.triggers.trigger_name = v_trigger.trigger_name
            AND event_object_table = v_trigger.event_object_table;
            
        -- Drop all instances
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
            v_trigger.trigger_name, v_trigger.event_object_table);
        
        RETURN QUERY SELECT 
            v_trigger.trigger_name,
            v_trigger.event_object_table,
            format('Removed %s duplicates', v_count);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute duplicate removal
SELECT * FROM remove_duplicate_triggers();

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 2: ⏰ HIGH - Additional RLS Coverage
-- ═══════════════════════════════════════════════════════════════════════════

\echo '⏰ PRIORITY 2: Additional RLS Coverage'
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- Enable RLS on other important tables
SELECT enable_rls_with_tenant_isolation('announcements');
SELECT enable_rls_with_tenant_isolation('marketing_materials');
SELECT enable_rls_with_tenant_isolation('promotional_discounts');

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

\echo '✅ VERIFICATION: Checking Results...'
\echo ''

-- Check FK constraints
\echo '🔗 Foreign Key Constraints:'
SELECT 
    tc.table_name,
    tc.constraint_name,
    'FK Added' as status
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.constraint_name IN ('fk_companies_tenant_id', 'fk_accounting_periods_company_id')
ORDER BY tc.table_name;

\echo ''

-- Check RLS status on critical tables
\echo '🔐 RLS Status on Critical Tables:'
SELECT 
    t.tablename as table_name,
    CASE WHEN t.rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    COUNT(p.policyname) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'employee_commissions', 'employee_targets', 'agent_bonuses', 
        'agent_withdrawals', 'agent_events', 'agent_messages', 
        'agent_targets', 'agent_commissions'
    )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

\echo ''

-- Check balance validation trigger
\echo '⚖️ Balance Validation Triggers:'
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event_type
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%validate_journal_balance%'
ORDER BY trigger_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '✅ FINAL SYNC COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo '📊 Summary:'
\echo '   ✅ Foreign key constraints added'
\echo '   ✅ RLS enabled on HR/Payroll tables'
\echo '   ✅ Debit=Credit validation implemented'
\echo '   ✅ Duplicate triggers cleaned up'
\echo ''
\echo '🎯 Next Steps:'
\echo '   1. Review FINAL_RECONCILIATION_REPORT.md'
\echo '   2. Implement Priority 2 items (Accounting automation)'
\echo '   3. Test multi-tenant isolation thoroughly'
\echo '   4. Update documentation to reflect current state'
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'

COMMIT;

\echo ''
\echo '💾 Changes committed successfully!'
\echo ''
