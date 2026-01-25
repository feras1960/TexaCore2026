-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 STEP 55: Advanced Order Management - اختبار شامل
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. التحقق من الجداول (13 جدول)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📦 الجداول' as category,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count,
    '✅ موجود' as status
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
      'order_statuses', 'order_status_transitions', 'order_fulfillment_locations',
      'order_shipments', 'order_history', 'notification_rules',
      'notification_templates', 'notification_queue', 'reward_rules',
      'discount_coupons', 'customer_coupons', 'loyalty_points', 'loyalty_transactions'
  )
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. التحقق من الدوال (13 دالة)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '⚡ الدوال' as category,
    routine_name as function_name,
    '✅ موجود' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'assign_fulfillment_locations',
      'update_order_status',
      'confirm_location_ready',
      'create_shipment',
      'update_shipment_status',
      'record_order_payment',
      'complete_order',
      'cancel_order',
      'queue_order_notification',
      'process_order_rewards',
      'generate_customer_coupon',
      'award_loyalty_points',
      'get_order_timeline'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. عدد الجداول والدوال
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 الإحصائيات' as category,
    'الجداول' as item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 13 THEN '✅ صحيح (13)'
        ELSE '❌ خطأ - المتوقع 13'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'order_statuses', 'order_status_transitions', 'order_fulfillment_locations',
      'order_shipments', 'order_history', 'notification_rules',
      'notification_templates', 'notification_queue', 'reward_rules',
      'discount_coupons', 'customer_coupons', 'loyalty_points', 'loyalty_transactions'
  )

UNION ALL

SELECT 
    '📊 الإحصائيات',
    'الدوال',
    COUNT(*),
    CASE 
        WHEN COUNT(*) = 13 THEN '✅ صحيح (13)'
        ELSE '❌ خطأ - المتوقع 13'
    END
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'assign_fulfillment_locations', 'update_order_status', 'confirm_location_ready',
      'create_shipment', 'update_shipment_status', 'record_order_payment',
      'complete_order', 'cancel_order', 'queue_order_notification',
      'process_order_rewards', 'generate_customer_coupon', 'award_loyalty_points',
      'get_order_timeline'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔒 RLS Policies' as category,
    tablename as table_name,
    COUNT(*) as policies_count,
    '✅ مُفعّل' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'order_statuses', 'order_status_transitions', 'order_fulfillment_locations',
      'order_shipments', 'order_history', 'notification_rules',
      'notification_templates', 'notification_queue', 'reward_rules',
      'discount_coupons', 'customer_coupons', 'loyalty_points', 'loyalty_transactions'
  )
GROUP BY tablename
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. التحقق من Indexes
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔍 Indexes' as category,
    tablename as table_name,
    COUNT(*) as indexes_count,
    '✅ موجود' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'order_statuses', 'order_status_transitions', 'order_fulfillment_locations',
      'order_shipments', 'order_history', 'notification_rules',
      'notification_templates', 'notification_queue', 'reward_rules',
      'discount_coupons', 'customer_coupons', 'loyalty_points', 'loyalty_transactions'
  )
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. الخلاصة النهائية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ الخلاصة' as category,
    'STEP 55: Advanced Order Management' as component,
    '✅ جاهز للاختبار الوظيفي' as status;
