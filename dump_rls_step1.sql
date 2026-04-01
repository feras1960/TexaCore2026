\copy (SELECT json_agg(t) FROM (SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename) t) TO STDOUT;
