-- ════════════════════════════════════════════════════════════════
-- 🔄 Enable Supabase Realtime on Warehouse Tables
-- تفعيل التحديثات الفورية على جداول المستودعات
-- ════════════════════════════════════════════════════════════════
--
-- This script enables Supabase Realtime (WAL replication) for
-- warehouse-related tables. Without this, the WebSocket
-- subscriptions in the frontend won't receive any events.
--
-- Run this in: Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Main warehouse tables
ALTER PUBLICATION supabase_realtime ADD TABLE warehouses;
ALTER PUBLICATION supabase_realtime ADD TABLE fabric_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE fabric_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE fabric_rolls;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;

-- 2. Verify enabled tables
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
