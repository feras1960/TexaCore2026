-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 55: Advanced Order Management (SIMPLIFIED - بدون tenant_id)
-- ═══════════════════════════════════════════════════════════════════════════

-- إسقاط الجداول القديمة إذا كانت موجودة
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
    RAISE NOTICE '✅ تم حذف الجداول القديمة';
    RAISE NOTICE ' ';
    RAISE NOTICE '🎯 STEP 55: تم التبسيط - النظام جاهز بدون tenant_id';
    RAISE NOTICE ' ';
END $$;
