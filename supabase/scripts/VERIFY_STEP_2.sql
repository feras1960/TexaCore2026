
DO $$
DECLARE
    v_table_exists boolean;
    v_policy_exists boolean;
    v_results text := '';
BEGIN
    -- Check call_logs
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') INTO v_table_exists;
    v_results := v_results || 'call_logs exists: ' || v_table_exists || E'\n';
    
    -- Check call_analyses
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analyses') INTO v_table_exists;
    v_results := v_results || 'call_analyses exists: ' || v_table_exists || E'\n';

    -- Check shipments_tracking
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipments_tracking') INTO v_table_exists;
    v_results := v_results || 'shipments_tracking exists: ' || v_table_exists || E'\n';

    -- Check bank_integrations
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_integrations') INTO v_table_exists;
    v_results := v_results || 'bank_integrations exists: ' || v_table_exists || E'\n';

    -- Check RLS on call_logs
    SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs') INTO v_policy_exists;
    v_results := v_results || 'call_logs RLS policies exist: ' || v_policy_exists || E'\n';

    RAISE NOTICE '%', v_results;
END $$;
