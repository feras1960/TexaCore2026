-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 7: الإحصائيات النهائية
-- ═══════════════════════════════════════════════════════════════════════════
-- نفذ هذا الاستعلام بعد نجاح جميع الخطوات السابقة

SELECT 
    'Modules' as item,
    COUNT(*) as count
FROM modules

UNION ALL

SELECT 
    'Active Modules',
    COUNT(*)
FROM modules
WHERE is_active = true

UNION ALL

SELECT 
    'Tenant Modules',
    COUNT(*)
FROM tenant_modules
WHERE is_active = true

UNION ALL

SELECT 
    'System Roles',
    COUNT(*)
FROM user_roles
WHERE is_system_role = true

UNION ALL

SELECT
    'Active Tenants',
    COUNT(*)
FROM tenants
WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════
-- المتوقع:
-- ═══════════════════════════════════════════════════════════════════════════
-- Modules: 18
-- Active Modules: 18
-- Tenant Modules: 18 × عدد tenants
-- System Roles: 6 × عدد tenants
-- Active Tenants: عدد الـ tenants النشطة
--
-- ✅ إذا كانت النتائج صحيحة - مبروك! Backend v2.0 يعمل بشكل ممتاز! 🎉
