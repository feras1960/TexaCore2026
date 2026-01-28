-- ═══════════════════════════════════════════════════════════════════════════
-- 🧪 STEP 54: Product Reviews System - اختبار شامل
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
  AND table_name IN ('product_reviews', 'review_votes', 'product_review_stats')
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. التحقق من أعمدة product_reviews
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📋 أعمدة product_reviews' as category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'product_reviews'
  AND column_name IN (
      'id', 'tenant_id', 'product_id', 'customer_id', 'order_id',
      'rating', 'title', 'review_text', 'images', 
      'status', 'is_verified_purchase', 'helpful_count', 
      'seller_response', 'created_at'
  )
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. التحقق من الدوال الجديدة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '⚡ الدوال الجديدة' as category,
    routine_name as function_name,
    '✅ موجود' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'add_product_review',
      'approve_review',
      'reject_review',
      'add_seller_response',
      'vote_on_review',
      'update_product_review_stats',
      'get_product_reviews',
      'get_product_review_statistics'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. التحقق من عدد الدوال (يجب أن يكون 8)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 عدد الدوال' as category,
    COUNT(*) as total_functions,
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ صحيح (8 دوال)'
        ELSE '⚠️ خطأ - المتوقع 8'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'add_product_review',
      'approve_review',
      'reject_review',
      'add_seller_response',
      'vote_on_review',
      'update_product_review_stats',
      'get_product_reviews',
      'get_product_review_statistics'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. التحقق من RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔒 RLS Policies' as category,
    tablename as table_name,
    policyname as policy_name,
    '✅ مُفعّل' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('product_reviews', 'review_votes', 'product_review_stats')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. التحقق من Indexes
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🔍 Indexes' as category,
    tablename as table_name,
    indexname as index_name,
    '✅ موجود' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('product_reviews', 'review_votes', 'product_review_stats')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. إحصائيات البيانات الحالية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 إحصائيات البيانات' as category,
    'product_reviews' as table_name,
    COUNT(*) as record_count
FROM product_reviews
UNION ALL
SELECT 
    '📊 إحصائيات البيانات',
    'review_votes',
    COUNT(*)
FROM review_votes
UNION ALL
SELECT 
    '📊 إحصائيات البيانات',
    'product_review_stats',
    COUNT(*)
FROM product_review_stats;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. الخلاصة النهائية
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ الخلاصة' as category,
    'STEP 54: Product Reviews System' as component,
    '✅ جاهز للاختبار الوظيفي' as status;
