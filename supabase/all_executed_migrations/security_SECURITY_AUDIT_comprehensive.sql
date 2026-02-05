-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY AUDIT: فحص أمني شامل لقاعدة البيانات
-- تاريخ: 2026-02-03
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ فحص الجداول بدون RLS
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '🔴 NO RLS' as status,
    schemaname,
    tablename,
    'يحتاج تفعيل RLS' as action_required
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT IN (
      SELECT tablename 
      FROM pg_tables pt
      JOIN pg_class pc ON pt.tablename = pc.relname
      WHERE pc.relrowsecurity = true
  )
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ فحص السياسات التي تستخدم user_metadata (خطير!)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '⚠️ METADATA CHECK' as status,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN qual::text LIKE '%user_metadata%' THEN '🔴 يستخدم user_metadata خطير!'
        WHEN qual::text LIKE '%app_metadata%' THEN '🟡 يستخدم app_metadata'
        ELSE '✅ آمن'
    END as security_status,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text LIKE '%metadata%' OR with_check::text LIKE '%metadata%')
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ فحص السياسات التي تسمح بكل شيء للمستخدمين المسجلين
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '🔴 DANGEROUS POLICY' as status,
    tablename,
    policyname,
    cmd,
    'سياسة تسمح بأي شيء للمستخدم المسجل' as warning
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      policyname ILIKE '%allow all%'
      OR policyname ILIKE '%authenticated%'
      OR (qual::text LIKE '%authenticated%' AND qual::text NOT LIKE '%auth.uid()%')
  )
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ فحص أن is_super_admin تستخدم الدالة الآمنة
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    'FUNCTION CHECK' as status,
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'is_super_admin';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ فحص المستخدمين الذين لديهم is_super_admin في metadata (يجب تنظيفها)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '⚠️ CLEANUP NEEDED' as status,
    au.email,
    au.raw_user_meta_data->>'is_super_admin' as metadata_super_admin,
    CASE WHEN is_super_admin(au.id) THEN '✅ Super Admin شرعي' ELSE '⛔ ليس Super Admin' END as actual_status
FROM auth.users au
WHERE au.raw_user_meta_data ? 'is_super_admin'
   OR au.raw_app_meta_data ? 'is_super_admin';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ فحص الجداول الحساسة وسياساتها
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%super_admin%' THEN '✅ محمي بـ Super Admin'
        WHEN policyname LIKE '%admin%' THEN '🟡 محمي بـ Admin'
        WHEN policyname LIKE '%own%' THEN '🟡 محمي بالملكية'
        ELSE '⚠️ يحتاج مراجعة'
    END as protection_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'user_profiles', 
      'user_roles', 
      'user_role_assignments', 
      'tenant_users', 
      'tenants',
      'companies',
      'roles',
      'permissions',
      'role_permissions'
  )
ORDER BY tablename, cmd;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ فحص Triggers الحماية
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    'TRIGGER' as type,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE WHEN tgname LIKE '%protect%' THEN '✅ موجود' ELSE '⚠️ يحتاج مراجعة' END as status
FROM pg_trigger
WHERE tgrelid::regclass::text IN ('user_profiles', 'user_roles', 'user_role_assignments')
  AND tgname NOT LIKE 'pg_%'
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ ملخص الأمان
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '📊 SECURITY SUMMARY' as report,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (qual::text LIKE '%is_super_admin%' OR with_check::text LIKE '%is_super_admin%')) as super_admin_protected,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (qual::text LIKE '%user_metadata%' OR with_check::text LIKE '%user_metadata%')) as using_dangerous_metadata;
