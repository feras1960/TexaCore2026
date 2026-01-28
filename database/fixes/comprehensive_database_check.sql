-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 استعلام التحقق الشامل من قاعدة البيانات
-- Comprehensive Database Verification
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 التحقق الشامل من قاعدة البيانات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. الجداول الموجودة (مرتبة أبجدياً)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📦 الجداول الموجودة' as section,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. إحصائيات الجداول
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 إحصائيات' as section,
    'إجمالي الجداول' as item,
    COUNT(*)::text as value
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '📊 إحصائيات',
    'إجمالي الدوال',
    COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    '📊 إحصائيات',
    'إجمالي الـ Views',
    COUNT(*)::text
FROM information_schema.views
WHERE table_schema = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. التحقق من جداول E-Commerce (STEP 48-54)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🛒 E-Commerce Tables' as section,
    'STEP 48-50: Core' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_groups') 
        THEN '✅ customer_groups'
        ELSE '❌ customer_groups مفقود'
    END as status

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 48-50: Core',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_lists') 
    THEN '✅ price_lists' ELSE '❌ price_lists مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 48-50: Core',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_list_items') 
    THEN '✅ price_list_items' ELSE '❌ price_list_items مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 51: Registration',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') 
    THEN '✅ customers' ELSE '❌ customers مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 52: Cart',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopping_carts') 
    THEN '✅ shopping_carts' ELSE '❌ shopping_carts مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 52: Cart',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') 
    THEN '✅ cart_items' ELSE '❌ cart_items مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 53: Checkout',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_checkouts') 
    THEN '✅ guest_checkouts' ELSE '❌ guest_checkouts مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 53: Checkout',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') 
    THEN '✅ orders' ELSE '❌ orders مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 53: Checkout',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') 
    THEN '✅ order_items' ELSE '❌ order_items مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 54: Reviews',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_reviews') 
    THEN '✅ product_reviews' ELSE '❌ product_reviews مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 54: Reviews',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_votes') 
    THEN '✅ review_votes' ELSE '❌ review_votes مفقود' END

UNION ALL SELECT '🛒 E-Commerce Tables', 'STEP 54: Reviews',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_review_stats') 
    THEN '✅ product_review_stats' ELSE '❌ product_review_stats مفقود' END;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. التحقق من الدوال الهامة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '⚡ الدوال الهامة' as section,
    'E-Commerce Functions' as category,
    routine_name as function_name,
    '✅ موجود' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'get_products_for_store',
      'get_available_categories_for_customer',
      'can_customer_access_product',
      'add_to_cart',
      'update_cart_item',
      'get_cart_with_items',
      'save_guest_checkout',
      'create_order_from_cart',
      'add_product_review',
      'get_product_reviews'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. الجداول الأساسية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🏢 الجداول الأساسية' as section,
    'Core Tables' as category,
    table_name,
    CASE 
        WHEN table_name IN ('tenants', 'companies', 'products', 'warehouses') THEN '✅ موجود'
        ELSE '⚠️ موجود'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tenants', 'companies', 'products', 'customers', 'warehouses', 'pos_branches')
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. التحقق من أعمدة tenant_id
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔍 أعمدة tenant_id' as section,
    table_name,
    CASE 
        WHEN column_name = 'tenant_id' THEN '✅ يحتوي على tenant_id'
        ELSE '❌ لا يحتوي على tenant_id'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tenants', 'companies', 'products', 'customers', 'orders', 'warehouses')
  AND column_name = 'tenant_id'
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. الخلاصة النهائية
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tables_count INT;
    v_functions_count INT;
    v_ecommerce_tables INT;
BEGIN
    SELECT COUNT(*) INTO v_tables_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO v_functions_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public';
    
    SELECT COUNT(*) INTO v_ecommerce_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'customer_groups', 'price_lists', 'price_list_items',
          'shopping_carts', 'cart_items', 
          'guest_checkouts', 'orders', 'order_items',
          'product_reviews', 'review_votes', 'product_review_stats'
      );
    
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 الخلاصة النهائية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
    RAISE NOTICE '📦 إجمالي الجداول: %', v_tables_count;
    RAISE NOTICE '⚡ إجمالي الدوال: %', v_functions_count;
    RAISE NOTICE '🛒 جداول E-Commerce (من أصل 12): %', v_ecommerce_tables;
    RAISE NOTICE ' ';
    RAISE NOTICE '✅ الحالة: %', 
        CASE 
            WHEN v_ecommerce_tables >= 10 THEN 'ممتاز - معظم الجداول موجودة'
            WHEN v_ecommerce_tables >= 6 THEN 'جيد - بعض الجداول مفقودة'
            ELSE 'يحتاج عمل - جداول كثيرة مفقودة'
        END;
    RAISE NOTICE ' ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE ' ';
END $$;
