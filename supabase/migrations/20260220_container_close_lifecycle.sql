-- ═══════════════════════════════════════════════════════════════
-- Migration: Container Close Lifecycle Fields
-- إضافة حقول إغلاق الحاوية — تسكير دورة الحياة
-- Date: 2026-02-20
-- ═══════════════════════════════════════════════════════════════

-- 1. Add closed_at / closed_by columns if not already present
ALTER TABLE containers
    ADD COLUMN IF NOT EXISTS closed_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS closed_by  UUID        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Ensure 'closed' is a valid status value
-- (If you use an ENUM for status, add the value — otherwise this comment applies to text columns)
-- ALTER TYPE container_status ADD VALUE IF NOT EXISTS 'closed';

-- 3. Update constraint comment (informational)
COMMENT ON COLUMN containers.closed_at IS 'Timestamp when the container lifecycle was closed/archived';
COMMENT ON COLUMN containers.closed_by IS 'User who closed the container';
COMMENT ON COLUMN containers.status IS 'Lifecycle status: ordered, in_transit, at_port, in_receiving, received, fully_received, completed, closed';

-- 4. Index for report queries (e.g. "show all closed containers")
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_closed_at ON containers(closed_at) WHERE closed_at IS NOT NULL;
