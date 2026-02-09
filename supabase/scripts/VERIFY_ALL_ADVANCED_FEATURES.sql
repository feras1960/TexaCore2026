-- ════════════════════════════════════════════════════════════════
-- 🔍 التحقق من جميع جداول الميزات المتقدمة (عودة النتائج كجدول)
-- ════════════════════════════════════════════════════════════════

SELECT 
    'Step 1: QR & Telegram' as check_group,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'telegram_username') as customers_telegram,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_codes') as table_qr_codes,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_scans') as table_qr_scans,
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_codes') as rls_qr_codes

UNION ALL

SELECT 
    'Step 2: Calls & Shipments' as check_group,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') as table_call_logs,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analyses') as table_call_analyses,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipments_tracking') as table_shipments,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_integrations') as table_bank_integrations;
