-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 1: فحص الجداول الجديدة
-- ═══════════════════════════════════════════════════════════════════════════
-- نفذ هذا الاستعلام وأخبرني بالنتيجة

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'modules', 
    'user_module_permissions', 
    'user_feature_permissions', 
    'user_roles', 
    'user_role_assignments'
)
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- المتوقع: يجب أن تظهر 5 جداول
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. modules
-- 2. user_feature_permissions
-- 3. user_module_permissions
-- 4. user_role_assignments
-- 5. user_roles
--
-- ⚠️ إذا لم تظهر الجداول، أخبرني لأعطيك الـ migrations للتنفيذ
-- ✅ إذا ظهرت الجداول، انتقل للخطوة 2
