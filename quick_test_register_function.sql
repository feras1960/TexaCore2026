-- ═══════════════════════════════════════════════════════════════
-- 🚀 اختبار سريع: هل register_new_subscriber موجودة؟
-- ═══════════════════════════════════════════════════════════════

-- نسخ هذا الكود وشغّله في Supabase SQL Editor

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_has_permissions BOOLEAN;
  rec RECORD;  -- إضافة متغير RECORD للـ loop
BEGIN
  -- ═══════════════════════════════════════════════════════════════
  -- 1️⃣ التحقق من وجود الدالة
  -- ═══════════════════════════════════════════════════════════════
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'register_new_subscriber'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ الدالة register_new_subscriber موجودة';
    
    -- عرض معلومات الدالة
    RAISE NOTICE '';
    RAISE NOTICE '📋 معلومات الدالة:';
    RAISE NOTICE '══════════════════';
    
    FOR rec IN (
      SELECT 
        proname AS function_name,
        pg_get_function_arguments(oid) AS arguments,
        CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
      FROM pg_proc
      WHERE proname = 'register_new_subscriber'
      AND pronamespace = 'public'::regnamespace
    ) LOOP
      RAISE NOTICE 'اسم الدالة: %', rec.function_name;
      RAISE NOTICE 'المعاملات: %', rec.arguments;
      RAISE NOTICE 'الأمان: %', rec.security;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ التحقق من الصلاحيات
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '';
    RAISE NOTICE '🔐 الصلاحيات:';
    RAISE NOTICE '══════════════';
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routine_privileges
      WHERE routine_name = 'register_new_subscriber'
      AND routine_schema = 'public'
      AND grantee IN ('authenticated', 'anon')
    ) INTO v_has_permissions;
    
    IF v_has_permissions THEN
      RAISE NOTICE '✅ الصلاحيات موجودة';
      
      FOR rec IN (
        SELECT grantee, privilege_type
        FROM information_schema.routine_privileges
        WHERE routine_name = 'register_new_subscriber'
        AND routine_schema = 'public'
        ORDER BY grantee
      ) LOOP
        RAISE NOTICE '  - %: %', rec.grantee, rec.privilege_type;
      END LOOP;
      
      RAISE NOTICE '';
      RAISE NOTICE '🎉 الدالة جاهزة للاستخدام!';
      RAISE NOTICE '✅ يمكنك الآن تجربة التسجيل في الـ Frontend';
      
    ELSE
      RAISE NOTICE '❌ الصلاحيات مفقودة!';
      RAISE NOTICE '';
      RAISE NOTICE '📝 نفّذ هذا الكود لإضافة الصلاحيات:';
      RAISE NOTICE '';
      RAISE NOTICE 'GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;';
      RAISE NOTICE 'GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ الدالة register_new_subscriber غير موجودة!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الحل:';
    RAISE NOTICE '══════';
    RAISE NOTICE '1. افتح: supabase/migrations/STEP_41_business_type_and_company_switcher.sql';
    RAISE NOTICE '2. انسخ محتواه كاملاً (Ctrl+A → Ctrl+C)';
    RAISE NOTICE '3. الصق هنا في SQL Editor (Ctrl+V)';
    RAISE NOTICE '4. اضغط Run';
    RAISE NOTICE '5. أعد تشغيل هذا الاختبار';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 📊 عرض جميع الدوال المتعلقة بالتسجيل
-- ═══════════════════════════════════════════════════════════════

SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname LIKE '%register%'
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
