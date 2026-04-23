-- ════════════════════════════════════════════════════════════════
-- 🗃️ TexaCore Self-Hosted — Database Initialization
-- ════════════════════════════════════════════════════════════════
-- Runs on first `docker compose up` when the DB is empty
-- ════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create default admin user function
-- (The actual schema will be loaded from migrations)

-- Mark DB as initialized
CREATE TABLE IF NOT EXISTS _texacore_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO _texacore_meta (key, value) VALUES 
    ('version', '1.0.0'),
    ('initialized_at', NOW()::TEXT),
    ('mode', 'selfhosted')
ON CONFLICT (key) DO NOTHING;

-- Log
DO $$
BEGIN
    RAISE NOTICE '✅ TexaCore database initialized (v1.0.0)';
END $$;
