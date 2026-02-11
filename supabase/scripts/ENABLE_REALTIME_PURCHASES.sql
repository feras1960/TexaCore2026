-- ══════════════════════════════════════════════════════════════
-- 🔄 ENABLE REALTIME FOR PURCHASES MODULE
-- ══════════════════════════════════════════════════════════════
-- الهدف: تفعيل Supabase Realtime على جداول المشتريات
-- لتحديث واجهة المستخدم تلقائياً عند أي تغيير
--
-- التنفيذ: شغّل هذا السكربت في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Add purchases tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS purchase_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS suppliers;

-- 2. Verify enabled tables
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
