-- ═══════════════════════════════════════════════════════════════
-- اختبار RPC: register_new_subscriber
-- تشغيل هذا في Supabase SQL Editor للتحقق
-- ═══════════════════════════════════════════════════════════════

-- استبدل هذه القيم ببيانات المستخدم الذي يحاول التسجيل:
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE'; -- ضع user_id هنا
  v_result JSONB;
BEGIN
  -- اختبار الدالة
  SELECT register_new_subscriber(
    v_user_id,
    'test@example.com',
    'Test User',
    'Test Company',
    '+966501234567',
    'general',
    'SAR',
    'SA'
  ) INTO v_result;
  
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'النتيجة: %', v_result;
  RAISE NOTICE '═══════════════════════════════════════';
  
  IF v_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ التسجيل نجح!';
    RAISE NOTICE 'Tenant ID: %', v_result->>'tenant_id';
    RAISE NOTICE 'Company ID: %', v_result->>'company_id';
  ELSE
    RAISE NOTICE '❌ التسجيل فشل!';
    RAISE NOTICE 'الخطأ: %', v_result->>'error';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من الدالة موجودة
-- ═══════════════════════════════════════════════════════════════
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'register_new_subscriber'
AND pronamespace = 'public'::regnamespace;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من الصلاحيات
-- ═══════════════════════════════════════════════════════════════
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'register_new_subscriber';
