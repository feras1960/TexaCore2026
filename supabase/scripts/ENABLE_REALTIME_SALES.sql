-- ══════════════════════════════════════════════════════════════
-- 🔄 ENABLE REALTIME FOR SALES MODULE
-- ══════════════════════════════════════════════════════════════
-- الهدف: تفعيل Supabase Realtime على جداول المبيعات
-- لتحديث واجهة المستخدم تلقائياً عند أي تغيير
--
-- التنفيذ: شغّل هذا السكربت في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Add sales tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS sales_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS sales_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS sales_returns;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS transit_reservations;

-- 2. Verify enabled tables
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
