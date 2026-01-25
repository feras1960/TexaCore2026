-- التحقق السريع من الجداول التي تحتوي على tenant_id
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
  AND table_name IN ('products', 'product_variants', 'subscription_plans', 'promotional_discounts')
ORDER BY table_name;
