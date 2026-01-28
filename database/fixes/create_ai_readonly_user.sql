-- ═══════════════════════════════════════════════════════════════
-- إنشاء مستخدم AI للقراءة فقط (ai_readonly)
-- ═══════════════════════════════════════════════════════════════
-- التاريخ: 2026-01-25
-- الهدف: إنشاء مستخدم آمن للـ AI للاتصال بقاعدة البيانات
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء المستخدم
-- ═══════════════════════════════════════════════════════════════

-- احذف المستخدم إذا كان موجوداً (للتجربة فقط)
DROP USER IF EXISTS ai_readonly;

-- أنشئ المستخدم الجديد
-- ⚠️ استبدل 'YOUR_SECURE_PASSWORD' بكلمة مرور قوية!
CREATE USER ai_readonly WITH PASSWORD 'YOUR_SECURE_PASSWORD';

-- ═══════════════════════════════════════════════════════════════
-- 2. منح صلاحيات القراءة على schema public
-- ═══════════════════════════════════════════════════════════════

-- منح استخدام schema
GRANT USAGE ON SCHEMA public TO ai_readonly;

-- منح قراءة جميع الجداول الموجودة
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;

-- منح قراءة جميع الـ sequences (للـ IDs)
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ai_readonly;

-- ═══════════════════════════════════════════════════════════════
-- 3. منح صلاحيات على الجداول المستقبلية (auto-grant)
-- ═══════════════════════════════════════════════════════════════

-- الجداول الجديدة ستُمنح صلاحيات القراءة تلقائياً
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO ai_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON SEQUENCES TO ai_readonly;

-- ═══════════════════════════════════════════════════════════════
-- 4. منح تنفيذ دوال القراءة المهمة
-- ═══════════════════════════════════════════════════════════════

-- دوال الباقات
GRANT EXECUTE ON FUNCTION get_subscription_plans() TO ai_readonly;
GRANT EXECUTE ON FUNCTION get_plan_pricing(VARCHAR, VARCHAR) TO ai_readonly;
GRANT EXECUTE ON FUNCTION check_plan_limits(UUID, VARCHAR) TO ai_readonly;

-- دوال الموديولات والصلاحيات
GRANT EXECUTE ON FUNCTION get_user_allowed_modules(UUID) TO ai_readonly;
GRANT EXECUTE ON FUNCTION check_user_module_permission(UUID, VARCHAR, VARCHAR) TO ai_readonly;
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, VARCHAR) TO ai_readonly;

-- دوال الخصومات
GRANT EXECUTE ON FUNCTION get_promotional_discounts() TO ai_readonly;

-- ⚠️ ملاحظة: لا نمنح صلاحيات تنفيذ دوال التعديل مثل:
-- register_new_subscriber, create_subscription_plan, etc.

-- ═══════════════════════════════════════════════════════════════
-- 5. التحقق من الصلاحيات الممنوحة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء المستخدم ai_readonly بنجاح!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- عرض جميع صلاحيات الجداول
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'ai_readonly'
ORDER BY table_name
LIMIT 20;

-- عرض عدد الجداول المتاحة
SELECT COUNT(DISTINCT table_name) AS total_tables
FROM information_schema.role_table_grants 
WHERE grantee = 'ai_readonly';

-- ═══════════════════════════════════════════════════════════════
-- 6. اختبار المستخدم الجديد
-- ═══════════════════════════════════════════════════════════════

-- للاختبار من Supabase SQL Editor:
-- (لن يعمل لأن SQL Editor يستخدم user الحالي)

-- للاختبار من Terminal:
-- psql "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres" \
--   -c "SELECT current_user, version();"

-- ═══════════════════════════════════════════════════════════════
-- 7. استعلامات اختبار مفيدة
-- ═══════════════════════════════════════════════════════════════

-- اختبار 1: عرض الباقات
-- SELECT code, name_ar, price_monthly, is_active FROM subscription_plans;

-- اختبار 2: عرض المستخدمين
-- SELECT id, email, created_at FROM auth.users LIMIT 5;

-- اختبار 3: عرض الـ tenants
-- SELECT id, code, name, status FROM tenants LIMIT 5;

-- اختبار 4: عرض الموديولات
-- SELECT code, name_ar, category, is_active FROM system_modules LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة
-- ═══════════════════════════════════════════════════════════════

/*
✅ الصلاحيات الممنوحة:
- SELECT على جميع الجداول في schema public
- EXECUTE على دوال القراءة فقط

❌ الصلاحيات غير الممنوحة (للأمان):
- INSERT, UPDATE, DELETE على أي جدول
- EXECUTE على دوال التعديل
- DROP, ALTER على أي كائن
- الوصول إلى schemas أخرى

🔒 توصيات الأمان:
1. استخدم كلمة مرور قوية (20+ حرف)
2. لا تشارك الـ password علناً
3. احفظ الـ Connection String في .env
4. أضف .env إلى .gitignore
5. استخدم Connection Pooler للإنتاج

📝 Connection String النهائي:
postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres

أو مع Connection Pooler (أفضل):
postgresql://ai_readonly:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
*/

-- ═══════════════════════════════════════════════════════════════
-- نهاية السكريبت
-- ═══════════════════════════════════════════════════════════════
