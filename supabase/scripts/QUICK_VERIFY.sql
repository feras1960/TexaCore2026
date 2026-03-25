-- ════════════════════════════════════════════════════════════════
-- 🔍 فحص شامل — نسخة موحّدة (كل النتائج في جدول واحد)
-- ════════════════════════════════════════════════════════════════

WITH 
-- 1. فحص الجداول
tables_check AS (
    SELECT 
        '📋 TABLE' as category,
        expected.tbl as item,
        CASE WHEN t.table_name IS NOT NULL THEN '✅' ELSE '❌' END as status
    FROM (VALUES 
        ('qr_codes'), ('qr_scans'), 
        ('call_logs'), ('call_analyses'), 
        ('shipments_tracking'), ('bank_integrations'), 
        ('notification_preferences')
    ) AS expected(tbl)
    LEFT JOIN information_schema.tables t 
        ON t.table_name = expected.tbl AND t.table_schema = 'public'
),

-- 2. فحص الأعمدة المضافة
columns_check AS (
    SELECT 
        '📋 COLUMN' as category,
        expected.tbl || '.' || expected.col as item,
        CASE WHEN c.column_name IS NOT NULL THEN '✅' ELSE '❌' END as status
    FROM (VALUES 
        ('customers', 'telegram_username'),
        ('customers', 'telegram_chat_id'),
        ('customers', 'preferred_language'),
        ('user_profiles', 'telegram_username'),
        ('user_profiles', 'telegram_chat_id'),
        ('user_profiles', 'is_manager')
    ) AS expected(tbl, col)
    LEFT JOIN information_schema.columns c 
        ON c.table_name = expected.tbl AND c.column_name = expected.col AND c.table_schema = 'public'
),

-- 3. فحص RLS مفعّل
rls_check AS (
    SELECT 
        '🛡️ RLS' as category,
        t.relname as item,
        CASE WHEN t.relrowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END 
        || ' (' || (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.relname AND p.schemaname = 'public')::text || ' policies)' as status
    FROM pg_class t
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname IN ('qr_codes','qr_scans','call_logs','call_analyses','shipments_tracking','bank_integrations','notification_preferences')
),

-- 4. فحص السياسات بالتسمية الرسمية
policies_check AS (
    SELECT 
        '🔑 POLICY' as category,
        tablename || ' → ' || policyname as item,
        cmd || ' ' || CASE 
            WHEN policyname LIKE '%_select_policy' AND cmd = 'SELECT' THEN '✅'
            WHEN policyname LIKE '%_insert_policy' AND cmd = 'INSERT' THEN '✅'
            WHEN policyname LIKE '%_update_policy' AND cmd = 'UPDATE' THEN '✅'
            WHEN policyname LIKE '%_delete_policy' AND cmd = 'DELETE' THEN '✅'
            ELSE '⚠️ non-standard'
        END as status
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('qr_codes','qr_scans','call_logs','call_analyses','shipments_tracking','bank_integrations','notification_preferences')
),

-- 5. فحص الدوال
functions_check AS (
    SELECT 
        '⚙️ FUNCTION' as category,
        p.proname as item,
        CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '⚠️ INVOKER' END as status
    FROM pg_proc p
    JOIN pg_namespace ns ON p.pronamespace = ns.oid
    WHERE ns.nspname = 'public'
    AND p.proname IN (
        'update_entity_status_on_scan', 'update_qr_codes_updated_at', 'notify_n8n_webhook',
        'get_daily_stats', 'get_monthly_summary', 'get_fund_balances', 'get_monthly_sales', 'get_monthly_expenses'
    )
),

-- 6. فحص Triggers
triggers_check AS (
    SELECT 
        '🔔 TRIGGER' as category,
        trigger_name || ' ON ' || event_object_table as item,
        event_manipulation || ' ✅' as status
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND event_object_table IN ('qr_codes', 'journal_entries')
),

-- 7. فحص الفهارس
indexes_check AS (
    SELECT DISTINCT
        '📊 INDEX' as category,
        i.relname as item,
        '✅ on ' || t.relname as status
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
    AND t.relname IN ('qr_codes','qr_scans','call_logs','call_analyses','shipments_tracking','bank_integrations')
    AND NOT ix.indisprimary
)

-- الجمع في نتيجة واحدة
SELECT category, item, status FROM tables_check
UNION ALL SELECT category, item, status FROM columns_check
UNION ALL SELECT category, item, status FROM rls_check
UNION ALL SELECT category, item, status FROM policies_check
UNION ALL SELECT category, item, status FROM functions_check
UNION ALL SELECT category, item, status FROM triggers_check
UNION ALL SELECT category, item, status FROM indexes_check
ORDER BY category, item;
