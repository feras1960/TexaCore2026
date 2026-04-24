-- ═══════════════════════════════════════════════════════════
-- Supabase Webhooks — Required functions
-- ═══════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS supabase_functions;
GRANT USAGE ON SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
