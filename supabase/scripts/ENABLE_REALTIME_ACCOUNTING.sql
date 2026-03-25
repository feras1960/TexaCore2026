-- ════════════════════════════════════════════════════════════════
-- 🔄 Enable Supabase Realtime on Accounting Tables
-- تفعيل التحديثات الفورية على جداول المحاسبة
-- ════════════════════════════════════════════════════════════════
--
-- This script enables Supabase Realtime (WAL replication) for
-- accounting-related tables. Without this, the WebSocket
-- subscriptions in the frontend won't receive any events.
--
-- Run this in: Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Accounting tables
ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_entry_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE chart_of_accounts;

-- 2. Verify enabled tables
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
