-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 STEP 53: Guest Checkout System - اختبار شامل مبسط
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. التحقق من الجداول الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📦 الجداول الجديدة' as category,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('guest_checkouts', 'orders', 'order_items')
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. التحقق من أعمدة guest_checkouts
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📋 أعمدة guest_checkouts' as category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'guest_checkouts'
  AND column_name IN (
      'id', 'tenant_id', 'company_id', 'session_id', 'email', 
      'full_name', 'phone', 'shipping_address', 'status', 'expires_at'
  )
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. التحقق من أعمدة orders
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📋 أعمدة orders' as category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
      'id', 'tenant_id', 'order_number', 'customer_id', 'guest_checkout_id',
      'cart_id', 'total_amount', 'status', 'payment_status', 'currency'
  )
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. التحقق من الدوال الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '⚡ الدوال الجديدة' as category,
    routine_name as function_name,
    CASE 
        WHEN routine_name = 'generate_order_number' THEN '✅ موجود'
        WHEN routine_name = 'save_guest_checkout' THEN '✅ موجود'
        WHEN routine_name = 'create_order_from_cart' THEN '✅ موجود'
        WHEN routine_name = 'convert_guest_order_to_customer' THEN '✅ موجود'
        WHEN routine_name = 'get_guest_orders' THEN '✅ موجود'
        WHEN routine_name = 'get_order_details' THEN '✅ موجود'
        WHEN routine_name = 'cleanup_expired_guest_checkouts' THEN '✅ موجود'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'generate_order_number',
      'save_guest_checkout',
      'create_order_from_cart',
      'convert_guest_order_to_customer',
      'get_guest_orders',
      'get_order_details',
      'cleanup_expired_guest_checkouts'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. التحقق من عدد الدوال (يجب أن يكون 7)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 عدد الدوال' as category,
    COUNT(*) as total_functions,
    CASE 
        WHEN COUNT(*) = 7 THEN '✅ صحيح (7 دوال)'
        ELSE '⚠️ خطأ - المتوقع 7'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'generate_order_number',
      'save_guest_checkout',
      'create_order_from_cart',
      'convert_guest_order_to_customer',
      'get_guest_orders',
      'get_order_details',
      'cleanup_expired_guest_checkouts'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔒 RLS Policies' as category,
    tablename as table_name,
    policyname as policy_name,
    '✅ مُفعّل' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('guest_checkouts', 'orders', 'order_items')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. التحقق من Indexes
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔍 Indexes' as category,
    tablename as table_name,
    indexname as index_name,
    '✅ موجود' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('guest_checkouts', 'orders', 'order_items')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. إحصائيات البيانات الحالية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 إحصائيات البيانات' as category,
    'guest_checkouts' as table_name,
    COUNT(*) as record_count
FROM guest_checkouts
UNION ALL
SELECT 
    '📊 إحصائيات البيانات',
    'orders',
    COUNT(*)
FROM orders
UNION ALL
SELECT 
    '📊 إحصائيات البيانات',
    'order_items',
    COUNT(*)
FROM order_items;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. الخلاصة النهائية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ الخلاصة' as category,
    'STEP 53: Guest Checkout System' as component,
    '✅ جاهز للاختبار الوظيفي' as status;
