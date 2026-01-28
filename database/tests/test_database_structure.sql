-- ═══════════════════════════════════════════════════════════════════════════
-- فحص هيكلية Database قبل تنفيذ STEP_42
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. فحص جدول tenants
SELECT 
    'tenants' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tenants'
ORDER BY ordinal_position;

-- 2. فحص جدول companies
SELECT 
    'companies' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- 3. فحص جدول user_profiles
SELECT 
    'user_profiles' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. فحص جدول tenant_modules
SELECT 
    'tenant_modules' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tenant_modules'
ORDER BY ordinal_position;

-- 5. فحص وجود جدول modules
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules')
        THEN '✅ جدول modules موجود'
        ELSE '❌ جدول modules غير موجود'
    END as modules_status;

-- 6. فحص الدوال المطلوبة
SELECT 
    proname as function_name,
    '✅ موجودة' as status
FROM pg_proc 
WHERE proname IN (
    'create_default_company_for_tenant',
    'apply_chart_template_to_company',
    'create_default_user_permissions'
)
ORDER BY proname;

-- 7. إحصائيات Tenants الحالية
SELECT 
    'عدد Tenants الحالية' as info,
    COUNT(*) as count
FROM tenants;

-- 8. إحصائيات Companies الحالية
SELECT 
    'عدد Companies الحالية' as info,
    COUNT(*) as count
FROM companies;
