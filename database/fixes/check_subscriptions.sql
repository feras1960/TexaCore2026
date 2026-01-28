-- ============================================================================
-- فحص الاشتراكات الموجودة
-- ============================================================================

-- 1. عرض العملاء مع اشتراكاتهم
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    ts.id as subscription_id,
    sp.name_en as plan_name,
    ts.status as subscription_status
FROM tenants t
LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE t.status = 'active'
ORDER BY t.name;
