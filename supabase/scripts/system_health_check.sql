-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 COMPREHENSIVE SYSTEM HEALTH CHECK & AUDIT
-- تقرير التحقق الشامل من صحة النظام
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2026-02-05
-- Purpose: Verify system integrity after RBAC policy updates
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: SYSTEM OVERVIEW - نظرة عامة على النظام
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '📊 SECTION 1: SYSTEM OVERVIEW' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 1.1 Database Tables Count
SELECT 
    'Total Tables in System' as metric,
    COUNT(*)::TEXT as value
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 1.2 Key Tables Row Counts
SELECT 
    'tenants' as table_name,
    (SELECT COUNT(*) FROM tenants) as row_count
UNION ALL
SELECT 
    'companies',
    (SELECT COUNT(*) FROM companies)
UNION ALL
SELECT 
    'branches',
    (SELECT COUNT(*) FROM branches)
UNION ALL
SELECT 
    'user_profiles',
    (SELECT COUNT(*) FROM user_profiles)
UNION ALL
SELECT 
    'roles',
    (SELECT COUNT(*) FROM roles)
UNION ALL
SELECT 
    'user_roles',
    (SELECT COUNT(*) FROM user_roles);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: TENANTS - المستأجرين
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '🏢 SECTION 2: TENANTS' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 2.1 All Tenants with Status
SELECT 
    t.id,
    t.name,
    t.status,
    t.created_at::DATE as created_date,
    (SELECT COUNT(*) FROM companies c WHERE c.tenant_id = t.id) as companies_count,
    (SELECT COUNT(*) FROM user_profiles up WHERE up.tenant_id = t.id) as users_count
FROM tenants t
ORDER BY t.created_at DESC;

-- 2.2 Subscription Plans Overview (flexible query)
SELECT 
    sp.code,
    sp.name_ar,
    sp.name_en,
    sp.is_active
FROM subscription_plans sp
ORDER BY sp.code;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: COMPANIES & BRANCHES - الشركات والفروع
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '🏗️ SECTION 3: COMPANIES & BRANCHES' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 3.1 Companies with their Tenants
SELECT 
    c.id,
    c.name_ar,
    c.code,
    c.is_active,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM branches b WHERE b.company_id = c.id) as branches_count
FROM companies c
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY t.name, c.name_ar;

-- 3.2 Branches Overview
SELECT 
    b.id,
    b.name_ar,
    b.code,
    b.is_active,
    c.name_ar as company_name
FROM branches b
LEFT JOIN companies c ON b.company_id = c.id
ORDER BY c.name_ar, b.name_ar;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: ROLES & PERMISSIONS - الأدوار والصلاحيات
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '🛡️ SECTION 4: ROLES & PERMISSIONS' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 4.1 All Roles
SELECT 
    r.id,
    r.code,
    r.name_ar,
    r.name_en,
    r.level,
    r.is_system,
    (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id AND ur.is_active = true) as assigned_users
FROM roles r
ORDER BY r.code;

-- 4.2 User Role Assignments
SELECT 
    up.full_name,
    up.email,
    r.code as role_code,
    r.name_ar as role_name,
    r.level as role_level,
    ur.is_active
FROM user_roles ur
JOIN user_profiles up ON ur.user_id = up.id
JOIN roles r ON ur.role_id = r.id
ORDER BY up.full_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: RLS POLICIES STATUS - حالة سياسات أمن الصفوف
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '🔐 SECTION 5: RLS POLICIES STATUS' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 5.1 Tables with RLS Enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'companies', 'branches', 'user_profiles', 'roles', 'user_roles', 
                  'user_resource_access', 'visibility_rules', 'chart_of_accounts', 
                  'journal_entries', 'warehouses', 'products')
ORDER BY tablename;

-- 5.2 All Active Policies on Critical Tables
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'companies', 'user_profiles', 'roles', 'user_roles')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: FUNCTIONS CHECK - فحص الدوال
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '⚙️ SECTION 6: CRITICAL FUNCTIONS CHECK' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 6.1 Check if critical functions exist
SELECT 
    routine_name as function_name,
    security_type,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('is_super_admin', 'get_user_roles', 'get_user_visible_modules', 
                     'can_user_see_module', 'is_mfa_required', 'get_mfa_status', 'is_admin_user')
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: DATA INTEGRITY CHECKS - فحص سلامة البيانات
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '✅ SECTION 7: DATA INTEGRITY CHECKS' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

-- 7.1 Users without tenants (orphaned users)
SELECT 
    'Users without tenant' as check_name,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ WARNING' END as status
FROM user_profiles 
WHERE tenant_id IS NULL;

-- 7.2 Companies without tenants
SELECT 
    'Companies without tenant' as check_name,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ WARNING' END as status
FROM companies 
WHERE tenant_id IS NULL;

-- 7.3 Branches without companies
SELECT 
    'Branches without company' as check_name,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ WARNING' END as status
FROM branches 
WHERE company_id IS NULL;

-- 7.4 User roles with invalid role_id
SELECT 
    'User roles with invalid role' as check_name,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = ur.role_id);

-- 7.5 User roles with invalid user_id
SELECT 
    'User roles with invalid user' as check_name,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = ur.user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: SUMMARY - الملخص
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '📋 SECTION 8: SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    'Total Tenants' as metric, (SELECT COUNT(*) FROM tenants)::TEXT as value
UNION ALL
SELECT 
    'Active Tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active')::TEXT
UNION ALL
SELECT 
    'Total Companies', (SELECT COUNT(*) FROM companies)::TEXT
UNION ALL
SELECT 
    'Total Branches', (SELECT COUNT(*) FROM branches)::TEXT
UNION ALL
SELECT 
    'Total Users', (SELECT COUNT(*) FROM user_profiles)::TEXT
UNION ALL
SELECT 
    'Total Roles', (SELECT COUNT(*) FROM roles)::TEXT
UNION ALL
SELECT 
    'Users with Roles', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE is_active = true)::TEXT
UNION ALL
SELECT 
    'Super Admins', (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.code = 'super_admin' AND ur.is_active = true)::TEXT;

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '✅ HEALTH CHECK COMPLETE!' as status;
SELECT '═══════════════════════════════════════════════════════════════' as separator;
