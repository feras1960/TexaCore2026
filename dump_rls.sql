\copy (SELECT json_agg(t) FROM (SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename) t) TO '/tmp/tables.json';
\copy (SELECT json_agg(t) FROM (SELECT t.tablename FROM pg_tables t LEFT JOIN pg_policies p ON t.tablename = p.tablename WHERE t.schemaname = 'public' AND t.rowsecurity = true AND p.policyname IS NULL) t) TO '/tmp/no_policies.json';
\copy (SELECT json_agg(t) FROM (SELECT tablename, policyname, cmd, CAST(qual AS TEXT), CAST(with_check AS TEXT) FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename) t) TO '/tmp/policies.json';
\copy (SELECT json_agg(t) FROM (SELECT routine_name, security_type FROM information_schema.routines WHERE routine_schema = 'public' AND security_type = 'DEFINER') t) TO '/tmp/functions.json';
\copy (SELECT json_agg(t) FROM (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') t) TO '/tmp/views.json';
