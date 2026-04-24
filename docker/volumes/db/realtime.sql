-- ═══════════════════════════════════════════════════════════
-- Supabase Realtime — Required schema
-- ═══════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
GRANT USAGE ON SCHEMA _realtime TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA _realtime TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA _realtime TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA _realtime TO postgres, anon, authenticated, service_role;
