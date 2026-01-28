-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار نهائي سريع - Final Quick Test
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tenants
SELECT '✅ Tenants:' as check_name, COUNT(*) as count FROM tenants;

-- 2. Companies
SELECT '✅ Companies:' as check_name, COUNT(*) as count FROM companies;

-- 3. Demo Company Accounts
SELECT 
    '✅ Demo Accounts:' as check_name, 
    COUNT(*) as count 
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.code = 'demo-tenant';

-- 4. Platform Owner Accounts
SELECT 
    '✅ Platform Owner Accounts:' as check_name, 
    COUNT(*) as count 
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.code = 'nexrev-platform';

-- 5. User Profiles
SELECT '✅ Users:' as check_name, COUNT(*) as count FROM user_profiles;

-- النتيجة المتوقعة:
-- Tenants: 2
-- Companies: 2
-- Demo Accounts: 59+ (أو العدد الذي ظهر)
-- Platform Owner Accounts: 40-80 (حسب القالب)
-- Users: 1+ (على الأقل feras1960@gmail.com)
