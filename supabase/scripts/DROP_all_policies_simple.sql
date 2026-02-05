-- DROP ALL RLS POLICIES - Simple Version
-- Date: 2026-02-05

DO $$
DECLARE
    policy_record RECORD;
    drop_count INTEGER := 0;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
        drop_count := drop_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Dropped % policies', drop_count;
END $$;

-- Verify
SELECT COUNT(*) as remaining_policies FROM pg_policies WHERE schemaname = 'public';
