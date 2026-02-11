-- ════════════════════════════════════════════════════════════════
-- 🔍 فحص شامل لجميع ميزات الأتمتة المتقدمة
-- 
-- يتحقق من:
-- 1. وجود الجداول والأعمدة
-- 2. سياسات RLS وفق النمط الرسمي
-- 3. الفهارس
-- 4. الدوال (RPC + Triggers)
-- 5. العلاقات (Foreign Keys)
-- 6. CHECK Constraints
-- ════════════════════════════════════════════════════════════════

-- ══════════════════════════════════
-- 📋 1. فحص وجود الجداول
-- ══════════════════════════════════
SELECT 
    '📋 TABLES CHECK' as section,
    t.table_name,
    CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    VALUES 
        ('qr_codes'), ('qr_scans'), 
        ('call_logs'), ('call_analyses'), 
        ('shipments_tracking'), ('bank_integrations'), 
        ('notification_preferences')
) AS expected(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected.table_name 
    AND t.table_schema = 'public';

-- ══════════════════════════════════
-- 📋 2. فحص الأعمدة المضافة
-- ══════════════════════════════════
SELECT 
    '📋 COLUMNS CHECK' as section,
    c.table_name || '.' || c.column_name as full_column,
    CASE WHEN c.column_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    VALUES 
        ('customers', 'telegram_username'),
        ('customers', 'telegram_chat_id'),
        ('customers', 'preferred_language'),
        ('customers', 'last_interaction_at'),
        ('user_profiles', 'telegram_username'),
        ('user_profiles', 'telegram_chat_id'),
        ('user_profiles', 'is_manager'),
        ('user_profiles', 'qr_access_level')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns c 
    ON c.table_name = expected.table_name 
    AND c.column_name = expected.column_name 
    AND c.table_schema = 'public';

-- ══════════════════════════════════
-- 🛡️ 3. فحص سياسات RLS (النمط الرسمي)
-- ══════════════════════════════════
SELECT 
    '🛡️ RLS POLICIES CHECK' as section,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN policyname LIKE '%_select_policy' AND cmd = 'SELECT' THEN '✅ Correct'
        WHEN policyname LIKE '%_insert_policy' AND cmd = 'INSERT' THEN '✅ Correct'
        WHEN policyname LIKE '%_update_policy' AND cmd = 'UPDATE' THEN '✅ Correct'
        WHEN policyname LIKE '%_delete_policy' AND cmd = 'DELETE' THEN '✅ Correct'
        ELSE '⚠️ Non-standard naming'
    END as naming_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations', 
    'notification_preferences'
)
ORDER BY tablename, cmd;

-- ══════════════════════════════════
-- 🛡️ 4. فحص تفعيل RLS على كل الجداول
-- ══════════════════════════════════
SELECT 
    '🛡️ RLS ENABLED CHECK' as section,
    t.relname as table_name,
    CASE WHEN t.relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.relname AND p.schemaname = 'public') as policy_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.relname AND p.schemaname = 'public') = 4 
        THEN '✅ Complete (4 policies)'
        WHEN (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.relname AND p.schemaname = 'public') > 0 
        THEN '⚠️ Partial (' || (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.relname AND p.schemaname = 'public') || ' policies)'
        ELSE '❌ No policies'
    END as coverage
FROM pg_class t
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
AND t.relname IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations', 
    'notification_preferences'
)
ORDER BY t.relname;

-- ══════════════════════════════════
-- 🔗 5. فحص العلاقات (Foreign Keys)
-- ══════════════════════════════════
SELECT 
    '🔗 FOREIGN KEYS CHECK' as section,
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column,
    '✅ FK Active' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations',
    'notification_preferences'
)
ORDER BY tc.table_name, kcu.column_name;

-- ══════════════════════════════════
-- 🔑 6. فحص الفهارس
-- ══════════════════════════════════
SELECT 
    '🔑 INDEXES CHECK' as section,
    t.relname as table_name,
    i.relname as index_name,
    '✅ Active' as status
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
AND t.relname IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations'
)
AND NOT ix.indisprimary  -- exclude primary keys
ORDER BY t.relname, i.relname;

-- ══════════════════════════════════
-- ⚙️ 7. فحص الدوال (Functions)
-- ══════════════════════════════════
SELECT 
    '⚙️ FUNCTIONS CHECK' as section,
    p.proname as function_name,
    CASE 
        WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '⚠️ SECURITY INVOKER'
    END as security_mode,
    CASE 
        WHEN p.provolatile = 's' THEN 'STABLE'
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        ELSE 'VOLATILE'
    END as volatility
FROM pg_proc p
JOIN pg_namespace ns ON p.pronamespace = ns.oid
WHERE ns.nspname = 'public'
AND p.proname IN (
    'update_entity_status_on_scan',
    'update_qr_codes_updated_at',
    'notify_n8n_webhook',
    'get_daily_stats',
    'get_monthly_summary', 
    'get_fund_balances',
    'get_monthly_sales',
    'get_monthly_expenses'
)
ORDER BY p.proname;

-- ══════════════════════════════════
-- 🔒 8. فحص CHECK Constraints
-- ══════════════════════════════════
SELECT 
    '🔒 CHECK CONSTRAINTS' as section,
    tc.table_name,
    tc.constraint_name,
    cc.check_clause,
    '✅ Active' as status
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
    AND tc.table_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses',
    'shipments_tracking', 'bank_integrations'
)
ORDER BY tc.table_name, tc.constraint_name;

-- ══════════════════════════════════
-- 🔔 9. فحص Triggers
-- ══════════════════════════════════
SELECT 
    '🔔 TRIGGERS CHECK' as section,
    trigger_name,
    event_manipulation as event,
    event_object_table as table_name,
    action_timing as timing,
    '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'qr_codes', 'journal_entries'
)
ORDER BY event_object_table, trigger_name;

-- ══════════════════════════════════
-- 🔍 10. فحص سياسات تستخدم الدوال الرسمية
-- ══════════════════════════════════
SELECT 
    '🔍 OFFICIAL HELPER USAGE' as section,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%get_user_tenant_id%' OR qual LIKE '%is_platform_admin%' 
        THEN '✅ Uses official helpers'
        ELSE '⚠️ May use custom logic'
    END as helper_usage
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'qr_codes', 'qr_scans', 
    'call_logs', 'call_analyses', 
    'shipments_tracking', 'bank_integrations'
)
ORDER BY tablename, policyname;

-- ══════════════════════════════════
-- 📊 ملخص نهائي
-- ══════════════════════════════════
SELECT '═══════════════════════════════════' as divider;
SELECT '📊 COMPREHENSIVE CHECK COMPLETE' as result;
SELECT '═══════════════════════════════════' as divider;
