-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 تنظيف الجداول النصف منشأة من STEP_55
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🧹 بدء تنظيف الجداول النصف منشأة...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;

-- إسقاط الدوال أولاً
DROP FUNCTION IF EXISTS get_order_timeline CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points CASCADE;
DROP FUNCTION IF EXISTS generate_customer_coupon CASCADE;
DROP FUNCTION IF EXISTS process_order_rewards CASCADE;
DROP FUNCTION IF EXISTS queue_order_notification CASCADE;
DROP FUNCTION IF EXISTS cancel_order CASCADE;
DROP FUNCTION IF EXISTS complete_order CASCADE;
DROP FUNCTION IF EXISTS record_order_payment CASCADE;
DROP FUNCTION IF EXISTS update_shipment_status CASCADE;
DROP FUNCTION IF EXISTS create_shipment CASCADE;
DROP FUNCTION IF EXISTS confirm_location_ready CASCADE;
DROP FUNCTION IF EXISTS update_order_status CASCADE;
DROP FUNCTION IF EXISTS assign_fulfillment_locations CASCADE;

-- إسقاط الجداول
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_points CASCADE;
DROP TABLE IF EXISTS customer_coupons CASCADE;
DROP TABLE IF EXISTS discount_coupons CASCADE;
DROP TABLE IF EXISTS reward_rules CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS order_shipments CASCADE;
DROP TABLE IF EXISTS order_fulfillment_locations CASCADE;
DROP TABLE IF EXISTS order_status_transitions CASCADE;
DROP TABLE IF EXISTS order_statuses CASCADE;

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم تنظيف جميع الجداول والدوال النصف منشأة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;
