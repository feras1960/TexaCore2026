-- ═══════════════════════════════════════════════════════════════
-- التحقق من schema جدول subscription_plans
-- ═══════════════════════════════════════════════════════════════

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_plans'
ORDER BY ordinal_position;
