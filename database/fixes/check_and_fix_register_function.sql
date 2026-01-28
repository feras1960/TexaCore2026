-- ═══════════════════════════════════════════════════════════════
-- 🔍 التحقق من وجود دالة register_new_subscriber
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ التحقق من وجود الدالة
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'register_new_subscriber'
AND pronamespace = 'public'::regnamespace;

-- النتيجة المتوقعة:
-- إذا لم يظهر أي نتيجة → الدالة غير موجودة!
-- إذا ظهرت نتيجة → تابع للخطوة التالية

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ التحقق من الصلاحيات
-- ═══════════════════════════════════════════════════════════════

SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'register_new_subscriber';

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ التحقق من GRANT
-- ═══════════════════════════════════════════════════════════════

SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'register_new_subscriber'
AND routine_schema = 'public';

-- ═══════════════════════════════════════════════════════════════
-- 📝 الملاحظات:
-- ═══════════════════════════════════════════════════════════════

-- إذا لم تظهر أي نتائج في الاستعلامات أعلاه،
-- فهذا يعني أن STEP_41 لم يتم تنفيذه بشكل صحيح!

-- الحل:
-- 1. افتح ملف: supabase/migrations/STEP_41_business_type_and_company_switcher.sql
-- 2. انسخ محتواه كاملاً
-- 3. نفذه في Supabase SQL Editor
-- 4. تحقق من عدم وجود أخطاء
-- 5. أعد تشغيل هذا السكريبت للتحقق
