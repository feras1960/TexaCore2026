-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 FINAL RECONCILIATION - Database Introspection
-- الجرد الفعلي الشامل لقاعدة البيانات
-- ═══════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '📊 PART 1: DATABASE INVENTORY - الجرد الكامل'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. إحصائيات شاملة
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📈 1.1 Database Statistics:'
SELECT 
    'Total Tables' as metric,
    COUNT(*)::text as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Total Views' as metric,
    COUNT(*)::text as count
FROM information_schema.views 
WHERE table_schema = 'public'

UNION ALL

SELECT 
    'Total Functions' as metric,
    COUNT(DISTINCT routine_name)::text as count
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    'Total Triggers' as metric,
    COUNT(*)::text as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. قائمة الجداول الكاملة مع التصنيف
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📋 1.2 Complete Tables List (Categorized):'

SELECT 
    CASE 
        -- Core System
        WHEN table_name IN ('tenants', 'companies', 'branches', 'fiscal_years', 'currencies') THEN '🏢 Core System'
        
        -- Accounting
        WHEN table_name LIKE 'accounting%' OR table_name LIKE 'journal%' OR table_name LIKE 'cost%' 
            OR table_name IN ('chart_of_accounts', 'account_groups', 'transactions', 'transaction_details') 
            THEN '💰 Accounting'
        
        -- E-commerce
        WHEN table_name LIKE 'product%' OR table_name LIKE 'order%' OR table_name LIKE 'cart%'
            OR table_name LIKE 'customer%' OR table_name LIKE 'review%' OR table_name LIKE 'price%'
            OR table_name IN ('shopping_carts', 'shopping_cart_items', 'guest_checkouts')
            THEN '🛒 E-commerce'
        
        -- Inventory
        WHEN table_name LIKE 'inventory%' OR table_name LIKE 'warehouse%' OR table_name LIKE 'stock%'
            OR table_name IN ('items', 'item_categories', 'units_of_measure')
            THEN '📦 Inventory'
        
        -- HR & Payroll
        WHEN table_name LIKE 'employee%' OR table_name LIKE 'payroll%' OR table_name LIKE 'attendance%'
            OR table_name LIKE 'leave%' THEN '👥 HR & Payroll'
        
        -- SaaS & Subscription
        WHEN table_name LIKE 'saas%' OR table_name LIKE 'subscription%' OR table_name LIKE 'module%'
            OR table_name LIKE 'plan%' THEN '🚀 SaaS'
        
        -- POS
        WHEN table_name LIKE 'pos%' THEN '🛍️ POS'
        
        -- CRM
        WHEN table_name LIKE 'crm%' OR table_name IN ('leads', 'opportunities', 'contacts') THEN '🤝 CRM'
        
        -- System & Security
        WHEN table_name LIKE 'audit%' OR table_name LIKE 'permission%' OR table_name LIKE 'role%'
            OR table_name LIKE 'user%' THEN '🔒 Security & Audit'
        
        ELSE '📁 Other'
    END as category,
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = t.table_name AND table_schema = 'public') as constraints
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY category, table_name;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. إحصائيات حسب الفئة
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📊 1.3 Tables by Category:'

SELECT 
    CASE 
        WHEN table_name IN ('tenants', 'companies', 'branches', 'fiscal_years', 'currencies') THEN '🏢 Core System'
        WHEN table_name LIKE 'accounting%' OR table_name LIKE 'journal%' OR table_name LIKE 'cost%' 
            OR table_name IN ('chart_of_accounts', 'account_groups', 'transactions', 'transaction_details') 
            THEN '💰 Accounting'
        WHEN table_name LIKE 'product%' OR table_name LIKE 'order%' OR table_name LIKE 'cart%'
            OR table_name LIKE 'customer%' OR table_name LIKE 'review%' OR table_name LIKE 'price%'
            OR table_name IN ('shopping_carts', 'shopping_cart_items', 'guest_checkouts')
            THEN '🛒 E-commerce'
        WHEN table_name LIKE 'inventory%' OR table_name LIKE 'warehouse%' OR table_name LIKE 'stock%'
            OR table_name IN ('items', 'item_categories', 'units_of_measure')
            THEN '📦 Inventory'
        WHEN table_name LIKE 'employee%' OR table_name LIKE 'payroll%' OR table_name LIKE 'attendance%'
            OR table_name LIKE 'leave%' THEN '👥 HR & Payroll'
        WHEN table_name LIKE 'saas%' OR table_name LIKE 'subscription%' OR table_name LIKE 'module%'
            OR table_name LIKE 'plan%' THEN '🚀 SaaS'
        WHEN table_name LIKE 'pos%' THEN '🛍️ POS'
        WHEN table_name LIKE 'crm%' OR table_name IN ('leads', 'opportunities', 'contacts') THEN '🤝 CRM'
        WHEN table_name LIKE 'audit%' OR table_name LIKE 'permission%' OR table_name LIKE 'role%'
            OR table_name LIKE 'user%' THEN '🔒 Security & Audit'
        ELSE '📁 Other'
    END as category,
    COUNT(*) as table_count,
    pg_size_pretty(SUM(pg_total_relation_size(quote_ident(table_name)::regclass))) as total_size
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
GROUP BY category
ORDER BY table_count DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '📊 PART 2: FOREIGN KEYS & CONSTRAINTS - العلاقات والقيود'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. العلاقات الأجنبية (Foreign Keys)
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔗 2.1 Foreign Key Relationships:'

SELECT 
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. التحقق من العلاقة الأساسية: tenants -> companies -> accounting
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🏗️ 2.2 Core Hierarchy Verification (tenants -> companies -> accounting):'

-- Check if tenants table exists
SELECT 
    'tenants table' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public')
        THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if companies table exists and has tenant_id FK
SELECT 
    'companies.tenant_id FK' as component,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'companies' 
            AND kcu.column_name = 'tenant_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check accounting tables with company_id FK
SELECT 
    table_name || '.company_id FK' as component,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = t.table_name
            AND kcu.column_name = 'company_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables t
WHERE t.table_name IN ('chart_of_accounts', 'journal_entries', 'transactions', 'accounting_periods')
    AND t.table_schema = 'public';

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. القيود (Constraints) - تحقق من قيد "مدين = دائن"
-- ═══════════════════════════════════════════════════════════════════════════

\echo '⚖️ 2.3 Debit/Credit Balance Constraints:'

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON tc.constraint_name = c.conname
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'CHECK'
    AND (
        pg_get_constraintdef(c.oid) ILIKE '%debit%credit%'
        OR pg_get_constraintdef(c.oid) ILIKE '%balance%'
    )
ORDER BY tc.table_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔒 PART 3: RLS POLICIES - سياسات الأمان'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. إحصائيات RLS
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📊 3.1 RLS Statistics:'

SELECT 
    'Tables with RLS Enabled' as metric,
    COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    'Total RLS Policies' as metric,
    COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public';

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. قائمة الجداول مع حالة RLS
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🔐 3.2 Tables with RLS Status:'

SELECT 
    t.tablename as table_name,
    CASE WHEN t.rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    COUNT(p.policyname) as policies_count,
    STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) as policy_names
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. تفاصيل سياسات RLS
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📋 3.3 RLS Policies Details:'

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. التحقق من سياسات Multi-tenancy
-- ═══════════════════════════════════════════════════════════════════════════

\echo '🏢 3.4 Multi-tenancy Isolation Check (tenant_id policies):'

SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual::text ILIKE '%tenant_id%' OR with_check::text ILIKE '%tenant_id%' 
            THEN '✅ HAS tenant_id' 
        ELSE '⚠️ NO tenant_id' 
    END as tenant_isolation,
    CASE 
        WHEN qual::text ILIKE '%company_id%' OR with_check::text ILIKE '%company_id%' 
            THEN '✅ HAS company_id' 
        ELSE '⚠️ NO company_id' 
    END as company_isolation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '⚙️ PART 4: TRIGGERS & FUNCTIONS - المحفزات والوظائف'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. إحصائيات Triggers
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📊 4.1 Triggers Statistics:'

SELECT 
    event_object_table as table_name,
    COUNT(*) as trigger_count,
    STRING_AGG(trigger_name, ', ' ORDER BY trigger_name) as trigger_names
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table
ORDER BY trigger_count DESC, event_object_table;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. قائمة Triggers الكاملة
-- ═══════════════════════════════════════════════════════════════════════════

\echo '⚡ 4.2 Complete Triggers List:'

SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event_type,
    action_timing as timing,
    action_statement as function_call
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. محفزات المحاسبة الآلية
-- ═══════════════════════════════════════════════════════════════════════════

\echo '💰 4.3 Accounting Automation Triggers:'

SELECT 
    t.trigger_name,
    t.event_object_table,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
    AND (
        t.event_object_table LIKE 'accounting%'
        OR t.event_object_table LIKE 'journal%'
        OR t.event_object_table LIKE 'transaction%'
        OR t.event_object_table IN ('chart_of_accounts', 'cost_centers')
    )
ORDER BY t.event_object_table, t.trigger_name;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. الوظائف (Functions)
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📋 4.4 Functions List:'

SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type,
    CASE 
        WHEN routine_name LIKE 'accounting%' OR routine_name LIKE 'calculate%' 
            OR routine_name LIKE 'journal%' THEN '💰 Accounting'
        WHEN routine_name LIKE 'product%' OR routine_name LIKE 'order%' 
            OR routine_name LIKE 'cart%' THEN '🛒 E-commerce'
        WHEN routine_name LIKE 'register%' OR routine_name LIKE 'auth%' 
            OR routine_name LIKE 'check%' THEN '🔒 Auth & Validation'
        WHEN routine_name LIKE 'get_%' OR routine_name LIKE 'list_%' THEN '📊 Queries'
        WHEN routine_name LIKE 'create_%' OR routine_name LIKE 'update_%' 
            OR routine_name LIKE 'delete_%' THEN '✏️ CRUD'
        ELSE '📁 Other'
    END as category
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY category, routine_name;

\echo ''
\echo '─────────────────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. إحصائيات الوظائف حسب الفئة
-- ═══════════════════════════════════════════════════════════════════════════

\echo '📊 4.5 Functions by Category:'

SELECT 
    CASE 
        WHEN routine_name LIKE 'accounting%' OR routine_name LIKE 'calculate%' 
            OR routine_name LIKE 'journal%' THEN '💰 Accounting'
        WHEN routine_name LIKE 'product%' OR routine_name LIKE 'order%' 
            OR routine_name LIKE 'cart%' THEN '🛒 E-commerce'
        WHEN routine_name LIKE 'register%' OR routine_name LIKE 'auth%' 
            OR routine_name LIKE 'check%' THEN '🔒 Auth & Validation'
        WHEN routine_name LIKE 'get_%' OR routine_name LIKE 'list_%' THEN '📊 Queries'
        WHEN routine_name LIKE 'create_%' OR routine_name LIKE 'update_%' 
            OR routine_name LIKE 'delete_%' THEN '✏️ CRUD'
        ELSE '📁 Other'
    END as category,
    COUNT(*) as function_count
FROM information_schema.routines
WHERE routine_schema = 'public'
GROUP BY category
ORDER BY function_count DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '✅ RECONCILIATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
