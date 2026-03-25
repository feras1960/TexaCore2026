-- ═══════════════════════════════════════════════════════════════════════════
-- 🗑️ DROP ALL RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2026-02-05
-- Total Policies to Drop: 341
-- Database: TexaCore ERP
-- 
-- ⚠️ WARNING: This script will delete ALL RLS policies
-- ⚠️ Make sure you have a backup before running this!
-- ⚠️ Backup file: supabase/backup/BACKUP_policies_2026_02_05.sql
--
-- This script:
-- ✅ Drops all policies
-- ✅ Does NOT disable RLS on tables
-- ✅ Safe to run (uses IF EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Start transaction for safety
BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP ALL POLICIES - Using dynamic SQL to drop all existing policies
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    policy_record RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🗑️ Starting to drop all RLS policies...';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
        drop_count := drop_count + 1;
        
        -- Log progress every 50 policies
        IF drop_count % 50 = 0 THEN
            RAISE NOTICE '  ... dropped % policies', drop_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Dropped % policies in total', drop_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY DELETION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM pg_policies WHERE schemaname = 'public';
    
    IF remaining_count > 0 THEN
        RAISE WARNING '⚠️ Some policies were not deleted! Remaining: %', remaining_count;
    ELSE
        RAISE NOTICE '✅ All policies have been successfully deleted!';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY RLS IS STILL ENABLED
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    rls_enabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_enabled_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    
    RAISE NOTICE '📊 Tables with RLS still enabled: %', rls_enabled_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Commit transaction
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- FINAL SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🗑️ DROP POLICIES COMPLETE' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as remaining_policies,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls;
