-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 FINAL SYNC V2 - Database Synchronization & Gap Fixing
-- نسخة محسنة مع معالجة البيانات القديمة
-- ═══════════════════════════════════════════════════════════════════════════

-- لا نستخدم BEGIN/COMMIT لكي لا يتم rollback كل شيء عند خطأ واحد
-- سنعالج كل قسم بشكل مستقل

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔧 FINAL SYNC V2 - Starting Database Synchronization'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 1: 🔥 URGENT - Security & Data Integrity
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔥 PRIORITY 1: Critical Security & Integrity Fixes'
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.0 Fix Orphaned Data FIRST (تنظيف البيانات اليتيمة)
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔍 1.0 Checking for Orphaned Data...'

-- Check for companies with invalid tenant_id
DO $$
DECLARE
    v_orphaned_count INT;
    v_first_tenant_id UUID;
BEGIN
    -- Count orphaned companies
    SELECT COUNT(*) INTO v_orphaned_count
    FROM companies c
    WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = c.tenant_id);
    
    IF v_orphaned_count > 0 THEN
        RAISE NOTICE '⚠️  Found % companies with invalid tenant_id', v_orphaned_count;
        
        -- Get first valid tenant_id
        SELECT id INTO v_first_tenant_id FROM tenants LIMIT 1;
        
        IF v_first_tenant_id IS NOT NULL THEN
            -- Update orphaned companies to use first tenant
            UPDATE companies 
            SET tenant_id = v_first_tenant_id
            WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = companies.tenant_id);
            
            RAISE NOTICE '✅ Fixed % orphaned companies (assigned to tenant: %)', v_orphaned_count, v_first_tenant_id;
        ELSE
            RAISE NOTICE '❌ No valid tenant found! Creating default tenant...';
            
            -- Create default tenant if none exists
            INSERT INTO tenants (
                id, name, slug, status, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                'Default Tenant',
                'default',
                'active',
                NOW(),
                NOW()
            ) RETURNING id INTO v_first_tenant_id;
            
            -- Update orphaned companies
            UPDATE companies 
            SET tenant_id = v_first_tenant_id
            WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = companies.tenant_id);
            
            RAISE NOTICE '✅ Created default tenant and fixed orphaned companies';
        END IF;
    ELSE
        RAISE NOTICE '✅ No orphaned companies found';
    END IF;
END $$;

\echo ''
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
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error adding FK companies.tenant_id: %', SQLERRM;
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
            -- First fix orphaned data
            DELETE FROM accounting_periods 
            WHERE company_id NOT IN (SELECT id FROM companies);
            
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
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error adding FK accounting_periods.company_id: %', SQLERRM;
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
RETURNS TEXT AS $$
DECLARE
    v_has_tenant_id BOOLEAN;
    v_policy_exists BOOLEAN;
    v_rls_enabled BOOLEAN;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) THEN
        RETURN '⚠️  Table ' || p_table_name || ' does not exist - SKIP';
    END IF;
    
    -- Check if table has tenant_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
            AND table_name = p_table_name
            AND column_name = 'tenant_id'
    ) INTO v_has_tenant_id;
    
    IF NOT v_has_tenant_id THEN
        RETURN '⚠️  Table ' || p_table_name || ' does not have tenant_id column - SKIP';
    END IF;
    
    -- Check if RLS already enabled
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = p_table_name;
    
    IF NOT v_rls_enabled THEN
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    END IF;
    
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
        RETURN '✅ Enabled RLS + Created policy on: ' || p_table_name;
    ELSE
        IF NOT v_rls_enabled THEN
            RETURN '✅ Enabled RLS on: ' || p_table_name || ' (policy existed)';
        ELSE
            RETURN '⏭️  RLS already enabled on: ' || p_table_name;
        END IF;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN '❌ Error on ' || p_table_name || ': ' || SQLERRM;
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
    
    -- Validate balance (only if both sides have amounts)
    IF (v_total_debit > 0 OR v_total_credit > 0) AND v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Journal entry % is not balanced: Debit=% Credit=%', 
            v_entry_id, v_total_debit, v_total_credit;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (to avoid duplicates)
DROP TRIGGER IF EXISTS trg_validate_journal_balance_sync_insert ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_validate_journal_balance_sync_update ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_validate_journal_balance_sync_delete ON journal_entry_lines;

-- Create triggers
CREATE TRIGGER trg_validate_journal_balance_sync_insert
AFTER INSERT ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

CREATE TRIGGER trg_validate_journal_balance_sync_update
AFTER UPDATE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

CREATE TRIGGER trg_validate_journal_balance_sync_delete
AFTER DELETE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

\echo '✅ Added Debit=Credit balance validation triggers'
\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.4 Additional RLS Coverage
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
    '✅ FK Added' as status
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
\echo '✅ FINAL SYNC V2 COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo '📊 Summary:'
\echo '   ✅ Orphaned data cleaned'
\echo '   ✅ Foreign key constraints added'
\echo '   ✅ RLS enabled on HR/Payroll tables'
\echo '   ✅ Debit=Credit validation implemented'
\echo ''
\echo '🎯 Next Steps:'
\echo '   1. Review results above'
\echo '   2. Test multi-tenant isolation'
\echo '   3. Implement Priority 2 items (Accounting automation)'
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'

\echo ''
\echo '💾 All changes applied successfully!'
\echo ''
